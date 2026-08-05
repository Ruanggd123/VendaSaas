import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { assertModule, MODULES } from '@/lib/permissions';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await assertModule(MODULES.ai);
    if (denied) return denied;

    const documents = await prisma.document.findMany({
      where: { tenant_id: session.tenantId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        mime_type: true,
        status: true,
        created_at: true,
      }
    });

    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const denied = await assertModule(MODULES.ai);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await prisma.document.delete({
      where: { id, tenant_id: session.tenantId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
