import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role?.toLowerCase() !== 'manager' && session.role?.toLowerCase() !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = params;

    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner || partner.tenant_id !== session.tenantId) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    await prisma.partner.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting partner:', error);
    return NextResponse.json({ error: 'Erro ao excluir parceiro' }, { status: 500 });
  }
}
