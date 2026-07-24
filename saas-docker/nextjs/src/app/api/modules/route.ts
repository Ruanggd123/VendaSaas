import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const tenantId = session?.tenant_id || session?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeModules = await prisma.activeModule.findMany({
      where: { tenant_id: tenantId },
      select: { module_name: true, activated_at: true }
    });

    const customModules = await prisma.customModule.findMany({
      where: { tenant_id: tenantId }
    });

    return NextResponse.json({ success: true, activeModules, customModules });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    const tenantId = session?.tenant_id || session?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { module_name, action } = await req.json();

    if (!module_name || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (action === 'activate') {
      // Garante que apenas um módulo setorial esteja ativo por vez
      await prisma.activeModule.deleteMany({
        where: {
          tenant_id: tenantId,
          module_name: { not: module_name }
        }
      });

      await prisma.activeModule.upsert({
        where: {
          tenant_id_module_name: {
            tenant_id: tenantId,
            module_name: module_name
          }
        },
        create: {
          tenant_id: tenantId,
          module_name: module_name
        },
        update: {}
      });
    } else if (action === 'deactivate') {
      await prisma.activeModule.deleteMany({
        where: {
          tenant_id: tenantId,
          module_name: module_name
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    const tenantId = session?.tenant_id || session?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key, title, icon, description, system_prompt } = await req.json();

    if (!key || !title || !description || !system_prompt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const keyClean = key.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");

    const customModule = await prisma.customModule.upsert({
      where: {
        tenant_id_key: {
          tenant_id: tenantId,
          key: keyClean
        }
      },
      create: {
        tenant_id: tenantId,
        key: keyClean,
        title,
        icon: icon || "🏪",
        description,
        system_prompt
      },
      update: {
        title,
        icon: icon || "🏪",
        description,
        system_prompt
      }
    });

    return NextResponse.json({ success: true, customModule });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const tenantId = session?.tenant_id || session?.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }

    // Desativa se tiver ativo
    await prisma.activeModule.deleteMany({
      where: {
        tenant_id: tenantId,
        module_name: key
      }
    });

    // Exclui
    await prisma.customModule.deleteMany({
      where: {
        tenant_id: tenantId,
        key: key
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
