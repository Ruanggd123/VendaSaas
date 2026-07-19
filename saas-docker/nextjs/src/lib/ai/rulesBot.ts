import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: 6379,
  maxRetriesPerRequest: null,
});

interface BotState {
  step: string;
  data: Record<string, any>;
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

  const stateKey = `rulesbot:state:${tenantId}:${contactNumber}`;
  
  // 1. Get current state from Redis
  const rawState = await redis.get(stateKey);
  let state: BotState = { step: "main_menu", data: {} };
  
  if (rawState) {
    try {
      state = JSON.parse(rawState);
    } catch {}
  }

  const cleanText = userMessage
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const customNodes = settings.custom_rules_nodes || [];

  // Check for pending debt / unpaid sale for this customer
  const pendingSale = await prisma.sale.findFirst({
    where: {
      tenant_id: tenantId,
      status: "pending",
      notes: { contains: `customer_phone:${contactNumber}` }
    },
    orderBy: { created_at: "desc" }
  });

  if (pendingSale && state.step !== "debt_paying") {
    state.step = "debt_paying";
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
    return `Olá! Verificamos em nosso sistema que você possui um pagamento pendente para *${pendingSale.product_name}* no valor de R$ ${pendingSale.amount.toFixed(2)}.\n\nGostaria de realizar o pagamento agora para liberar seu pedido?\n\n1️⃣ Sim, pagar agora\n2️⃣ Não, ir para o menu principal\n\nResponda *1* ou *2*:`;
  }

  if (state.step === "debt_paying") {
    if (cleanText === "1" || cleanText.includes("sim") || cleanText.includes("pagar")) {
      await redis.del(stateKey);
      if (pendingSale?.payment_link) {
        return `💳 Para efetuar o pagamento seguro via PIX ou Cartão, clique no link abaixo:\n🔗 ${pendingSale.payment_link}\n\nAssim que o pagamento for confirmado, enviaremos um aviso aqui para você! 🚀`;
      } else {
        return `Você pode realizar o pagamento presencialmente ou solicitar uma chave PIX com nosso atendente.`;
      }
    } else if (cleanText === "2" || cleanText.includes("nao") || cleanText.includes("não") || cleanText === "menu" || cleanText === "voltar") {
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    } else {
      return `Por favor, responda com *1* para Pagar Agora ou *2* para ir para o Menu Principal.`;
    }
  }

  // Handle "voltar" navigation
  if (["0", "voltar", "menu", "inicio", "olá", "ola", "oi", "bom dia", "boa tarde", "boa noite"].includes(cleanText)) {
    if (state.step === "main_menu") {
      return getMainMenuMessage(settings);
    }

    if (state.step.startsWith("submenu:")) {
      const currentSubmenuId = state.step.replace("submenu:", "");
      const currentNode = customNodes.find((n: any) => n.id === currentSubmenuId);
      
      if (currentNode && currentNode.parentId) {
        state.step = `submenu:${currentNode.parentId}`;
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        
        const parentNode = customNodes.find((n: any) => n.id === currentNode.parentId);
        return getSubmenuMessage(parentNode, customNodes);
      } else {
        state.step = "main_menu";
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        return getMainMenuMessage(settings);
      }
    }

    // Default fallback: reset to main menu
    state = { step: "main_menu", data: {} };
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
    return getMainMenuMessage(settings);
  }

  // Handle "atendente" transition natively
  if (["atendente", "falar com atendente", "humano", "suporte", "chamar atendente"].includes(cleanText) || (cleanText === "4" && state.step === "main_menu")) {
    await prisma.conversation.updateMany({
      where: { tenant_id: tenantId, contact_number: contactNumber },
      data: { ai_paused: true }
    });
    return "";
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
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    }
    const optionIdx = parseInt(cleanText, 10) - 1;
    const productsList = settings.products || [];
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= productsList.length) {
      return "❌ Opção inválida. Digite o número correspondente ao produto/serviço que deseja contratar/comprar, ou *0* para voltar ao menu.";
    }
    const chosenService = productsList[optionIdx];
    
    // Clear state after selection
    await redis.del(stateKey);

    let response = `Você selecionou: *${chosenService.name}*\n`;
    if (chosenService.description) response += `${chosenService.description}\n\n`;
    response += `Valor: R$ ${chosenService.price}\n\n`;
    
    // Adicionar imagem, se existir, para que o queue processor envie como mídia
    if (chosenService.image_url) {
      response += `${chosenService.image_url}\n\n`;
    }

    // Determinar o tipo de produto/entrega
    const deliveryType = chosenService.delivery_type || "physical";
    const deadline = chosenService.delivery_deadline || "imediato";
    
    state.data = { chosenService };

    if (deliveryType === "virtual_instant") {
      const addr = "Envio Digital Imediato";
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, chosenService, addr, settings, stateKey);
    } else if (deliveryType === "virtual_deadline") {
      const addr = `Envio Digital (Prazo: ${deadline})`;
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, chosenService, addr, settings, stateKey);
    } else if (deliveryType === "both") {
      state.step = "catalog_select_both_methods";
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return `🛒 *Você selecionou:* ${chosenService.name}\n💰 *Valor:* R$ ${parseFloat(chosenService.price).toFixed(2)}\n\nEste produto está disponível nas opções Digital e Física. Como prefere receber?\n1️⃣ Envio Digital (Prazo: ${deadline})\n2️⃣ Entrega Física no meu endereço\n\nResponda com o número correspondente (*1* ou *2*):`;
    } else {
      // Default: physical
      state.step = "catalog_select_delivery_method";
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return `🛒 *Você selecionou:* ${chosenService.name}\n💰 *Valor:* R$ ${parseFloat(chosenService.price).toFixed(2)}\n\nComo deseja receber o produto/serviço?\n1️⃣ Entrega (Delivery)\n2️⃣ Retirada na Loja / Presencial\n\nResponda com o número correspondente (*1* ou *2*):`;
    }
  }

  if (state.step === "catalog_select_both_methods") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    }

    if (cleanText !== "1" && cleanText !== "2") {
      return "❌ Opção inválida. Digite *1* para Envio Digital ou *2* para Entrega Física:";
    }

    const chosenService = state.data.chosenService;
    const deadline = chosenService.delivery_deadline || "imediato";

    if (cleanText === "1") {
      const addr = `Envio Digital (Prazo: ${deadline})`;
      state.data.address = addr;
      return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, chosenService, addr, settings, stateKey);
    } else {
      state.step = "catalog_input_address";
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return "🚚 Por favor, envie seu endereço completo de entrega (Rua, Número, Bairro, Cidade):";
    }
  }

  if (state.step === "catalog_select_delivery_method") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    }

    if (cleanText !== "1" && cleanText !== "2") {
      return "❌ Opção inválida. Digite *1* para Entrega (Delivery) ou *2* para Retirada na Loja:";
    }

    if (cleanText === "1") {
      state.step = "catalog_input_address";
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return "🚚 Por favor, envie seu endereço completo de entrega (Rua, Número, Bairro, Cidade):";
    } else {
      state.data.address = "Retirada na Loja";
      return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, state.data.chosenService, "Retirada na Loja", settings, stateKey);
    }
  }

  if (state.step === "catalog_input_address") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    }
    const address = userMessage.trim();
    return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, state.data.chosenService, address, settings, stateKey);
  }

  // Handle Scheduling steps
  if (state.step === "scheduling_select_service") {
    const optionIdx = parseInt(cleanText, 10) - 1;
    const productsList = settings.products || [];
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= productsList.length) {
      return "❌ Opção inválida. Envie o número do serviço desejado ou *0* para cancelar.";
    }
    const chosenService = productsList[optionIdx];
    const availableDates = obterProximosDiasDisponiveis(settings);

    state.step = "scheduling_select_date";
    state.data = {
      serviceName: chosenService.name,
      servicePrice: chosenService.price,
      duration: chosenService.duration_min || 60,
      availableDates: availableDates.map(d => d.toISOString())
    };
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);

    const WEEKDAY_NAMES_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    let response = `Você selecionou *${chosenService.name}*.\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
    availableDates.forEach((d, idx) => {
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      response += `${idx + 1}️⃣ ${WEEKDAY_NAMES_PT[d.getDay()]} (${dateStr})\n`;
    });
    response += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
    return response;
  }

  if (state.step === "scheduling_select_date") {
    if (cleanText === "0" || cleanText === "voltar" || cleanText === "menu") {
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
    }
    
    const optionIdx = parseInt(cleanText, 10) - 1;
    const availableDates = state.data.availableDates || [];
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= availableDates.length) {
      return `❌ Opção inválida. Digite o número correspondente à data desejada (1-${availableDates.length}) ou *0* para voltar:`;
    }

    const chosenDate = new Date(availableDates[optionIdx]);
    const dateFormatted = `${chosenDate.getDate().toString().padStart(2, '0')}/${(chosenDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    state.data.date = dateFormatted;
    state.data.parsedDate = chosenDate.toISOString();
    state.step = "scheduling_select_period";
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
    
    return `Data definida: *${dateFormatted}*.\n\nEscolha o período desejado:\n1️⃣ Manhã\n2️⃣ Tarde\n\nDigite o número da opção ou *0* para voltar.`;
  }

  if (state.step === "scheduling_select_period") {
    if (cleanText !== "1" && cleanText !== "2") {
      return "❌ Opção inválida. Digite *1* para Manhã ou *2* para Tarde:";
    }

    const parsedDate = new Date(state.data.parsedDate);
    const slots = await getAvailableSlots(tenantId, parsedDate, state.data.duration || 60, settings);
    
    const isMorning = cleanText === "1";
    const filteredSlots = slots.filter(s => {
      const hour = parseInt(s.split(":")[0], 10);
      return isMorning ? hour < 12 : hour >= 12;
    });

    if (filteredSlots.length === 0) {
      return `❌ Não há horários disponíveis para o período da ${isMorning ? 'Manhã' : 'Tarde'} nesta data. Por favor, digite outra data (ex: *Amanhã*, *Segunda-feira*):`;
    }

    state.data.period = isMorning ? "manha" : "tarde";
    state.data.availableSlots = filteredSlots;
    state.step = "scheduling_select_time";
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);

    let response = `🕒 *Horários disponíveis (${isMorning ? 'Manhã' : 'Tarde'}):*\n\n`;
    filteredSlots.forEach((s, idx) => {
      response += `${idx + 1}️⃣ ${s}\n`;
    });
    response += `\nDigite o número do horário desejado ou *0* para voltar.`;
    return response;
  }

  if (state.step === "scheduling_select_time") {
    const optionIdx = parseInt(cleanText, 10) - 1;
    const availableSlots = state.data.availableSlots || [];
    if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= availableSlots.length) {
      return "❌ Opção inválida. Digite o número correspondente ao horário desejado:";
    }

    const chosenTime = availableSlots[optionIdx];
    state.step = "scheduling_confirm";
    state.data.time = chosenTime;
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
    
    let confirmMsg = `✍️ *Por favor, confirme seus dados:*\n\n`;
    confirmMsg += `🛠 *Serviço:* ${state.data.serviceName} (R$ ${state.data.servicePrice})\n`;
    confirmMsg += `📅 *Data:* ${state.data.date}\n`;
    confirmMsg += `🕒 *Horário:* ${state.data.time}\n\n`;
    confirmMsg += `Digite *1* para Confirmar ou *2* para Cancelar.`;
    return confirmMsg;
  }

  if (state.step === "scheduling_confirm") {
    if (cleanText === "1" || cleanText.includes("confirm") || cleanText.includes("sim")) {
      const parsedDate = parseDateAndTime(state.data.date, state.data.time);
      const startDateTime = parsedDate || new Date();
      await prisma.appointment.create({
        data: {
          tenant_id: tenantId,
          service_name: state.data.serviceName,
          duration_min: state.data.duration || 60,
          scheduled_at: startDateTime,
          status: "scheduled",
          notes: `customer_phone:${contactNumber} | RulesBot Booking`
        }
      });
      await redis.del(stateKey);
      return `🎉 *Agendamento confirmado com sucesso!*\n\nSeu horário para *${state.data.serviceName}* está marcado para o dia *${state.data.date}* às *${state.data.time}*.\n\nObrigado!`;
    }
    state = { step: "main_menu", data: {} };
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
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

  // Match keyword in the active level
  if (activeLevelNodes.length > 0) {
    const matchedNode = activeLevelNodes.find((node: any) => {
      const cleanKeyword = node.keyword.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return cleanText === cleanKeyword || cleanText.includes(cleanKeyword);
    });

    if (matchedNode) {
      const hasChildren = customNodes.some((n: any) => n.parentId === matchedNode.id);
      let response = "";

      if (matchedNode.actionType === "catalog") {
        const productsList = settings.products || [];
        if (productsList.length === 0) {
          response = "📋 No momento não temos serviços cadastrados no catálogo.";
        } else {
          response = "📋 *Nossos Serviços e Preços:*\n\n";
          productsList.forEach((p: any, idx: number) => {
            response += `${idx + 1}️⃣ *${p.name}* - R$ ${p.price}\n`;
            if (p.description) response += `   _${p.description}_\n`;
            response += "\n";
          });
          response += "✍️ Se deseja contratar ou comprar algum destes serviços/produtos, responda enviando o número dele (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";
          state.step = "catalog_select_product";
          await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        }
      }
      else if (matchedNode.actionType === "scheduling") {
        const productsList = settings.products || [];
        if (productsList.length === 0) {
          return "📋 No momento não temos serviços disponíveis para agendamento. Digite *voltar* para retornar.";
        }
        
        let response = "📅 *Iniciar Agendamento*\nSelecione o número do serviço que deseja agendar:\n\n";
        productsList.forEach((p: any, idx: number) => {
          response += `${idx + 1}️⃣ ${p.name} (R$ ${p.price})\n`;
        });
        response += "\nDigite o número do serviço ou *voltar* para cancelar.";
        
        state.step = "scheduling_select_service";
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        return response;
      }
      else if (matchedNode.actionType === "human") {
        await prisma.conversation.updateMany({
          where: { tenant_id: tenantId, contact_number: contactNumber },
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
        return matchedNode.textContent || "";
      }
      else {
        // default text / submenu Presentation text
        response = matchedNode.textContent || "";
      }

      // If this option matched has further derivations (children submenus), transition to submenu step and list them
      if (hasChildren) {
        state.step = `submenu:${matchedNode.id}`;
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        
        if (response) response += "\n\n";
        response += getSubmenuMessage(matchedNode, customNodes);
        return response;
      }

      return response || "Opção registrada.";
    }
  }

  // Fallback: se não tem nós customizados, tenta match por número do produto
  if (state.step === "main_menu" && (settings.custom_rules_nodes || []).length === 0) {
    const productsList = settings.products || [];
    const optionIdx = parseInt(cleanText, 10) - 1;
    if (!isNaN(optionIdx) && optionIdx >= 0 && optionIdx < productsList.length) {
      const chosen = productsList[optionIdx];
      // Se for serviço com agendamento, vai pra etapa de agendar
      if (chosen.delivery_type === 'service') {
        const availableDates = obterProximosDiasDisponiveis(settings);
        state.step = "scheduling_select_date";
        state.data = {
          serviceName: chosen.name, servicePrice: chosen.price,
          duration: chosen.duration_min || 60,
          availableDates: availableDates.map((d: Date) => d.toISOString())
        };
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        const WEEKDAY_NAMES_PT = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        let resp = `Você selecionou *${chosen.name}*.\n\n📅 Escolha um dos dias disponíveis abaixo:\n\n`;
        availableDates.forEach((d: Date, idx: number) => {
          const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          resp += `${idx + 1}️⃣ ${WEEKDAY_NAMES_PT[d.getDay()]} (${dateStr})\n`;
        });
        resp += `\nDigite o número correspondente (1-${availableDates.length}) ou *0* para voltar:`;
        return resp;
      }
      // Para outros tipos, inicia fluxo de compra
      state.step = "catalog_select_product";
      state.data = {};
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      // Redireciona simulando que entrou no catálogo
      const deliveryType = chosen.delivery_type || "virtual_instant";
      const deadline = chosen.delivery_deadline || "imediato";
      state.data.chosenService = chosen;
      if (deliveryType === "virtual_instant") {
        const addr = "Envio Digital Imediato";
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, chosen, addr, settings, stateKey);
      } else if (deliveryType === "virtual_deadline") {
        const addr = `Envio Digital (Prazo: ${deadline})`;
        state.data.address = addr;
        return await processarFinalizacaoPedidoRulesBot(tenantId, contactNumber, chosen, addr, settings, stateKey);
      } else if (deliveryType === "both") {
        state.step = "catalog_select_both_methods";
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        return `🛒 *Você selecionou:* ${chosen.name}\n💰 *Valor:* R$ ${parseFloat(chosen.price).toFixed(2)}\n\nEste produto está disponível nas opções Digital e Física. Como prefere receber?\n1️⃣ Envio Digital (Prazo: ${deadline})\n2️⃣ Entrega Física no meu endereço\n\nResponda com o número correspondente (*1* ou *2*):`;
      } else {
        state.step = "catalog_select_delivery_method";
        await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
        return `🛒 *Você selecionou:* ${chosen.name}\n💰 *Valor:* R$ ${parseFloat(chosen.price).toFixed(2)}\n\nComo deseja receber o produto/serviço?\n1️⃣ Entrega (Delivery)\n2️⃣ Retirada na Loja / Presencial\n\nResponda com o número correspondente (*1* ou *2*):`;
      }
    }
  }

  // Keyword unmatched fallback
  if (state.step === "main_menu") {
    return `Desculpe, não entendi. Selecione uma opção válida:\n\n${getMainMenuMessage(settings)}`;
  } else if (state.step.startsWith("submenu:")) {
    const currentSubmenuId = state.step.replace("submenu:", "");
    const parentNode = customNodes.find((n: any) => n.id === currentSubmenuId);
    return `Opção inválida. Selecione uma das opções abaixo:\n\n${getSubmenuMessage(parentNode, customNodes)}`;
  }

  return "Olá! Digite *menu* para iniciar o auto-atendimento.";
}

function getMainMenuMessage(settings: any): string {
  let msg = settings.welcome_message || "Olá! Seja bem-vindo(a) ao nosso atendimento! 🤖👋\n\n";
  
  const rootNodes = (settings.custom_rules_nodes || []).filter((n: any) => !n.parentId);
  if (rootNodes.length > 0) {
    msg += "Escolha uma das opções abaixo:\n";
    rootNodes.forEach((node: any) => {
      msg += `\n*${node.keyword}* - ${node.title}`;
    });
  } else {
    // Auto-gera menu a partir dos produtos cadastrados
    const products = settings.products || [];
    if (products.length > 0) {
      msg += "Confira nossos produtos e serviços:\n";
      products.forEach((p: any, i: number) => {
        const idx = i + 1;
        if (p.delivery_type === 'service') {
          msg += `\n*${idx}* - ${p.name} (agendamento)\n   R$ ${p.price} · ${p.duration_min || 60}min`;
        } else if (p.stock !== undefined && p.stock !== null) {
          msg += `\n*${idx}* - ${p.name}\n   R$ ${p.price} · ${p.stock > 0 ? p.stock + ' restantes' : 'ESGOTADO'}`;
        } else {
          msg += `\n*${idx}* - ${p.name}\n   R$ ${p.price}`;
        }
      });
      msg += "\n\nDigite o *número* do produto para mais detalhes.";
    } else {
      msg += "Nenhum produto disponível no momento.";
    }
  }
  
  return msg;
}

function getSubmenuMessage(parentNode: any, allNodes: any[]): string {
  let msg = "";
  if (parentNode.actionType !== "catalog" && parentNode.actionType !== "text") {
    msg += `📂 *${parentNode.title}*\n`;
  }
  msg += `Selecione uma das opções abaixo:\n\n`;
  
  const subNodes = allNodes.filter((n: any) => n.parentId === parentNode.id);
  subNodes.forEach((node: any) => {
    msg += `*${node.keyword}* - ${node.title}\n`;
  });
  
  msg += "\nDigite *0* ou *voltar* para retornar ao menu anterior.";
  return msg;
}

function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  try {
    const today = new Date();
    let year = today.getFullYear();
    if (year < 2026) year = 2026;
    let month = today.getMonth();
    let day = today.getDate();

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      day = tomorrow.getDate();
      month = tomorrow.getMonth();
      year = tomorrow.getFullYear();
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
          let diff = targetDay - today.getDay();
          if (diff <= 0) diff += 7;
          const targetDate = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
          day = targetDate.getDate();
          month = targetDate.getMonth();
          year = targetDate.getFullYear();
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

    const result = new Date(year, month, day, hours, minutes, 0);
    if (isNaN(result.getTime())) return null;
    return result;
  } catch {
    return null;
  }
}

function parseDateOnly(dateStr: string): Date | null {
  try {
    const today = new Date();
    let year = today.getFullYear();
    if (year < 2026) year = 2026;
    let month = today.getMonth();
    let day = today.getDate();

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      day = tomorrow.getDate();
      month = tomorrow.getMonth();
      year = tomorrow.getFullYear();
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
          let diff = targetDay - today.getDay();
          if (diff <= 0) diff += 7;
          const targetDate = new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
          day = targetDate.getDate();
          month = targetDate.getMonth();
          year = targetDate.getFullYear();
          if (year < 2026) year = 2026;
        } else {
          return null;
        }
      }
    }
    if (year < 2026) year = 2026;
    const result = new Date(year, month, day, 0, 0, 0, 0);
    if (isNaN(result.getTime())) return null;
    return result;
  } catch {
    return null;
  }
}

async function getAvailableSlots(tenantId: string, date: Date, durationMin: number, settings: any): Promise<string[]> {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenant_id: tenantId,
      scheduled_at: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ["scheduled", "confirmed"],
      },
    },
  });

  const startHourStr = settings.business_hours_start || "08:00";
  const endHourStr = settings.business_hours_end || "18:00";

  const [startH, startM] = startHourStr.split(":").map(Number);
  const [endH, endM] = endHourStr.split(":").map(Number);

  const startLimit = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startH, startM, 0, 0);
  const endLimit = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endH, endM, 0, 0);

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
      const h = String(current.getHours()).padStart(2, "0");
      const m = String(current.getMinutes()).padStart(2, "0");
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
  stateKey: string
): Promise<string> {
  try {
    const order = await prisma.retailOrder.create({
      data: {
        tenant_id: tenantId,
        total_amount: parseFloat(chosenService.price),
        shipping_address: address,
        status: "cart",
        items: {
          create: [
            {
              product_name: chosenService.name,
              unit_price: parseFloat(chosenService.price),
              quantity: 1
            }
          ]
        }
      }
    });

    const requiresPayment = chosenService.requires_payment !== false && chosenService.requires_payment !== "false";

    if (requiresPayment) {
      const productName = encodeURIComponent(chosenService.name);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const checkoutUrl = `${baseUrl}/checkout/${tenantId}?product=${productName}`;

      await redis.del(stateKey);

      return `🛒 *Produto:* ${chosenService.name}\n💰 *Valor:* R$ ${parseFloat(chosenService.price).toFixed(2)}\n🚚 *Método/Endereço:* ${address}\n\n🔗 *Clique no link abaixo para finalizar a compra:*\n${checkoutUrl}\n\nApós o pagamento, enviaremos a confirmação aqui! 🚀`;

    } else {
      await prisma.sale.create({
        data: {
          tenant_id: tenantId,
          product_name: chosenService.name,
          amount: parseFloat(chosenService.price),
          status: "pending",
          notes: `customer_phone:${contactNumber} | presencial | address:${address}`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      await redis.del(stateKey);

      return `🛒 *Produto:* ${chosenService.name}\n💰 *Valor:* R$ ${parseFloat(chosenService.price).toFixed(2)}\n🚚 *Método/Endereço:* ${address}\n\n✅ Pedido registrado com sucesso! O pagamento será realizado presencialmente na retirada ou momento da entrega. Obrigado!`;
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
  const today = new Date();
  let current = new Date(today.getTime());

  // Garante que o ano está corrigido se houver clock drift
  if (current.getFullYear() < 2026) {
    current.setFullYear(2026);
  }

  // Percorre os próximos 14 dias para encontrar 5 dias válidos
  for (let i = 0; i < 14; i++) {
    const dayOfWeek = current.getDay();
    const dayStr = businessDaysMap[dayOfWeek];
    const dateISO = current.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const isDayEnabled = enabledDays.includes(dayStr);
    const isBlocked = blockedDates.includes(dateISO);
    
    // Evita agendar para o passado no próprio dia atual se a hora limite já passou
    const isToday = i === 0;
    let isPast = false;
    if (isToday) {
      const endHourStr = settings.business_hours_end || "18:00";
      const [endH, endM] = endHourStr.split(":").map(Number);
      const limit = new Date(current.getFullYear(), current.getMonth(), current.getDate(), endH, endM, 0);
      if (new Date().getTime() > limit.getTime()) {
        isPast = true;
      }
    }

    if (isDayEnabled && !isBlocked && !isPast) {
      dates.push(new Date(current.getTime()));
    }
    
    if (dates.length >= 5) break;
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}
