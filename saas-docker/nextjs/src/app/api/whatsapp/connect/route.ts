import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const connectionName = body.connectionName || "Meu WhatsApp";
    // instanceName is passed if we are trying to REFRESH or CONNECT an existing DB instance
    let instanceName = body.instanceName;

    const evolutionUrl = process.env.EVOLUTION_URL || "http://evolution:8080";
    const evolutionKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionKey) {
      throw new Error("EVOLUTION_API_KEY não configurada no servidor");
    }

    const headers = {
      'apikey': evolutionKey,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };

    let dbInstance;

    // Caso 1: Instância já existe no DB e estamos tentando pegar o QR ou recriar
    if (instanceName) {
      dbInstance = await prisma.whatsappInstance.findUnique({
        where: { name: instanceName }
      });
      if (!dbInstance || dbInstance.tenant_id !== session.tenant_id) {
        return NextResponse.json({ error: "Instância não encontrada ou acesso negado" }, { status: 404 });
      }

      if (session.role === 'partner' && dbInstance.partner_id !== session.id) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }

      // Tenta obter o QR code da instância existente
      let connectRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, { 
        method: "GET", 
        headers 
      });

      // Se a instância não existir mais na Evolution (ex: deletada pelo painel avançado), recriamos ela
      if (connectRes.status === 404) {
        connectRes = await fetch(`${evolutionUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true
          })
        });

        // Garantir que o webhook seja configurado
        try {
          await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              webhook: {
                enabled: true,
                url: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://nextjs:3000').replace(/\\nSensitive/g, '').replace(/Sensitive/g, '').trim()}/api/webhooks/evolution`,
                webhookByEvents: false,
                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
              }
            })
          });
        } catch (e) {
          console.error("Erro ao configurar webhook na recriação", e);
        }
      }

      if (!connectRes.ok) {
        return NextResponse.json({ error: "Erro ao gerar novo QR Code na Evolution API" }, { status: 500 });
      }

      const connectData = await connectRes.json();

      // Atualiza status no banco
      await prisma.whatsappInstance.update({
        where: { id: dbInstance.id },
        data: { status: "connecting" }
      });

      return NextResponse.json({
        status: "connecting",
        qrcode: connectData?.base64 || connectData?.qrcode?.base64 || null,
        instanceName,
        dbInstance
      });
      
    } else {
      // Caso 2: Criando uma instância do ZERO
      
      // Checar limites do plano
      const tenant = await prisma.tenant.findUnique({ where: { id: session.tenant_id } });
      if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

      const isPartner = session.role === 'partner';
      const instanceFilter = {
        tenant_id: session.tenant_id,
        ...(isPartner ? { partner_id: session.id } : {}),
      };

      const planLimit = tenant.plan === 'solo' ? 1 : tenant.plan === 'pro' ? 3 : 999;
      const partnerLimit = 1;
      const limit = isPartner ? partnerLimit : planLimit;
      const currentInstancesCount = await prisma.whatsappInstance.count({
        where: instanceFilter
      });

      if (currentInstancesCount >= limit) {
        return NextResponse.json({ error: `Limite de ${limit} conexão(ões) atingido.` }, { status: 403 });
      }

      instanceName = `${session.tenant_id}_${crypto.randomUUID().substring(0,8)}`;
      dbInstance = await prisma.whatsappInstance.create({
        data: {
          tenant_id: session.tenant_id,
          ...(isPartner ? { partner_id: session.id } : {}),
          name: instanceName,
          connectionName: connectionName,
          status: "connecting"
        }
      });
      
      // Criar a instância na Evolution API
      const createRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true
        })
      });

      if (!createRes.ok) {
        return NextResponse.json({ error: "Erro ao criar instância no Evolution API" }, { status: 500 });
      }

      const createData = await createRes.json();

      // Configurar webhook automaticamente para que as mensagens cheguem na nossa IA
      try {
        const webhookRes = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://nextjs:3000'}/api/webhooks/evolution`,
              webhookByOccurrences: false,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
            }
          })
        });
        if (!webhookRes.ok) {
          console.error("Falha ao registrar webhook da Evolution:", await webhookRes.text());
        } else {
          console.log(`✅ Webhook auto-configurado para a nova instância ${instanceName}`);
        }
      } catch (webhookErr) {
        console.error("Erro ao configurar webhook automático:", webhookErr);
      }
      
      return NextResponse.json({
        status: "connecting",
        qrcode: createData?.qrcode?.base64 || null,
        instanceName,
        dbInstance
      });
    }

  } catch (error: any) {
    console.error("Erro na rota /api/whatsapp/connect:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}
