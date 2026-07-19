import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, notes, name, email, city, estado, interested_product, value, nextContactAt } = body;
    
    // Garantir que pertence ao tenant atual e ao parceiro
    const leadCheck = await prisma.lead.findUnique({ where: { id } });
    if (!leadCheck || leadCheck.tenant_id !== session.tenantId) {
       return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (session.role === 'partner' && leadCheck.partner_id !== session.id) {
       return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { 
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(city !== undefined && { city }),
        ...(estado !== undefined && { estado }),
        ...(interested_product !== undefined && { interested_product }),
        ...(value !== undefined && { value: Number(value) }),
        ...(nextContactAt !== undefined && { nextContactAt: nextContactAt ? new Date(nextContactAt) : null }),
      }
    });

    // Se foi convertido e tem parceiro, cria comissão automaticamente
    if (status === 'CONVERTED' && leadCheck.partner_id) {
      const partner = await prisma.partner.findUnique({
        where: { id: leadCheck.partner_id }
      });

      if (partner) {
        const saleValue = lead.value || leadCheck.value || 0;
        const productName = (lead.interested_product || leadCheck.interested_product || '').toLowerCase();

        let commissionAmount: number;
        let commissionType = 'percentage';

        const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { settings: true } });
        let products: any[] = [];
        try { products = JSON.parse(tenant?.settings as string || '{}').products || []; } catch {}

        const product = products.find((p: any) => p.name?.toLowerCase() === productName);

        if (product?.commission_fixed) {
          commissionAmount = product.commission_fixed;
          commissionType = 'fixed';
        } else {
          const daysOld = (Date.now() - new Date(partner.created_at).getTime()) / (1000 * 60 * 60 * 24);
          const effRate = daysOld < 30 ? 50 : partner.commissionRate;
          commissionAmount = saleValue * (effRate / 100);
        }

        // Cria venda vinculada ao lead
        const sale = await prisma.sale.create({
          data: {
            tenant_id: session.tenantId,
            lead_id: lead.id,
            product_name: lead.interested_product || 'Venda via indicação',
            amount: saleValue,
            status: 'pending',
          }
        });

        // Cria comissão do parceiro
        await prisma.partnerCommission.create({
          data: {
            partner_id: partner.id,
            sale_id: sale.id,
            amount: commissionAmount,
            type: commissionType,
            status: 'pending',
          }
        });
      }
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
