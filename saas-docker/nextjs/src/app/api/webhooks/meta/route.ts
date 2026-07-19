import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    const body = await req.json();
    
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
