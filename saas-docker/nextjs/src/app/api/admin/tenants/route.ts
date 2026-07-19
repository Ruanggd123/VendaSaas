import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado. Apenas o Super Admin pode criar contas.' }, { status: 403 });
    }

    const { name, email, phone, password, plan } = await request.json();

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

    // Hash da senha (Criptografia Nível Produção)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar Tenant e User em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          phone,
          plan: plan || 'solo', // plano padrão inicial
          // Dá 30 dias de acesso padrão quando criado pelo Admin
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        }
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          name,
          email,
          password_hash: hashedPassword,
          role: 'admin', // Dono daquela empresa recém-criada
        }
      });

      return { tenant, user };
    });

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        users: { select: { id: true, name: true, email: true } },
        whatsapp_instances: true
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(tenants, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
