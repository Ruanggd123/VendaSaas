import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const event = await req.json();
    
    // O Asaas envia um header 'asaas-access-token' se configurarmos. 
    // É uma boa prática verificar a autenticidade do Webhook em produção.

    console.log("Recebido Webhook do Asaas:", event.event);

    if (event.event === "PAYMENT_RECEIVED" || event.event === "PAYMENT_CONFIRMED") {
      const payment = event.payment;
      // const customerId = payment.customer;
      // const externalReference = payment.externalReference; // Aqui geralmente enviamos o ID do Tenant ou Venda

      // Lógica de Negócio:
      // 1. Procurar o Tenant pelo externalReference
      // 2. Renovar a assinatura ou dar baixa no Pedido (RetailOrder / Sale)
      // 3. Disparar mensagem no WhatsApp informando aprovação (opcional)

      console.log(`Pagamento de ${payment.value} aprovado! Fatura: ${payment.id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no Webhook Asaas:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
