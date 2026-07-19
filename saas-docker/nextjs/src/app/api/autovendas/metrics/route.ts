import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const isPartner = session.role === 'partner';
    const partnerFilter = isPartner ? { partner_id: session.id } : {};

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalLeadsThisMonth = await prisma.lead.count({
      where: { tenant_id: tenantId, created_at: { gte: firstDayOfMonth }, ...partnerFilter }
    });

    const contactedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'CONTACTED', ...partnerFilter }
    });

    const interestedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'INTERESTED', ...partnerFilter }
    });

    const convertedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'CONVERTED', ...partnerFilter }
    });

    const optedOutLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'OPTED_OUT', ...partnerFilter }
    });

    // Daily follow-ups
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const followUpsToday = await prisma.lead.count({
      where: {
        tenant_id: tenantId,
        status: 'CONTACTED',
        nextContactAt: { gte: startOfDay, lte: endOfDay },
        ...partnerFilter
      }
    });

    return NextResponse.json({
      totalLeadsThisMonth,
      contactedLeads,
      interestedLeads,
      convertedLeads,
      conversionRate: totalLeadsThisMonth > 0 ? (convertedLeads / totalLeadsThisMonth) * 100 : 0,
      optedOutLeads,
      followUpsToday,
      role: session.role
    });
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
