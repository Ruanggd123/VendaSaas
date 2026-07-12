import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// Validate superadmin access and API key
const validateSuperAdmin = async (request: Request) => {
  const session = await getSession();
  if (!session || session.role !== 'superadmin') {
    return false;
  }

  // Additional check for API key in production
  if (process.env.NODE_ENV === 'production') {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.SUPERADMIN_API_KEY) {
      return false;
    }
  }

  return true;
};

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const isValid = await validateSuperAdmin(request);
    if (!isValid) {
      return NextResponse.json({ error: 'Acesso negado. Apenas Super Admin.' }, { status: 403 });
    }

    const { plan, addDays } = await request.json();
    const tenantId = params.id;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID é obrigatório' }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (plan) {
      updateData.plan = plan;
    }
    
    if (addDays) {
      const currentExpiry = tenant.subscription_expires_at > new Date() ? tenant.subscription_expires_at : new Date();
      const newExpiry = new Date(currentExpiry.getTime() + addDays * 24 * 60 * 60 * 1000);
      updateData.subscription_expires_at = newExpiry;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData
    });

    return NextResponse.json({ success: true, tenant: updatedTenant }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const isValid = await validateSuperAdmin(request);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Acesso negado. Credenciais inválidas ou expiradas.' }, 
        { status: 403, headers: { 'WWW-Authenticate': 'Bearer realm="superadmin"' } }
      );
    }

    const tenantId = params.id;

    // Apenas expira a assinatura pra simular suspensão (Soft Delete / Suspension)
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscription_expires_at: new Date(0) // Data no passado
      }
    });

    return NextResponse.json({ success: true, message: "Acesso suspenso" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
