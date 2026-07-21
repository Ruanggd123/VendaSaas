import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const services = await prisma.devService.findMany({
      where: { partner_id: session.id },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(services);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { title, description, price, is_recurring } = await request.json();

    const service = await prisma.devService.create({
      data: {
        partner_id: session.id,
        title,
        description,
        price: parseFloat(price),
        is_recurring: is_recurring || false
      }
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar serviço' }, { status: 500 });
  }
}
