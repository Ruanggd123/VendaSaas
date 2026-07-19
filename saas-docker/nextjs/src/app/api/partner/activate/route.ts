import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession, encrypt } from '@/lib/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner' || !session.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const access_expires_at = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.partner.update({
      where: { id: session.id },
      data: { access_expires_at },
    });

    const newPayload = {
      ...session,
      accessExpiresAt: access_expires_at.toISOString(),
    };

    const newToken = await encrypt(newPayload);
    cookies().set('session', newToken, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
    });

    return NextResponse.json({
      accessExpiresAt: access_expires_at.toISOString(),
      remainingMinutes: 60,
      remainingSeconds: 0,
      remainingMs: 3600000,
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
