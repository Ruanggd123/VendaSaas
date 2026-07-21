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

    // Checar se o projeto ainda está disponível
    const project = await prisma.project.findUnique({
      where: { id: project_id }
    });

    if (!project || project.status !== 'OPEN' || project.partner_id) {
      return NextResponse.json({ error: 'Este projeto já foi assumido por outro desenvolvedor ou não está disponível.' }, { status: 400 });
    }

    // Assumir o projeto
    const updatedProject = await prisma.project.update({
      where: { id: project_id },
      data: {
        partner_id: session.id,
        status: 'IN_PROGRESS',
        updated_at: new Date()
      }
    });

    await prisma.projectTimeline.create({
      data: {
        project_id: project.id,
        status_change: 'IN_PROGRESS',
        message: 'Projeto assumido por um desenvolvedor e em andamento.',
        author: 'SYSTEM'
      }
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
