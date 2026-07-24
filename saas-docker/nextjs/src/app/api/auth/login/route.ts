import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`login:${ip}`, 10)) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 minuto.' }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }

      await login({
        id: user.id,
        email: user.email,
        tenant_id: user.tenant_id,
        role: user.role
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Se não encontrou como User, tenta como Partner
    const partner = await prisma.partner.findFirst({ where: { email: normalizedEmail } });
    if (!partner || !partner.password_hash) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, partner.password_hash);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    await login({
      id: partner.id,
      partnerId: partner.id,
      email: partner.email,
      name: partner.name,
      tenant_id: partner.tenant_id,
      tenantId: partner.tenant_id,
      role: 'partner',
      accessExpiresAt: partner.access_expires_at?.toISOString() || null,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
