import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';

// This acts as a reverse proxy between the Official Evolution Manager and the Evolution API.
// It intercepts requests to inject the Global API Key and isolate tenant instances.
async function proxyRequest(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const session = await getSession();
  const tenantId = session?.tenant_id;
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verificar status da Assinatura no Banco de Dados
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  }

  if (tenant.subscription_expires_at && tenant.subscription_expires_at < new Date()) {
    return NextResponse.json({ error: 'Assinatura Expirada. Por favor, renove seu plano para continuar acessando.' }, { status: 403 });
  }

  // Reconstruct the URL path
  const path = params.path ? params.path.join('/') : '';
  const searchParams = req.nextUrl.searchParams.toString();
  const url = `${EVOLUTION_URL}${path ? '/' + path : ''}${searchParams ? '?' + searchParams : ''}`;

  // Copy headers but override apikey
  const headers = new Headers();
  headers.set('apikey', EVOLUTION_KEY);
  headers.set('Content-Type', req.headers.get('content-type') || 'application/json');
  headers.set('ngrok-skip-browser-warning', 'true');

  const method = req.method;
  let body = undefined;

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const text = await req.text();
      if (text) {
        // --- SECURITY: INSTANCE CREATION ISOLATION & PLAN LIMITS ---
        if (path === 'instance/create') {
          // Checar limites do plano
          const limit = tenant.plan === 'solo' ? 1 : tenant.plan === 'pro' ? 3 : 999;
          
          // Buscar instâncias atuais na Evolution API para checar o limite
          const fetchRes = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers, cache: 'no-store' });
          const allInstances = await fetchRes.json();
          const tenantInstances = Array.isArray(allInstances) ? allInstances.filter((i: any) => i.instance.instanceName.startsWith(`${tenantId}_`)) : [];
          
          if (tenantInstances.length >= limit) {
             return NextResponse.json({ error: `Seu plano (${tenant.plan}) permite apenas ${limit} conexão(ões). Faça um upgrade!` }, { status: 403 });
          }

          const jsonBody = JSON.parse(text);
          jsonBody.instanceName = `${tenantId}_${jsonBody.instanceName}`;
          body = JSON.stringify(jsonBody);
        } else {
          body = text;
        }
      }
    } catch {}
  }

  try {
    const response = await fetch(url, { method, headers, body, cache: 'no-store' });
    
    // Pass back raw response (for JSON, text, etc)
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      let data = await response.json();

      // --- SINC EXT: SALVAR NO DB LOCAL SE CRIOU/DELETOU PELO MANAGER ---
      if (response.ok) {
        if (path === 'instance/create' && data.instance?.instanceName) {
          try {
            const instanceName = data.instance.instanceName;
            const existing = await prisma.whatsappInstance.findUnique({ where: { name: instanceName } });
            if (!existing) {
              await prisma.whatsappInstance.create({
                data: {
                  tenant_id: tenantId,
                  name: instanceName,
                  connectionName: instanceName.replace(`${tenantId}_`, ''),
                  status: data.instance?.state || "connecting"
                }
              });
            }
          } catch (e) {
            console.error("Erro ao sincronizar instância do manager com DB:", e);
          }
        }

        if (path?.startsWith('instance/delete/')) {
          try {
            const instanceName = path.split('/').pop();
            if (instanceName) {
              await prisma.whatsappInstance.deleteMany({
                where: { name: instanceName, tenant_id: tenantId }
              });
            }
          } catch (e) {
            console.error("Erro ao sincronizar exclusão do manager com DB:", e);
          }
        }
      }

      // --- SECURITY: FETCH ISOLATION ---
      // Filter fetchInstances to only show this tenant's instances
      if (path === 'instance/fetchInstances' && Array.isArray(data)) {
        data = data.filter((inst: any) => inst.instance.instanceName.startsWith(`${tenantId}_`));
      }

      return NextResponse.json(data, { status: response.status });
    } else {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: response.status,
        headers: { 'Content-Type': contentType }
      });
    }

  } catch (e: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
