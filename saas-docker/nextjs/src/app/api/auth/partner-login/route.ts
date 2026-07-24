import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(`partner-login:${ip}`, 10)) {
      return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 minuto.' }, { status: 429 });
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    const partner = await prisma.partner.findFirst({ where: { email } });
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
    });

    return NextResponse.json({ success: true, redirect: '/painel-parceiro' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
