import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

const PROJECT_STATUSES = ['pendente', 'em_contato', 'em_desenvolvimento', 'homologacao', 'entregue', 'cancelado'] as const;

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { leadId, status, projectNotes } = await req.json();

    if (!leadId || !status) {
      return NextResponse.json({ error: 'leadId e status são obrigatórios' }, { status: 400 });
    }

    if (!PROJECT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Verifica se o lead pertence ao parceiro
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, partner_id: session.id, tenant_id: session.tenantId },
      include: { sales: { take: 1, orderBy: { created_at: 'desc' } } },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    // Atualiza o notes do lead com o status do projeto
    const existingNotes = (lead.notes ? JSON.parse(lead.notes) : {}) as Record<string, unknown>;
    const updatedNotes = {
      ...existingNotes,
      project_status: status,
      project_updated_at: new Date().toISOString(),
      ...(projectNotes ? { project_notes: projectNotes } : {}),
    };

    await prisma.lead.update({
      where: { id: leadId },
      data: { notes: JSON.stringify(updatedNotes) },
    });

    // Se marcou como entregue, atualiza o status do lead para CONVERTED
    if (status === 'entregue' && lead.status !== 'CONVERTED') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'CONVERTED' },
      });
    }

    return NextResponse.json({
      success: true,
      project_status: status,
      message: getStatusMessage(status, lead.name || 'Cliente'),
    });
  } catch (error: any) {
    console.error('Error updating project status:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function getStatusMessage(status: string, name: string): string {
  const messages: Record<string, string> = {
    pendente: 'Projeto aguardando início.',
    em_contato: 'Dev entrou em contato com o cliente.',
    em_desenvolvimento: 'Projeto em desenvolvimento.',
    homologacao: 'Projeto em homologação.',
    entregue: 'Projeto entregue com sucesso!',
    cancelado: 'Projeto cancelado.',
  };
  return messages[status] || `Status atualizado para ${status}`;
}
