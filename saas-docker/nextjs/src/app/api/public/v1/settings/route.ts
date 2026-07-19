import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({ error: 'API Key é obrigatória' }, { status: 400 });
    }

    // Busca o tenant cuja configuração contenha a apiKey informada
    const tenant = await prisma.tenant.findFirst({
      where: {
        settings: {
          contains: `"apiKey":"${apiKey}"`
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'API Key inválida' }, { status: 401 });
    }

    const body = await req.json();

    // Parseia as configurações atuais
    let currentSettings: any = {};
    try {
      currentSettings = JSON.parse(tenant.settings as string || '{}');
    } catch {}

    // Modifica apenas chaves permitidas para alteração via API
    const updatableKeys = [
      'bot_type', 
      'ia_prompt', 
      'prompt', 
      'business_hours_start', 
      'business_hours_end', 
      'off_hours_message', 
      'ignored_numbers'
    ];

    for (const key of updatableKeys) {
      if (body[key] !== undefined) {
        currentSettings[key] = body[key];
      }
    }

    // Salva de volta
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        settings: JSON.stringify(currentSettings)
      }
    });

    return NextResponse.json({
      success: true,
      settings: currentSettings
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });

  } catch (error: any) {
    console.error('Error updating public settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
