import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { login } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
