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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const tenantId = session.tenantId;

    const where: any = { tenant_id: tenantId };
    if (status) where.status = status;
    if (session.role === 'partner') where.partner_id = session.id;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = session.tenantId;
    const body = await req.json();

    if (!body.phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
    }

    let partnerId = null;
    if (body.referral_code) {
      const partner = await prisma.partner.findUnique({
        where: { referralCode: body.referral_code.toUpperCase() }
      });
      if (partner && partner.tenant_id === tenantId) {
        partnerId = partner.id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        tenant_id: tenantId,
        name: body.name || null,
        phone: body.phone,
        email: body.email || null,
        interested_product: body.interested_product || null,
        value: body.value ? Number(body.value) : null,
        city: body.city || null,
        estado: body.estado || null,
        source: body.source || 'manual',
        status: 'NEW',
        notes: body.notes || null,
        nextContactAt: body.nextContactAt ? new Date(body.nextContactAt) : null,
        partner_id: partnerId,
      }
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
