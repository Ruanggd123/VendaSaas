import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const isPartner = session.role === 'partner';
    const isAdmin = session.role === 'superadmin' || session.role === 'manager';

    if (!isPartner && !isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    if (type === 'all' && isAdmin) {
      // Retornar todos os projetos para o painel admin
      const projects = await prisma.project.findMany({
        orderBy: { created_at: 'desc' },
        include: { timelines: true }
      });
      return NextResponse.json(projects);
    } else if (type === 'open') {
      // Retornar projetos não assinados por ninguém
      const projects = await prisma.project.findMany({
        where: { status: 'OPEN', partner_id: null },
        orderBy: { created_at: 'desc' }
      });
      return NextResponse.json(projects);
    } else {
      // Retornar projetos do Dev
      const projects = await prisma.project.findMany({
        where: { partner_id: session.id },
        orderBy: { created_at: 'desc' },
        include: { timelines: true }
      });
      return NextResponse.json(projects);
    }
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_name, client_phone, title, description, briefing, price, partner_id } = body;

    // Se partner_id for passado, já assina direto (venda pelo link do Dev).
    // Senão, cai no pool público
    const project = await prisma.project.create({
      data: {
        client_name,
        client_phone,
        title,
        description,
        briefing,
        price: parseFloat(price || '0'),
        partner_id: partner_id || null,
        status: partner_id ? 'IN_PROGRESS' : 'OPEN'
      }
    });

    await prisma.projectTimeline.create({
      data: {
        project_id: project.id,
        status_change: project.status,
        message: 'Projeto criado e aguardando desenvolvimento.',
        author: 'SYSTEM'
      }
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar projeto' }, { status: 500 });
  }
}
