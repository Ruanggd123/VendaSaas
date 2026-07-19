import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.tenant_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const instance = req.nextUrl.searchParams.get('instance') || 'joao_imobiliaria';
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/findContacts/${instance}`, {
      headers: { apikey: EVOLUTION_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch {
    return NextResponse.json([]);
  }
}
