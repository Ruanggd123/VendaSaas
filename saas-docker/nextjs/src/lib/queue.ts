import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: 6379,
  maxRetriesPerRequest: null
});

// Fila de processamento de mensagens
export const messageQueue = new Queue('message-queue', {
  connection: redis as any
});

// Fila de envio de mensagens via WhatsApp
export const sendQueue = new Queue('send-queue', {
  connection: redis as any
});

// Função para adicionar mensagem na fila
export const addMessageToQueue = async (data: any) => {
  await messageQueue.add('process-message', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });
};

// Worker para processar mensagens
export const messageWorker = process.env.IS_WORKER === 'true' ? new Worker('message-queue', async (job) => {
  const { tenantId, from, message, instanceName, isMessageToMyself } = job.data;

  console.log(`[Queue] Processando mensagem para tenant ${tenantId} vinda de ${from} (AdminMode: ${!!isMessageToMyself})`);
  
  // Duplication/Debounce Check: Evitar responder mensagens antigas se houver novas na fila
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const conversation = await prisma.conversation.findFirst({
    where: { tenant_id: tenantId, contact_number: from },
    include: {
      messages: {
        orderBy: { created_at: 'desc' },
        take: 1
      }
    }
  });

  const latestMessage = conversation?.messages?.[0];
  if (latestMessage && latestMessage.direction === "inbound" && latestMessage.content !== message) {
    console.log(`[Queue] Descartando job antigo/acumulado de ${from}: "${message}" pois a mais recente é "${latestMessage.content}"`);
    return;
  }
  
  const { processMessageWithAI } = await import('./ai/engine');
  const iaResponse = await processMessageWithAI(tenantId, from, message, isMessageToMyself);

  if (iaResponse) {
    // Depois de processar, coloca na fila de envio
    await sendQueue.add('send-message', {
      tenantId,
      instanceName,
      to: from,
      answer: iaResponse
    });
  }

}, { connection: redis as any }) : null;

// Worker para enviar mensagens no WhatsApp
export const sendWorker = process.env.IS_WORKER === 'true' ? new Worker('send-queue', async (job) => {
  const { tenantId, instanceName, to, answer } = job.data;

  console.log(`[Queue] Enviando mensagem IA para ${to} via ${instanceName}`);

  const { sendWhatsAppMessage, sendWhatsAppMedia } = await import('./evolution');
  
  const mediaRegex = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|bmp|pdf|zip|rar|docx|doc|xlsx|mp4|avi|mkv|mov|webm|mp3|ogg|wav))/i;
  const match = answer.match(mediaRegex);

  if (match) {
    const mediaUrl = match[1];
    const cleanAnswer = answer.replace(mediaUrl, "").trim();
    await sendWhatsAppMedia(instanceName, to, mediaUrl, cleanAnswer);
  } else {
    await sendWhatsAppMessage(instanceName, to, answer);
  }

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const conversation = await prisma.conversation.findFirst({
    where: { tenant_id: tenantId, contact_number: to }
  });
  
  if (conversation) {
    await prisma.message.create({
      data: {
        tenant_id: tenantId,
        conversation_id: conversation.id,
        direction: "outbound",
        content: answer,
        ai_generated: true
      }
    });
  }

}, { connection: redis as any }) : null;
