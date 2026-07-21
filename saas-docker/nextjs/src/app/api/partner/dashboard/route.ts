import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const partnerId = session.id;
    const tenantId = session.tenantId;

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId, tenant_id: tenantId }
    });

    if (!partner) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    const leads = await prisma.lead.findMany({
      where: { partner_id: partnerId, tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const totalLeads = await prisma.lead.count({
      where: { partner_id: partnerId, tenant_id: tenantId }
    });

    const convertedLeads = await prisma.lead.count({
      where: { partner_id: partnerId, tenant_id: tenantId, status: 'CONVERTED' }
    });

    const commissions = await prisma.partnerCommission.aggregate({
      where: { partner_id: partnerId },
      _sum: { amount: true },
    });

    const paidCommissions = await prisma.partnerCommission.aggregate({
      where: { partner_id: partnerId, status: 'paid' },
      _sum: { amount: true },
    });

    const daysOld = (Date.now() - new Date(partner.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const effRate = (daysOld < 30 && partner.type !== 'dev') ? 50 : partner.commissionRate;

    const leadsWithProjectStatus = leads.map(l => {
      let projectStatus = 'pendente';
      let projectUpdatedAt: string | null = null;
      let projectNotes: string | null = null;
      try {
        const notes = l.notes ? JSON.parse(l.notes) : {};
        projectStatus = notes.project_status || 'pendente';
        projectUpdatedAt = notes.project_updated_at || null;
        projectNotes = notes.project_notes || null;
      } catch {}
      return { ...l, project_status: projectStatus, project_updated_at: projectUpdatedAt, project_notes: projectNotes };
    });

    return NextResponse.json({
      tenantId,
      name: partner.name,
      referralCode: partner.referralCode,
      leads: leadsWithProjectStatus,
      totalLeads,
      convertedLeads,
      pendingCommissions: (commissions._sum.amount || 0) - (paidCommissions._sum.amount || 0),
      paidCommissions: paidCommissions._sum.amount || 0,
      totalCommissions: commissions._sum.amount || 0,
      commissionRate: effRate,
      type: partner.type || 'vendedor',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
