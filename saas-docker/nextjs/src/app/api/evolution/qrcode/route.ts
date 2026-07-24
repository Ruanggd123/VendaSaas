import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";
import { verifyInstanceOwnership } from "@/lib/instance-ownership";

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.tenant_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const instance = req.nextUrl.searchParams.get('instance') || '';
  if (!await verifyInstanceOwnership(session.tenant_id, instance)) {
    return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
  }
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instance}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Falha ao gerar QR Code' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.tenant_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { action, instance } = await req.json();
  const instanceName = instance || '';
  if (!await verifyInstanceOwnership(session.tenant_id, instanceName)) {
    return NextResponse.json({ error: "Instância não encontrada" }, { status: 404 });
  }

  try {
    if (action === 'disconnect') {
      const res = await fetch(`${EVOLUTION_URL}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: EVOLUTION_KEY },
      });
      const data = await res.json();
      return NextResponse.json(data);
    }
    if (action === 'restart') {
      const res = await fetch(`${EVOLUTION_URL}/instance/restart/${instanceName}`, {
        method: 'PUT',
        headers: { apikey: EVOLUTION_KEY },
      });
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Falha na operação' }, { status: 500 });
  }
}
