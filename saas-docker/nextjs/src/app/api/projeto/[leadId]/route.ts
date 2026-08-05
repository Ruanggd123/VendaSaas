import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { leadId } = await params;
    const session = await getSession();
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
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

    // A página pública de tracking usa a UUID do lead como token de capacidade.
    // Sem sessão, devolvemos apenas o necessário p/ acompanhamento — sem valores
    // de vendas e sem o WhatsApp do desenvolvedor (o botão já usa número fixo).
    const isOwner = session && (session.role === 'superadmin' || session.role === 'manager' || session.role === 'admin' || lead.tenant_id === session.tenant_id || (session.role === 'partner' && lead.partner_id === session.id));

    return NextResponse.json({
      id: lead.id,
      clientName: lead.name,
      clientPhone: lead.phone,
      product: lead.interested_product,
      value: lead.value,
      projectStatus,
      projectUpdatedAt,
      devName: lead.partner?.name || 'Desenvolvedor',
      devWhatsapp: isOwner ? (lead.partner?.whatsappNumber || lead.phone) : null,
      sales: isOwner
        ? lead.sales.map(s => ({
            amount: s.amount,
            status: s.status,
            isRecurring: s.is_recurring,
            paidAt: s.paid_at,
            createdAt: s.created_at,
          }))
        : [],
      timeline,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
