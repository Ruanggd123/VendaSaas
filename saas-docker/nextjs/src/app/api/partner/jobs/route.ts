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

    // Busca leads que são do tipo "projeto" (site/products) e não têm parceiro ou têm mas estão pendentes
    const available = await prisma.lead.findMany({
      where: {
        tenant_id: session.tenantId,
        partner_id: null,
        status: { in: ['NEW', 'CONTACTED', 'INTERESTED'] },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        phone: true,
        interested_product: true,
        value: true,
        created_at: true,
        source: true,
      },
    });

    return NextResponse.json({ available });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId é obrigatório' }, { status: 400 });
    }

    // Verifica se o lead está disponível
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenant_id: session.tenantId, partner_id: null },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Trabalho não disponível ou já aceito por outro dev' }, { status: 409 });
    }

    // Atribui o lead ao dev
    await prisma.lead.update({
      where: { id: leadId },
      data: { partner_id: session.id, status: 'CONTACTED' },
    });

    return NextResponse.json({ success: true, message: 'Trabalho aceito! Entre em contato com o cliente.' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
