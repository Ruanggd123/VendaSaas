import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Segurança do Cron
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    console.log("⏳ [CRON HOURLY] Iniciando rotina horária...");

    // Encontra todos os agendamentos confirmados para a próxima hora
    const now = new Date();
    const inOneHourStart = new Date(now);
    inOneHourStart.setMinutes(inOneHourStart.getMinutes() + 50); // janela de tolerância
    const inOneHourEnd = new Date(now);
    inOneHourEnd.setMinutes(inOneHourEnd.getMinutes() + 70);

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: "scheduled",
        scheduled_at: { gte: inOneHourStart, lte: inOneHourEnd }
      },
      include: { 
        tenant: { include: { whatsapp_instances: { where: { status: "open" }, take: 1 } } },
        lead: true 
      }
    });

    for (const appt of upcomingAppointments) {
      if (appt.tenant.whatsapp_instances.length === 0 || !appt.lead || !appt.lead.phone) continue;
      
      const instanceName = appt.tenant.whatsapp_instances[0].name;
      const time = appt.scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      const name = appt.lead.name || "Cliente";
      
      console.log(`[Tenant ${appt.tenant_id}] Lembrete 1h enviado para ${appt.lead.phone}`);
      const msg = `Olá, ${name}! Só passando para lembrar que nosso agendamento é daqui a pouco, às *${time}*.\nAté já!`;
      
      await sendWhatsAppMessage(instanceName, appt.lead.phone, msg);
    }

    // Auto-conclusão de agendamentos passados (considerando duração)
    const pastAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ["scheduled", "confirmed"] },
        scheduled_at: { lte: new Date() },
      },
      select: { id: true, scheduled_at: true, duration_min: true },
    });

    const toComplete = pastAppointments.filter(
      a => new Date(a.scheduled_at).getTime() + (a.duration_min || 60) * 60000 < Date.now()
    );

    let autoCompletedCount = 0;
    if (toComplete.length > 0) {
      const result = await prisma.appointment.updateMany({
        where: { id: { in: toComplete.map(a => a.id) } },
        data: { status: "completed" },
      });
      autoCompletedCount = result.count;
    }

    console.log(`✅ [CRON HOURLY] Finalizado. ${upcomingAppointments.length} lembretes enviados, ${autoCompletedCount} agendamentos auto-concluídos.`);
    return NextResponse.json({ success: true, processed: upcomingAppointments.length, autoCompleted: autoCompletedCount });
  } catch (error: any) {
    console.error("❌ [CRON HOURLY] Erro fatal:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
