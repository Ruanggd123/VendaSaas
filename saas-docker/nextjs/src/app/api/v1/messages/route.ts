import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/evolution"; // Ajustado para o path alias

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // 1. Extrair e verificar a API Key do Header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header missing" }, { status: 401 });
    }

    // Aceita tanto "Bearer <API_KEY>" quanto apenas "<API_KEY>"
    const apiKey = authHeader.replace("Bearer ", "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API Key format" }, { status: 401 });
    }

    // 2. Buscar o Tenant no banco de dados usando a API Key
    const tenant = await prisma.tenant.findUnique({
      where: { api_key: apiKey },
      include: {
        whatsapp_instances: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    // 3. Verificar o plano e status do Tenant (opcional, mas recomendado)
    if (tenant.status !== "active") {
      return NextResponse.json({ error: "Tenant account is not active" }, { status: 403 });
    }

    // 4. Extrair os dados da requisição (numero e mensagem)
    const body = await req.json().catch(() => null);
    if (!body || !body.numero || !body.mensagem) {
      return NextResponse.json(
        { error: "Missing required fields: 'numero' and 'mensagem'" },
        { status: 400 }
      );
    }

    const { numero, mensagem } = body;

    // 5. Encontrar a instância de WhatsApp ativa do Tenant
    // Pega a primeira instância (ou pode filtrar por status == 'open')
    const instance = tenant.whatsapp_instances.length > 0 ? tenant.whatsapp_instances[0] : null;

    if (!instance) {
      return NextResponse.json(
        { error: "No WhatsApp instance configured for this account" },
        { status: 400 }
      );
    }

    // 6. Chamar a função da Evolution API para enviar a mensagem
    const success = await sendWhatsAppMessage(instance.name, numero, String(mensagem));

    if (success) {
      return NextResponse.json({
        status: "success",
        message: "Message sent successfully",
        details: {
          instance: instance.name,
          to: numero,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send message via Evolution API" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in API Gateway /messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
