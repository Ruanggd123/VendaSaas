import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner' || !session.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: session.id },
      select: { access_expires_at: true },
    });

    if (!partner) {
      return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
    }

    const now = new Date();
    const accessExpires = partner.access_expires_at;
    const expired = accessExpires ? now >= accessExpires : true;
    const remainingMs = accessExpires ? Math.max(0, accessExpires.getTime() - now.getTime()) : 0;
    const remainingMinutes = Math.floor(remainingMs / 60000);
    const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

    return NextResponse.json({
      accessExpiresAt: accessExpires?.toISOString() || null,
      expired,
      remainingMinutes,
      remainingSeconds,
      remainingMs,
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
