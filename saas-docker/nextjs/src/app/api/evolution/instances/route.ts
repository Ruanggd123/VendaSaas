import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976';

const headers = { apikey: EVOLUTION_KEY, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', 'ngrok-skip-browser-warning': 'true' };

async function checkAuth() {
  const session = await getSession();
  if (!session?.tenant_id) return null;
  return session;
}

export async function GET() {
  const session = await checkAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    // Busca instâncias do DB para este tenant/partner
    const dbInstances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(session.role === 'partner' ? { partner_id: session.id } : {}),
      },
      select: { name: true },
    });
    const dbInstanceNames = new Set(dbInstances.map(i => i.name));

    // Busca da Evolution API
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers, cache: 'no-store' });
    const data = await res.json();
    const allInstances = Array.isArray(data) ? data : [];

    // Filtra apenas instâncias que existem no DB para este tenant/partner
    const filtered = allInstances.filter((inst: any) => {
      const name = inst?.instance?.instanceName || inst?.name;
      return dbInstanceNames.has(name);
    });

    return NextResponse.json(filtered);
  } catch { return NextResponse.json([]); }
  finally { await prisma.$disconnect(); }
}

export async function POST(req: NextRequest) {
  const session = await checkAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...body, integration: 'WHATSAPP-BAILEYS' }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await checkAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { instance } = await req.json();
    const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instance}`, { method: 'DELETE', headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
