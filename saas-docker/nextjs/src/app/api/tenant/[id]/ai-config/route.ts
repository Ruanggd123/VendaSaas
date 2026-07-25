import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const { id } = await params;
    if (session.tenant_id !== id && session.role !== 'superadmin') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { settings } = await request.json();

    const tenant = await prisma.tenant.findUnique({
      where: { id }
    });

    if (!tenant) {
        return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const currentSettings = JSON.parse((tenant.settings as string) || "{}");
    const mergedSettings = { ...currentSettings, ...settings };

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { settings: JSON.stringify(mergedSettings) }
    });

    return NextResponse.json({ message: 'Configurações atualizadas' });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configurações' },
      { status: 500 }
    );
  }
}
