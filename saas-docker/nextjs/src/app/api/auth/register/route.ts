import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 });
    }

    // Verificar se usuário ou tenant já existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });
    }
    const existingTenant = await prisma.tenant.findUnique({ where: { phone } });
    if (existingTenant) {
      return NextResponse.json({ error: 'Telefone já cadastrado em outra empresa' }, { status: 400 });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar Tenant e User em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          phone,
          plan: 'solo', // plano padrão inicial
          // Em um sistema real com Asaas, a expiração só muda após o pagamento.
          // Daremos 3 dias de trial grátis para teste inicial
          subscription_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 
        }
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          name,
          email,
          password_hash: hashedPassword,
          role: 'admin', // Dono da empresa
        }
      });

      return { tenant, user };
    });

    const { password_hash, ...safeUser } = result.user;
    return NextResponse.json({ success: true, user: safeUser }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
