import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    // Busca o tenant cuja configuração (settings JSON string no banco) contenha a apiKey informada
    const tenant = await prisma.tenant.findFirst({
      where: {
        settings: {
          contains: `"apiKey":"${apiKey}"`
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 });
    }

    const tenantId = tenant.id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalLeadsThisMonth = await prisma.lead.count({
      where: { tenant_id: tenantId, created_at: { gte: firstDayOfMonth } }
    });

    const contactedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'CONTACTED' }
    });

    const interestedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'INTERESTED' }
    });

    const convertedLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'CONVERTED' }
    });

    const optedOutLeads = await prisma.lead.count({
      where: { tenant_id: tenantId, status: 'OPTED_OUT' }
    });

    return NextResponse.json({
      success: true,
      tenantName: tenant.name,
      metrics: {
        totalLeadsThisMonth,
        contactedLeads,
        interestedLeads,
        convertedLeads,
        conversionRate: totalLeadsThisMonth > 0 ? (convertedLeads / totalLeadsThisMonth) * 100 : 0,
        optedOutLeads
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error: any) {
    console.error('Error fetching public metrics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
