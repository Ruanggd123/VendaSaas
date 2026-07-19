import { processMessageWithAI } from './src/lib/ai/engine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tenantId = "aeeadf53-8f3d-4694-81bc-d171a8e33f1d";
const contactNumber = "5599999999999"; // Simulando um número genérico

async function runTest(scenario: string, message: string) {
  console.log(`\n========================================`);
  console.log(`[TESTE] Cenário: ${scenario}`);
  console.log(`[CLIENTE] ${message}`);
  
  // Salva no BD a mensagem fictícia do cliente para haver histórico
  const conv = await prisma.conversation.upsert({
    where: { tenant_id_contact_number: { tenant_id: tenantId, contact_number: contactNumber } },
    update: { last_message_at: new Date() },
    create: { tenant_id: tenantId, contact_number: contactNumber, contact_name: "Cliente Teste", instance_name: "teste" }
  });

  await prisma.message.create({
    data: { tenant_id: tenantId, conversation_id: conv.id, direction: "inbound", content: message }
  });

  const response = await processMessageWithAI(tenantId, contactNumber, message);
  console.log(`\n[🤖 IA RESPOSTA]\n${response}`);

  // Salva a resposta da IA no histórico
  if (response) {
     await prisma.message.create({
        data: { tenant_id: tenantId, conversation_id: conv.id, direction: "outbound", content: response, ai_generated: true }
     });
  }
}

async function main() {
  // Limpa histórico do número de teste para um teste limpo
  await prisma.conversation.deleteMany({ where: { contact_number: contactNumber } });

  console.log("Iniciando Bateria de Testes da IA (Estoque, Regras e Horários)...");

  // await runTest("A1 - Alucinação e Nome", "Qual o seu nome? Você vende calça jeans ou roupas?");
  // await runTest("B1 - Agendamento (Fora do Horário)", "Quero agendar uma visita presencial para domingo às 03:00 da manhã.");
  await runTest("D1 - Compra de Produto", "como funciona esse bot de 97 ?");
  
  // Limpar testes
  await prisma.conversation.deleteMany({ where: { contact_number: contactNumber } });
  console.log(`\n========================================`);
  console.log("Testes finalizados!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
