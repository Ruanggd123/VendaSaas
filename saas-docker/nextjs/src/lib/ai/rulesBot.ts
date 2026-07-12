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
  settings: any
): Promise<string> {
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

  // If user says "voltar", "menu" or "inicio", reset to main menu
  if (["voltar", "menu", "inicio", "olá", "ola", "oi", "bom dia", "boa tarde", "boa noite"].includes(cleanText) && state.step !== "main_menu") {
    state = { step: "main_menu", data: {} };
    await redis.set(stateKey, JSON.stringify(state), "EX", 3600); // 1 hour expiration
    return getMainMenuMessage(settings);
  }

  // 2. State Machine
  switch (state.step) {
    case "main_menu":
      if (cleanText === "1" || cleanText.includes("servico") || cleanText.includes("preco")) {
        const productsList = settings.products || [];
        if (productsList.length === 0) {
          return "📋 No momento não temos serviços cadastrados no catálogo. Digite *4* para falar com um atendente.\n\nDigite *voltar* para retornar ao menu principal.";
        }
        let response = "📋 *Nossos Serviços e Preços:*\n\n";
        productsList.forEach((p: any, idx: number) => {
          response += `${idx + 1}️⃣ *${p.name}* - R$ ${p.price}\n`;
          if (p.description) response += `   _${p.description}_\n`;
          response += "\n";
        });
        response += "Digite *voltar* para retornar ao menu principal ou *3* para agendar um horário.";
        return response;
      }
      
      if (cleanText === "2" || cleanText.includes("horario") || cleanText.includes("contato")) {
        const start = settings.business_hours_start || "08:00";
        const end = settings.business_hours_end || "18:00";
        const daysMap: Record<string, string> = {
          mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta", fri: "Sexta", sat: "Sábado", sun: "Domingo"
        };
        const activeDays = (settings.business_days || ["mon", "tue", "wed", "thu", "fri"])
          .map((d: string) => daysMap[d] || d)
          .join(", ");

        let response = "🕐 *Informações de Atendimento:*\n\n";
        response += `📅 *Dias de atendimento:* ${activeDays}\n`;
        response += `🕒 *Horário:* ${start} às ${end}\n`;
        if (settings.manager_phone) {
          response += `📞 *Contato Direto:* ${settings.manager_phone}\n`;
        }
        response += "\nDigite *voltar* para retornar ao menu principal.";
        return response;
      }

      if (cleanText === "3" || cleanText.includes("agendar") || cleanText.includes("reserva")) {
        if (settings.module_scheduling === false) {
          return "📅 Desculpe, os agendamentos online estão temporariamente desativados. Digite *4* para falar com um atendente.\n\nDigite *voltar* para retornar ao menu.";
        }
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

      if (cleanText === "4" || cleanText.includes("atendente") || cleanText.includes("humano") || cleanText.includes("pessoa")) {
        // Pausar o atendimento automático e notificar equipe
        await prisma.conversation.updateMany({
          where: { tenant_id: tenantId, contact_number: contactNumber },
          data: { 
            ai_paused: true,
            last_message: `Cliente solicitou atendimento humano: "${userMessage}"`
          }
        });
        
        // Notificar canal de atendimento se configurado
        if (settings.manager_phone) {
          await prisma.message.create({
            data: {
              tenant_id: tenantId,
              contact_number: settings.manager_phone,
              content: `📢 Novo pedido de atendimento humano de ${contactNumber}: "${userMessage}"`,
              direction: 'outbound',
              status: 'pending'
            }
          });
        }

        await redis.del(stateKey);
        return `👋 *Atendimento humano solicitado!*\n\nUm atendente entrará em contato em breve.\n\n📞 Número para contato: ${contactNumber}\n⏳ Aguarde por favor...`;
      }

      // Default Fallback
      return getMainMenuMessage(settings);

    case "scheduling_select_service": {
      const optionIdx = parseInt(cleanText, 10) - 1;
      const productsList = settings.products || [];
      if (isNaN(optionIdx) || optionIdx < 0 || optionIdx >= productsList.length) {
        return "❌ Opção inválida. Por favor, envie apenas o número do serviço desejado (ex: 1) ou *voltar* para cancelar.";
      }
      
      const chosenService = productsList[optionIdx];
      state.step = "scheduling_select_date";
      state.data = { serviceName: chosenService.name, servicePrice: chosenService.price, duration: chosenService.duration_min || 60 };
      
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return `Você selecionou *${chosenService.name}*.\n\n📅 Agora, digite a data desejada (ex: *Amanhã*, *Segunda-feira*, ou informe a data como *15/07*):`;
    }

    case "scheduling_select_date": {
      state.step = "scheduling_select_time";
      state.data.date = userMessage.trim();
      
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return `Data definida: *${state.data.date}*.\n\n🕒 Qual o horário desejado? (ex: *14:00*, *10:30*):`;
    }

    case "scheduling_select_time": {
      state.step = "scheduling_confirm";
      state.data.time = userMessage.trim();
      
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      
      let confirmMsg = `✍️ *Por favor, confirme seus dados:*\n\n`;
      confirmMsg += `🛠 *Serviço:* ${state.data.serviceName} (R$ ${state.data.servicePrice})\n`;
      confirmMsg += `📅 *Data:* ${state.data.date}\n`;
      confirmMsg += `🕒 *Horário:* ${state.data.time}\n\n`;
      confirmMsg += `Digite *1* para Confirmar ou *2* para Cancelar.`;
      return confirmMsg;
    }

    case "scheduling_confirm": {
      if (cleanText === "1" || cleanText.includes("confirm") || cleanText.includes("sim")) {
        // Book the appointment
        const parsedDate = parseDateAndTime(state.data.date, state.data.time);
        const startDateTime = parsedDate || new Date(); // fallback to now if parse fails

        // Save to DB
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
        return `🎉 *Agendamento confirmado com sucesso!*\n\nSeu horário para *${state.data.serviceName}* está marcado para o dia *${state.data.date}* às *${state.data.time}*.\n\nObrigado e até logo!`;
      }
      
      // Cancelled or 2
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return `❌ Agendamento cancelado.\n\n${getMainMenuMessage(settings)}`;
    }

    default:
      state = { step: "main_menu", data: {} };
      await redis.set(stateKey, JSON.stringify(state), "EX", 3600);
      return getMainMenuMessage(settings);
  }
}

function getMainMenuMessage(settings: any): string {
  const company = settings.ai_name || "Nossa Empresa";
  const welcomeMsg = settings.welcome_message || `Olá! Seja bem-vindo(a) ao atendimento da *${company}*! 🤖👋`;
  
  return `${welcomeMsg}\n\n*MENU PRINCIPAL* - Digite o número da opção:\n\n` +
    `1️⃣ *Serviços* - Lista completa com preços\n` +
    `2️⃣ *Horário* - Nosso funcionamento\n` +
    `3️⃣ *Agendar* - Marque seu horário\n` +
    `4️⃣ *Atendente* - Falar com uma pessoa\n\n` +
    `Exemplo: digite *1* para ver serviços`;
}

function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  try {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDate();

    const cleanDate = dateStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanDate.includes("amanha")) {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      day = tomorrow.getDate();
      month = tomorrow.getMonth();
      year = tomorrow.getFullYear();
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
        }
      }
    }

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
