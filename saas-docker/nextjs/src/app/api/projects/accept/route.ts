import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'partner') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const { project_id } = await request.json();

    // Checar limite de carga do Dev (ex: max 3 projetos ativos)
    const activeProjectsCount = await prisma.project.count({
      where: { partner_id: session.id, status: { in: ['IN_PROGRESS', 'REVIEW'] } }
    });

    if (activeProjectsCount >= 3) {
      return NextResponse.json({ error: 'Você atingiu o limite de 3 projetos simultâneos. Finalize um projeto para aceitar novos.' }, { status: 400 });
    }

    // Assumir o projeto atomicamente (evita condicao de corrida)
    const updatedProject = await prisma.project.updateMany({
      where: { id: project_id, status: 'OPEN', partner_id: null },
      data: {
        partner_id: session.id,
        status: 'IN_PROGRESS',
        updated_at: new Date()
      }
    });

    if (updatedProject.count === 0) {
      return NextResponse.json({ error: 'Este projeto já foi assumido por outro desenvolvedor ou não está disponível.' }, { status: 400 });
    }

    await prisma.projectTimeline.create({
      data: {
        project_id: project_id,
        status_change: 'IN_PROGRESS',
        message: 'Projeto assumido por um desenvolvedor e em andamento.',
        author: 'SYSTEM'
      }
    });

    return NextResponse.json({ success: true, project_id });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
