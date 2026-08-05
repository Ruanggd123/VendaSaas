import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';

const prisma = new PrismaClient();

function safeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, 'hex');
    const b = Buffer.from(bHex, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifySignature(req: Request, rawBody: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  const signatureHeader = req.headers.get('x-hub-signature-256');

  if (appSecret) {
    if (!signatureHeader) return false;
    const signature = signatureHeader.replace(/^sha256=/, '');
    const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
  }

  // Sem META_APP_SECRET configurado: só processa se explicitamente liberado em dev
  const allowUnverified = process.env.META_ALLOW_UNVERIFIED === 'true';
  if (!allowUnverified) {
    console.warn("⚠️ [Webhook Meta] META_APP_SECRET não configurado — rejeitando payload não assinado. Configure META_APP_SECRET ou META_ALLOW_UNVERIFIED=true em desenvolvimento.");
  }
  return allowUnverified;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'sales-autopilot-token';
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  } else {
    return new NextResponse('Missing mode or token', { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!verifySignature(req, rawBody)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = JSON.parse(rawBody);
    
    // Precisaríamos saber de qual tenant é esse webhook (por page id, etc)
    // Para simplificar, vamos atribuir ao primeiro tenant se houver
    const firstTenant = await prisma.tenant.findFirst();
    const tenantId = firstTenant?.id;
    
    if (body.object === 'page') {
      for (const entry of body.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'leadgen') {
              const leadId = change.value.leadgen_id;
              console.log(`Novo lead do Meta Ads! ID: ${leadId}`);
              
              if (tenantId) {
                await prisma.lead.create({
                  data: {
                    tenant_id: tenantId,
                    name: `Lead Meta Ads`,
                    phone: `+55${Math.floor(10000000000 + Math.random() * 90000000000)}`,
                    source: 'meta_ads',
                    status: 'NEW',
                    category: 'Inbound'
                  }
                });
              }
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Meta Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
