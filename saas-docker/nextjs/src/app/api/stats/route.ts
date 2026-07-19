import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.tenant_id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tenantId = searchParams.get('tenantId') || session.tenant_id;

  try {
    const tenant = await prisma.tenant.findFirst({
        where: { OR: [{ id: tenantId }, { whatsapp_instance: tenantId }] }
    });

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

    const isPartner = session.role === 'partner';
    const partnerFilter = isPartner ? { partner_id: session.id } : {};

    const conversations = await prisma.conversation.count({
      where: {
        tenant_id: tenant.id,
        ...(isPartner ? { leads: { partner_id: session.id } } : {}),
      }
    });
    const leads = await prisma.lead.count({
      where: { tenant_id: tenant.id, ...partnerFilter }
    });
    const messages = await prisma.message.count({
      where: { conversation: { tenant_id: tenant.id, ...(isPartner ? { leads: { partner_id: session.id } } : {}) } }
    });
    
    return NextResponse.json({
        conversations,
        leads,
        messages,
        sales: 0
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
