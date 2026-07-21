import { NextRequest, NextResponse } from 'next/server';
import { getSession } from "@/lib/auth";

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || 'B6D711FCDE4D4FD5936544120E713976';
const headers = { apikey: EVOLUTION_KEY, 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };

// GET: busca configuração atual do webhook ou status/qrcode/config
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.tenant_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const instance = req.nextUrl.searchParams.get('instance') || '';
  const action = req.nextUrl.searchParams.get('action') || 'status';

  const endpoints: Record<string, string> = {
    status:    `${EVOLUTION_URL}/instance/connectionState/${instance}`,
    qrcode:    `${EVOLUTION_URL}/instance/connect/${instance}`,
    webhook:   `${EVOLUTION_URL}/webhook/find/${instance}`,
    settings:  `${EVOLUTION_URL}/settings/find/${instance}`,
    chats:     `${EVOLUTION_URL}/chat/findChats/${instance}`,
    contacts:  `${EVOLUTION_URL}/chat/findContacts/${instance}`,
    messages:  `${EVOLUTION_URL}/chat/findMessages/${instance}?count=40`,
    n8n:       `${EVOLUTION_URL}/n8n/find/${instance}`,
    openai:    `${EVOLUTION_URL}/openai/find/${instance}`,
    typebot:   `${EVOLUTION_URL}/typebot/find/${instance}`,
    chatwoot:  `${EVOLUTION_URL}/chatwoot/find/${instance}`,
    proxy:     `${EVOLUTION_URL}/proxy/find/${instance}`,
  };

  const url = endpoints[action];
  if (!url) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: 'Falha na requisição' }, { status: 500 }); }
}

// POST: atualiza configurações
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.tenant_id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const instance = req.nextUrl.searchParams.get('instance') || '';
  const action = req.nextUrl.searchParams.get('action') || '';
  const body = await req.json();

  const endpoints: Record<string, { url: string; method: string }> = {
    logout:     { url: `${EVOLUTION_URL}/instance/logout/${instance}`, method: 'DELETE' },
    restart:    { url: `${EVOLUTION_URL}/instance/restart/${instance}`, method: 'PUT' },
    webhook:    { url: `${EVOLUTION_URL}/webhook/set/${instance}`, method: 'POST' },
    settings:   { url: `${EVOLUTION_URL}/settings/set/${instance}`, method: 'POST' },
    n8n:        { url: `${EVOLUTION_URL}/n8n/set/${instance}`, method: 'POST' },
    openai:     { url: `${EVOLUTION_URL}/openai/set/${instance}`, method: 'POST' },
    typebot:    { url: `${EVOLUTION_URL}/typebot/set/${instance}`, method: 'POST' },
    chatwoot:   { url: `${EVOLUTION_URL}/chatwoot/set/${instance}`, method: 'POST' },
    proxy:      { url: `${EVOLUTION_URL}/proxy/set/${instance}`, method: 'POST' },
    sendText:   { url: `${EVOLUTION_URL}/message/sendText/${instance}`, method: 'POST' },
  };

  const ep = endpoints[action];
  if (!ep) return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  try {
    const res = await fetch(ep.url, { method: ep.method, headers, body: JSON.stringify(body) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
