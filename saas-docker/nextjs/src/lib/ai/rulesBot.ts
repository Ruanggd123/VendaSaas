import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { botMessageTemplates } from "./botMessageTemplates";
import { cancelPayment, createCustomer, createPayment, getPixQrCode, updatePayment } from "@/lib/asaas";
import { getBusinessDayRange, getZonedDateTimeParts, zonedDateTimeToUtc } from "@/lib/dateTime";
import { createHash } from "crypto";
import { formatBRL, getProductPrice, getProductPriceLabel } from "@/lib/currency";

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
  updatedAt?: number;
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

async function findOrCreateLeadByPhone(tenantId: string, phone: string, contactName?: string) {
  const normalized = normalizePhone(phone);
  const lead = await prisma.lead.findFirst({
    where: getLeadLookupWhereClause(tenantId, normalized || phone),
  });
  if (lead) return lead;
  return prisma.lead.create({
    data: {
      tenant_id: tenantId,
      phone: normalized || phone,
      name: contactName || normalized || phone,
      status: "NEW",
    },
  });
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
    || findProductByRef(products, node.title)
    || findProductByRef(products, node.keyword);
}

function getProductDisplayPrice(prod: ProductLike | null): string {
  if (!prod) return "";
  const monthly = prod.monthly ? Number(prod.monthly) : 0;
  const price = monthly > 0 ? monthly : (prod.price ? Number(prod.price) : 0);
  return price > 0 ? price.toFixed(2).replace(".", ",") : "";
}

function getProductOptionLabel(product: ProductLike): string {
  const name = String(product.name || "Produto").trim();
  const price = getProductDisplayPrice(product);
  return price ? `${name} - R$ ${price}` : name;
}

function getCatalogIntro(nodeText: string): string {
  const text = (nodeText || "").trim();
  const normalized = normalizeTextForLookup(text);
  if (text && normalized !== "escolha uma opcao") return text;
  return "🚀 *Escolha o plano ideal para a sua empresa abaixo:*";
}

function isSchedulableProduct(prod: ProductLike | null | undefined): boolean {
  if (!prod) return false;
  const deliveryType = String(prod.delivery_type || "").trim().toLowerCase();
  const type = String(prod.type || "").trim().toLowerCase();
  return deliveryType === "service" || type === "service";
}

function getSchedulableProducts(products: any[]): ProductLike[] {
  if (!Array.isArray(products)) return [];
  const explicit = products.filter((p) => isSchedulableProduct(p as ProductLike));

  if (explicit.length > 0) {
    return explicit as ProductLike[];
  }

  return [];
}

function isValidNode(node: any) {
  if (!node) return false;
  const title = (node.title || "").trim();
  const textContent = (node.textContent || "").trim();
  const variableName = (node.variableName || "").trim();
  if (!title && !textContent && !variableName) return false;
  return true;
}

function sanitizeMessageWhitespace(msg: string): string {
  if (!msg) return "";
  return msg
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderCollectedVariables(value: unknown, collected: Record<string, unknown> | null | undefined): string {
  let str = String(value || "");
  if (!collected || typeof collected !== "object") return str;

  // 1. Replaça {{key}} e {key}
  str = str.replace(
    /\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}|\{\s*([a-zA-Z0-9_\-\.]+)\s*\}/g,
    (match, doubleKey, singleKey) => {
      const key = doubleKey || singleKey;
      const replacement = collected[key] ?? collected[key.toLowerCase()];
      return replacement !== undefined && replacement !== null ? String(replacement) : match;
    }
  );

  // 2. Substituição flexível de qualquer variável coletada no dicionário (com ou sem chaves)
  Object.keys(collected).forEach((k) => {
    const val = collected[k];
    if (val !== undefined && val !== null && String(val).trim().length > 0) {
      // Replaça {var} e {{var}}
      const regexBrackets = new RegExp(`\\{\\{?\\s*${k}\\s*\\}?\\}`, "gi");
      str = str.replace(regexBrackets, String(val));
      
      // Replaça a palavra solta exata no texto se o nome da variável tiver pelo menos 3 caracteres
      if (k.length >= 3) {
        const regexWord = new RegExp(`\\b${k}\\b`, "gi");
        str = str.replace(regexWord, String(val));
      }
    }
  });

  return sanitizeMessageWhitespace(str);
}

export function resolveChoiceIndex(value: string, labels: string[]): number {
  if (/^\d+$/.test(value.trim())) {
    const numericIndex = Number(value.trim()) - 1;
    if (numericIndex >= 0 && numericIndex < labels.length) return numericIndex;
  }
  const normalized = normalizeTextForLookup(value);
  const normalizedLabels = labels.map((l) => normalizeTextForLookup(l || ""));

  // 1. Exact match
  const exactIndex = normalizedLabels.findIndex((label) => label === normalized);
  if (exactIndex >= 0) return exactIndex;

  // 2. Prefix match: "label R$ price" format
  const prefixIndex = normalizedLabels.findIndex((label) => {
    if (!label || !normalized.startsWith(`${label} `)) return false;
    return /^r\s*\d/.test(normalized.slice(label.length).trim());
  });
  if (prefixIndex >= 0) return prefixIndex;

  // 3. Partial match for inputs >= 3 chars (handles poll vote labels containing product names)
  if (normalized.length >= 3) {
    return normalizedLabels.findIndex((label) => label && (label.includes(normalized) || normalized.includes(label)));
  }

  return -1;
}

export async function processMessageWithRules(
  tenantId: string,
  contactNumber: string,
  userMessage: string,
  settings: any,
  isMessageToMyself: boolean = false
): Promise<string | null> {

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

  let state: BotState = { step: "main_menu", data: {}, updatedAt: Date.now() };
  
  if (rawState) {
    try {
      const parsed = JSON.parse(rawState);
      const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inatividade
      if (parsed.updatedAt && (Date.now() - Number(parsed.updatedAt) > SESSION_TIMEOUT_MS)) {
        console.log(`[RulesBot] Sessão expirada para ${contactNumber} (> 30min de inatividade). Resetando estado.`);
        state = { step: "main_menu", data: {}, updatedAt: Date.now() };
        // Limpa row expirada do banco para não acumular lixo
        await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      } else {
        state = parsed;
      }
    } catch {}
  }

  // Helper para salvar o estado
  const saveState = async (newState: BotState) => {
    try {
      const stateToSave = { ...newState, updatedAt: Date.now() };
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify(stateToSave) },
        create: { key: stateKey, value: JSON.stringify(stateToSave) }
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
      select: { contact_name: true, ai_paused: true }
    });
    if (conv?.ai_paused) {
      console.log(`[RulesBot] Conversa em Atendimento Humano (ai_paused=true) para ${contactNumber}. Retornando null.`);
      return null;
    }
    if (conv?.contact_name) contactName = conv.contact_name;
  } catch {}

  const cleanText = userMessage
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");

  let customNodes = settings.custom_rules_nodes || [];
  const mainStoreTenantId = process.env.MAIN_STORE_TENANT_ID || "3bc0174c-d760-4fc7-9e38-8d20577f5593";
  const isMainStore = tenantId === mainStoreTenantId;
  if (!isMainStore && customNodes.some((n: any) => n.id === "node_plano_growth" || n.productId === "Plano Growth (Mais Vendido ⭐)")) {
    customNodes = [];
  }

  const customNodeTitlesAndKeywords: string[] = [];
  if (Array.isArray(customNodes)) {
    for (const node of customNodes) {
      if (node.title) {
        customNodeTitlesAndKeywords.push(...node.title.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length >= 3));
      }
      if (node.triggerKeywords && Array.isArray(node.triggerKeywords)) {
        customNodeTitlesAndKeywords.push(...node.triggerKeywords.map((k: string) => k.toLowerCase().trim()));
      }
      if (node.options && Array.isArray(node.options)) {
        for (const opt of node.options) {
          if (opt.text) {
            customNodeTitlesAndKeywords.push(...opt.text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").split(/\s+/).filter((w: string) => w.length >= 3));
          }
        }
      }
    }
  }

  const words = cleanText.split(/\s+/).filter(Boolean);
  const globalActionKeywords = [
    "comprar", "pix", "cartao", "credito", "agendar", "agendamento", "suporte",
    "preco", "preço", "link", "cancelar", "cancele", "paguei", "verificar",
    "catalogo", "catalogos", "servico", "servicos", "produto", "produtos",
    "atendente", "humano", "orcamento", "orçamento", "informacao", "informação",
    "reuniao", "reunião", "horario", "horário",
    "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
  ];
  const allActionKeywords = [...globalActionKeywords, ...customNodeTitlesAndKeywords];

  const hasActionKeyword = words.some(w => allActionKeywords.some(ak => w === ak || (ak.length >= 3 && w.includes(ak))));

  const isResetCommand = ["menu", "0", "voltar", "inicio", "reiniciar", "recomecar"].includes(cleanText);
  const isShortGreeting = words.length > 0 && words.length <= 4 && !hasActionKeyword;

  // A saudação curta só deve resetar o estado quando estamos no menu principal.
  // Em fluxos ativos (collect_data, endereço, checkout, coleta de dados), mensagens
  // curtas como nome, idade ou endereço NÃO podem ser interpretadas como saudação.
  const isGreetingOrReset = isResetCommand || (isShortGreeting && state.step === "main_menu");
  if (isGreetingOrReset) {
    state = { step: "main_menu", data: { menu_sent: true } };
    await saveState(state);
    return getMainMenuMessage(settings);
  }

  // Detecção Universal Direct-Match para seleções interativas do WhatsApp ou envio de nome de produto
  const rawInputStripped = userMessage.replace(/^Selecionou:\s*/i, "").trim();
  const rawInputClean = rawInputStripped.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "");

  if (rawInputClean.length >= 3 && !isResetCommand) {
    const allProductsList = settings.products || [];
    const matchedProduct = allProductsList.find((p: any) => {
      const pNameClean = (p.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "");
      if (!pNameClean) return false;
      return rawInputClean.includes(pNameClean) || pNameClean.includes(rawInputClean);
    });

    if (matchedProduct && (userMessage.toLowerCase().includes("selecionou:") || rawInputClean.length > 5)) {
      state.data = { ...state.data, chosenService: matchedProduct, chosenNodeText: null };
      const deliveryType = matchedProduct.delivery_type || "virtual_instant";
      const deadline = matchedProduct.delivery_deadline || "imediato";

      if (deliveryType === "virtual_instant") {
        const addr = botMessageTemplates.labels.digitalImmediate();
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(
          tenantId, contactNumber, matchedProduct, addr,
          settings, stateKey, state.data.collected, undefined, contactName
        );
      } else if (deliveryType === "virtual_deadline") {
        const addr = botMessageTemplates.labels.bothDigital(deadline);
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(
          tenantId, contactNumber, matchedProduct, addr,
          settings, stateKey, state.data.collected, undefined, contactName
        );
      }
    }
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

  // Handle briefing collection for service products (sob medida) antes do pagamento
  if (state.step === "awaiting_checkout_briefing") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await saveState(state);
      return getMainMenuMessage(settings);
    }
    const answer = userMessage.trim();
    if (answer.length < 2) return "Por favor, digite uma resposta válida:";
    const collected = { ...(state.data.collected || {}) };
    if ((state.data.briefingStep || 0) === 0) {
      collected.briefing_segmento = answer;
      state.data.collected = collected;
      state.data.briefingStep = 1;
      await saveState(state);
      return appendNodeCheckoutText(state.data.originNodeText, "2️⃣ *Quais páginas/sessões você precisa no site?* (ex: Início, Serviços, Contato)");
    }
    collected.briefing_paginas = answer;
    const nome = state.data.name || contactName;
    return await processarFinalizacaoPedidoRulesBot(
      tenantId, contactNumber, state.data.chosenService,
      state.data.address, settings, stateKey,
      { ...collected, name: collected.name || nome, email: collected.email },
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

  if (state.step === "awaiting_payment_confirmation") {
    const confirmChoice = resolveChoiceIndex(cleanText, ["Confirmar", "Cancelar"]);
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu" || confirmChoice === 1) {
      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      return getMainMenuMessage(settings);
    }
    if (confirmChoice === 0 || cleanText.includes("confirma") || cleanText.includes("sim") || cleanText.includes("confirmar")) {
      return await executarPagamentoAposConfirmacao(
        tenantId, contactNumber, state.data, settings, stateKey, contactName
      );
    }
    return "Opção inválida. Responda:\n\n1️⃣ *Confirmar* a compra\n2️⃣ *Cancelar*\n\n---BUTTONS---\nConfirmar|1\nCancelar|2";
  }

  // Check for pending debt / unpaid sale for this customer
  const phoneDigits = contactNumber.replace(/\D/g, "");
  const phoneFormats = [phoneDigits];
  if (phoneDigits.startsWith("55")) {
    phoneFormats.push(phoneDigits.slice(2));
  } else {
    phoneFormats.push("55" + phoneDigits);
  }
  const phoneOrConditions = phoneFormats.flatMap(pf => [
    { notes: { contains: `customer_phone:${pf}` } },
    { notes: { contains: `"customer_phone":"${pf}"` } },
    { notes: { contains: pf } }
  ]);

  // Busca a compra/cobrança MAIS RECENTE de todas para este número (pendente, paga ou expirada)
  const mostRecentSale = await prisma.sale.findFirst({
    where: {
      tenant_id: tenantId,
      OR: phoneOrConditions
    },
    orderBy: { created_at: "desc" }
  });

  const pendingSale = mostRecentSale?.status === "pending" ? mostRecentSale : null;

  const pendingPaymentPrompt = (mostRecentSale && mostRecentSale.status === "pending")
    ? `Olá! Existe um pagamento pendente para *${mostRecentSale.product_name}* no valor de *R$ ${mostRecentSale.amount.toFixed(2).replace(".", ",")}*.`
      + `\n\nEscolha como deseja continuar:\n\n1️⃣ *Pagar com PIX* — código no próprio WhatsApp\n2️⃣ *Pagar com Cartão* — checkout seguro\n3️⃣ *Cancelar cobrança*\n\n---BUTTONS---\nPagar com PIX|1\nPagar com Cartão|2\nCancelar cobrança|3`
    : "";

  const isAlreadyPaidIntent = cleanText.includes("paguei") || cleanText.includes("ja paguei") || cleanText.includes("fiz o pagamento") || cleanText.includes("fiz o pix") || cleanText.includes("comprovante") || cleanText.includes("pago") || cleanText.includes("ja tenho o plano") || cleanText.includes("ja tenho plano") || cleanText.includes("verificar") || cleanText.includes("verifique");

  if (isAlreadyPaidIntent) {
    if (!mostRecentSale) {
      return `🔎 Não identifiquei nenhuma tentativa de pagamento registrada para este número de WhatsApp. Gostaria de conhecer nossos planos e solicitar um PIX?`;
    }

    const appUrl = (await import("@/lib/auth")).getAppBaseUrl();

    // Extração defensiva do e-mail do cliente a partir dos campos
    let clientEmail = "";
    if (mostRecentSale.notes) {
      const matchE = mostRecentSale.notes.match(/customer_email:([^\s|]+)/);
      if (matchE && matchE[1]) clientEmail = matchE[1];
    }

    // --- CASO 1: A COMPRA MAIS RECENTE CONSTA COMO PENDENTE ---
    if (mostRecentSale.status === "pending") {
      const apiKey = settings.asaas_api_key || process.env.ASAAS_API_KEY;
      if (mostRecentSale.payment_id && apiKey) {
        try {
          const { getPayment } = await import("@/lib/asaas");
          const asaasRes = await getPayment(mostRecentSale.payment_id, apiKey);
          const st = (asaasRes?.status || "").toUpperCase();

          if (st === "RECEIVED" || st === "CONFIRMED" || st === "RECEIVED_IN_CASH") {
            const newlyPaid = await prisma.sale.update({
              where: { id: mostRecentSale.id },
              data: { status: "paid", paid_at: new Date() }
            });

            // Entrega / Provisionamento automático de credenciais de acesso
            let accessDetails = "";
            if (clientEmail) {
              const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
              if (existingUser) {
                accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha:* Sua senha cadastrada no sistema`;
              } else {
                const bcrypt = await import("bcryptjs");
                const rawPassword = Math.random().toString(36).slice(-8) + "A1!";
                const hashedPassword = await bcrypt.hash(rawPassword, 10);
                const newTenant = await prisma.tenant.create({
                  data: {
                    name: `Empresa ${clientEmail.split("@")[0]}`,
                    phone: `${contactNumber}_sub_${Date.now()}`,
                    plan: newlyPaid.product_name,
                    subscription_expires_at: new Date(Date.now() + 30 * 86400000),
                  }
                });
                await prisma.user.create({
                  data: {
                    tenant_id: newTenant.id,
                    name: clientEmail.split("@")[0],
                    email: clientEmail,
                    password_hash: hashedPassword,
                    role: "admin",
                  }
                });
                accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha Provisória:* ${rawPassword}\n\n_(Recomendamos alterar a senha no primeiro acesso!)_`;
              }
            } else {
              accessDetails = `\n\n📋 *Acesso ao Painel:*\n🔗 ${appUrl}/login\nAcesse com seu e-mail cadastrado.`;
            }

            state = { step: "main_menu", data: {} };
            await saveState(state);
            return `🎉 *Pagamento Confirmado & Conta Liberada com Sucesso!*\n\nIdentificamos o seu pagamento aprovado para *${newlyPaid.product_name}* (R$ ${newlyPaid.amount.toFixed(2).replace(".", ",")})! 🚀${accessDetails}\n\nSeu pedido já está 100% ativo! Como podemos te ajudar agora?`;
          }

          if (st === "OVERDUE" || st === "CANCELLED" || st === "REFUNDED") {
            await prisma.sale.update({
              where: { id: mostRecentSale.id },
              data: { status: "expired" }
            });
            return `⏰ *Cobrança Expirada*\n\nA sua cobrança para *${mostRecentSale.product_name}* (R$ ${mostRecentSale.amount.toFixed(2).replace(".", ",")}) expirou ou foi cancelada pela operadora por limite de tempo.\n\nDeseja gerar um novo código PIX ou link de pagamento para concluir a compra?`;
          }
        } catch (e) {
          console.error("Erro ao consultar Asaas em tempo real:", e);
        }
      }

      // Se a cobrança pendente foi criada há mais de 48h sem pagamento
      const hoursOld = (Date.now() - new Date(mostRecentSale.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursOld > 48) {
        await prisma.sale.update({
          where: { id: mostRecentSale.id },
          data: { status: "expired" }
        });
        return `⏰ A sua cobrança para *${mostRecentSale.product_name}* (R$ ${mostRecentSale.amount.toFixed(2).replace(".", ",")}) expirou por ter ultrapassado o tempo limite de pagamento (mais de 48h).\n\nQuer que eu gere um novo código PIX para você agora?`;
      }

      return `🔎 O seu pagamento para *${mostRecentSale.product_name}* (R$ ${mostRecentSale.amount.toFixed(2).replace(".", ",")}) ainda consta como PENDENTE na operadora.\n\nSe você acabou de concluir a transferência via PIX, a compensação costuma ser automática em até 30 segundos! Digite 'paguei' novamente em instantes para re-verificar.`;
    }

    // --- CASO 2: A COMPRA MAIS RECENTE JÁ ESTÁ PAGA E APROVADA ---
    if (mostRecentSale.status === "paid") {
      let accessDetails = "";
      if (clientEmail) {
        const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
        if (existingUser) {
          accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha:* Sua senha cadastrada no sistema`;
        } else {
          const bcrypt = await import("bcryptjs");
          const rawPassword = Math.random().toString(36).slice(-8) + "A1!";
          const hashedPassword = await bcrypt.hash(rawPassword, 10);
          const newTenant = await prisma.tenant.create({
            data: {
              name: `Empresa ${clientEmail.split("@")[0]}`,
              phone: `${contactNumber}_sub_${Date.now()}`,
              plan: mostRecentSale.product_name,
              subscription_expires_at: new Date(Date.now() + 30 * 86400000),
            }
          });
          await prisma.user.create({
            data: {
              tenant_id: newTenant.id,
              name: clientEmail.split("@")[0],
              email: clientEmail,
              password_hash: hashedPassword,
              role: "admin",
            }
          });
          accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha Provisória:* ${rawPassword}\n\n_(Recomendamos alterar a senha no primeiro acesso!)_`;
        }
      } else {
        accessDetails = `\n\n📋 *Acesso ao Painel:*\n🔗 ${appUrl}/login\nAcesse com seu e-mail cadastrado para gerenciar seus serviços.`;
      }

      state = { step: "main_menu", data: {} };
      await saveState(state);
      return `🎉 *Assinatura Ativa & Acesso Liberado!*\n\nIdentificamos o seu pagamento aprovado para *${mostRecentSale.product_name}* (R$ ${mostRecentSale.amount.toFixed(2).replace(".", ",")})! 🚀${accessDetails}\n\nComo podemos te ajudar agora?`;
    }

    // --- CASO 3: OUTROS STATUS (EX: EXPIRADO OU CANCELADO) ---
    return `⏰ A sua última tentativa de compra para *${mostRecentSale.product_name}* consta como expirada ou cancelada. Deseja escolher um plano para gerar um novo pagamento?`;
  }

  if (pendingSale) {
    const isCancelIntent = cleanText.includes("cancele") || cleanText.includes("cancelar") || cleanText.includes("cancela") || cleanText.includes("desistir") || cleanText === "3";
    if (isCancelIntent) {
      await prisma.sale.update({
        where: { id: pendingSale.id },
        data: { status: "cancelled" }
      }).catch(() => {});

      await prisma.conversation.updateMany({
        where: conversationId
          ? { id: conversationId, tenant_id: tenantId }
          : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
        data: { ai_paused: true }
      });

      state = { step: "main_menu", data: {} };
      await saveState(state);
      return "✅ Cobrança cancelada com sucesso! Transfiri o seu atendimento para a nossa equipe humana. Como podemos te ajudar?";
    }

    const isExplicitPaymentRequest = cleanText.includes("pagar") || cleanText.includes("cobranca") || cleanText.includes("cobrança") || cleanText.includes("meu pedido");
    if ((state.step === "debt_payment_method" || state.step === "debt_paying" || isExplicitPaymentRequest) && state.step !== "main_menu") {
      if (state.step !== "debt_payment_method" && state.step !== "debt_paying") {
        state.step = "debt_payment_method";
        await saveState(state);
        return pendingPaymentPrompt;
      }
    }
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

    // Verificação de pagamento em tempo real no Asaas / Banco de Dados
    const isAlreadyPaid = pendingSale.status === "paid";
    let isApprovedNow = false;

    if (!isAlreadyPaid && asaasKey && pendingSale.payment_id) {
      try {
        const { getPayment } = await import("@/lib/asaas");
        const paymentStatusRes = await getPayment(pendingSale.payment_id, asaasKey, asaasUrl);
        const payStatus = paymentStatusRes?.status;
        if (payStatus === "RECEIVED" || payStatus === "CONFIRMED" || payStatus === "RECEIVED_IN_CASH") {
          await prisma.sale.update({
            where: { id: pendingSale.id },
            data: { status: "paid", paid_at: new Date() },
          });
          isApprovedNow = true;
        }
      } catch (checkErr) {
        console.error("Erro ao checar status do pagamento no Asaas:", checkErr);
      }
    }

    if (isAlreadyPaid || isApprovedNow) {
      state = { step: "main_menu", data: {} };
      await saveState(state);

      const { getAppBaseUrl } = await import("@/lib/auth");
      const appUrl = getAppBaseUrl();

      let clientEmail = "";
      if (pendingSale.notes) {
        const matchE = pendingSale.notes.match(/customer_email:([^\s|]+)/);
        if (matchE && matchE[1]) clientEmail = matchE[1];
      }

      let accessDetails = "";
      if (clientEmail) {
        const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
        if (existingUser) {
          accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha:* Sua senha cadastrada anteriormente`;
        } else {
          // Provisiona novo usuario de acesso
          const bcrypt = await import("bcryptjs");
          const rawPassword = Math.random().toString(36).slice(-8) + "A1!";
          const hashedPassword = await bcrypt.hash(rawPassword, 10);
          const newTenant = await prisma.tenant.create({
            data: {
              name: `Empresa ${clientEmail.split("@")[0]}`,
              phone: `${contactNumber}_sub_${Date.now()}`,
              plan: pendingSale.product_name,
              subscription_expires_at: new Date(Date.now() + 30 * 86400000),
            }
          });
          await prisma.user.create({
            data: {
              tenant_id: newTenant.id,
              name: clientEmail.split("@")[0],
              email: clientEmail,
              password_hash: hashedPassword,
              role: "admin",
            }
          });
          accessDetails = `\n\n📋 *Seus Dados de Acesso ao Painel:*\n🔗 ${appUrl}/login\n📧 *Email:* ${clientEmail}\n🔑 *Senha Provisória:* ${rawPassword}\n\n_(Recomendamos alterar a senha no primeiro acesso!)_`;
        }
      } else {
        accessDetails = `\n\n📋 *Acesso ao Painel:*\n🔗 ${appUrl}/login\nUse o seu e-mail cadastrado para acessar a plataforma.`;
      }

      return `🎉 *Pagamento Aprovado & Confirmado com Sucesso!*\n\nSeu pagamento de R$ ${pendingSale.amount.toFixed(2).replace(".", ",")} para *${pendingSale.product_name}* foi processado com sucesso! 🚀${accessDetails}\n\nSeu pedido já foi ativado em nosso sistema. Qualquer dúvida, estamos à disposição!\n\n${getMainMenuMessage(settings)}`;
    }

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

      const response = `✅ *PIX gerado no próprio WhatsApp*\n\n📦 *${pendingSale.product_name}*\n💰 *Valor:* R$ ${pendingSale.amount.toFixed(2).replace(".", ",")}\n\n🔑 O código Pix Copia e Cola será enviado em uma mensagem separada para facilitar a cópia.\n\nAbra o aplicativo do seu banco, escolha *Pix Copia e Cola* e cole o código enviado.\n\n---PIX-COPY---\n${pixCopy}`;
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
    state.data.collected = state.data.collected || {};
    state.data.collected[varName] = userMessage.trim();

    const nodeId = state.step.replace("collect_data:", "");
    const children = customNodes.filter((n: any) => n.parentId === nodeId && isValidNode(n));

    if (children.length === 1) {
      const nextNode = children[0];
      if (nextNode.actionType === "collect_data") {
        state.step = `collect_data:${nextNode.id}`;
        state.data.collect_variable = nextNode.variableName || "dado_coletado";
        await saveState(state);
        const questionText = renderCollectedVariables(nextNode.textContent || "Por favor, digite a informação solicitada:", state.data.collected);
        return sanitizeMessageWhitespace(questionText);
      } else if (nextNode.actionType === "text" || !nextNode.actionType) {
        state.step = "main_menu";
        await saveState(state);
        const textMsg = renderCollectedVariables(nextNode.textContent || "Obrigado! Suas informações foram registradas.", state.data.collected);
        return sanitizeMessageWhitespace(textMsg);
      } else if (nextNode.actionType === "human") {
        await prisma.conversation.updateMany({
          where: conversationId
            ? { id: conversationId, tenant_id: tenantId }
            : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
          data: { ai_paused: true }
        });
        await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
        return renderCollectedVariables(nextNode.textContent || "Transferindo para atendente humano...", state.data.collected);
      }
    }

    if (children.length > 1) {
      state.step = `submenu:${nodeId}`;
      await saveState(state);
      const currentNode = customNodes.find((n: any) => n.id === nodeId);
      return sanitizeMessageWhitespace(`✅ Registrado!\n\n${getSubmenuMessage(currentNode, customNodes)}`);
    } else {
      await prisma.conversation.updateMany({
        where: conversationId
          ? { id: conversationId, tenant_id: tenantId }
          : { tenant_id: tenantId, contact_number: contactNumber },
        data: { ai_paused: true }
      });
      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      return "✅ Registrado com sucesso! Suas informações foram enviadas para nossa equipe e um atendente responderá em breve.";
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

  // Native Intent Handler for Main Menu Options (Agendar, Atendente, Catálogo, Orçamento)
  if (state.step === "main_menu") {
    // 1. Agendar Horário / Reunião
    const isSchedulingIntent = (
      cleanText.includes("agendar") ||
      cleanText.includes("reuniao") ||
      cleanText.includes("reuniao") ||
      cleanText.includes("horario") ||
      cleanText === "1"
    ) && !cleanText.includes("ver agendamentos") && !cleanText.includes("meus agendamentos");

    if (isSchedulingIntent) {
      let servicesList = getSchedulableProducts(settings.products || []);
      if (servicesList.length === 0) {
        servicesList = [{
          name: "Reunião de Atendimento / Consultoria",
          price: "0",
          duration_min: 30,
          delivery_type: "service",
          type: "service"
        }];
      }

      if (servicesList.length === 1) {
        const chosenService = servicesList[0];
        const availableDates = await obterProximosDiasDisponiveis(tenantId, settings, chosenService.duration_min || 60);

        state.step = "scheduling_select_date";
        const availableDateLabels = availableDates.map(formatSchedulingDateLabel);
        const reqPay = chosenService.requires_payment !== false && chosenService.requires_payment !== "false" && String(chosenService.requires_payment ?? "") !== "0" && chosenService.requires_payment !== null;
        state.data = {
          serviceName: chosenService.name,
          servicePrice: chosenService.price,
          servicePriceLabel: getProductPriceLabel(chosenService),
          requiresPayment: reqPay,
          duration: chosenService.duration_min || 60,
          availableDates: availableDates.map(d => d.toISOString()),
          availableDateLabels,
        };
        await saveState(state);

        let response = `📅 *Agendamento de ${chosenService.name}*\n\nEscolha um dos dias disponíveis abaixo:\n\n`;
        const dateOptions: Array<{ label: string; value: string }> = [];
        availableDates.forEach((d, idx) => {
          const label = availableDateLabels[idx];
          response += `${idx + 1}️⃣ ${label}\n`;
          dateOptions.push({ label, value: String(idx + 1) });
        });
        response += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
        return appendInteractiveOptions(response, dateOptions);
      }

      const response = "📅 *Agende seu horário*\n\nEscolha o serviço desejado:";
      state.step = "scheduling_select_service";
      await saveState(state);
      return appendInteractiveOptions(response, servicesList.map((service: any, idx: number) => ({
        label: getProductOptionLabel(service),
        value: String(idx + 1),
      })));
    }

    // 2. Falar com Atendente Humano
    const isHumanIntent = (
      cleanText.includes("atendente") ||
      cleanText.includes("humano") ||
      cleanText.includes("suporte") ||
      cleanText.includes("falar") ||
      cleanText === "2"
    );

    if (isHumanIntent) {
      await prisma.conversation.updateMany({
        where: conversationId
          ? { id: conversationId, tenant_id: tenantId }
          : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
        data: { ai_paused: true }
      });
      return "Aguarde um momento, estou transferindo você para um de nossos especialistas. Logo você será atendido! 🧑‍💻";
    }

    // 3. Catálogo Completo de Serviços
    const isCatalogIntent = (
      cleanText.includes("catalogo") ||
      cleanText.includes("servicos") ||
      cleanText.includes("planos") ||
      cleanText.includes("produtos") ||
      cleanText === "3"
    );

    if (isCatalogIntent) {
      const productsList = settings.products || [];
      if (productsList.length === 0) {
        return "📋 No momento não temos serviços cadastrados no catálogo. Digite *0* para voltar.";
      }

      let response = "📋 *Catálogo Oficial de Planos & Soluções*\n\nConheça nossas soluções completas:\n\n";
      productsList.forEach((p: any, idx: number) => {
        const displayPrice = p.type === 'plan' || p.monthly ? `${p.monthly || p.price}/mês` : `${p.price}`;
        response += `${idx + 1}️⃣ *${p.name}* - R$ ${displayPrice}\n`;
        if (p.description) response += `   _${p.description}_\n\n`;
      });
      response += "✍️ Responda enviando o número do plano que deseja contratar (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";

      state.step = "catalog_select_product";
      state.data._allProductsList = productsList;
      await saveState(state);

      return appendInteractiveOptions(response, productsList.map((product: any, idx: number) => ({
        label: getProductOptionLabel(product),
        value: String(idx + 1),
      })));
    }

    // 4. Solicitar Informação / Orçamento
    const isQuoteIntent = (
      cleanText.includes("orcamento") ||
      cleanText.includes("informacao") ||
      cleanText.includes("duvida") ||
      cleanText.includes("solicitar") ||
      cleanText === "4"
    );

    if (isQuoteIntent) {
      await prisma.conversation.updateMany({
        where: conversationId
          ? { id: conversationId, tenant_id: tenantId }
          : { tenant_id: tenantId, instance_name: settings._instanceName || "__missing_instance__", contact_number: contactNumber },
        data: { ai_paused: true }
      });
      return "📝 *Solicitação de Informação / Orçamento*\n\nPor favor, digite qual informação ou orçamento você precisa. Um de nossos especialistas irá analisar e responder o mais rápido possível! 🧑‍💻";
    }
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
    const currentProds = state.data._allProductsList || settings.products || [];
    let optionIdx = resolveChoiceIndex(
      cleanText,
      currentProds.map((p: any) => getProductOptionLabel(p))
    );
    if (optionIdx < 0) {
      optionIdx = resolveChoiceIndex(
        cleanText,
        currentProds.map((p: any) => String(p?.name || ""))
      );
    }

    // Check if catalog used product nodes from workflow
    const productNodeIds = state.data._productNodes as string[] | undefined;
    if (productNodeIds && productNodeIds.length > 0) {
      if (optionIdx < 0) {
        optionIdx = resolveChoiceIndex(cleanText, productNodeIds.map((id) => {
          const node = customNodes.find((candidate: any) => candidate.id === id);
          const product = resolveProductFromNode(settings.products || [], node);
          if (product) return getProductOptionLabel(product);
          return String(node?.title || "");
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
      const hasChildren = customNodes.some((n: any) => n.parentId === selectedProductNode.id);
      if (hasChildren) {
        state.step = `submenu:${selectedProductNode.id}`;
        state.data = { ...state.data };
        await saveState(state);

        const prod = resolveProductFromNode(settings.products || [], selectedProductNode);
        let msg = `Você selecionou: *${selectedProductNode.title}*\n\n`;
        if (prod) {
          const displayPrice = getProductPriceLabel(prod) || `R$ ${prod.price}`;
          msg += `Valor: ${displayPrice}\n\n`;
          if (prod.image_url && prod.send_photo !== false) msg += `${prod.image_url}\n\n`;
        }
        msg += getSubmenuMessage(selectedProductNode, customNodes);
        return msg;
      }

      // No children: trigger checkout flow for the selected product
      const chosenService = resolveProductFromNode(settings.products || [], selectedProductNode) || {
        name: selectedProductNode.productName || selectedProductNode.title || "Plano ou Serviço",
        price: selectedProductNode.productPrice || "97",
        monthly: selectedProductNode.productPrice || "97",
        description: selectedProductNode.productDescription || selectedProductNode.textContent || "",
        delivery_type: "virtual_instant",
        requires_payment: true
      };

      const deliveryType = (chosenService as any).delivery_type || "virtual_instant";
      const deadline = (chosenService as any).delivery_deadline || "imediato";
      state.data = { chosenService, chosenNodeText: selectedProductNode.textContent || null };

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
      } else {
        state.step = "catalog_select_delivery_method";
        await saveState(state);
        return appendInteractiveOptions(botMessageTemplates.catalog.deliveryOrPickup(chosenService), [
          { label: "Entrega", value: "1" },
          { label: "Retirada", value: "2" },
        ]);
      }
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
    const displayPrice = getProductPriceLabel(chosenService) || `R$ ${chosenService.price}`;
    response += `Valor: ${displayPrice}\n\n`;
    
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
    const optionIdx = resolveChoiceIndex(cleanText, servicesList.map((service) => getProductOptionLabel(service)));
    if (servicesList.length === 0) {
      return "📋 Não há serviços configurados para agendamento no momento. Digite *0* para cancelar ou *menu* para voltar.";
    }

    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= servicesList.length) {
      return "❌ Opção inválida. Envie o número do serviço desejado ou *0* para cancelar.";
    }
    const chosenService = servicesList[optionIdx];
    const availableDates = await obterProximosDiasDisponiveis(tenantId, settings, chosenService.duration_min || 60);

    state.step = "scheduling_select_date";
    const availableDateLabels = availableDates.map(formatSchedulingDateLabel);
    const reqPay = chosenService.requires_payment !== false && chosenService.requires_payment !== "false" && String(chosenService.requires_payment ?? "") !== "0" && chosenService.requires_payment !== null;
    state.data = {
      serviceName: chosenService.name,
      servicePrice: chosenService.price,
      servicePriceLabel: getProductPriceLabel(chosenService),
      requiresPayment: reqPay,
      duration: chosenService.duration_min || 60,
      availableDates: availableDates.map(d => d.toISOString()),
      availableDateLabels,
    };
    await saveState(state);

    const chosenPriceNum = Number(chosenService.price || 0);
    const selectedServicePrice = chosenPriceNum > 0 ? ` (${getProductPriceLabel(chosenService)})` : "";
    let response = `Você selecionou *${chosenService.name}*${selectedServicePrice}.\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
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
    const numPrice = Number(state.data.servicePrice || 0);
    if (numPrice > 0) {
      confirmMsg += `💰 *Valor:* ${state.data.servicePriceLabel || formatBRL(state.data.servicePrice)}\n`;
    }
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

        const finalNumPrice = Number(state.data.servicePrice || 0);
        if (state.data.requiresPayment && finalNumPrice > 0) {
          await prisma.appointment.create({
            data: {
              tenant_id: tenantId,
              lead_id: lead.id,
              service_name: state.data.serviceName,
              service_price: finalNumPrice,
              duration_min: durationMin,
              scheduled_at: startDateTime,
              status: "pending_payment",
              notes: `customer_phone:${normalizedContact || contactNumber} | RulesBot Booking (Aguardando Pagamento)${extraNotes}`
            }
          });
          await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
          const { getAppBaseUrl } = await import("@/lib/auth");
          const checkoutUrl = `${getAppBaseUrl()}/checkout/${tenantId}?product=${encodeURIComponent(state.data.serviceName)}&phone=${encodeURIComponent(contactNumber)}`;
          return `✅ *Agendamento Pré-Reservado!*\n\nSeu horário para *${state.data.serviceName}* está reservado para o dia *${state.data.date}* às *${state.data.time}*.\n💰 *Valor:* ${state.data.servicePriceLabel || formatBRL(state.data.servicePrice)}\n\n⚠️ Este serviço requer **pagamento antecipado** para confirmação definitiva.\n\n🔗 Clique no link abaixo para realizar o pagamento via PIX ou Cartão:\n👉 ${checkoutUrl}\n\nAssim que o pagamento for aprovado, seu agendamento será confirmado automaticamente!`;
        }

        await prisma.appointment.create({
          data: {
            tenant_id: tenantId,
            lead_id: lead.id,
            service_name: state.data.serviceName,
            service_price: finalNumPrice || null,
            duration_min: durationMin,
            scheduled_at: startDateTime,
            status: "scheduled",
            notes: `customer_phone:${normalizedContact || contactNumber} | RulesBot Booking${extraNotes}`
          }
        });
      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      const priceText = finalNumPrice > 0
        ? `\n💰 *Valor:* ${state.data.servicePriceLabel || formatBRL(state.data.servicePrice)}`
        : "";
      return `🎉 *Agendamento confirmado com sucesso!*\n\nSeu horário para *${state.data.serviceName}* está marcado para o dia *${state.data.date}* às *${state.data.time}*.${priceText}\n\nObrigado!`;
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
  const optionIdx = resolveChoiceIndex(cleanText, productsList.map((product: any) => {
    if (!product) return "";
    return getProductOptionLabel(product);
  }));

  // Match keyword or poll selection in active level using multi-strategy lookup
  if (activeLevelNodes.length > 0) {
    const interactiveNodes = activeLevelNodes.filter((n: any) => n.showInPoll !== false);

    // 1. Exact keyword match (e.g. "6", "7", "8", "9")
    let matchedNode = activeLevelNodes.find((node: any) => {
      const cleanKeyword = normalizeTextForLookup(node.keyword);
      return Boolean(cleanKeyword) && cleanText === cleanKeyword;
    });

    // 2. Exact title match (e.g. "agendar horario reuniao", "falar com atendente humano")
    if (!matchedNode) {
      matchedNode = activeLevelNodes.find((node: any) => {
        const cleanTitle = normalizeTextForLookup(node.title);
        return Boolean(cleanTitle) && cleanText === cleanTitle;
      });
    }

    // 3. 1-based index matching against displayed interactive poll items (e.g. typing "1", "2", "3", "4" or "1️⃣")
    if (!matchedNode && /^\d+$/.test(cleanText)) {
      const numericIndex = Number(cleanText) - 1;
      if (numericIndex >= 0 && numericIndex < interactiveNodes.length) {
        matchedNode = interactiveNodes[numericIndex];
      }
    }

    // 4. Partial title or keyword match (e.g. typing "agendar", "humano", "atendente", "catalogo", "orcamento", "informacao")
    if (!matchedNode && cleanText.length >= 3) {
      matchedNode = activeLevelNodes.find((node: any) => {
        const cleanTitle = normalizeTextForLookup(node.title);
        const cleanKeyword = normalizeTextForLookup(node.keyword);
        if (!cleanTitle && !cleanKeyword) return false;
        return (cleanTitle && (cleanTitle.includes(cleanText) || cleanText.includes(cleanTitle)))
            || (cleanKeyword && !/^\d+$/.test(cleanKeyword) && (cleanKeyword.includes(cleanText) || cleanText.includes(cleanKeyword)));
      });
    }

    if (matchedNode) {
      const hasChildren = customNodes.some((n: any) => n.parentId === matchedNode.id);
      const nodeText = renderCollectedVariables(matchedNode.textContent, state.data.collected);
      let response = "";

      if (matchedNode.actionType === "catalog") {
        const productsList = settings.products || [];
        if (productsList.length === 0) {
          return "📋 No momento não temos serviços cadastrados no catálogo.";
        }

        response = `${getCatalogIntro(nodeText)}\n\n`;
        productsList.forEach((p: any, idx: number) => {
          const displayPrice = p.type === 'plan' || p.monthly ? `${p.monthly || p.price}/mês` : `${p.price}`;
          response += `${idx + 1}️⃣ *${p.name}* - R$ ${displayPrice}\n`;
          if (p.description) response += `   _${p.description}_\n\n`;
        });
        response += "✍️ Se deseja contratar ou comprar algum destes serviços/produtos, responda enviando o número dele (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";
        
        state.step = "catalog_select_product";
        state.data._allProductsList = productsList;
        await saveState(state);
        
        return appendInteractiveOptions(response, productsList.map((product: any, idx: number) => ({
          label: getProductOptionLabel(product),
          value: String(idx + 1),
        })));
      }
      else if (matchedNode.actionType === "scheduling") {
        let servicesList = getSchedulableProducts(settings.products || []);
        if (servicesList.length === 0) {
          servicesList = [{
            name: "Reunião de Atendimento / Consultoria",
            price: "0",
            duration_min: 30,
            delivery_type: "service",
            type: "service"
          }];
        }
        
        if (servicesList.length === 1) {
          const chosenService = servicesList[0];
          const availableDates = await obterProximosDiasDisponiveis(tenantId, settings, chosenService.duration_min || 60);

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

          let response = `📅 *Agendamento de ${chosenService.name}*\n\nEscolha um dos dias disponíveis abaixo:\n\n`;
          const dateOptions: Array<{ label: string; value: string }> = [];
          availableDates.forEach((d, idx) => {
            const label = availableDateLabels[idx];
            response += `${idx + 1}️⃣ ${label}\n`;
            dateOptions.push({ label, value: String(idx + 1) });
          });
          response += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
          return appendInteractiveOptions(response, dateOptions);
        }

        const response = "📅 *Agende seu horário*\n\nEscolha o serviço desejado:";
        
        state.step = "scheduling_select_service";
        await saveState(state);
        return appendInteractiveOptions(response, servicesList.map((service: any, idx: number) => ({
          label: getProductOptionLabel(service),
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
            try {
              const { sendWhatsAppMessage } = await import("@/lib/evolution");
              const managerAlert = `🤖 *Intervenção humana solicitada*\n\nO cliente *${contactName || contactNumber}* pediu para falar com um humano.\n\nA IA foi pausada nesta conversa. Assuma o atendimento agora.`;
              await sendWhatsAppMessage(whatsappInstance.name, settings.manager_phone, managerAlert);
            } catch (alertError) {
              console.error(`[RulesBot] Falha ao alertar gerente ${settings.manager_phone}:`, alertError);
            }
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
        const chosen: ProductLike = resolveProductFromNode(productsList, matchedNode) || {
          name: matchedNode.productName || matchedNode.title || "Plano ou Serviço",
          price: matchedNode.productPrice || "97",
          monthly: matchedNode.productPrice || "97",
          description: matchedNode.productDescription || matchedNode.textContent || "",
          delivery_type: "virtual_instant",
          requires_payment: true
        };
        // Verifica estoque
        if (chosen.stock !== undefined && chosen.stock !== null && chosen.stock <= 0) {
          return `❌ *${chosen.name}* está esgotado no momento. Digite *0* para voltar.`;
        }
        
        const collectedData = { ...(state.data.collected || {}) };
        if (matchedNode.paymentMode === "pix") collectedData.billingType = "PIX";
        if (matchedNode.paymentMode === "link") collectedData.billingType = "CREDIT_CARD";
        
        if (isSchedulableProduct(chosen)) {
          const availableDates = await obterProximosDiasDisponiveis(tenantId, settings, chosen.duration_min || 60);
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
        const availableDates = await obterProximosDiasDisponiveis(tenantId, settings, chosen.duration_min || 60);
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
    // Se a mensagem do cliente for uma pergunta livre (nao casou com nenhum botao/numero), retorna null para permitir que a IA responda
    console.log(`[RulesBot] Mensagem '${userMessage}' nao casou com nenhum nó do menu. Delegando para a IA.`);
    return null;
  } else if (state.step.startsWith("submenu:")) {
    const currentSubmenuId = state.step.replace("submenu:", "");
    const parentNode = customNodes.find((n: any) => n.id === currentSubmenuId);
    return `Opção inválida. Selecione uma das opções abaixo:\n\n${getSubmenuMessage(parentNode, customNodes)}`;
  }

  return null;
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
    const hasCatalogNode = rootNodes.some((n: any) => n.actionType === "catalog");
    const interactiveNodes = getInteractiveNodes(rootNodes).filter((n: any) => {
      if (hasCatalogNode && (n.actionType === "product" || n.actionType === "checkout")) {
        return false;
      }
      return true;
    });
    const hasInteractive = interactiveNodes.length > 0;

    let msg = hasExplicitMenuSection(welcome)
      ? welcome
      : welcome + (hasInteractive ? "" : "\n\nEscolha uma opção abaixo:");

    if (interactiveNodes.length > 3) {
      const listLines = interactiveNodes.map((n: any) => `${n.title}|${n.keyword}`);
      msg += "\n\n---LIST---\n" + listLines.join("\n");
    } else if (interactiveNodes.length > 0) {
      const buttonLines = interactiveNodes.map((n: any) => `${n.title}|${n.keyword}`);
      msg += "\n\n---BUTTONS---\n" + buttonLines.join("\n");
    }

    return msg;
  }

  // Auto-gera menu a partir dos produtos cadastrados
  const products = settings.products || [];
  if (products.length === 0 || settings.hide_auto_catalog === true) {
    return welcome;
  }

  const hasInteractiveMenu = products.length > 0;
  let msg = hasExplicitMenuSection(welcome)
    ? welcome
    : welcome + (hasInteractiveMenu ? "" : "\n\nConfira nossos produtos e serviços:");

  if (products.length > 3) {
    const listLines = products.map((p: any, i: number) => `${getProductOptionLabel(p)}|${i + 1}`);
    msg += "\n\n---LIST---\n" + listLines.join("\n");
  } else if (products.length > 0) {
    const buttonLines = products.map((p: any, i: number) => `${getProductOptionLabel(p)}|${i + 1}`);
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
    if (year < todayParts.year) year = todayParts.year;
    let month = todayParts.month - 1;
    let day = todayParts.day;

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(Date.UTC(year, month, day + 1, 12));
      day = tomorrow.getUTCDate();
      month = tomorrow.getUTCMonth();
      year = tomorrow.getUTCFullYear();
      if (year < todayParts.year) year = todayParts.year;
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
          if (year < todayParts.year) year = todayParts.year;
        }
      }
    }
    if (year < todayParts.year) year = todayParts.year;

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
    if (year < todayParts.year) year = todayParts.year;
    let month = todayParts.month - 1;
    let day = todayParts.day;

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(Date.UTC(year, month, day + 1, 12));
      day = tomorrow.getUTCDate();
      month = tomorrow.getUTCMonth();
      year = tomorrow.getUTCFullYear();
      if (year < todayParts.year) year = todayParts.year;
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
          if (year < todayParts.year) year = todayParts.year;
        } else {
          return null;
        }
      }
    }
    if (year < todayParts.year) year = todayParts.year;
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

  const businessDaysMap: Record<number, string> = { 0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
  const dayOfWeek = date.getUTCDay();
  const dayStr = businessDaysMap[dayOfWeek];
  const schedulePerDay = settings?.schedule_per_day || {};
  const dayConfig = schedulePerDay[dayStr];

  if (dayConfig && dayConfig.enabled === false) {
    return [];
  }

  const startHourStr = dayConfig?.start || settings.business_hours_start || "08:00";
  const endHourStr = dayConfig?.end || settings.business_hours_end || "18:00";

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

    const reqPayVal = chosenService?.requires_payment;
    const requiresPayment = reqPayVal !== false && reqPayVal !== "false" && reqPayVal !== 0 && reqPayVal !== "0" && reqPayVal !== null;

    if (requiresPayment) {
      const chosenBillingType = (collectedData?.billingType || '').toUpperCase();
      const billingType = chosenBillingType;

      // Se o usuário ainda não escolheu explicitamente a forma de pagamento nesta conversa, pergunta obrigatoriamente
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
        const effectivePriceStr = `R$ ${getProductPrice(chosenService).toFixed(2).replace(".", ",")}`;
        return `Você selecionou: *${chosenService.name}* (${effectivePriceStr})\n\nComo você prefere pagar?\n\n1️⃣ *PIX* (gerado no próprio WhatsApp)\n2️⃣ *Cartão de Crédito* (link seguro)\n\n---BUTTONS---\nPIX|1\nCartão de Crédito|2`;
      }

      // CONFIRMATION STEP: show summary before charging
      const effectivePrice = getProductPrice(chosenService);
      const confirmStateData: any = {
        step: "awaiting_payment_confirmation",
        data: {
          chosenService,
          address,
          collected: { ...collectedData, billingType },
          originNodeText,
        }
      };
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify(confirmStateData) },
        create: { key: stateKey, value: JSON.stringify(confirmStateData) }
      });
      const billingLabel = billingType === 'PIX' ? 'PIX' : 'Cartão de Crédito';
      return `📋 *Resumo do Pedido:*\n\n📦 Produto: ${chosenService.name}\n💰 Valor: R$ ${effectivePrice.toFixed(2).replace(".", ",")}\n💳 Pagamento: ${billingLabel}\n\nConfirma a compra?\n\n---BUTTONS---\nConfirmar|1\nCancelar|2`;
    }

    // No payment required: create pending sale and confirm
    const saleLead = await findOrCreateLeadByPhone(tenantId, contactNumber, contactName);
    await prisma.sale.create({
      data: {
        tenant_id: tenantId,
        product_name: chosenService.name,
        amount: getProductPrice(chosenService),
        status: "pending",
        lead_id: saleLead.id,
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
  } catch (err: any) {
    console.error("Erro finalizar pedido rulesBot:", err);
    return `❌ Erro ao finalizar pedido: ${err.message}`;
  }
}

// Função chamada APÓS o cliente confirmar o pagamento (state: awaiting_payment_confirmation)
async function executarPagamentoAposConfirmacao(
  tenantId: string,
  contactNumber: string,
  stateData: any,
  settings: any,
  stateKey: string,
  contactName?: string
): Promise<string> {
  const { chosenService, address, collected, originNodeText } = stateData;
  const billingType = (collected?.billingType || '').toUpperCase();
  const customerName = collected?.name || contactName || '';
  const customerEmail = collected?.email || '';
  const cleanDigits = contactNumber.replace(/\D/g, "");
  const effectivePrice = getProductPrice(chosenService);

  let extraNotes = "";
  if (collected && Object.keys(collected).length > 0) {
    extraNotes = " | Dados Coletados: " + Object.entries(collected).map(([k, v]) => `${k}=${v}`).join(", ");
  }

  // Create retail order (cart)
  const orderLead = await findOrCreateLeadByPhone(tenantId, contactNumber, contactName);
  const order = await prisma.retailOrder.create({
    data: {
      tenant_id: tenantId,
      lead_id: orderLead.id,
      total_amount: effectivePrice,
      shipping_address: address,
      status: "cart",
      items: {
        create: [{ product_name: chosenService.name, unit_price: effectivePrice, quantity: 1 }]
      }
    }
  });

  // Get Asaas key from settings
  const asaasKey = settings.asaas_api_key
    || settings.asaasApiKey
    || settings.asaas_test_api_key
    || settings.asaasTestApiKey
    || settings.asaas_environment_key;

  // PIX direct flow
  if (billingType === 'PIX' && asaasKey) {
    // Ask for name if missing
    if (!customerName) {
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify({ step: "awaiting_checkout_name", data: { chosenService, address, collected, originNodeText, _needsEmail: true } }) },
        create: { key: stateKey, value: JSON.stringify({ step: "awaiting_checkout_name", data: { chosenService, address, collected, originNodeText, _needsEmail: true } }) }
      });
      return appendNodeCheckoutText(originNodeText, "Para gerar o pagamento via PIX, preciso do seu *nome completo*:");
    }

    // Ask for email if missing
    if (!customerEmail) {
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify({ step: "awaiting_checkout_email", data: { chosenService, address, collected: { ...collected, name: customerName }, originNodeText, name: customerName } }) },
        create: { key: stateKey, value: JSON.stringify({ step: "awaiting_checkout_email", data: { chosenService, address, collected: { ...collected, name: customerName }, originNodeText, name: customerName } }) }
      });
      return appendNodeCheckoutText(originNodeText, "Qual o seu *melhor email* para enviarmos a confirmação do pagamento?");
    }

    // Briefing para serviços sob medida
    const isServiceProduct = String(chosenService?.type || "").trim().toLowerCase() === "service"
      || String(chosenService?.delivery_type || "").trim().toLowerCase() === "service";
    const briefingDone = !!(collected?.briefing_segmento && collected?.briefing_paginas);
    if (isServiceProduct && !briefingDone) {
      await prisma.systemConfig.upsert({
        where: { key: stateKey },
        update: { value: JSON.stringify({ step: "awaiting_checkout_briefing", data: { chosenService, address, collected, originNodeText, name: customerName, briefingStep: 0 } }) },
        create: { key: stateKey, value: JSON.stringify({ step: "awaiting_checkout_briefing", data: { chosenService, address, collected, originNodeText, name: customerName, briefingStep: 0 } }) }
      });
      return appendNodeCheckoutText(originNodeText, "Perfeito! Antes de gerar o pagamento, preciso de algumas informações do seu projeto:\n\n1️⃣ *Qual o segmento/área do seu negócio?*");
    }

    try {
      const asaasUrl = settings.asaas_mode === 'production'
        ? 'https://asaas.com/api/v3'
        : 'https://sandbox.asaas.com/api/v3';

      const customer = await createCustomer({
        name: customerName,
        email: customerEmail,
        phone: contactNumber,
        cpfCnpj: "",
      }, asaasKey, asaasUrl);

      if (!customer.id) {
        const errMsg = customer.errors ? customer.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar cliente no gateway';
        throw new Error(errMsg);
      }

      const idempotencyKey = `rules_pix_${order.id}`;
      let operation = await prisma.paymentOperation.findUnique({ where: { idempotency_key: idempotencyKey } });
      if (operation?.status === "completed" && operation.result) return operation.result;
      if (!operation) {
        operation = await prisma.paymentOperation.create({
          data: { tenant_id: tenantId, idempotency_key: idempotencyKey, kind: "rules_pix" },
        });
      }

      const pixLead = await findOrCreateLeadByPhone(tenantId, contactNumber, contactName);
      const sale = operation.sale_id
        ? await prisma.sale.findUnique({ where: { id: operation.sale_id } })
        : await prisma.sale.create({
            data: {
              tenant_id: tenantId,
              product_name: chosenService.name,
              amount: effectivePrice,
              status: "pending",
              lead_id: pixLead.id,
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
        value: effectivePrice,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        description: cleanDescription(chosenService.name),
        externalReference: `${tenantId}_${sale.id}`,
      }, asaasKey, asaasUrl, idempotencyKey);

      if (!pay.id) {
        const errMsg = pay.errors ? pay.errors.map((e: any) => e.description).join(', ') : 'Erro ao criar pagamento PIX';
        throw new Error(errMsg);
      }

      let pixCopy = pay.pixCopiaECola || '';
      let pixQr = pay.pixQrCodeUrl || '';
      if ((!pixCopy || !pixQr) && pay.id) {
        try {
          const pixFallbackRes = await fetch(`${asaasUrl}/payments/${pay.id}/pixQrCode`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', 'access_token': asaasKey.trim() }
          });
          if (pixFallbackRes.ok) {
            const pixData = await pixFallbackRes.json();
            pixCopy = (typeof pixData.payload === 'string' ? pixData.payload : (pixData.payload?.payload || pixData.payload?.copyPaste)) || pixCopy;
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

      const displayPriceStr = getProductPriceLabel(chosenService) || `R$ ${effectivePrice.toFixed(2).replace(".", ",")}`;
      let msg = `🛒 *Resumo do Pedido:* ${chosenService.name}\n💰 *Valor:* ${displayPriceStr}\n📍 *Entrega:* ${address}`;
      if (chosenService.description) msg += `\n\n📄 *Detalhes do Produto:*\n${chosenService.description}`;
      if (Array.isArray(chosenService.features) && chosenService.features.length > 0) msg += `\n\n✨ *O que está incluso:*\n` + chosenService.features.map((f: any) => `• ${f}`).join("\n");
      msg += `\n\n💳 *Pagamento via PIX*`;
      if (pixCopy) msg += `\n\n🔑 O código Pix Copia e Cola será enviado na próxima mensagem para facilitar a cópia.`;
      if (!pixCopy && !pixQr && pay.invoiceUrl) msg += `\n\n🔗 *Link para pagamento:*\n${pay.invoiceUrl}`;
      else if (!pixCopy && !pixQr) msg += `\n\n❌ Não foi possível gerar o PIX. Tente novamente ou escolha outra forma de pagamento.`;
      msg += `\n\nApós a aprovação automática, seu pedido será liberado! 🚀`;
      if (pixCopy) msg += `\n\n---PIX-COPY---\n${pixCopy.trim()}`;
      if (pixQr) msg += `\n\n---IMAGE---\n${pixQr.replace(/^data:image\/[^;]+;base64,/, "")}`;

      const finalMessage = appendNodeCheckoutText(originNodeText, msg);
      await prisma.paymentOperation.update({
        where: { id: operation.id },
        data: { status: "completed", provider_id: pay.id, result: finalMessage },
      });
      return finalMessage;

    } catch (e: any) {
      console.error("Erro ao criar pagamento PIX direto:", e);
      await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
      return `❌ No momento o pagamento via PIX não está disponível. Caso queira prosseguir com a compra, entre em contato com o suporte.`;
    }
  }

  // PIX selected but no Asaas key
  if (billingType === 'PIX' && !asaasKey) {
    await prisma.systemConfig.delete({ where: { key: stateKey } }).catch(() => {});
    return `❌ No momento o pagamento via PIX não está disponível (chave de gateway não configurada). Entre em contato com o suporte para concluir sua compra.`;
  }

  // CREDIT_CARD or fallback
  const productNameEnc = encodeURIComponent(chosenService.name);
  const { getAppBaseUrl } = await import("@/lib/auth");
  const baseUrl = getAppBaseUrl();
  let checkoutUrl = `${baseUrl}/checkout/${tenantId}?product=${productNameEnc}&order=${order.id}`;
  if (customerName) checkoutUrl += `&name=${encodeURIComponent(customerName)}`;
  if (cleanDigits) checkoutUrl += `&phone=${encodeURIComponent(contactNumber)}`;
  if (customerEmail) checkoutUrl += `&email=${encodeURIComponent(customerEmail)}`;

  const checkoutLead = await findOrCreateLeadByPhone(tenantId, contactNumber, contactName);
  await prisma.sale.create({
    data: {
      tenant_id: tenantId,
      product_name: chosenService.name,
      amount: effectivePrice,
      status: "pending",
      lead_id: checkoutLead.id,
      notes: `customer_phone:${cleanDigits} | Link Checkout | customer_email:${customerEmail || ''} | customer_name:${customerName || ''}${extraNotes}`,
      due_date: new Date(Date.now() + 7 * 86400000),
      retail_order_id: order.id,
      payment_link: checkoutUrl,
    }
  }).catch(err => console.error("Erro ao registrar venda pendente do checkout:", err));

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
}

async function obterProximosDiasDisponiveis(tenantId: string, settings: any, durationMin: number = 60): Promise<Date[]> {
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
  const safeYear = todayParts.year;
  const current = new Date(Date.UTC(safeYear, todayParts.month - 1, todayParts.day, 12));

  // Percorre os próximos 31 dias para encontrar 5 dias com horarios disponiveis
  for (let i = 0; i < 31; i++) {
    const dayOfWeek = current.getUTCDay();
    const dayStr = businessDaysMap[dayOfWeek];
    const dateISO = current.toISOString().split("T")[0];
    
    const schedulePerDay = settings?.schedule_per_day || {};
    const dayConfig = schedulePerDay[dayStr];
    const isDayEnabled = dayConfig
      ? dayConfig.enabled !== false
      : enabledDays.includes(dayStr);
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
      // Verifica se o dia tem horarios disponiveis antes de incluir
      const slots = await getAvailableSlots(tenantId, current, durationMin, settings);
      if (slots.length > 0) {
        dates.push(new Date(current.getTime()));
      }
    }
    
    if (dates.length >= 5) break;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
}
