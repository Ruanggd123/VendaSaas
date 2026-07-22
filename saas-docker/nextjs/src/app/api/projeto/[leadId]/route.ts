import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { leadId: string } }) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.leadId },
      include: {
        sales: { orderBy: { created_at: 'desc' }, take: 5 },
        partner: { select: { name: true, whatsappNumber: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    let projectStatus = 'pendente';
    let projectUpdatedAt: string | null = null;
    try {
      const notes = lead.notes ? JSON.parse(lead.notes) : {};
      projectStatus = notes.project_status || 'pendente';
      projectUpdatedAt = notes.project_updated_at || null;
    } catch {}

    const timeline: { status: string; date: string }[] = [
      { status: 'pedido', date: lead.created_at.toISOString() },
    ];
    if (projectUpdatedAt) {
      timeline.push({ status: projectStatus, date: projectUpdatedAt });
    }

    return NextResponse.json({
      id: lead.id,
      clientName: lead.name,
      clientPhone: lead.phone,
      product: lead.interested_product,
      value: lead.value,
      projectStatus,
      projectUpdatedAt,
      devName: lead.partner?.name || 'Desenvolvedor',
      devWhatsapp: lead.partner?.whatsappNumber || lead.phone,
      sales: lead.sales.map(s => ({
        amount: s.amount,
        status: s.status,
        isRecurring: s.is_recurring,
        paidAt: s.paid_at,
        createdAt: s.created_at,
      })),
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
