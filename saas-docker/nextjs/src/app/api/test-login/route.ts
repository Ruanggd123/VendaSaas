import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { login } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Não disponível em produção' }, { status: 403 });
  }
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json({ error: 'Nenhum usuário encontrado' }, { status: 404 });
    }
    
    await login({
      id: user.id,
      email: user.email,
      name: user.name || 'Cliente Teste',
      tenant_id: user.tenant_id,
      role: user.role
    });

    return NextResponse.redirect(new URL(`/tenant/${user.tenant_id}`, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
