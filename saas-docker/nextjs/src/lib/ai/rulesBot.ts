import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { botMessageTemplates } from "./botMessageTemplates";
import { cancelPayment, createCustomer, createPayment, getPixQrCode, updatePayment } from "@/lib/asaas";
import { getBusinessDayRange, getZonedDateTimeParts, zonedDateTimeToUtc } from "@/lib/dateTime";
import { createHash } from "crypto";
import { formatBRL, getProductPriceLabel } from "@/lib/currency";

const prisma = new PrismaClient();

function generateCPF(): string {
  const n = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const n9 = Array.from({ length: 9 }, () => n(0, 9));
  const d1 = n9.reduce((s, v, i) => s + v * (10 - i), 0) % 11;
  const d1v = d1 < 2 ? 0 : 11 - d1;
  const d2 = [...n9, d1v].reduce((s, v, i) => s + v * (11 - i), 0) % 11;
  const d2v = d2 < 2 ? 0 : 11 - d2;
  return [...n9, d1v, d2v].join('');
}

function cleanDescription(str: string): string {
  if (!str) return "Pagamento";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100) || "Pagamento";
}

type ProductLike = {
  id?: any;
  name?: string;
  price?: any;
  description?: string;
  type?: string;
  monthly?: string;
  image_url?: string;
  send_photo?: boolean;
  delivery_type?: string;
  delivery_deadline?: string;
  duration_min?: number;
  duration?: number;
  stock?: number;
  requires_payment?: boolean | string;
};

// Removemos o Redis pois na Vercel Serverless isso causa timeout/erro.
// Utilizaremos o SystemConfig do Prisma (Banco de Dados) como um key-value store temporário para o state do bot.

interface BotState {
  step: string;
  data: Record<string, any>;
  errorCount?: number;
}

function normalizePhone(value: any): string {
  return String(value || "").replace(/\D/g, "");
}

function getLeadLookupWhereClause(tenantId: string, rawPhone: string): any {
  const clean = normalizePhone(rawPhone);
  const or: Array<{ phone: string }> = [];

  if (clean) or.push({ phone: clean });
  if (clean.length > 8) {
    const noCountry = clean.startsWith("55") ? clean.slice(2) : clean;
    or.push({ phone: noCountry });
  }

  return {
    tenant_id: tenantId,
    ...(or.length > 0 ? { OR: or } : { phone: rawPhone }),
  };
}

function normalizeTextForLookup(value: any): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const WEEKDAY_NAMES_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function formatSchedulingDateLabel(date: Date) {
  const parts = getZonedDateTimeParts(date);
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const dateStr = `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}`;
  return `${WEEKDAY_NAMES_PT[dayOfWeek]} (${dateStr})`;
}

function getProductIdentifier(product: ProductLike | undefined): string {
  if (!product) return "";
  if (product.id !== undefined && product.id !== null) {
    return String(product.id).trim();
  }
  return "";
}

function findProductByRef(products: any[], productRef: any): ProductLike | null {
  if (!Array.isArray(products)) return null;

  const ref = (productRef || "").toString().trim();
  if (!ref) return null;

  const idMatch = products.find((p: any) => getProductIdentifier(p) === ref);
  if (idMatch) return idMatch as ProductLike;

  const exactName = products.find((p: any) => (p?.name || "").trim() === ref);
  if (exactName) return exactName as ProductLike;

  const normalizedRef = normalizeTextForLookup(ref);
  const normalizedNameMatch = products.find((p: any) => normalizeTextForLookup(p?.name || "") === normalizedRef);
  if (normalizedNameMatch) return normalizedNameMatch as ProductLike;

  const includesMatch = products.find((p: any) => {
    const normalizedProductName = normalizeTextForLookup(p?.name || "");
    return normalizedProductName.includes(normalizedRef) || normalizedRef.includes(normalizedProductName);
  });
  if (includesMatch) return includesMatch as ProductLike;

  return null;
}

function appendNodeCheckoutText(customText: unknown, message: string): string {
  const customMessage = String(customText || "").trim();

  if (!customMessage) {
    return message;
  }

  return `${String(customText).trim()}\n\n${message}`;
}

function appendInteractiveOptions(
  message: string,
  options: Array<{ label: string; value: string }>,
): string {
  const validOptions = options.filter((option) => option.label.trim() && option.value.trim());
  if (validOptions.length === 0) return message;

  const marker = validOptions.length > 3 ? "---LIST---" : "---BUTTONS---";
  return `${message.trim()}\n\n${marker}\n${validOptions
    .map((option) => `${option.label}|${option.value}`)
    .join("\n")}`;
}

function getInteractiveNodes(nodes: any[]): any[] {
  return nodes.filter((node: any) => node.showInPoll !== false);
}

function resolveProductFromNode(products: any[], node: any): ProductLike | null {
  if (!node) return null;
  return findProductByRef(products, node.productId)
    || findProductByRef(products, node.productName)
    || findProductByRef(products, node.title);
}

function getProductDisplayPrice(prod: ProductLike | null): string {
  if (!prod) return "";
  return (getProductPriceLabel(prod) || "Preço não informado").replace(/^R\$\s?/, "");
}

function isSchedulableProduct(prod: ProductLike | null | undefined): boolean {
  if (!prod) return false;
  const deliveryType = String(prod.delivery_type || "").trim().toLowerCase();
  if (deliveryType) {
    return deliveryType === "service";
  }

  const type = String(prod.type || "").trim().toLowerCase();
  return type === "service";
}

function getSchedulableProducts(products: any[]): ProductLike[] {
  if (!Array.isArray(products)) return [];
  const explicit = products.filter((p) => isSchedulableProduct(p as ProductLike));

  if (explicit.length > 0) {
    return explicit as ProductLike[];
  }

  return products.filter((p) => String(p?.name || "").trim().length > 0) as ProductLike[];
}

function renderCollectedVariables(value: unknown, collected: Record<string, unknown> | null | undefined): string {
  return String(value || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g,
    (match, doubleKey, singleKey) => {
      const replacement = collected?.[doubleKey || singleKey];
      return replacement === undefined || replacement === null ? match : String(replacement);
    },
  );
}

export function resolveChoiceIndex(value: string, labels: string[]): number {
  if (/^\d+$/.test(value.trim())) {
    const numericIndex = Number(value.trim()) - 1;
    if (numericIndex >= 0 && numericIndex < labels.length) return numericIndex;
  }
  const normalized = normalizeTextForLookup(value);
  const normalizedLabels = labels.map(normalizeTextForLookup);
  const exactIndex = normalizedLabels.findIndex((label) => label === normalized);
  if (exactIndex >= 0) return exactIndex;

  // Poll labels include the display price, while the workflow stores only the product name.
  return normalizedLabels.findIndex((label) => {
    if (!label || !normalized.startsWith(`${label} `)) return false;
    return /^r\s*\d/.test(normalized.slice(label.length).trim());
  });
}

export async function processMessageWithRules(
  tenantId: string,
  contactNumber: string,
  userMessage: string,
  settings: any,
  isMessageToMyself: boolean = false
): Promise<string> {

  // --- MODO DE DEMONSTRAÇÃO (UNIVERSAL LOGIN DO PARCEIRO) ---
  if (settings.isDemoRegras) {
    const cleanText = userMessage.toLowerCase().trim();
    if (cleanText === 'olá' || cleanText === 'ola' || cleanText === 'oi') {
      return "Olá! Sou a inteligência artificial da *Nexus*. Notei que você quer automatizar seu WhatsApp e vender mais. Como posso te ajudar hoje?\n\n1️⃣ Quero saber sobre os Bots\n2️⃣ Quero um Site Profissional\n3️⃣ Falar com humano";
    }
    if (cleanText.includes('1')) {
      return "Nossos bots custam a partir de *R$ 97/mês* e trabalham 24h por você. Eles qualificam leads, agendam reuniões e mandam link de PIX automático! \n\nLegal a demonstração, né? Mostre isso para seus clientes! 😉\n*(Para sair digite 'sair do teste')*";
    }
    if (cleanText.includes('2')) {
      return "Criamos sites completos a partir de *R$ 997*. Você terá uma plataforma super rápida, otimizada para o Google e com design premium. \n\nIsso converte muito! Teste finalizado. 😉\n*(Para sair digite 'sair do teste')*";
    }
    return "Isso é apenas uma demonstração do nosso bot de regras rápidas. Digite '1', '2' ou 'Sair do teste'.";
  }

  const instanceScope = String(settings._instanceName || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  const conversationId = typeof settings._conversationId === "string" ? settings._conversationId : null;
  const stateKey = `rulesbot_state_${tenantId}_${instanceScope}_${contactNumber}`;
  
  // 1. Get current state from Database (SystemConfig)
  let rawState: string | null = null;
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: stateKey } });
    if (config) rawState = config.value;

    // Preserve an in-progress conversation when a tenant has only one WhatsApp connection.
    if (!config && instanceScope !== "default") {
      const instanceCount = await prisma.whatsappInstance.count({ where: { tenant_id: tenantId } });
      if (instanceCount === 1) {
        const legacyConfig = await prisma.systemConfig.findUnique({
          where: { key: `rulesbot_state_${tenantId}_${contactNumber}` },
        });
        if (legacyConfig) rawState = legacyConfig.value;
      }
    }
  } catch (e) {
    console.error("Erro ao buscar state do rulesBot no DB:", e);
  }

  let state: BotState = { step: "main_menu", data: {} };
  
  if (rawState) {
    try {
      state = JSON.parse(rawState);
    } catch {}
  }

  // Helper para salvar o estado
  const saveState = async (newState: BotState) => {
    try {
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify(newState) },
        create: { key: stateKey, value: JSON.stringify(newState) }
      });
    } catch (e) {
      console.error("Erro ao salvar state do rulesBot no DB:", e);
    }
  };

  // Fetch contact name from conversation
  let contactName = '';
  try {
    const conv = await prisma.conversation.findFirst({
      where: conversationId
        ? { id: conversationId, tenant_id: tenantId }
        : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
      select: { contact_name: true }
    });
    if (conv?.contact_name) contactName = conv.contact_name;
  } catch {}

  const cleanText = userMessage
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");

  const customNodes = settings.custom_rules_nodes || [];

  if (["reiniciar", "reiniciar atendimento", "recomecar", "recomecar atendimento"].includes(cleanText)) {
    state = { step: "main_menu", data: { menu_sent: true } };
    await saveState(state);
    return getMainMenuMessage(settings);
  }

  // Handle name collection for checkout payment
  if (state.step === "awaiting_checkout_name") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    const nome = userMessage.trim();
    if (nome.length < 2) return "Por favor, digite um nome válido:";
    state.data.name = nome;
    if (state.data._needsEmail) {
      state.step = "awaiting_checkout_email";
      await saveState(state);
      return "Qual o seu *melhor email* para enviarmos a confirmação do pagamento?";
    }
    return await processarFinalizacaoPedidoRulesBot(
      tenantId, contactNumber, state.data.chosenService,
      state.data.address, settings, stateKey,
      { ...state.data.collected, name: nome },
      state.data.originNodeText, nome
    );
  }

  if (state.step === "awaiting_checkout_email") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    const email = userMessage.trim().toLowerCase();
    if (!email.includes("@") || !email.includes(".")) return "Por favor, digite um email válido (ex: nome@email.com):";
    state.data.email = email;
    const nome = state.data.name || contactName;
    return await processarFinalizacaoPedidoRulesBot(
      tenantId, contactNumber, state.data.chosenService,
      state.data.address, settings, stateKey,
      { ...state.data.collected, name: nome, email },
      state.data.originNodeText, nome
    );
  }

  // Handle payment method selection for checkout
  if (state.step === "awaiting_payment_method") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    const paymentChoice = resolveChoiceIndex(cleanText, ["PIX", "Cartão de Crédito"]);
    let billingType = '';
    if (paymentChoice === 0 || cleanText.includes("pix")) {
      billingType = 'PIX';
    } else if (paymentChoice === 1 || cleanText.includes("cartao") || cleanText.includes("credito") || cleanText.includes("crédito") || cleanText.includes("card")) {
      billingType = 'CREDIT_CARD';
    } else {
      return "Opção inválida. Responda:\n\n1️⃣ *PIX* (pagamento instantâneo)\n2️⃣ *Cartão de Crédito* (link seguro)\n\nDigite *0* para voltar ao menu.\n\n---BUTTONS---\nPIX|1\nCartão de Crédito|2";
    }
    const chosenService = state.data.chosenService;
    const address = state.data.address;
    const collected = state.data.collected || {};
    collected.billingType = billingType;
    return await processarFinalizacaoPedidoRulesBot(
      tenantId, contactNumber, chosenService, address,
      settings, stateKey, collected,
      state.data.originNodeText, contactName
    );
  }

  // Check for pending debt / unpaid sale for this customer
  const phoneDigits = contactNumber.replace(/\D/g, "");
  const phoneFormats = [phoneDigits];
  if (phoneDigits.startsWith("55")) {
    phoneFormats.push(phoneDigits.slice(2));
  } else {
    phoneFormats.push("55" + phoneDigits);
  }
  const pendingSale = await prisma.sale.findFirst({
    where: {
      tenant_id: tenantId,
      status: "pending",
      OR: phoneFormats.map(pf => ({
        notes: { contains: `customer_phone:${pf}` }
      }))
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      product_name: true,
      amount: true,
      payment_link: true,
      payment_id: true,
      notes: true,
    }
  });

  const pendingPaymentPrompt = pendingSale
    ? `Olá! Existe um pagamento pendente para *${pendingSale.product_name}* no valor de *R$ ${pendingSale.amount.toFixed(2).replace(".", ",")}*.`
      + `\n\nEscolha como deseja continuar:\n\n1️⃣ *Pagar com PIX* — código no próprio WhatsApp\n2️⃣ *Pagar com Cartão* — checkout seguro\n3️⃣ *Cancelar cobrança*\n\n---BUTTONS---\nPagar com PIX|1\nPagar com Cartão|2\nCancelar cobrança|3`
    : "";

  if (pendingSale && state.step !== "debt_payment_method" && state.step !== "debt_paying") {
    state.step = "debt_payment_method";
    await saveState(state);
    return pendingPaymentPrompt;
  }

  // Converte conversas iniciadas pela versão anterior para a escolha de método.
  if (state.step === "debt_paying") {
    const debtChoice = resolveChoiceIndex(cleanText, ["Pagar Agora", "Ir para o Menu"]);
    if (debtChoice === 0 || cleanText.includes("sim") || cleanText.includes("pagar")) {
      state.step = "debt_payment_method";
      await saveState(state);
      return pendingPaymentPrompt;
    } else if (debtChoice === 1 || cleanText.includes("nao") || cleanText.includes("não") || cleanText === "menu" || cleanText === "voltar") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    } else {
      return `Por favor, responda com *1* para Pagar Agora ou *2* para ir para o Menu Principal.\n\n---BUTTONS---\nPagar Agora|1\nIr para o Menu|2`;
    }
  }

  if (state.step === "debt_payment_method") {
    if (!pendingSale) {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    const asaasKey = settings.asaas_api_key
      || settings.asaasApiKey
      || settings.asaas_test_api_key
      || settings.asaasTestApiKey
      || settings.asaas_environment_key;
    const asaasUrl = settings.asaas_mode === 'production'
      ? 'https://asaas.com/api/v3'
      : 'https://sandbox.asaas.com/api/v3';

    const debtPaymentChoice = resolveChoiceIndex(cleanText, ["Pagar com PIX", "Pagar com Cartão", "Cancelar cobrança"]);
    if (debtPaymentChoice === 0 || cleanText.includes("pix")) {
      if (!asaasKey || !pendingSale.payment_id) {
        return `Não foi possível gerar o PIX desta cobrança agora. Você pode tentar o cartão ou cancelar a cobrança.\n\n---BUTTONS---\nPagar com Cartão|2\nCancelar cobrança|3`;
      }

      const updatedPayment = await updatePayment(
        pendingSale.payment_id,
        { billingType: 'PIX' },
        asaasKey,
        asaasUrl,
      );
      if (updatedPayment.errors) {
        console.error("Erro ao alterar cobrança pendente para PIX:", updatedPayment.errors);
        return `Não consegui alterar esta cobrança para PIX. Tente novamente ou escolha outra opção.\n\n---BUTTONS---\nTentar PIX novamente|1\nPagar com Cartão|2\nCancelar cobrança|3`;
      }

      const pixData = await getPixQrCode(pendingSale.payment_id, asaasKey, asaasUrl);
      const pixCopy = typeof pixData.payload === 'string'
        ? pixData.payload
        : (pixData.payload?.payload || pixData.payload?.copyPaste || '');
      const encodedImage = typeof pixData.encodedImage === "string" ? pixData.encodedImage.trim() : "";

      if (!pixCopy) {
        console.error("Asaas não retornou o PIX copia e cola da cobrança:", pixData.errors || pixData);
        return `O gateway não retornou o código PIX. Você pode tentar novamente, usar cartão ou cancelar.\n\n---BUTTONS---\nTentar PIX novamente|1\nPagar com Cartão|2\nCancelar cobrança|3`;
      }

      const existingNotes = pendingSale.notes || `customer_phone:${phoneDigits}`;
      const notesWithoutOldPix = existingNotes.replace(/\s*\|\s*pix_key:[^|]*/gi, "").trim();
      await prisma.sale.update({
        where: { id: pendingSale.id },
        data: {
          payment_link: updatedPayment.invoiceUrl || pendingSale.payment_link,
          notes: `${notesWithoutOldPix} | pix_key:${pixCopy}`,
        },
      });

      const response = `✅ *PIX gerado no próprio WhatsApp*\n\n📦 *${pendingSale.product_name}*\n💰 *Valor:* R$ ${pendingSale.amount.toFixed(2).replace(".", ",")}\n\n🔑 *Pix Copia e Cola:*\n\`${pixCopy}\`\n\nAbra o aplicativo do seu banco, escolha *Pix Copia e Cola* e cole o código acima.\n\nSe escolheu errado, você pode trocar a forma ou cancelar:\n\n---BUTTONS---\nPagar com Cartão|2\nCancelar cobrança|3`;
      return encodedImage
        ? `${response}\n\n---IMAGE---\n${encodedImage.replace(/^data:image\/[^;]+;base64,/, "")}`
        : response;
    }

    if (debtPaymentChoice === 1 || cleanText.includes("cartao") || cleanText.includes("credito")) {
      let cardLink = pendingSale.payment_link || "";
      if (asaasKey && pendingSale.payment_id) {
        const updatedPayment = await updatePayment(
          pendingSale.payment_id,
          { billingType: 'CREDIT_CARD' },
          asaasKey,
          asaasUrl,
        );
        if (updatedPayment.errors) {
          console.error("Erro ao alterar cobrança pendente para cartão:", updatedPayment.errors);
          return `Não consegui alterar esta cobrança para cartão. Tente novamente ou escolha outra opção.\n\n---BUTTONS---\nPagar com PIX|1\nTentar Cartão novamente|2\nCancelar cobrança|3`;
        }
        cardLink = updatedPayment.invoiceUrl || cardLink;
        if (cardLink !== pendingSale.payment_link) {
          await prisma.sale.update({ where: { id: pendingSale.id }, data: { payment_link: cardLink } });
        }
      }

      if (!cardLink) {
        return `Não foi possível abrir o checkout do cartão. Escolha PIX ou cancele esta cobrança.\n\n---BUTTONS---\nPagar com PIX|1\nCancelar cobrança|3`;
      }

      return `💳 *Pagamento com Cartão de Crédito*\n\nPara preencher os dados do cartão com segurança, abra o checkout:\n🔗 ${cardLink}\n\nSe escolheu errado, você pode gerar o PIX ou cancelar:\n\n---BUTTONS---\nPagar com PIX|1\nCancelar cobrança|3`;
    }

    if (debtPaymentChoice === 2 || cleanText.includes("cancelar") || cleanText.includes("desistir")) {
      if (asaasKey && pendingSale.payment_id) {
        const canceledPayment = await cancelPayment(pendingSale.payment_id, asaasKey, asaasUrl);
        if (canceledPayment.errors) {
          console.error("Erro ao cancelar cobrança pendente no Asaas:", canceledPayment.errors);
          return `Não consegui cancelar a cobrança no gateway. Tente novamente em instantes ou escolha uma forma de pagamento.\n\n---BUTTONS---\nPagar com PIX|1\nPagar com Cartão|2\nTentar cancelar|3`;
        }
      }

      await prisma.sale.update({
        where: { id: pendingSale.id },
        data: { status: "canceled" },
      });
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return `❌ Cobrança de *${pendingSale.product_name}* cancelada.\n\nVocê pode escolher outro produto ou serviço:\n\n${getMainMenuMessage(settings)}`;
    }

    return pendingPaymentPrompt;
  }

  if (state.step.startsWith("collect_data:")) {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    const varName = state.data.collect_variable || "dado_coletado";
    // Initialize or get collected data array/object
    state.data.collected = state.data.collected || {};
    state.data.collected[varName] = userMessage.trim();

    const nodeId = state.step.replace("collect_data:", "");
    const hasChildren = customNodes.some((n: any) => n.parentId === nodeId);
    
    if (hasChildren) {
      state.step = `submenu:${nodeId}`;
      await saveState(state);
      const currentNode = customNodes.find((n: any) => n.id === nodeId);
      return `✅ Registrado!\n\n${getSubmenuMessage(currentNode, customNodes)}`;
    } else {
      state.step = "main_menu";
      await saveState(state);
      return `✅ Registrado!\n\n${getMainMenuMessage(settings)}`;
    }
  }

  // Handle "voltar" navigation
  if (["0", "voltar", "menu", "inicio", "olá", "ola", "oi", "bom dia", "boa tarde", "boa noite"].includes(cleanText)) {
    if (state.step === "main_menu") {
      if (state.data.menu_sent) {
        return "Já te mandei as opções acima! Digite *1*, *2*, *3* ou *4* para continuar, ou *0* para voltar.";
      }
      state.data.menu_sent = true;
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    if (state.step.startsWith("submenu:")) {
      const currentSubmenuId = state.step.replace("submenu:", "");
      const currentNode = customNodes.find((n: any) => n.id === currentSubmenuId);
      
      if (currentNode && currentNode.parentId) {
        state.step = `submenu:${currentNode.parentId}`;
        await saveState(state);
        
        const parentNode = customNodes.find((n: any) => n.id === currentNode.parentId);
        return getSubmenuMessage(parentNode, customNodes);
      } else {
        state.step = "main_menu";
        await saveState(state);
        return getMainMenuMessage(settings);
      }
    }

    // Default fallback: reset to main menu
    state = { step: "main_menu", data: {} };
    await saveState(state);
    return getMainMenuMessage(settings);
  }

  // Handle "atendente" transition natively
  const hasConfiguredOptionFour = customNodes.some((node: any) => !node.parentId && String(node.keyword || "").trim() === "4")
    || (settings.products || []).length >= 4;
  if (["atendente", "falar com atendente", "humano", "suporte", "chamar atendente"].includes(cleanText)
    || (cleanText === "4" && state.step === "main_menu" && !hasConfiguredOptionFour)) {
    await prisma.conversation.updateMany({
      where: conversationId
        ? { id: conversationId, tenant_id: tenantId }
        : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
      data: { ai_paused: true }
    });
    return "Aguarde um momento, estou transferindo você para um de nossos especialistas. Logo você será atendido! 🧑‍💻";
  }

  // Handle viewing appointments natively
  if (["ver agendamentos", "meus agendamentos", "agendamentos"].includes(cleanText) && state.step === "main_menu") {
    // Se for o dono do sistema, mostra TODOS os agendamentos
    if (isMessageToMyself) {
      const allAppointments = await prisma.appointment.findMany({
        where: { tenant_id: tenantId },
        include: { lead: { select: { name: true, phone: true } } },
        orderBy: { scheduled_at: "asc" },
      });

      if (allAppointments.length === 0) {
        return `📅 Nenhum agendamento cadastrado no sistema.\n\n${getMainMenuMessage(settings)}`;
      }

      let response = `📅 *Todos os Agendamentos (${allAppointments.length}):*\n\n`;
      allAppointments.forEach((app, idx) => {
        const dateFormatted = app.scheduled_at.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const timeFormatted = app.scheduled_at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
        const statusEmoji: Record<string, string> = { scheduled: "📌", confirmed: "✅", completed: "✔️", cancelled: "❌", no_show: "🚫" };
        const emoji = statusEmoji[app.status] || "📌";
        const cliente = app.lead?.name || "Sem cadastro";
        response += `${emoji} *${app.service_name}*\n   📅 ${dateFormatted} às ${timeFormatted}\n   👤 ${cliente}\n   📋 ${app.status}\n\n`;
      });
      response += `Digite *0* para voltar ao menu principal.`;
      return response;
    }

    // Cliente comum: mostra apenas agendamentos próprios
    const myAppointments = await prisma.appointment.findMany({
      where: {
        tenant_id: tenantId,
        notes: {
          contains: `customer_phone:${contactNumber}`
        },
        scheduled_at: {
          gte: new Date()
        }
      },
      orderBy: {
        scheduled_at: "asc"
      }
    });

    if (myAppointments.length === 0) {
      return `🔍 Você não possui agendamentos futuros cadastrados.\n\n${getMainMenuMessage(settings)}`;
    }

    let response = "📅 *Seus Agendamentos:*\n\n";
    myAppointments.forEach((app, idx) => {
      const dateFormatted = app.scheduled_at.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const timeFormatted = app.scheduled_at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      response += `${idx + 1}️⃣ *${app.service_name}*\n📅 Data: ${dateFormatted}\n🕒 Horário: ${timeFormatted}\n\n`;
    });
    response += `Digite *0* para voltar ao menu principal.`;
    return response;
  }

  // Handle Catalog Purchase selection
  if (state.step === "catalog_select_product") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      const collected = state.data.collected;
      state = { step: "main_menu", data: collected ? { collected } : {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    let optionIdx = /^\d+$/.test(cleanText) ? Number(cleanText) - 1 : -1;

    // Check if catalog used product nodes from workflow
    const productNodeIds = state.data._productNodes as string[] | undefined;
    if (productNodeIds && productNodeIds.length > 0) {
      if (optionIdx < 0) {
        optionIdx = resolveChoiceIndex(cleanText, productNodeIds.map((id) => {
          const node = customNodes.find((candidate: any) => candidate.id === id);
          const product = resolveProductFromNode(settings.products || [], node);
          return String(product?.name || node?.title || "");
        }));
      }
      // Redirect to the selected product node
      if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= productNodeIds.length) {
        return "❌ Opção inválida. Digite o número correspondente ao produto desejado, ou *0* para voltar ao menu.";
      }
      const selectedProductNodeId = productNodeIds[optionIdx];
      const selectedProductNode = customNodes.find((n: any) => n.id === selectedProductNodeId);
      if (!selectedProductNode) {
        return "❌ Erro: produto não encontrado no fluxo.";
      }
      // Transition to product node's submenu
      const hasChildren = customNodes.some((n: any) => n.parentId === selectedProductNode.id);
      state.step = hasChildren ? `submenu:${selectedProductNode.id}` : "main_menu";
      state.data = { ...state.data };
      await saveState(state);

      // Show product info
      const prod = resolveProductFromNode(settings.products || [], selectedProductNode);
      let msg = `Você selecionou: *${selectedProductNode.title}*\n\n`;
      if (prod) {
        if (prod.description) msg += `${prod.description}\n\n`;
        msg += `Valor: R$ ${prod.price}\n\n`;
        if (prod.image_url && prod.send_photo !== false) msg += `${prod.image_url}\n\n`;
      }
      if (hasChildren) {
        msg += getSubmenuMessage(selectedProductNode, customNodes);
      } else {
        msg += "✅ Opção registrada.";
      }
      return msg;
    }

    // Fallback: original hardcoded product flow
    const productsList = settings.products || [];
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= productsList.length) {
      return "❌ Opção inválida. Digite o número correspondente ao produto/serviço que deseja contratar/comprar, ou *0* para voltar ao menu.";
    }
    const chosenService = productsList[optionIdx];
    // Verifica estoque
    if (chosenService.stock !== undefined && chosenService.stock !== null && chosenService.stock <= 0) {
      return `❌ *${chosenService.name}* está esgotado no momento. Digite *0* para voltar ao menu.`;
    }
    
    await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});

    let response = `Você selecionou: *${chosenService.name}*\n`;
    if (chosenService.description) response += `${chosenService.description}\n\n`;
    response += `Valor: R$ ${chosenService.price}\n\n`;
    
    // Adicionar imagem, se existir e estiver habilitada, para que o queue processor envie como mídia
    if (chosenService.image_url && chosenService.send_photo !== false) {
      response += `${chosenService.image_url}\n\n`;
    }

    // Determinar o tipo de produto/entrega
    const deliveryType = chosenService.delivery_type || "virtual_instant";
    const deadline = chosenService.delivery_deadline || "imediato";
    
    state.data = {
      chosenService,
      chosenNodeText: null,
    };

    if (deliveryType === "virtual_instant") {
      const addr = botMessageTemplates.labels.digitalImmediate();
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(
        tenantId,
        contactNumber,
        chosenService,
        addr,
        settings,
        stateKey,
        state.data.collected,
        state.data.chosenNodeText,
        contactName
      );
    } else if (deliveryType === "virtual_deadline") {
      const addr = botMessageTemplates.labels.bothDigital(deadline);
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(
        tenantId,
        contactNumber,
        chosenService,
        addr,
        settings,
        stateKey,
        state.data.collected,
        state.data.chosenNodeText,
        contactName
      );
    } else if (deliveryType === "both") {
      state.step = "catalog_select_both_methods";
      await saveState(state);
      return appendInteractiveOptions(botMessageTemplates.catalog.bothMethods(chosenService, { deadline }), [
        { label: "Envio Digital", value: "1" },
        { label: "Entrega Física", value: "2" },
      ]);
    } else {
      // Default: physical
      state.step = "catalog_select_delivery_method";
      await saveState(state);
      return appendInteractiveOptions(botMessageTemplates.catalog.deliveryOrPickup(chosenService), [
        { label: "Entrega", value: "1" },
        { label: "Retirada", value: "2" },
      ]);
    }
  }

  if (state.step === "catalog_select_both_methods") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    const methodChoice = resolveChoiceIndex(cleanText, ["Envio Digital", "Entrega Física"]);
    if (methodChoice < 0 || methodChoice > 1) {
      return botMessageTemplates.errors.invalidBothMethodsChoice();
    }

    const chosenService = state.data.chosenService;
    const deadline = chosenService.delivery_deadline || "imediato";

    if (methodChoice === 0) {
      const addr = botMessageTemplates.labels.bothDigital(deadline);
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(
        tenantId,
        contactNumber,
        chosenService,
        addr,
        settings,
        stateKey,
        state.data.collected,
        state.data.chosenNodeText,
        contactName
      );
    } else {
      state.step = "catalog_input_address";
      await saveState(state);
      return botMessageTemplates.prompts.requestAddress();
    }
  }

  if (state.step === "catalog_select_delivery_method") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }

    const deliveryChoice = resolveChoiceIndex(cleanText, ["Entrega", "Retirada"]);
    if (deliveryChoice < 0 || deliveryChoice > 1) {
      return botMessageTemplates.errors.invalidDeliveryChoice();
    }

    if (deliveryChoice === 0) {
      state.step = "catalog_input_address";
      await saveState(state);
      return botMessageTemplates.prompts.requestAddress();
    } else {
      const addr = botMessageTemplates.labels.pickup();
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(
        tenantId,
        contactNumber,
        state.data.chosenService,
        addr,
        settings,
        stateKey,
        state.data.collected,
        state.data.chosenNodeText,
        contactName
      );
    }
  }

  if (state.step === "catalog_input_address") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    const address = userMessage.trim();
    return await processarFinalizacaoPedidoRulesBot(
      tenantId,
      contactNumber,
      state.data.chosenService,
      address,
      settings,
      stateKey,
      state.data.collected,
      state.data.chosenNodeText,
      contactName
    );
  }

  // Handle Scheduling steps
  if (state.step === "scheduling_select_service") {
    const servicesList = getSchedulableProducts(settings.products || []);
    const optionIdx = resolveChoiceIndex(cleanText, servicesList.map((service) => String(service.name || "")));
    if (servicesList.length === 0) {
      return "📋 Não há serviços configurados para agendamento no momento. Digite *0* para cancelar ou *menu* para voltar.";
    }

    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= servicesList.length) {
      return "❌ Opção inválida. Envie o número do serviço desejado ou *0* para cancelar.";
    }
    const chosenService = servicesList[optionIdx];
    const availableDates = obterProximosDiasDisponiveis(settings);

    state.step = "scheduling_select_date";
    const availableDateLabels = availableDates.map(formatSchedulingDateLabel);
    state.data = {
      serviceName: chosenService.name,
      servicePrice: chosenService.price,
      servicePriceLabel: getProductPriceLabel(chosenService),
      duration: chosenService.duration_min || 60,
      availableDates: availableDates.map(d => d.toISOString()),
      availableDateLabels,
    };
    await saveState(state);

    const selectedServicePrice = getProductPriceLabel(chosenService) || "Preço não informado";
    let response = `Você selecionou *${chosenService.name}* (${selectedServicePrice}).\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
    const dateOptions: Array<{ label: string; value: string }> = [];
    availableDates.forEach((d, idx) => {
      const label = availableDateLabels[idx];
      response += `${idx + 1}️⃣ ${label}\n`;
      dateOptions.push({ label, value: String(idx + 1) });
    });
    response += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
    return appendInteractiveOptions(response, dateOptions);
  }

  if (state.step === "scheduling_select_date") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    
    const availableDates = state.data.availableDates || [];
    const storedDateLabels = Array.isArray(state.data.availableDateLabels)
      && state.data.availableDateLabels.length === availableDates.length
      ? state.data.availableDateLabels.map(String)
      : availableDates.map((value: string) => formatSchedulingDateLabel(new Date(value)));
    const optionIdx = resolveChoiceIndex(cleanText, storedDateLabels);
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= availableDates.length) {
      return `❌ Opção inválida. Digite o número correspondente à data desejada (1-${availableDates.length}) ou *0* para voltar:`;
    }

    const chosenDate = new Date(availableDates[optionIdx]);
    const chosenDateParts = getZonedDateTimeParts(chosenDate);
    const dateFormatted = `${String(chosenDateParts.day).padStart(2, "0")}/${String(chosenDateParts.month).padStart(2, "0")}`;
    
    // Check available periods
    const allSlots = await getAvailableSlots(tenantId, chosenDate, state.data.duration || 60, settings);
    const hasMorning = allSlots.some(s => parseInt(s.split(":")[0], 10) < 12);
    const hasAfternoon = allSlots.some(s => parseInt(s.split(":")[0], 10) >= 12);

    if (!hasMorning && !hasAfternoon) {
       return `❌ Não há horários disponíveis para o dia ${dateFormatted}. Por favor, escolha outra data (1-${availableDates.length}) ou digite 0 para voltar ao menu principal:`;
    }

    state.data.date = dateFormatted;
    state.data.parsedDate = chosenDate.toISOString();
    state.step = "scheduling_select_period";
    await saveState(state);
    
    let periodMsg = `Data definida: *${dateFormatted}*.\n\nEscolha o período desejado:\n`;
    const periodOptions: Array<{ label: string; value: string }> = [];
    if (hasMorning) {
      periodMsg += `1️⃣ Manhã\n`;
      periodOptions.push({ label: "Manhã", value: "1" });
    }
    if (hasAfternoon) {
      periodMsg += `2️⃣ Tarde\n`;
      periodOptions.push({ label: "Tarde", value: "2" });
    }
    periodMsg += `\nDigite o número da opção ou *0* para voltar.`;
    return appendInteractiveOptions(periodMsg, periodOptions);
  }

  if (state.step === "scheduling_select_period") {
    const periodChoice = resolveChoiceIndex(cleanText, ["Manhã", "Tarde"]);
    if (periodChoice < 0 || periodChoice > 1) {
      return "❌ Opção inválida. Digite *1* para Manhã ou *2* para Tarde:";
    }

    const parsedDate = new Date(state.data.parsedDate);
    const slots = await getAvailableSlots(tenantId, parsedDate, state.data.duration || 60, settings);
    
    const isMorning = periodChoice === 0;
    const filteredSlots = slots.filter(s => {
      const hour = parseInt(s.split(":")[0], 10);
      return isMorning ? hour < 12 : hour >= 12;
    });

    if (filteredSlots.length === 0) {
      state.step = "scheduling_select_date";
      await saveState(state);
      
      const availableDates = state.data.availableDates.map((d: string) => new Date(d));
      let errorResponse = `❌ Ocorreu um erro e o período selecionado não possui horários disponíveis.\n\n📅 Escolha outra data:\n\n`;
      availableDates.forEach((d: Date, idx: number) => {
        errorResponse += `${idx + 1}️⃣ ${formatSchedulingDateLabel(d)}\n`;
      });
      errorResponse += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para cancelar:`;
      return appendInteractiveOptions(errorResponse, availableDates.map((d: Date, idx: number) => {
        return { label: formatSchedulingDateLabel(d), value: String(idx + 1) };
      }));
    }

    state.data.period = isMorning ? "manha" : "tarde";
    state.data.availableSlots = filteredSlots;
    state.step = "scheduling_select_time";
    await saveState(state);

    let response = `🕒 *Horários disponíveis (${isMorning ? 'Manhã' : 'Tarde'}):*\n\n`;
    filteredSlots.forEach((s, idx) => {
      response += `${idx + 1}️⃣ ${s}\n`;
    });
    response += `\nDigite o número do horário desejado ou *0* para voltar.`;
    return appendInteractiveOptions(response, filteredSlots.map((slot, idx) => ({
      label: slot,
      value: String(idx + 1),
    })));
  }

  if (state.step === "scheduling_select_time") {
    const availableSlots = state.data.availableSlots || [];
    const optionIdx = resolveChoiceIndex(cleanText, availableSlots.map(String));
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= availableSlots.length) {
      return "❌ Opção inválida. Digite o número correspondente ao horário desejado:";
    }

    const chosenTime = availableSlots[optionIdx];
    state.step = "scheduling_confirm";
    state.data.time = chosenTime;
    await saveState(state);
    
    let confirmMsg = `✍️ *Por favor, confirme seus dados:*\n\n`;
    confirmMsg += `🛠 *Serviço:* ${state.data.serviceName}\n`;
    confirmMsg += `💰 *Valor:* ${state.data.servicePriceLabel || formatBRL(state.data.servicePrice) || "Preço não informado"}\n`;
    confirmMsg += `📅 *Data:* ${state.data.date}\n`;
    confirmMsg += `🕒 *Horário:* ${state.data.time}\n\n`;
    confirmMsg += `---BUTTONS---\nConfirmar|1\nCancelar|2`;
    return confirmMsg;
  }

  if (state.step === "scheduling_confirm") {
    const confirmationChoice = cleanText === "sim"
      ? 0
      : cleanText === "nao" || cleanText === "não"
        ? 1
        : resolveChoiceIndex(cleanText, ["Confirmar", "Cancelar"]);
    if (confirmationChoice < 0 || confirmationChoice > 1) {
      return "❌ Opção inválida. Escolha *Confirmar* ou *Cancelar*.";
    }
    if (confirmationChoice === 0) {
      const stateDate = String(state.data.date || "");
      const stateTime = String(state.data.time || "");
      if (!stateDate || !stateTime) {
        state = { step: "main_menu", data: {} };
        await saveState(state);
        return "⚠️ Não foi possível validar o horário selecionado. Digite *agendar* no menu para iniciar novamente.";
      }

      const parsedDate = parseDateAndTime(stateDate, stateTime);
      if (!parsedDate) {
        state = { step: "main_menu", data: {} };
        await saveState(state);
        return "⚠️ Não foi possível validar o horário selecionado. Digite *agendar* no menu para iniciar novamente.";
      }

      const durationMin = Number(state.data.duration || 60);
      const startDateTime = parsedDate;
      const availableNow = await isSlotAvailable(tenantId, startDateTime, durationMin);
      if (!availableNow) {
        const selectedDate = parseDateOnly(stateDate) || new Date(state.data.parsedDate || parsedDate);
        const allSlots = await getAvailableSlots(tenantId, selectedDate, durationMin, settings);
        const selectedPeriod = state.data.period;
        const periodLabel = selectedPeriod === "tarde" ? "Tarde" : "Manhã";
        const periodSlots = allSlots.filter((slot) => {
          const hour = parseInt(slot.split(":")[0], 10);
          const isMorning = selectedPeriod === "manha";
          return selectedPeriod ? (isMorning ? hour < 12 : hour >= 12) : true;
        });
        const availableSlots = periodSlots.length > 0 ? periodSlots : allSlots;
        const label = selectedPeriod ? `${periodLabel}` : "Dia inteiro";

        if (!availableSlots.length) {
          state.step = "scheduling_select_date";
          state.data.availableSlots = [];
          state.data.time = undefined;
          state.data.period = undefined;
          await saveState(state);
          return `❌ O horário ${stateTime} foi ocupado no momento. Não há mais horários disponíveis para ${stateDate}. Escolha outra data ou digite *0* para cancelar.`;
        }

        state.step = "scheduling_select_time";
        state.data.availableSlots = availableSlots;
        state.data.time = undefined;
        await saveState(state);

        let response = `⚠️ O horário escolhido foi reservado antes da confirmação. Seguem os horários atualizados para *${stateDate}* (${label}):\n\n`;
        availableSlots.forEach((slot, idx) => {
          response += `${idx + 1}️⃣ ${slot}\n`;
        });
        response += `\nDigite o número do novo horário desejado ou *0* para voltar.`;
        return appendInteractiveOptions(response, availableSlots.map((slot, idx) => ({
          label: slot,
          value: String(idx + 1),
        })));
      }
      
      let extraNotes = "";
      if (state.data.collected && Object.keys(state.data.collected).length > 0) {
        extraNotes = " | Dados Coletados: " + Object.entries(state.data.collected).map(([k, v]) => `${k}=${v}`).join(", ");
      }

        const normalizedContact = normalizePhone(contactNumber);
        const lead = await prisma.lead.findFirst({
          where: getLeadLookupWhereClause(tenantId, normalizedContact || contactNumber),
        }) || await prisma.lead.create({
          data: {
            tenant_id: tenantId,
            phone: normalizedContact || contactNumber,
            name: normalizedContact || contactNumber,
            status: 'NEW'
          }
        });

        await prisma.appointment.create({
          data: {
            tenant_id: tenantId,
            lead_id: lead.id,
            service_name: state.data.serviceName,
            service_price: Number(state.data.servicePrice) || null,
            duration_min: durationMin,
            scheduled_at: startDateTime,
            status: "scheduled",
            notes: `customer_phone:${normalizedContact || contactNumber} | RulesBot Booking${extraNotes}`
          }
        });
      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      return `🎉 *Agendamento confirmado com sucesso!*\n\nSeu horário para *${state.data.serviceName}* está marcado para o dia *${state.data.date}* às *${state.data.time}*.\n💰 *Valor:* ${state.data.servicePriceLabel || formatBRL(state.data.servicePrice) || "Preço não informado"}\n\nObrigado!`;
    }
    state = { step: "main_menu", data: {} };
    await saveState(state);
    return `❌ Agendamento cancelado.\n\n${getMainMenuMessage(settings)}`;
  }

  // 2. Resolve nodes based on active level (Main Menu vs. Submenu)
  let activeLevelNodes = [];
  if (state.step === "main_menu") {
    activeLevelNodes = customNodes.filter((node: any) => !node.parentId);
  } else if (state.step.startsWith("submenu:")) {
    const currentSubmenuId = state.step.replace("submenu:", "");
    activeLevelNodes = customNodes.filter((node: any) => node.parentId === currentSubmenuId);
  }

  const productsList = settings.products || [];
  const optionIdx = resolveChoiceIndex(cleanText, productsList.map((product: any) => String(product?.name || "")));

  // Match keyword in the active level
  if (activeLevelNodes.length > 0) {
    const exactMatchedNode = activeLevelNodes.find((node: any) => {
      const cleanKeyword = normalizeTextForLookup(node.keyword);
      const cleanTitle = normalizeTextForLookup(node.title);
      return cleanText === cleanKeyword || cleanText === cleanTitle;
    });
    const matchedNode = exactMatchedNode || [...activeLevelNodes]
      .sort((left: any, right: any) => String(right.keyword || "").length - String(left.keyword || "").length)
      .find((node: any) => {
        const cleanKeyword = normalizeTextForLookup(node.keyword);
        return Boolean(cleanKeyword)
          && !/^\d+$/.test(cleanKeyword)
          && cleanText.includes(cleanKeyword);
      });

    if (matchedNode) {
      const hasChildren = customNodes.some((n: any) => n.parentId === matchedNode.id);
      const nodeText = renderCollectedVariables(matchedNode.textContent, state.data.collected);
      let response = "";

      if (matchedNode.actionType === "catalog") {
        // Check if catalog node has child product nodes
        const productNodes = customNodes.filter((n: any) => n.parentId === matchedNode.id && n.actionType === 'product');
        
        if (productNodes.length > 0) {
          response = nodeText.trim()
            ? `${nodeText.trim()}\n\n`
            : "📋 *Nossos Serviços e Preços:*\n\n";
          productNodes.forEach((pn: any, idx: number) => {
            const prod = resolveProductFromNode(settings.products || [], pn);
            if (prod) {
              const displayPrice = getProductDisplayPrice(prod);
              response += `${idx + 1}️⃣ *${prod.name}* - R$ ${displayPrice}\n`;
              if (prod.description) response += `   _${prod.description}_\n\n`;
            } else {
              response += `${idx + 1}️⃣ *${pn.title}*\n\n`;
            }
          });
          response += "✍️ Se deseja contratar ou comprar algum destes serviços/produtos, responda enviando o número dele (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";
          state.step = "catalog_select_product";
          state.data._productNodes = productNodes.map((n: any) => n.id);
          await saveState(state);
          return appendInteractiveOptions(response, productNodes.flatMap((node: any, idx: number) => {
            if (node.showInPoll === false) return [];
            const product = resolveProductFromNode(settings.products || [], node);
            return [{
              label: product
                ? `${product.name} - R$ ${getProductDisplayPrice(product)}`
                : node.title,
              value: String(idx + 1),
            }];
          }));
        } else {
          // Fallback: show all products from settings (original behavior)
          const productsList = settings.products || [];
          if (productsList.length === 0) {
            response = "📋 No momento não temos serviços cadastrados no catálogo.";
          } else {
            response = nodeText.trim()
              ? `${nodeText.trim()}\n\n`
              : "📋 *Nossos Serviços e Preços:*\n\n";
            productsList.forEach((p: any, idx: number) => {
              const displayPrice = p.type === 'plan' || p.monthly ? `${p.monthly || p.price}/mês` : `${p.price}`;
              response += `${idx + 1}️⃣ *${p.name}* - R$ ${displayPrice}\n`;
              if (p.description) response += `   _${p.description}_\n\n`;
              else response += `\n`;
            });
            response += "✍️ Se deseja contratar ou comprar algum destes serviços/produtos, responda enviando o número dele (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";
            state.step = "catalog_select_product";
            await saveState(state);
            return appendInteractiveOptions(response, productsList.map((product: any, idx: number) => ({
              label: `${product.name} - R$ ${getProductDisplayPrice(product)}`,
              value: String(idx + 1),
            })));
          }
        }
        return response;
      }
      else if (matchedNode.actionType === "scheduling") {
        const servicesList = getSchedulableProducts(settings.products || []);
        if (servicesList.length === 0) {
          return "📋 No momento não temos serviços disponíveis para agendamento. Digite *voltar* para retornar.";
        }
        
        let response = nodeText.trim()
          ? `${nodeText.trim()}\n\n`
          : `📅 *Iniciar Agendamento*\nSelecione o serviço que deseja agendar:\n\n`;
        servicesList.forEach((p: any, idx: number) => {
          const displayPrice = p.type === 'plan' || p.monthly ? `${p.monthly || p.price}/mês` : `${p.price}`;
          response += `${idx + 1}️⃣ ${p.name} (R$ ${displayPrice})\n`;
        });
        response += "\nDigite o número do serviço ou *voltar* para cancelar.";
        
        state.step = "scheduling_select_service";
        await saveState(state);
        return appendInteractiveOptions(response, servicesList.map((service: any, idx: number) => ({
          label: `${service.name} - ${getProductPriceLabel(service) || "Preço não informado"}`,
          value: String(idx + 1),
        })));
      }
      else if (matchedNode.actionType === "human") {
        await prisma.conversation.updateMany({
          where: conversationId
            ? { id: conversationId, tenant_id: tenantId }
            : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
          data: { ai_paused: true }
        });
        
        if (settings.manager_phone) {
          const whatsappInstance = await prisma.whatsappInstance.findFirst({
            where: { tenant_id: tenantId }
          });
          if (whatsappInstance) {
            console.log(`Alertando gerente no número ${settings.manager_phone} sobre intervenção humana para ${contactNumber}`);
          }
        }
        return nodeText || "";
      }
      else if (matchedNode.actionType === "collect_data") {
        state.step = `collect_data:${matchedNode.id}`;
        state.data.collect_variable = matchedNode.variableName || "dado_coletado";
        await saveState(state);
        return nodeText || "Por favor, digite a informação solicitada:";
      }
      else if (matchedNode.actionType === "product") {
        const prod = resolveProductFromNode(settings.products || [], matchedNode);
        const customProductText = nodeText.trim();
        if (!prod) {
          response = customProductText || `📦 *${matchedNode.title}*`;
        } else {
          const displayPrice = getProductDisplayPrice(prod);
          response = customProductText ? `${customProductText}\n\n` : "";
          response += `📦 *${prod.name}* - R$ ${displayPrice}\n\n`;
          if (prod.description) response += `${prod.description}\n\n`;
          if (prod.image_url && prod.send_photo !== false) response += `${prod.image_url}\n\n`;
        }
        // Product node with children transitions to submenu (children define the flow)
        if (hasChildren) {
          state.step = `submenu:${matchedNode.id}`;
          await saveState(state);
          if (response) response += "\n\n";
          response += getSubmenuMessage(matchedNode, customNodes);
          return response;
        }
        // No children: just show product info
      }
      else if (matchedNode.actionType === "checkout") {
        const productsList = settings.products || [];
        const chosen = resolveProductFromNode(productsList, matchedNode);
        if (!chosen) {
          return "❌ Erro: Produto não encontrado no sistema.";
        }
        // Verifica estoque
        if (chosen.stock !== undefined && chosen.stock !== null && chosen.stock <= 0) {
          return `❌ *${chosen.name}* está esgotado no momento. Digite *0* para voltar.`;
        }
        
        const collectedData = { ...(state.data.collected || {}) };
        if (matchedNode.paymentMode === "pix") collectedData.billingType = "PIX";
        if (matchedNode.paymentMode === "link") collectedData.billingType = "CREDIT_CARD";
        
        if (isSchedulableProduct(chosen)) {
          const availableDates = obterProximosDiasDisponiveis(settings);
          state.step = "scheduling_select_date";
          const availableDateLabels = availableDates.map(formatSchedulingDateLabel);
          state.data = {
            serviceName: chosen.name, servicePrice: chosen.price, servicePriceLabel: getProductPriceLabel(chosen),
            duration: chosen.duration_min || 60,
            availableDates: availableDates.map((d: Date) => d.toISOString()),
            availableDateLabels,
            collected: collectedData
          };
          await saveState(state);
          let resp = `Você selecionou *${chosen.name}*.\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
          availableDates.forEach((d: Date, idx: number) => {
            resp += `${idx + 1}️⃣ ${availableDateLabels[idx]}\n`;
          });
          resp += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
          return appendInteractiveOptions(resp, availableDates.map((d: Date, idx: number) => {
            return { label: availableDateLabels[idx], value: String(idx + 1) };
          }));
        }

        // Para outros tipos, inicia fluxo de compra
        state.step = "catalog_select_product";
        state.data = {
          chosenService: chosen,
          collected: collectedData,
          chosenNodeText: nodeText,
        };
        
        const deliveryType = chosen.delivery_type || "virtual_instant";
        const deadline = chosen.delivery_deadline || "imediato";

        if (deliveryType === "virtual_instant") {
          const addr = botMessageTemplates.labels.digitalImmediate();
          state.data.address = addr;
          await saveState(state);
          return await processarFinalizacaoPedidoRulesBot(
            tenantId,
            contactNumber,
            chosen,
            addr,
            settings,
            stateKey,
            collectedData,
            nodeText,
            contactName
          );
        } else if (deliveryType === "virtual_deadline") {
          const addr = botMessageTemplates.labels.bothDigital(deadline);
          state.data.address = addr;
          await saveState(state);
          return await processarFinalizacaoPedidoRulesBot(
            tenantId,
            contactNumber,
            chosen,
            addr,
            settings,
            stateKey,
            collectedData,
            nodeText,
            contactName
          );
        } else if (deliveryType === "both") {
          state.step = "catalog_select_both_methods";
          await saveState(state);
          return appendInteractiveOptions(botMessageTemplates.catalog.bothMethods(chosen, { deadline }), [
            { label: "Envio Digital", value: "1" },
            { label: "Entrega Física", value: "2" },
          ]);
        } else {
          state.step = "catalog_select_delivery_method";
          await saveState(state);
          return appendInteractiveOptions(botMessageTemplates.catalog.deliveryOrPickup(chosen), [
            { label: "Entrega", value: "1" },
            { label: "Retirada", value: "2" },
          ]);
        }
      } else {
        // default text / submenu Presentation text
        response = nodeText || "";
      }

      // If this option matched has further derivations (children submenus), transition to submenu step and list them
      if (hasChildren) {
        state.step = `submenu:${matchedNode.id}`;
        await saveState(state);
        
        if (response) response += "\n\n";
        response += getSubmenuMessage(matchedNode, customNodes);
        return response;
      }

      return response || "Opção registrada.";
    }
  }

  // Fallback: tenta match por número do produto (no menu principal)
  if (state.step === "main_menu") {
    if (!isNaN(optionIdx) && optionIdx >= 0 && optionIdx < productsList.length) {
      const chosen = productsList[optionIdx];
      // Verifica estoque
      if (chosen.stock !== undefined && chosen.stock !== null && chosen.stock <= 0) {
        return `❌ *${chosen.name}* está esgotado no momento. Digite *0* para voltar ao menu principal.`;
      }
      // Se for serviço com agendamento, vai pra etapa de agendar
      if (isSchedulableProduct(chosen)) {
        const availableDates = obterProximosDiasDisponiveis(settings);
        state.step = "scheduling_select_date";
        const availableDateLabels = availableDates.map(formatSchedulingDateLabel);
        state.data = {
          serviceName: chosen.name, servicePrice: chosen.price, servicePriceLabel: getProductPriceLabel(chosen),
          duration: chosen.duration_min || 60,
          availableDates: availableDates.map((d: Date) => d.toISOString()),
          availableDateLabels,
        };
        await saveState(state);
        let resp = `Você selecionou *${chosen.name}*.\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
        availableDates.forEach((d: Date, idx: number) => {
          resp += `${idx + 1}️⃣ ${availableDateLabels[idx]}\n`;
        });
        resp += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
        return appendInteractiveOptions(resp, availableDates.map((d: Date, idx: number) => {
          return { label: availableDateLabels[idx], value: String(idx + 1) };
        }));
      }
      // Para outros tipos, inicia fluxo de compra
      const collectedData = state.data.collected || {};
      state.step = "catalog_select_product";
      state.data = {
        collected: collectedData,
        chosenNodeText: null,
      };
      await saveState(state);
      // Redireciona simulando que entrou no catálogo
      const deliveryType = chosen.delivery_type || "virtual_instant";
      const deadline = chosen.delivery_deadline || "imediato";
      state.data.chosenService = chosen;
      if (deliveryType === "virtual_instant") {
        const addr = botMessageTemplates.labels.digitalImmediate();
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(
          tenantId,
          contactNumber,
          chosen,
          addr,
          settings,
          stateKey,
          state.data.collected,
          state.data.chosenNodeText,
          contactName
        );
      } else if (deliveryType === "virtual_deadline") {
        const addr = botMessageTemplates.labels.bothDigital(deadline);
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(
          tenantId,
          contactNumber,
          chosen,
          addr,
          settings,
          stateKey,
          state.data.collected,
          state.data.chosenNodeText,
          contactName
        );
      } else if (deliveryType === "both") {
        state.step = "catalog_select_both_methods";
        await saveState(state);
        return appendInteractiveOptions(botMessageTemplates.catalog.bothMethods(chosen, { deadline }), [
          { label: "Envio Digital", value: "1" },
          { label: "Entrega Física", value: "2" },
        ]);
      } else {
        state.step = "catalog_select_delivery_method";
        await saveState(state);
        return appendInteractiveOptions(botMessageTemplates.catalog.deliveryOrPickup(chosen), [
          { label: "Entrega", value: "1" },
          { label: "Retirada", value: "2" },
        ]);
      }
    }
  }

  // Keyword unmatched fallback
  const errorCount = (state.errorCount || 0) + 1;
  state.errorCount = errorCount;
  
  if (errorCount >= 3) {
    // Falhou 3 vezes consecutivas. Pausa a IA e transfere para humano.
    await prisma.conversation.updateMany({
      where: conversationId
        ? { id: conversationId, tenant_id: tenantId }
        : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
      data: { ai_paused: true }
    });
    await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
    return "Parece que você está com dificuldade ou é um atendimento automatizado. Estou te transferindo para um atendente humano para te ajudar melhor! Aguarde um momento.";
  }
  
  await saveState(state);

  if (state.step === "main_menu") {
    // Primeira mensagem não reconhecida: mostra menu sem o prefixo de erro
    // (importante para clientes que vêm do site com "Olá! Vim pelo site...")
    if (errorCount === 1) {
      state.data.menu_sent = true;
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    return `Desculpe, não entendi. Selecione uma opção válida:\n\n${getMainMenuMessage(settings)}`;
  } else if (state.step.startsWith("submenu:")) {
    const currentSubmenuId = state.step.replace("submenu:", "");
    const parentNode = customNodes.find((n: any) => n.id === currentSubmenuId);
    return `Opção inválida. Selecione uma das opções abaixo:\n\n${getSubmenuMessage(parentNode, customNodes)}`;
  }

  return "Olá! Digite *menu* para iniciar o auto-atendimento.";
}

function getMainMenuMessage(settings: any): string {
  const rawWelcome = settings.welcome_message || "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋";
  const welcome = rawWelcome.replace(/[¤–‘‹’¼]/g, "").trim();

  const shouldAppendMenu = settings.welcome_menu_auto_append !== false;
  if (!shouldAppendMenu) {
    return welcome;
  }

  const rootNodes = (settings.custom_rules_nodes || []).filter((n: any) => !n.parentId);

  if (rootNodes.length > 0) {
    let msg = hasExplicitMenuSection(welcome)
      ? welcome
      : welcome + "\n\n" + "Escolha uma opção abaixo:\n\n";

    const interactiveNodes = getInteractiveNodes(rootNodes);
    if (interactiveNodes.length > 3) {
      const listLines = interactiveNodes.map((n: any) => `${n.title}|${n.keyword}`);
      if (!hasExplicitMenuSection(welcome)) {
        msg += rootNodes.map((n: any) => `*${n.keyword}* - *${n.title}*`).join("\n");
      }
      msg += "\n\n---LIST---\n" + listLines.join("\n");
    } else {
      const buttonLines = interactiveNodes.map((n: any) => `${n.title}|${n.keyword}`);
      if (!hasExplicitMenuSection(welcome)) {
        msg += rootNodes.map((n: any) => `*${n.keyword}* - *${n.title}*`).join("\n");
      }
      if (buttonLines.length > 0) msg += "\n\n---BUTTONS---\n" + buttonLines.join("\n");
    }

    return msg;
  }

  // Auto-gera menu a partir dos produtos cadastrados
  const products = settings.products || [];
  if (products.length === 0 || settings.hide_auto_catalog === true) {
    return welcome;
  }

  let msg = hasExplicitMenuSection(welcome)
    ? welcome
    : welcome + "\n\nConfira nossos produtos e serviços:\n";

  if (!hasExplicitMenuSection(welcome)) {
    products.forEach((p: any, i: number) => {
      const idx = i + 1;
      const displayPrice = p.type === 'plan' || p.monthly ? `${p.monthly || p.price}/mês` : `${p.price}`;
      if (isSchedulableProduct(p)) {
        msg += `\n*${idx}* - ${p.name} (agendamento)\n   R$ ${displayPrice} · ${p.duration_min || 60}min`;
      } else if (p.stock !== undefined && p.stock !== null) {
        msg += `\n*${idx}* - ${p.name}\n   R$ ${displayPrice} · ${p.stock > 0 ? p.stock + ' restantes' : 'ESGOTADO'}`;
      } else {
        msg += `\n*${idx}* - ${p.name}\n   R$ ${displayPrice}`;
      }
    });
    msg += "\n\nDigite o *número* da opção para mais detalhes.";
  }

  if (products.length > 3) {
    const listLines = products.map((p: any, i: number) => `${p.name}|${i + 1}`);
    msg += "\n\n---LIST---\n" + listLines.join("\n");
  } else if (products.length > 0) {
    const buttonLines = products.map((p: any, i: number) => `${p.name}|${i + 1}`);
    msg += "\n\n---BUTTONS---\n" + buttonLines.join("\n");
  }

  return msg;
}

function hasExplicitMenuSection(message: string): boolean {
  const normalized = message
    .replace(/\r/g, "")
    .toLowerCase()
    .trim();

  if (
    normalized.includes("escolha uma das opcoes abaixo") ||
    normalized.includes("escolha uma das opções abaixo") ||
    normalized.includes("selecione uma das opcoes abaixo") ||
    normalized.includes("selecione uma das opções abaixo")
  ) {
    return true;
  }

  const menuLikeLines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\*?\d+\*?\s*[-–:]\s*/.test(line));

  return menuLikeLines.length >= 2;
}

function getSubmenuMessage(parentNode: any, allNodes: any[]): string {
  let msg = "";
  if (parentNode.actionType !== "catalog" && parentNode.actionType !== "text") {
    msg += `📂 *${parentNode.title}*\n`;
  }
  msg += `Selecione uma opção abaixo:\n\n`;
  
  const subNodes = allNodes.filter((n: any) => n.parentId === parentNode.id);
  subNodes.forEach((node: any) => {
    msg += `*${node.keyword}* - *${node.title}*\n`;
  });
  
  msg += "\nDigite *0* ou *voltar* para retornar ao menu anterior.";

  // Botões interativos (até 3) ou lista (mais de 3)
  const interactiveNodes = getInteractiveNodes(subNodes);
  if (interactiveNodes.length > 0) {
    const optionLines = interactiveNodes.map((n: any) => `${n.title}|${n.keyword}`);
    if (interactiveNodes.length > 3) {
      msg += "\n\n---LIST---\n" + optionLines.join("\n");
    } else {
      msg += "\n\n---BUTTONS---\n" + optionLines.join("\n");
    }
  }

  return msg;
}

function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  try {
    const today = new Date();
    const todayParts = getZonedDateTimeParts(today);
    let year = todayParts.year;
    if (year < 2026) year = 2026;
    let month = todayParts.month - 1;
    let day = todayParts.day;

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(Date.UTC(year, month, day + 1, 12));
      day = tomorrow.getUTCDate();
      month = tomorrow.getUTCMonth();
      year = tomorrow.getUTCFullYear();
      if (year < 2026) year = 2026;
    } else if (cleanDate.includes("hoje")) {
      // keep today
    } else {
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length >= 2) {
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        if (dateParts.length === 3) {
          year = parseInt(dateParts[2], 10);
          if (year < 100) year += 2000;
        }
      } else {
        const weekdays = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
        const targetDay = weekdays.findIndex(d => cleanDate.includes(d));
        if (targetDay !== -1) {
          const todayDayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay();
          let diff = targetDay - todayDayOfWeek;
          if (diff <= 0) diff += 7;
          const targetDate = new Date(Date.UTC(year, month, day + diff, 12));
          day = targetDate.getUTCDate();
          month = targetDate.getUTCMonth();
          year = targetDate.getUTCFullYear();
          if (year < 2026) year = 2026;
        }
      }
    }
    if (year < 2026) year = 2026;

    const timeParts = timeStr.split(/[:h]/i);
    let hours = 9;
    let minutes = 0;
    if (timeParts.length >= 1) {
      hours = parseInt(timeParts[0], 10);
      if (timeParts.length >= 2) {
        minutes = parseInt(timeParts[1], 10);
      }
    }

    const result = zonedDateTimeToUtc({ year, month: month + 1, day, hour: hours, minute: minutes });
    if (isNaN(result.getTime())) return null;
    return result;
  } catch {
    return null;
  }
}

function parseDateOnly(dateStr: string): Date | null {
  try {
    const today = new Date();
    const todayParts = getZonedDateTimeParts(today);
    let year = todayParts.year;
    if (year < 2026) year = 2026;
    let month = todayParts.month - 1;
    let day = todayParts.day;

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(Date.UTC(year, month, day + 1, 12));
      day = tomorrow.getUTCDate();
      month = tomorrow.getUTCMonth();
      year = tomorrow.getUTCFullYear();
      if (year < 2026) year = 2026;
    } else if (cleanDate.includes("hoje")) {
      // keep today
    } else {
      const dateParts = dateStr.split(/[-/]/);
      if (dateParts.length >= 2) {
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        if (dateParts.length === 3) {
          year = parseInt(dateParts[2], 10);
          if (year < 100) year += 2000;
        }
      } else {
        const weekdays = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
        const targetDay = weekdays.findIndex(d => cleanDate.includes(d));
        if (targetDay !== -1) {
          const todayDayOfWeek = new Date(Date.UTC(year, month, day)).getUTCDay();
          let diff = targetDay - todayDayOfWeek;
          if (diff <= 0) diff += 7;
          const targetDate = new Date(Date.UTC(year, month, day + diff, 12));
          day = targetDate.getUTCDate();
          month = targetDate.getUTCMonth();
          year = targetDate.getUTCFullYear();
          if (year < 2026) year = 2026;
        } else {
          return null;
        }
      }
    }
    if (year < 2026) year = 2026;
    const result = zonedDateTimeToUtc({ year, month: month + 1, day, hour: 0, minute: 0 });
    if (isNaN(result.getTime())) return null;
    return result;
  } catch {
    return null;
  }
}

async function isSlotAvailable(
  tenantId: string,
  scheduledAt: Date,
  durationMin: number,
  statusFilter: string[] = ["scheduled", "confirmed", "pending_payment"]
): Promise<boolean> {
  const start = new Date(scheduledAt.getTime());
  const duration = Number(durationMin || 60);
  const end = start.getTime() + duration * 60 * 1000;

  const { start: dayStart, end: dayEnd } = getBusinessDayRange(start);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenant_id: tenantId,
      scheduled_at: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: statusFilter,
      },
    },
  });

  return !appointments.some((app) => {
    const appStart = app.scheduled_at.getTime();
    const appEnd = appStart + (app.duration_min || 60) * 60 * 1000;
    return start.getTime() < appEnd && end > appStart;
  });
}

async function getAvailableSlots(tenantId: string, date: Date, durationMin: number, settings: any): Promise<string[]> {
  const dateParts = getZonedDateTimeParts(date);
  const { start: dayStart, end: dayEnd } = getBusinessDayRange(date);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenant_id: tenantId,
      scheduled_at: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ["scheduled", "confirmed", "pending_payment"],
      },
    },
  });

  const startHourStr = settings.business_hours_start || "08:00";
  const endHourStr = settings.business_hours_end || "18:00";

  const [startH, startM] = startHourStr.split(":").map(Number);
  const [endH, endM] = endHourStr.split(":").map(Number);

  const startLimit = zonedDateTimeToUtc({ ...dateParts, hour: startH, minute: startM, second: 0 });
  const endLimit = zonedDateTimeToUtc({ ...dateParts, hour: endH, minute: endM, second: 0 });

  const slots: string[] = [];
  const current = new Date(startLimit.getTime());
  const stepMs = 30 * 60 * 1000; 

  while (current.getTime() + durationMin * 60 * 1000 <= endLimit.getTime()) {
    const slotStart = current.getTime();
    const slotEnd = slotStart + durationMin * 60 * 1000;

    const isOverlapping = appointments.some((app) => {
      const appStart = app.scheduled_at.getTime();
      const appEnd = appStart + app.duration_min * 60 * 1000;
      return slotStart < appEnd && slotEnd > appStart;
    });

    const isPast = slotStart < Date.now();

    if (!isOverlapping && !isPast) {
      const currentParts = getZonedDateTimeParts(current);
      const h = String(currentParts.hour).padStart(2, "0");
      const m = String(currentParts.minute).padStart(2, "0");
      slots.push(`${h}:${m}`);
    }

    current.setTime(current.getTime() + stepMs);
  }

  return slots;
}

async function processarFinalizacaoPedidoRulesBot(
  tenantId: string,
  contactNumber: string,
  chosenService: any,
  address: string,
  settings: any,
  stateKey: string,
  collectedData: any = null,
  originNodeText?: string,
  contactName?: string
): Promise<string> {
  try {
    let extraNotes = "";
    if (collectedData && Object.keys(collectedData).length > 0) {
      extraNotes = " | Dados Coletados: " + Object.entries(collectedData).map(([k, v]) => `${k}=${v}`).join(", ");
    }

    const requiresPayment = chosenService.requires_payment !== false && chosenService.requires_payment !== "false";

    if (requiresPayment) {
      const productBillingType = (chosenService.billing_type || '').toUpperCase();
      const chosenBillingType = collectedData?.billingType || '';
      const billingType = chosenBillingType || productBillingType;

      // If no billing type specified (neither on product nor chosen), ask user
      if (!billingType) {
        const stateData: any = {
          step: "awaiting_payment_method",
          data: {
            chosenService,
            address,
            collected: collectedData || {},
            originNodeText,
          }
        };
        await prisma.systemConfig.upsert({
          where: { key: stateKey },
          update: { value: JSON.stringify(stateData) },
          create: { key: stateKey, value: JSON.stringify(stateData) }
        });
        return "Como você prefere pagar?\n\n---BUTTONS---\nPIX|1\nCartão de Crédito|2";
      }

      const customerName = collectedData?.name || contactName || '';
      const customerEmail = collectedData?.email || '';
      const cleanDigits = contactNumber.replace(/\D/g, "");

      const order = await prisma.retailOrder.create({
        data: {
          tenant_id: tenantId,
          total_amount: parseFloat(chosenService.price),
          shipping_address: address,
          status: "cart",
          items: {
            create: [{ product_name: chosenService.name, unit_price: parseFloat(chosenService.price), quantity: 1 }]
          }
        }
      });

      // Get Asaas key from settings
      const asaasKey = settings.asaas_api_key
        || settings.asaasApiKey
        || settings.asaas_test_api_key
        || settings.asaasTestApiKey
        || settings.asaas_environment_key;

      // PIX direct flow: create payment via Asaas and send PIX data in WhatsApp
      if (billingType === 'PIX' && asaasKey) {
        // If missing name, ask for it
        if (!customerName) {
          const stateData: any = {
            step: "awaiting_checkout_name",
            data: {
              chosenService,
              address,
              collected: collectedData || {},
              originNodeText,
              _needsEmail: true,
            }
          };
          await prisma.systemConfig.upsert({
            where: { key: stateKey },
            update: { value: JSON.stringify(stateData) },
            create: { key: stateKey, value: JSON.stringify(stateData) }
          });
          return appendNodeCheckoutText(originNodeText, "Para gerar o pagamento via PIX, preciso do seu *nome completo*:");
        }

        // If missing email, ask for it
        if (!customerEmail) {
          const stateData: any = {
            step: "awaiting_checkout_email",
            data: {
              chosenService,
              address,
              collected: { ...(collectedData || {}), name: customerName },
              originNodeText,
              name: customerName,
            }
          };
          await prisma.systemConfig.upsert({
            where: { key: stateKey },
            update: { value: JSON.stringify(stateData) },
            create: { key: stateKey, value: JSON.stringify(stateData) }
          });
          return appendNodeCheckoutText(originNodeText, "Qual o seu *melhor email* para enviarmos a confirmação do pagamento?");
        }

        try {
          const asaasUrl = settings.asaas_mode === 'production'
            ? 'https://asaas.com/api/v3'
            : 'https://sandbox.asaas.com/api/v3';

          const customer = await createCustomer({
            name: customerName,
            email: customerEmail,
            phone: contactNumber,
            cpfCnpj: generateCPF(),
          }, asaasKey, asaasUrl);

          if (!customer.id) {
            const errMsg = customer.errors ? customer.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar cliente no gateway';
            throw new Error(errMsg);
          }

          const idempotencyKey = `rules_pix_${createHash("sha256").update(`${stateKey}:${chosenService.id || chosenService.name}:${customerEmail}`).digest("hex")}`;
          let operation = await prisma.paymentOperation.findUnique({ where: { idempotency_key: idempotencyKey } });
          if (operation?.status === "completed" && operation.result) return operation.result;
          if (!operation) {
            operation = await prisma.paymentOperation.create({
              data: { tenant_id: tenantId, idempotency_key: idempotencyKey, kind: "rules_pix" },
            });
          }

          const sale = operation.sale_id
            ? await prisma.sale.findUnique({ where: { id: operation.sale_id } })
            : await prisma.sale.create({
                data: {
                  tenant_id: tenantId,
                  product_name: chosenService.name,
                  amount: parseFloat(chosenService.price),
                  status: "pending",
                  notes: `customer_phone:${cleanDigits} | PIX direto WhatsApp${extraNotes}`,
                  due_date: new Date(Date.now() + 7 * 86400000),
                  retail_order_id: order.id,
                },
              });
          if (!sale) throw new Error("Venda idempotente não encontrada");
          if (!operation.sale_id) {
            await prisma.paymentOperation.update({ where: { id: operation.id }, data: { sale_id: sale.id } });
          }

          const pay = await createPayment({
            customer: customer.id,
            billingType: 'PIX',
            value: parseFloat(chosenService.price),
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            description: cleanDescription(chosenService.name),
            externalReference: `${tenantId}_${sale.id}`,
          }, asaasKey, asaasUrl, idempotencyKey);

          if (!pay.id) {
            const errMsg = pay.errors ? pay.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar pagamento PIX';
            throw new Error(errMsg);
          }

          // Fallback: se PIX data veio vazio, tenta buscar explicitamente
          let pixCopy = pay.pixCopiaECola || '';
          let pixQr = pay.pixQrCodeUrl || '';
          if ((!pixCopy || !pixQr) && pay.id) {
            try {
              const pixFallbackRes = await fetch(`${asaasUrl}/payments/${pay.id}/pixQrCode`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'access_token': asaasKey.trim(),
                }
              });
              if (pixFallbackRes.ok) {
                const pixData = await pixFallbackRes.json();
                pixCopy = (typeof pixData.payload === 'string'
                  ? pixData.payload
                  : (pixData.payload?.payload || pixData.payload?.copyPaste)) || pixCopy;
                pixQr = pixData.payload?.url || pixData.encodedImage || pixData.qrCodeUrl || pixQr;
              }
            } catch (pixErr) {
              console.error("Erro ao buscar PIX QR code explicitamente:", pixErr);
            }
          }

          const pixQrUrl = /^https?:\/\//i.test(pixQr) ? pixQr : "";
          const finalPaymentLink = pay.invoiceUrl || pixQrUrl;
          await prisma.sale.update({
            where: { id: sale.id },
            data: {
              payment_link: finalPaymentLink,
              payment_id: pay.id,
              notes: `customer_phone:${cleanDigits} | PIX direto WhatsApp | pix_qr:${pixQrUrl} | pix_key:${pixCopy || ''}${extraNotes}`,
            },
          });

          await prisma.systemConfig.upsert({
            where: { key: stateKey },
            update: { value: JSON.stringify({ step: "debt_payment_method", data: {} }) },
            create: { key: stateKey, value: JSON.stringify({ step: "debt_payment_method", data: {} }) },
          });

          let msg = `🛒 *Resumo do Pedido:* ${chosenService.name}\n💰 *Valor:* R$ ${parseFloat(chosenService.price).toFixed(2)}\n📍 *Entrega:* ${address}\n\n💳 *Pagamento via PIX*`;

          if (pixCopy) msg += `\n\n🔑 *Pix Copia e Cola:*\n\`${pixCopy}\``;
          // Fallback: se ainda assim veio vazio, usa invoiceUrl como fallback
          if (!pixCopy && !pixQr && pay.invoiceUrl) {
            msg += `\n\n🔗 *Link para pagamento:*\n${pay.invoiceUrl}`;
          } else if (!pixCopy && !pixQr) {
            msg += `\n\n❌ Não foi possível gerar o PIX. Tente novamente ou escolha outra forma de pagamento.`;
          }

          msg += `\n\nApós a aprovação automática, seu pedido será liberado! 🚀`;
          msg += `\n\n---BUTTONS---\nPagar com Cartão|2\nCancelar cobrança|3`;
          if (pixQr) {
            msg += `\n\n---IMAGE---\n${pixQr.replace(/^data:image\/[^;]+;base64,/, "")}`;
          }

          const finalMessage = appendNodeCheckoutText(originNodeText, msg);
          await prisma.paymentOperation.update({
            where: { id: operation.id },
            data: { status: "completed", provider_id: pay.id, result: finalMessage },
          });
          return finalMessage;

        } catch (e: any) {
          console.error("Erro ao criar pagamento PIX direto:", e);
          // Fallback to checkout link
        }
      }

      // CREDIT_CARD or fallback: redirect to checkout with pre-filled data
      const productNameEnc = encodeURIComponent(chosenService.name);
      const { getAppBaseUrl } = await import("@/lib/auth");
      const baseUrl = getAppBaseUrl();
      let checkoutUrl = `${baseUrl}/checkout/${tenantId}?product=${productNameEnc}&order=${order.id}`;
      if (customerName) checkoutUrl += `&name=${encodeURIComponent(customerName)}`;
      if (cleanDigits) checkoutUrl += `&phone=${encodeURIComponent(contactNumber)}`;
      if (customerEmail) checkoutUrl += `&email=${encodeURIComponent(customerEmail)}`;

      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});

      return appendNodeCheckoutText(
        originNodeText,
        botMessageTemplates.checkout.withPayment({
          product: chosenService,
          address,
          checkoutLink: checkoutUrl,
          paymentMode: "link",
        })
      );

    } else {
      await prisma.sale.create({
        data: {
          tenant_id: tenantId,
          product_name: chosenService.name,
          amount: parseFloat(chosenService.price),
          status: "pending",
          notes: `customer_phone:${contactNumber} | presencial | address:${address}${extraNotes}`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});

      return appendNodeCheckoutText(
        originNodeText,
        botMessageTemplates.checkout.withoutPayment({
          product: chosenService,
          address,
        })
      );
    }
  } catch (err: any) {
    console.error("Erro finalizar pedido rulesBot:", err);
    return `❌ Erro ao finalizar pedido: ${err.message}`;
  }
}

function obterProximosDiasDisponiveis(settings: any): Date[] {
  const businessDaysMap: Record<number, string> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat"
  };
  
  const enabledDays = settings.business_days || ["mon", "tue", "wed", "thu", "fri"];
  const blockedDates = settings.blocked_dates || [];
  
  const dates: Date[] = [];
  const now = new Date();
  const todayParts = getZonedDateTimeParts(now);
  const safeYear = Math.max(todayParts.year, 2026);
  const current = new Date(Date.UTC(safeYear, todayParts.month - 1, todayParts.day, 12));

  // Percorre os próximos 14 dias para encontrar 5 dias válidos
  for (let i = 0; i < 14; i++) {
    const dayOfWeek = current.getUTCDay();
    const dayStr = businessDaysMap[dayOfWeek];
    const dateISO = current.toISOString().split("T")[0];
    
    const isDayEnabled = enabledDays.includes(dayStr);
    const isBlocked = blockedDates.includes(dateISO);
    
    // Evita agendar para o passado no próprio dia atual se a hora limite já passou
    const isToday = i === 0;
    let isPast = false;
    if (isToday) {
      const endHourStr = settings.business_hours_end || "18:00";
      const [endH, endM] = endHourStr.split(":").map(Number);
      const limit = zonedDateTimeToUtc({
        year: current.getUTCFullYear(),
        month: current.getUTCMonth() + 1,
        day: current.getUTCDate(),
        hour: endH,
        minute: endM,
      });
      if (now.getTime() > limit.getTime()) {
        isPast = true;
      }
    }

    if (isDayEnabled && !isBlocked && !isPast) {
      dates.push(new Date(current.getTime()));
    }
    
    if (dates.length >= 5) break;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
}
