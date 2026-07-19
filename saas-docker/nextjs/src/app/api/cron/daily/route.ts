import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic"; // Importante para rotas de Cron

// Feriados Nacionais Fixos (MM-DD)
const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "Confraternização Universal",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalhador",
  "09-07": "Independência do Brasil",
  "10-12": "Nossa Senhora Aparecida",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "12-25": "Natal",
};

export async function GET(req: Request) {
  try {
    // Para segurança básica de cron job exposto
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("⏰ [CRON DAILY] Iniciando rotina diária...");

    const tenants = await prisma.tenant.findMany({
      include: {
        whatsapp_instances: { where: { status: "open" }, take: 1 }
      }
    });

    const now = new Date();
    
    // Calcula a data daqui a 5 dias para checar feriados
    const in5Days = new Date();
    in5Days.setDate(in5Days.getDate() + 5);
    const month = String(in5Days.getMonth() + 1).padStart(2, '0');
    const day = String(in5Days.getDate()).padStart(2, '0');
    const holidayKey = `${month}-${day}`;
    const upcomingHoliday = FIXED_HOLIDAYS[holidayKey];

    // Calcula amanhã (para lembretes 24h)
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    for (const tenant of tenants) {
      if (tenant.whatsapp_instances.length === 0) continue; // Sem WhatsApp conectado
      const instanceName = tenant.whatsapp_instances[0].name;

      let settings: any = {};
      try { settings = JSON.parse(tenant.settings as string || "{}"); } catch {}

      // ---------------------------------------------------------
      // 1. FERIADOS PROATIVOS (Aviso de 5 dias)
      // ---------------------------------------------------------
      if (upcomingHoliday && settings.manager_phone) {
        const fullDate = `${in5Days.getFullYear()}-${month}-${day}`;
        // Se a data já não estiver no array de bloqueados, nós avisamos/adicionamos
        if (!settings.blocked_dates?.includes(fullDate)) {
          console.log(`[Tenant ${tenant.id}] Avisando chefe sobre feriado: ${upcomingHoliday}`);
          
          // Adicionamos no banco como bloqueado por precaução
          const newBlocked = [...(settings.blocked_dates || []), fullDate];
          settings.blocked_dates = newBlocked;
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { settings: JSON.stringify(settings) }
          });

          const msg = `Olá! Daqui a 5 dias teremos o feriado de *${upcomingHoliday}* (${day}/${month}).\n\nPor precaução, eu já bloqueei sua agenda para este dia. Você deseja abrir a agenda para trabalhar ou prefere manter fechada?\n\nResponda "Abrir agenda dia ${day}/${month}" se for trabalhar.`;
          await sendWhatsAppMessage(instanceName, settings.manager_phone, msg);
        }
      }

      // ---------------------------------------------------------
      // 2. COBRANÇA DE INADIMPLENTES
      // ---------------------------------------------------------
      if (settings.auto_charge_enabled === "true") {
        const graceDays = parseInt(settings.auto_charge_days || "3");
        
        // Pega vendas pendentes e vencidas há mais que graceDays
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - graceDays);
        
        const unpaidSales = await prisma.sale.findMany({
          where: {
            tenant_id: tenant.id,
            status: "pending",
            created_at: { lt: cutoffDate },
          }
        });

        for (const sale of unpaidSales) {
          console.log(`[Tenant ${tenant.id}] Venda atrasada ID: ${sale.id} - R$ ${sale.amount}`);
          
          let phone = "";
          if (sale.notes && sale.notes.includes("customer_phone:")) {
            const match = sale.notes.match(/customer_phone:(\d+)/);
            if (match) phone = match[1];
          }

          if (phone && sale.payment_link) {
             const msg = `Olá! Notamos que o pagamento referente a *${sale.product_name}* no valor de R$ ${sale.amount} está pendente.\n\nPara regularizar, acesse o link de pagamento: ${sale.payment_link}\n\nSe já efetuou o pagamento, desconsidere esta mensagem.`;
             await sendWhatsAppMessage(instanceName, phone, msg);
             console.log(`Mensagem de cobrança enviada para ${phone}`);
          }
        }
      }

      // ---------------------------------------------------------
      // 3. LEMBRETE 24 HORAS DE AGENDAMENTOS
      // ---------------------------------------------------------
      const appointmentsTomorrow = await prisma.appointment.findMany({
        where: {
          tenant_id: tenant.id,
          status: "scheduled", // Our schema defaults to "scheduled"
          scheduled_at: { gte: tomorrowStart, lte: tomorrowEnd }
        },
        include: { lead: true }
      });

      for (const appt of appointmentsTomorrow) {
        let phone = appt.lead?.phone;
        let name = appt.lead?.name || "Cliente";

        if (!phone && appt.notes && appt.notes.includes("customer_phone:")) {
          const match = appt.notes.match(/customer_phone:(\d+)/);
          if (match) phone = match[1];
        }

        if (phone) {
          console.log(`[Tenant ${tenant.id}] Lembrete 24h enviado para ${phone}`);
          const time = appt.scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          const msg = `Olá, ${name}! Passando para lembrar do seu agendamento amanhã às *${time}*.\nAté logo!`;
          await sendWhatsAppMessage(instanceName, phone, msg);
        }
      }
      // ---------------------------------------------------------
      // 4. RECUPERAÇÃO DE VENDAS / FOLLOW-UP AUTOMÁTICO (D-3)
      // ---------------------------------------------------------
      const threeDaysAgoStart = new Date();
      threeDaysAgoStart.setDate(threeDaysAgoStart.getDate() - 3);
      threeDaysAgoStart.setHours(0, 0, 0, 0);
      
      const threeDaysAgoEnd = new Date(threeDaysAgoStart);
      threeDaysAgoEnd.setHours(23, 59, 59, 999);

      const stalledLeads = await prisma.lead.findMany({
        where: {
          tenant_id: tenant.id,
          status: { in: ["novo", "atendimento"] },
          conversation: {
            last_message_at: { gte: threeDaysAgoStart, lte: threeDaysAgoEnd }
          }
        },
        include: { conversation: true }
      });

      for (const lead of stalledLeads) {
        if (lead.phone) {
          console.log(`[Tenant ${tenant.id}] Follow-up (D-3) enviado para ${lead.phone}`);
          const msg = `Oi, ${lead.name?.split(" ")[0] || "tudo bem"}! Sou eu novamente. Só passando pra saber se você conseguiu pensar na nossa conversa ou se ficou com alguma dúvida. Posso ajudar em algo? 😊`;
          await sendWhatsAppMessage(instanceName, lead.phone, msg);
        }
      }
    }

    console.log("✅ [CRON DAILY] Rotina diária finalizada com sucesso!");
    return NextResponse.json({ success: true, processed: tenants.length });
  } catch (error: any) {
    console.error("❌ [CRON DAILY] Erro fatal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
