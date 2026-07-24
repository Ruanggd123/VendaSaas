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
  const count = parseInt(req.nextUrl.searchParams.get('count') || '20');
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/findMessages/${instance}?count=${count}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}
