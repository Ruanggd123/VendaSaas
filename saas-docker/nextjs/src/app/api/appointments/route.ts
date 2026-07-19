import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

// GET — lista agendamentos do tenant
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const isPartner = session.role === 'partner';
    const partnerLeadIds = isPartner
      ? (await prisma.lead.findMany({
          where: { partner_id: session.id, tenant_id: session.tenant_id },
          select: { id: true },
        })).map(l => l.id)
      : null;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // formato: "2026-07"

    let where: Record<string, unknown> = { tenant_id: session.tenant_id };
    if (isPartner && partnerLeadIds) {
      where.OR = [
        { lead_id: { in: partnerLeadIds } },
        { lead_id: null },
      ];
    }

    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);
      where.scheduled_at = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { lead: { select: { name: true, phone: true } } },
      orderBy: { scheduled_at: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error("GET /api/appointments:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — criar agendamento
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { service_name, duration_min, scheduled_at, lead_id, notes } = body;

    if (!service_name || !scheduled_at) {
      return NextResponse.json({ error: "service_name e scheduled_at são obrigatórios" }, { status: 400 });
    }

    // Parceiro só pode criar agendamento para lead próprio
    if (session.role === 'partner' && lead_id) {
      const lead = await prisma.lead.findFirst({
        where: { id: lead_id, partner_id: session.id },
      });
      if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    // Verifica conflito de horário
    const scheduledDate = new Date(scheduled_at);
    const endTime = new Date(scheduledDate.getTime() + (duration_min || 60) * 60000);

    const conflict = await prisma.appointment.findFirst({
      where: {
        tenant_id: session.tenant_id,
        status: { in: ["scheduled", "confirmed"] },
        scheduled_at: {
          gte: new Date(scheduledDate.getTime() - (duration_min || 60) * 60000),
          lt: endTime,
        },
      },
    });

    if (conflict) {
      return NextResponse.json({
        error: "Conflito de horário",
        message: `Já existe um agendamento de ${conflict.service_name} nesse horário.`,
      }, { status: 409 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenant_id: session.tenant_id,
        lead_id: lead_id || null,
        service_name,
        duration_min: duration_min || 60,
        scheduled_at: scheduledDate,
        notes: notes || null,
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/appointments:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH — atualizar status do agendamento
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, status, notes } = body;

    const appointment = await prisma.appointment.findFirst({
      where: { id, tenant_id: session.tenant_id },
    });

    if (!appointment) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    // Parceiro só pode alterar agendamento de lead próprio (ou sem lead)
    if (session.role === 'partner' && appointment.lead_id) {
      const lead = await prisma.lead.findFirst({
        where: { id: appointment.lead_id, partner_id: session.id },
      });
      if (!lead) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
    });

    return NextResponse.json({ appointment: updated });
  } catch (err) {
    console.error("PATCH /api/appointments:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — cancelar agendamento
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    // Parceiro só pode cancelar agendamento de lead próprio (ou sem lead)
    if (session.role === 'partner') {
      const apt = await prisma.appointment.findUnique({ where: { id } });
      if (!apt) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
      if (apt.lead_id) {
        const lead = await prisma.lead.findFirst({
          where: { id: apt.lead_id, partner_id: session.id },
        });
        if (!lead) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
      }
    }

    await prisma.appointment.updateMany({
      where: { id, tenant_id: session.tenant_id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/appointments:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
