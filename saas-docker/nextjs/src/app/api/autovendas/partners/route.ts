import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Restringir a Super Admin / Manager
    if (session.role?.toLowerCase() !== 'manager' && session.role?.toLowerCase() !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const tenantId = session.tenantId;

    try {
      const partners = await prisma.partner.findMany({
        where: { tenant_id: tenantId },
        include: { _count: { select: { leads: true } } }
      });

      const partnerIds = partners.map(p => p.id);

      // Busca leads convertidos de cada parceiro
      const convertedCounts = await prisma.lead.groupBy({
        by: ['partner_id'],
        where: { partner_id: { in: partnerIds }, status: 'CONVERTED' },
        _count: true,
      });
      const convertedMap = new Map(convertedCounts.map(c => [c.partner_id, c._count]));

      // Busca comissões agregadas por parceiro
      const commissionAggs = await prisma.partnerCommission.groupBy({
        by: ['partner_id'],
        where: { partner_id: { in: partnerIds } },
        _sum: { amount: true },
      });
      const commissionTotalMap = new Map(commissionAggs.map(c => [c.partner_id, c._sum.amount || 0]));

      const paidCommissions = await prisma.partnerCommission.groupBy({
        by: ['partner_id'],
        where: { partner_id: { in: partnerIds }, status: 'paid' },
        _sum: { amount: true },
      });
      const paidCommissionMap = new Map(paidCommissions.map(c => [c.partner_id, c._sum.amount || 0]));
      
      const formattedPartners = partners.map(p => ({
        id: p.id,
        name: p.name,
        referralCode: p.referralCode,
        commissionRate: p.commissionRate,
        type: p.type || 'vendedor',
        leadsCount: p._count.leads,
        convertedCount: convertedMap.get(p.id) || 0,
        created_at: p.created_at,
        totalCommissions: commissionTotalMap.get(p.id) || 0,
        paidCommissions: paidCommissionMap.get(p.id) || 0,
      }));

      return NextResponse.json(formattedPartners);
    } catch (err) {
      return NextResponse.json([]);
    }
  } catch (error: any) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role?.toLowerCase() !== 'manager' && session.role?.toLowerCase() !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    const tenantId = session.tenantId;
    const { name, referralCode, email, type, commissionRate } = await req.json();

    if (!name || !referralCode) {
      return NextResponse.json({ error: 'Nome e Código de Indicação são obrigatórios' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório para o parceiro acessar o sistema' }, { status: 400 });
    }

    // Verifica se já existe um parceiro com o mesmo email neste tenant
    const existingPartner = await prisma.partner.findFirst({
      where: { email, tenant_id: tenantId }
    });
    if (existingPartner) {
      return NextResponse.json({ error: 'Já existe um parceiro com este email cadastrado' }, { status: 409 });
    }

    // Gera senha aleatória de 8 caracteres
    const rawPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(rawPassword, 10);

    // Calculate commission logic based on type
    let finalCommissionRate = 30; // default for vendedor
    if (type === 'dev') {
      // If dev, they input the platform tax (e.g. 10%). The dev's share is 100 - tax (90%).
      const tax = parseFloat(commissionRate) || 10;
      finalCommissionRate = 100 - tax;
    } else {
      if (commissionRate !== undefined) {
        finalCommissionRate = parseFloat(commissionRate);
      }
    }

    const partner = await prisma.partner.create({
      data: {
        tenant_id: tenantId,
        name,
        email,
        password_hash,
        type: type || 'vendedor',
        referralCode: referralCode.toUpperCase(),
        commissionRate: finalCommissionRate,
      }
    });

    return NextResponse.json({ ...partner, generatedPassword: rawPassword });
  } catch (error: any) {
    console.error('Error creating partner:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
