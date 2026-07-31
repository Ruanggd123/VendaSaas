import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getProfilePicture, sendWhatsAppMedia, sendWhatsAppMessage } from "@/lib/evolution";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { createHash, timingSafeEqual } from "crypto";
import { ensureMinimumWhatsAppPollOptions, formatWhatsAppOptionText } from "@/lib/whatsappOptions";
import { reserveMonthlyAttendance } from "@/lib/usage";
import { formatBusinessDateKey } from "@/lib/dateTime";
import { recordDiagnostic } from "@/lib/diagnostics";

const prisma = new PrismaClient();
const webhookTokenCache = new Map<string, { token: string; expiresAt: number }>();
const outboundEchoCache = new Map<string, number>();
const DEFAULT_INBOUND_DEBOUNCE_MS = 1200;
export const dynamic = "force-dynamic";

function outboundEchoKey(instanceName: string, contactNumber: string, content: string) {
  return `${instanceName}:${contactNumber}:${content.trim()}`;
}

function persistentOutboundEchoKey(instanceName: string, contactNumber: string, content: string) {
  const digest = createHash("sha256")
    .update(`${instanceName}:${contactNumber}:${content.trim()}`)
    .digest("hex");
  return `outbound_media_echo_${digest}`;
}

function conversationCoordinationKey(prefix: string, tenantId: string, instanceName: string, contactNumber: string) {
  const digest = createHash("sha256")
    .update(`${tenantId}:${instanceName}:${contactNumber}`)
    .digest("hex");
  return `${prefix}_${digest}`;
}

async function claimLatestInboundMessage(
  tenantId: string,
  instanceName: string,
  contactNumber: string,
  token: string,
  debounceMs: number,
) {
  const key = conversationCoordinationKey("inbound_debounce", tenantId, instanceName, contactNumber);
  await prisma.systemConfig.deleteMany({
    where: {
      key: { startsWith: "inbound_debounce_" },
      updated_at: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: token },
    create: { key, value: token },
  });

  await new Promise((resolve) => setTimeout(resolve, debounceMs));
  const claimed = await prisma.systemConfig.deleteMany({ where: { key, value: token } });
  return claimed.count === 1;
}

async function acquireConversationProcessingLock(
  tenantId: string,
  instanceName: string,
  contactNumber: string,
  token: string,
) {
  const key = conversationCoordinationKey("inbound_processing", tenantId, instanceName, contactNumber);
  await prisma.systemConfig.deleteMany({
    where: { key, updated_at: { lt: new Date(Date.now() - 60 * 1000) } },
  });
  try {
    await prisma.systemConfig.create({ data: { key, value: token } });
    return key;
  } catch (error) {
    const existingLock = await prisma.systemConfig.findUnique({ where: { key }, select: { key: true } });
    if (existingLock) return null;
    throw error;
  }
}

async function releaseConversationProcessingLock(key: string, token: string) {
  await prisma.systemConfig.deleteMany({ where: { key, value: token } }).catch(() => undefined);
}

async function markPersistentOutboundEcho(instanceName: string, contactNumber: string, content: string) {
  const key = persistentOutboundEchoKey(instanceName, contactNumber, content);
  await prisma.systemConfig.deleteMany({
    where: {
      key: { startsWith: "outbound_media_echo_" },
      updated_at: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(Date.now() + 2 * 60 * 1000) },
    create: { key, value: String(Date.now() + 2 * 60 * 1000) },
  });
  return key;
}

async function consumePersistentOutboundEcho(instanceName: string, contactNumber: string, content: string) {
  const key = persistentOutboundEchoKey(instanceName, contactNumber, content);
  const marker = await prisma.systemConfig.findUnique({ where: { key }, select: { value: true } });
  if (!marker) return false;

  const removed = await prisma.systemConfig.deleteMany({ where: { key } });
  return removed.count === 1 && Number(marker.value) > Date.now();
}

function getIgnoredNumbers(raw: unknown) {
  const values = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  return values
    .map((item) => typeof item === "string" ? item : item?.number)
    .map((number) => String(number || "").replace(/\D/g, ""))
    .filter((number) => number.length >= 8);
}

function phoneNumbersMatch(left: string, right: string) {
  const leftDigits = left.replace(/\D/g, "");
  const rightDigits = right.replace(/\D/g, "");
  const leftWithout55 = leftDigits.startsWith("55") ? leftDigits.slice(2) : leftDigits;
  const rightWithout55 = rightDigits.startsWith("55") ? rightDigits.slice(2) : rightDigits;
  return leftDigits === rightDigits
    || leftWithout55 === rightWithout55
    || (leftWithout55.length >= 8 && rightWithout55.length >= 8 && (
      leftWithout55.endsWith(rightWithout55) || rightWithout55.endsWith(leftWithout55)
    ));
}

async function sendTrackedWhatsAppMessage(
  instanceName: string,
  contactNumber: string,
  content: string,
) {
  const now = Date.now();
  for (const [key, expiresAt] of outboundEchoCache) {
    if (expiresAt <= now) outboundEchoCache.delete(key);
  }

  const key = outboundEchoKey(instanceName, contactNumber, content);
  outboundEchoCache.set(key, now + 2 * 60 * 1000);
  const sent = await sendWhatsAppMessage(instanceName, contactNumber, content);
  if (!sent) outboundEchoCache.delete(key);
  return sent;
}

async function sendTrackedWhatsAppMedia(
  instanceName: string,
  contactNumber: string,
  mediaSource: string,
  caption: string,
  mediaType: string,
) {
  const persistentKey = await markPersistentOutboundEcho(instanceName, contactNumber, caption);

  const sent = await sendWhatsAppMedia(instanceName, contactNumber, mediaSource, caption, mediaType);
  if (!sent) {
    await prisma.systemConfig.deleteMany({ where: { key: persistentKey } }).catch(() => undefined);
  }
  return sent;
}

function tokensMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function isValidWebhookToken(instanceName: string, token: string) {
  const globalToken = process.env.EVOLUTION_API_KEY || "";
  if (globalToken && tokensMatch(token, globalToken)) return true;

  const cached = webhookTokenCache.get(instanceName);
  if (cached && cached.expiresAt > Date.now() && tokensMatch(token, cached.token)) return true;

  const evolutionUrl = (process.env.EVOLUTION_URL || "").replace(/\/$/, "");
  if (!evolutionUrl || !globalToken) return false;

  try {
    const response = await fetch(
      `${evolutionUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { headers: { apikey: globalToken }, cache: "no-store" },
    );
    if (!response.ok) return false;

    const instances = await response.json();
    const instanceToken = Array.isArray(instances) ? instances[0]?.token : null;
    if (typeof instanceToken !== "string" || !tokensMatch(token, instanceToken)) return false;

    webhookTokenCache.set(instanceName, { token: instanceToken, expiresAt: Date.now() + 5 * 60 * 1000 });
    return true;
  } catch (error) {
    console.error("[Webhook] Falha ao validar token da instância na Evolution:", error);
    return false;
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}

export async function POST(req: Request) {
  let receiptKeyForRetry = "";
  try {
    const ts = Date.now();
    console.log(`[Webhook] Recebido em ${new Date().toISOString()}`);
    const body = await req.json();
    const instanceName = body.instance;
    const apiKey = req.headers.get("apikey") || body.apikey;
    if (!apiKey || !instanceName || !await isValidWebhookToken(instanceName, apiKey)) {
      console.warn(`[Webhook] Token ausente ou inválido. IP: ${req.headers.get('x-forwarded-for') || 'desconhecido'}`);
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // O evento da Evolution API geralmente vem no formato:
    // { event: "messages.upsert", instance: "nome_instancia", data: { messages: [...] } }
    
    const rawEvent = (body.event || body.type || "").toString().toLowerCase().replace(/_/g, ".").replace(/-/g, ".");
    console.log("[Webhook Debug] Evento:", rawEvent, "| Instância:", instanceName);
    
    const isMessageEvent =
      rawEvent.includes("messages") ||
      rawEvent.includes("message") ||
      rawEvent.includes("upsert") ||
      rawEvent.includes("send");

    if (isMessageEvent && instanceName) {
      // Procurar qual Tenant é dono dessa instância (por name ou connectionName)
      const instance = await prisma.whatsappInstance.findFirst({
        where: {
          OR: [
            { name: instanceName },
            { connectionName: instanceName }
          ]
        }
      });
      
      // Fallback removido por segurança — não associar a primeira instância aleatória
      if (!instance) {
        console.warn(`[Webhook Evolution] Instância ${instanceName} não encontrada no banco.`);
        return NextResponse.json({ error: 'Instância não encontrada' }, { status: 401 });
      }

      const tenantId = instance.tenant_id;
      let messageData;
      if (body.data && body.data.key) {
        messageData = body.data;
      } else if (body.data && body.data.messages && body.data.messages.length > 0) {
        messageData = body.data.messages[0];
      }
      
      if (messageData && messageData.key && messageData.key.remoteJid) {
        const remoteJid = messageData.key.remoteJid;
        
        // Ignorar status do whatsapp
        if (remoteJid === "status@broadcast") {
          return NextResponse.json({ success: true, ignored: "Status" });
        }

        // 0. Busca o Tenant para verificar permissões de grupo e limites
        const webhookTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

        const rJid = (messageData.key.remoteJid || "").toString().toLowerCase();
        const rJidAlt = (messageData.key.remoteJidAlt || "").toString().toLowerCase();
        const partJid = (messageData.key.participant || "").toString().toLowerCase();
        const partJidAlt = (messageData.key.participantAlt || "").toString().toLowerCase();

        const isGroupMessage =
          rJid.includes("@g.us") ||
          rJidAlt.includes("@g.us") ||
          partJid.includes("@g.us") ||
          partJidAlt.includes("@g.us") ||
          (messageData.key.participant !== undefined && messageData.key.participant !== null && messageData.key.participant !== "");

        if (isGroupMessage) {
          const settings = typeof webhookTenant?.settings === "string"
            ? JSON.parse(webhookTenant?.settings || "{}")
            : (webhookTenant?.settings || {});

          const enableGroups = settings?.enable_groups === true;
          const whitelistStr = (settings?.whitelisted_groups || webhookTenant?.whitelisted_groups || "").trim();

          // 1. Se a opção de grupos estiver desativada (PADRÃO), ignora o grupo
          if (!enableGroups) {
            console.log(`[Webhook] Ignorando grupo (${rJid}): Respostas em grupos desativadas nas configurações.`);
            return NextResponse.json({ success: true, ignored: "Respostas em grupos desativadas" });
          }

          // 2. Se a opção estiver ativada, valida se o grupo atual consta na lista de autorizados
          const allowedList = whitelistStr.split(",").map((g: string) => g.trim().toLowerCase()).filter(Boolean);
          const cleanGroupId = rJid.replace("@g.us", "").trim();

          if (allowedList.length > 0) {
            const pushName = (messageData.pushName || "").toLowerCase();
            const isAllowed = allowedList.some((allowed: string) =>
              cleanGroupId.includes(allowed) || rJid.includes(allowed) || pushName.includes(allowed)
            );

            if (!isAllowed) {
              console.log(`[Webhook] Ignorando grupo (${rJid}): Grupo não está na lista de autorizados (${whitelistStr}).`);
              return NextResponse.json({ success: true, ignored: "Grupo não autorizado na whitelist" });
            }
          } else {
            console.log(`[Webhook] Ignorando grupo (${rJid}): Nenhum grupo cadastrado na lista de autorizados.`);
            return NextResponse.json({ success: true, ignored: "Nenhum grupo cadastrado na lista" });
          }
        }

        const effectiveJid = (messageData.key.remoteJidAlt || messageData.key.remoteJid || "").toString();
        const contactNumber = effectiveJid
          .replace("@s.whatsapp.net", "")
          .replace("@g.us", "")
          .replace("@lid", "");
        const contactName = messageData.pushName || contactNumber;
        const fromMe = messageData.key.fromMe || false;
        const providerMessageId = typeof messageData.key.id === "string" ? messageData.key.id.trim() : "";

        if (
          fromMe &&
          (messageData.message?.pollCreationMessage || messageData.message?.pollCreationMessageV3)
        ) {
          console.log(`[Webhook] Ignorando criação de enquete enviada pelo bot para ${contactNumber}`);
          return NextResponse.json({ success: true, ignored: "Criação de enquete do bot" });
        }

        if (fromMe && (messageData.message?.buttonsMessage || messageData.message?.listMessage)) {
          console.log(`[Webhook] Ignorando menu interativo enviado pelo bot para ${contactNumber}`);
          return NextResponse.json({ success: true, ignored: "Menu interativo do bot" });
        }

        if (providerMessageId) {
          const receiptKey = `evolution_message_${instanceName}_${providerMessageId}`;
          try {
            await prisma.systemConfig.create({ data: { key: receiptKey, value: new Date().toISOString() } });
          } catch (error) {
            const existingReceipt = await prisma.systemConfig.findUnique({ where: { key: receiptKey }, select: { key: true } });
            if (existingReceipt) {
              console.log(`[Webhook] Evento duplicado ignorado atomicamente: ${providerMessageId}`);
              await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "ignored", reasonCode: "duplicate" });
              return NextResponse.json({ success: true, ignored: "Evento duplicado" });
            }
            throw error;
          }
          receiptKeyForRetry = receiptKey;
        }

        // A lista da conta vale para todas as conexões; a lista da instância vale só para este número.
        let accountSettings: any = {};
        let connectionSettings: any = {};
        try {
          accountSettings = typeof webhookTenant?.settings === "string"
            ? JSON.parse(webhookTenant.settings || "{}")
            : (webhookTenant?.settings || {});
        } catch {}
        try {
          connectionSettings = JSON.parse(instance.settings || "{}");
        } catch {}
        const ignoredNumbers = [
          ...getIgnoredNumbers(accountSettings.ignored_numbers),
          ...getIgnoredNumbers(connectionSettings.ignored_numbers),
        ];
        if (ignoredNumbers.some((number) => phoneNumbersMatch(contactNumber, number))) {
          console.log(`[Webhook] Contato ${contactNumber} (${contactName}) está na lista de ignorados da conta ou da instância ${instanceName}.`);
          return NextResponse.json({ success: true, ignored: "Blacklist" });
        }

        
        // Ignorar mensagens antigas (Histórico de fato) - Mais de 24 horas atrás (86400 segundos)
        const msgTimestamp = messageData.messageTimestamp || Math.floor(Date.now() / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (currentTimestamp - msgTimestamp > 86400) {
          console.log(`[Ignorado] Mensagem muito antiga de ${contactNumber} (sincronização de histórico).`);
          return NextResponse.json({ success: true, ignored: "Mensagem Antiga (Sync)" });
        }

        // Extrai texto da mensagem (pode ser text, extendedTextMessage, etc)
        const messageEnvelope = messageData.message || {};
        const rawMessageType = Object.keys(messageEnvelope).find((key) =>
          key !== "messageContextInfo" && key !== "base64"
        ) || "unknown";
        let pollSelectionLabel = "";
        const incomingPoll = messageEnvelope.pollCreationMessage || messageEnvelope.pollCreationMessageV3;
        let msgContent = messageData.message?.conversation 
          || messageData.message?.extendedTextMessage?.text
          || "";

        if (!msgContent && incomingPoll) {
          msgContent = incomingPoll.name || "Enquete recebida";
        }

        // Extrair texto de botões interativos (button_reply / list_reply)
        if (!msgContent) {
          const interactive = messageData.message?.interactiveMessage
            || messageData.message?.buttonsResponseMessage;
          if (interactive) {
            try {
              const nativeFlow = interactive.nativeFlowResponseMessage;
              if (nativeFlow?.paramsJson) {
                const parsed = JSON.parse(nativeFlow.paramsJson);
                msgContent = parsed.id || parsed.title || '';
              }
            } catch {}
            if (!msgContent && interactive.selectedDisplayText) {
              msgContent = interactive.selectedDisplayText;
            }
            if (!msgContent && interactive.selectedButtonId) {
              msgContent = interactive.selectedButtonId;
            }
          }
        }

        // Extrair texto de resposta de lista (Lista interativa Evolution API)
        if (!msgContent) {
          const listResponse = messageData.message?.listResponseMessage;
          if (listResponse) {
            msgContent = listResponse.singleSelectReply?.selectedRowId || listResponse.title || '';
          }
        }

        // A Evolution descriptografa votos e inclui o nome selecionado no webhook.
        if (!msgContent) {
          const selectedPollOption = messageData.message?.pollUpdateMessage?.vote?.selectedOptions?.[0]
            || messageData.pollUpdates?.find((option: any) => option.voters?.length > 0)?.name;
          if (typeof selectedPollOption === 'string') {
            pollSelectionLabel = selectedPollOption.replace(/\s*\[([^\[\]]+)]\s*$/, "").trim();
            const idMatch = selectedPollOption.match(/\s*\[([^\[\]]+)]\s*$/);
            msgContent = idMatch?.[1]?.trim() || selectedPollOption;
          }
        }

        // Fallback: WhatsApp Cloud API format
        if (!msgContent) {
          const buttonReply = messageData.message?.interactive?.button_reply;
          const listReply = messageData.message?.interactive?.list_reply;
          if (buttonReply?.title) msgContent = buttonReply.title;
          else if (listReply?.title) msgContent = listReply.title;
        }

        if (!msgContent && messageEnvelope.pollUpdateMessage) {
          console.log(`[Webhook] Ignorando atualização de enquete sem opção descriptografada: ${providerMessageId}`);
          return NextResponse.json({ success: true, ignored: "Voto de enquete vazio" });
        }

        let mediaType: "image" | "audio" | "video" | "document" | null = null;
        let mediaBase64 = messageData.message?.base64 || messageData.base64 || "";
        let mediaNode: any = null;

        if (messageData.message?.imageMessage) {
          mediaType = "image";
          mediaNode = messageData.message.imageMessage;
        } else if (messageData.message?.stickerMessage) {
          mediaType = "image";
          mediaNode = messageData.message.stickerMessage;
        } else if (messageData.message?.audioMessage) {
          mediaType = "audio";
          mediaNode = messageData.message.audioMessage;
        } else if (messageData.message?.videoMessage) {
          mediaType = "video";
          mediaNode = messageData.message.videoMessage;
        } else if (messageData.message?.documentMessage || messageData.message?.documentWithCaptionMessage) {
          mediaType = "document";
          mediaNode = messageData.message.documentMessage
            || messageData.message.documentWithCaptionMessage?.message?.documentMessage;
        }

        if (mediaType && !mediaBase64 && process.env.EVOLUTION_URL && process.env.EVOLUTION_API_KEY) {
          try {
            const mediaResponse = await fetch(
              `${process.env.EVOLUTION_URL.replace(/\/$/, "")}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: process.env.EVOLUTION_API_KEY,
                },
                body: JSON.stringify({ message: messageData }),
              },
            );
            if (mediaResponse.ok) {
              const recoveredMedia = await mediaResponse.json();
              mediaBase64 = recoveredMedia.base64 || "";
              mediaNode = { ...mediaNode, ...recoveredMedia };
            } else {
              console.warn(`[Webhook] Evolution não recuperou mídia ${providerMessageId}: ${mediaResponse.status}`);
            }
          } catch (error) {
            console.error(`[Webhook] Falha ao recuperar mídia ${providerMessageId}:`, error);
          }
        }

        if (mediaType && !msgContent) {
           msgContent = messageData.message?.imageMessage?.caption || messageData.message?.videoMessage?.caption || messageData.message?.documentWithCaptionMessage?.message?.documentMessage?.caption || `[Mídia: ${mediaType}]`;
        }

        const location = messageData.message?.locationMessage;
        if (!msgContent && location) {
          msgContent = location.name || location.address || "Localização compartilhada";
        }
        const sharedContact = messageData.message?.contactMessage;
        if (!msgContent && sharedContact) {
          msgContent = `Contato compartilhado: ${sharedContact.displayName || "sem nome"}`;
        }
        const reaction = messageData.message?.reactionMessage;
        if (!msgContent && reaction) {
          msgContent = `Reagiu com ${reaction.text || "uma reação"}`;
        }

        if (!msgContent && !mediaType) msgContent = `Mensagem não suportada (${rawMessageType})`;

        if (
          fromMe &&
          (outboundEchoCache.get(outboundEchoKey(instanceName, contactNumber, msgContent)) ?? 0) > Date.now()
        ) {
          console.log(`[Webhook] Ignorando eco rastreado do bot para ${contactNumber}`);
          return NextResponse.json({ success: true, ignored: "Eco rastreado do bot" });
        }
        if (fromMe && mediaType && await consumePersistentOutboundEcho(instanceName, contactNumber, msgContent)) {
          console.log(`[Webhook] Ignorando eco persistente de mídia do bot para ${contactNumber}`);
          return NextResponse.json({ success: true, ignored: "Eco persistente de mídia do bot" });
        }

        // 1. Busca ou cria a conversa atomicamente (sem race condition)
        const conversation = await prisma.conversation.upsert({
          where: {
            tenant_id_instance_name_contact_number: {
              tenant_id: tenantId,
              instance_name: instance.name,
              contact_number: contactNumber
            }
          },
          update: {
            instance_name: instance.name,
            ...(fromMe ? {} : { contact_name: contactName, status: "active" }) // Só atualiza o nome se não for eu enviando (para não sobreescrever os clientes com o meu nome)
          },
          create: {
            tenant_id: tenantId,
            instance_name: instance.name,
            contact_number: contactNumber,
            contact_name: contactName,
            last_message_at: new Date()
          }
        });

        if (providerMessageId) {
          const recentWebhookDuplicate = await prisma.message.findFirst({
            where: {
              conversation_id: conversation.id,
              metadata: { contains: `"providerMessageId":${JSON.stringify(providerMessageId)}` },
              created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) }
            },
            select: { id: true }
          });
          if (recentWebhookDuplicate) {
            console.log(`[Webhook] Ignorando retry duplicado da mensagem ${providerMessageId}`);
            return NextResponse.json({ success: true, ignored: "Retry duplicado" });
          }
        }

        // 1.1 Criar ou Atualizar Lead no Funil de Vendas
        if (!fromMe || conversation.contact_name) {
          const leadData = {
            tenant_id: tenantId,
            conversation_id: conversation.id,
            name: conversation.contact_name || contactName,
            phone: contactNumber,
          };
          
          const existingLead = await prisma.lead.findFirst({
            where: { conversation_id: conversation.id }
          });

          if (!existingLead) {
            await prisma.lead.create({
              data: {
                ...leadData,
                status: "novo"
              }
            });
          }
        }

        // A foto não pode atrasar o atendimento; ela é enriquecida em segundo plano.
        if (!conversation.profile_picture && !fromMe) {
          void getProfilePicture(instanceName, remoteJid).then((picUrl) => {
            if (!picUrl) return;
            return prisma.conversation.updateMany({
              where: { id: conversation.id, profile_picture: null },
              data: { profile_picture: picUrl },
            });
          }).catch((error) => console.warn("[Webhook] Falha ao atualizar foto em segundo plano:", error));
        }

        // Prevenir duplicação do echo do webhook de uma mensagem gerada pela IA
        if (fromMe) {
          
          // --- COMANDO ESPECIAL: ADICIONAR À LISTA BRANCA ---
          if (msgContent.trim().toLowerCase() === "lista branca") {
            const settingsTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (settingsTenant) {
               let settings: any = {};
               try { settings = JSON.parse((settingsTenant.settings as string) || "{}"); } catch(e) {}
               const currentIgnored: any[] = Array.isArray(settings.ignored_numbers)
                 ? settings.ignored_numbers
                 : (typeof settings.ignored_numbers === "string"
                   ? settings.ignored_numbers.split(",").map((value: string) => value.trim()).filter(Boolean)
                   : []);
                const cleanContact = contactNumber.replace(/\D/g, "");
                if (!getIgnoredNumbers(currentIgnored).some((number) => phoneNumbersMatch(number, cleanContact))) {
                  currentIgnored.push({ number: cleanContact, name: contactName });
                  settings.ignored_numbers = currentIgnored;
                 await prisma.tenant.update({ where: { id: tenantId }, data: { settings: JSON.stringify(settings) } });
                 console.log(`[Webhook] Palavra-chave! Contato ${contactNumber} adicionado à Lista Branca.`);
               }
            }
            return NextResponse.json({ success: true, ignored: "Comando Lista Branca" });
          }

          const recentDuplicate = await prisma.message.findFirst({
            where: {
              conversation_id: conversation.id,
              direction: "outbound",
              content: msgContent,
              created_at: { gte: new Date(Date.now() - 30000) } // últimos 30 segundos
            }
          });
          if (recentDuplicate) {
            console.log(`[Webhook] Ignorando echo de IA para ${contactNumber}`);
            return NextResponse.json({ success: true, ignored: "Echo da IA" });
          }

          if (mediaType) {
            const recentMediaSentBySite = await prisma.message.findFirst({
              where: {
                conversation_id: conversation.id,
                direction: "outbound",
                ai_generated: false,
                metadata: { contains: `"kind":"${mediaType}"` },
                created_at: { gte: new Date(Date.now() - 30_000) },
                NOT: { metadata: { contains: '"providerMessageId"' } },
              },
              orderBy: { created_at: "desc" },
            });
            if (recentMediaSentBySite) {
              let existingMetadata: Record<string, unknown> = {};
              try {
                existingMetadata = JSON.parse(recentMediaSentBySite.metadata || "{}");
              } catch {}
              await prisma.message.update({
                where: { id: recentMediaSentBySite.id },
                data: {
                  metadata: JSON.stringify({
                    ...existingMetadata,
                    providerMessageId: providerMessageId || existingMetadata.providerMessageId,
                  }),
                },
              });
              console.log(`[Webhook] Eco de mídia associado à mensagem ${recentMediaSentBySite.id}`);
              return NextResponse.json({ success: true, ignored: "Eco de mídia do site" });
            }
          }

          // Fallback: compara com o conteúdo da última mensagem de saída gerada pela IA
          const lastAiMsg = await prisma.message.findFirst({
            where: {
              conversation_id: conversation.id,
              direction: "outbound",
              ai_generated: true,
            },
            orderBy: { created_at: 'desc' }
          });
          if (lastAiMsg && lastAiMsg.content.trim() === msgContent.trim()) {
            console.log(`[Webhook] Ignorando eco da IA (fromMe, conteúdo) para ${contactNumber}`);
            return NextResponse.json({ success: true, ignored: "Echo da IA (conteúdo)" });
          }
        }

        const botNumber = (body.sender || "").replace("@s.whatsapp.net", "");
        
        // --- Processamento de Mídia ---
        const messageMetadata: Record<string, unknown> = {
          schemaVersion: 1,
          kind: mediaType || (incomingPoll ? "poll" : pollSelectionLabel ? "poll_vote" : location ? "location" : sharedContact ? "contact" : reaction ? "reaction" : "text"),
          rawType: rawMessageType,
          providerRemoteJid: effectiveJid,
          providerFromMe: fromMe,
        };
        if (providerMessageId) messageMetadata.providerMessageId = providerMessageId;
        const providerParticipant = messageData.key.participant || messageData.key.participantAlt;
        if (providerParticipant) messageMetadata.providerParticipant = String(providerParticipant);
        const contentNode = messageData.message?.extendedTextMessage
          || messageData.message?.imageMessage
          || messageData.message?.videoMessage
          || messageData.message?.documentMessage
          || messageData.message?.audioMessage;
        const contextInfo = contentNode?.contextInfo;
        if (contextInfo?.stanzaId) {
          const quotedMessage = contextInfo.quotedMessage || {};
          const quotedContent = quotedMessage.conversation
            || quotedMessage.extendedTextMessage?.text
            || quotedMessage.imageMessage?.caption
            || quotedMessage.videoMessage?.caption
            || quotedMessage.documentMessage?.caption
            || "[Mídia]";
          messageMetadata.quoted = {
            providerMessageId: String(contextInfo.stanzaId),
            content: String(quotedContent),
            participant: contextInfo.participant ? String(contextInfo.participant) : undefined,
          };
        }
        if (Array.isArray(contextInfo?.mentionedJid) && contextInfo.mentionedJid.length > 0) {
          messageMetadata.mentioned = contextInfo.mentionedJid.map((jid: unknown) => String(jid).replace(/@.+$/, ""));
        }
        if (incomingPoll) {
          const rawOptions = Array.isArray(incomingPoll.options) ? incomingPoll.options : [];
          messageMetadata.poll = {
            title: incomingPoll.name || "Enquete",
            selectableCount: incomingPoll.selectableOptionsCount || 1,
            options: rawOptions.map((option: any, index: number) => ({
              id: String(index + 1),
              label: option.optionName || option.name || option.title || `Opção ${index + 1}`,
            })),
          };
        }
        if (pollSelectionLabel) messageMetadata.pollVote = { label: pollSelectionLabel, id: msgContent };
        if (location) {
          messageMetadata.location = {
            latitude: location.degreesLatitude,
            longitude: location.degreesLongitude,
            name: location.name,
            address: location.address,
          };
        }
        if (mediaType && mediaBase64) {
           try {
              const normalizedBase64 = mediaBase64
                .replace(/^data:[^;]+;base64,/i, "")
                .replace(/\s/g, "");
              const bufferData = Buffer.from(normalizedBase64, 'base64');
              const mimeType = mediaNode?.mimetype || (mediaType === "image" ? "image/jpeg" : mediaType === "audio" ? "audio/ogg" : mediaType === "video" ? "video/mp4" : "application/octet-stream");
              const extensionByMime: Record<string, string> = {
                "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
                "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/webm": "webm",
                "video/mp4": "mp4", "video/quicktime": "mov", "application/pdf": "pdf",
              };
              const originalFileName = String(mediaNode?.fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
              const fallbackExtension = extensionByMime[mimeType.split(";")[0]] || (mediaType === "document" ? "bin" : mediaType);
              const filename = `${tenantId}_${Date.now()}_${originalFileName || `webhook.${fallbackExtension}`}`;
             
             const accountId = process.env.R2_ACCOUNT_ID;
             const accessKeyId = process.env.R2_ACCESS_KEY_ID;
             const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
             const bucketName = process.env.R2_BUCKET_NAME;
             const publicUrl = process.env.R2_PUBLIC_URL;
             
             let uploadedUrl = "";
             
             if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
                // Fallback local
                 const uploadsDir = join(process.cwd(), 'public', 'uploads');
                await mkdir(uploadsDir, { recursive: true });
                await writeFile(join(uploadsDir, filename), bufferData);
                uploadedUrl = `/uploads/${filename}`;
             } else {
                // R2
                const s3Client = new S3Client({
                  region: "auto",
                  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                  credentials: { accessKeyId, secretAccessKey },
                });
                await s3Client.send(new PutObjectCommand({
                  Bucket: bucketName,
                  Key: filename,
                  Body: bufferData,
                  ContentType: mimeType,
                }));
                uploadedUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${filename}` : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filename}`;
             }
             
              messageMetadata.type = mediaType;
              messageMetadata.url = uploadedUrl;
              messageMetadata.mimeType = mimeType;
              messageMetadata.fileName = originalFileName || filename;
             } catch (err) {
               console.error("[Webhook] Erro ao salvar mídia", err);
             }
        } else if (mediaType) {
          messageMetadata.type = mediaType;
          messageMetadata.fileName = mediaNode?.fileName || undefined;
          messageMetadata.mimeType = mediaNode?.mimetype || undefined;
          messageMetadata.mediaUnavailable = true;
        }
        const finalMetadata = Object.keys(messageMetadata).length > 0 ? JSON.stringify(messageMetadata) : null;
        
        let isOwner = false;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { phone: true } });
        const ownerNumbers = [tenant?.phone, instance.phone_number, botNumber]
          .map((number) => String(number || "").replace(/\D/g, ""))
          .filter((number) => number.length >= 8);
        isOwner = ownerNumbers.some((number) => phoneNumbersMatch(contactNumber, number));
        
        const isMessageToMyself = isOwner || contactNumber === botNumber;

        // 2. Salva a mensagem (se for mensagem para mim mesmo testando, entra como inbound)
        const incomingMessage = await prisma.message.create({
          data: {
            tenant_id: tenantId,
            conversation_id: conversation.id,
            direction: (fromMe && !isMessageToMyself) ? "outbound" : "inbound",
            content: msgContent,
            ai_generated: false, // Se chegou até aqui, assumimos que foi o Humano via WhatsApp Web
            metadata: finalMetadata
          }
        });

        // Atualiza a data da última mensagem da conversa
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { last_message_at: new Date() }
        });

        if (incomingPoll || location || sharedContact || reaction || msgContent.startsWith("Mensagem não suportada")) {
          console.log(`[Webhook] Evento ${rawMessageType} armazenado sem acionar resposta automática`);
          return NextResponse.json({ success: true, stored: rawMessageType });
        }

        console.log(`💬 [Tenant ${tenantId}] Mensagem sincronizada de ${contactNumber}: ${msgContent.substring(0,30)}...`);

        // 3. Lógica de Auto-Pause e IA
        if (fromMe && !isMessageToMyself) {
          // Se fui eu que mandei (fromMe) para OUTRA pessoa, precisamos saber se foi a IA ou o Humano (via WhatsApp Web).
          // Vamos buscar a última mensagem dessa conversa
          const lastMsg = await prisma.message.findFirst({
            where: { conversation_id: conversation.id },
            orderBy: { created_at: 'desc' }
          });
          
          // Se a última mensagem que mandamos não está marcada como ai_generated (ou seja, você digitou no celular/PC)
          // E o texto não for igual a algo que a IA acabou de mandar...
          // Pausamos a IA para não interromper você.
          const isHybridEnabled = (connectionSettings?.modules?.module_hybrid_mode !== false) &&
                                  (connectionSettings?.module_hybrid_mode !== false) &&
                                  (accountSettings?.modules?.module_hybrid_mode !== false) &&
                                  (accountSettings?.module_hybrid_mode !== false);
          if (isHybridEnabled && !lastMsg?.ai_generated) {
            await prisma.conversation.updateMany({
              where: { id: conversation.id, tenant_id: tenantId },
              data: { ai_paused: true }
            });
            console.log(`⏸️ Modo Híbrido: IA pausada para o contato ${contactNumber} pois um humano assumiu o atendimento.`);
          }
        } else {
          const isHybridEnabled = (connectionSettings?.modules?.module_hybrid_mode !== false) &&
                                  (connectionSettings?.module_hybrid_mode !== false) &&
                                  (accountSettings?.modules?.module_hybrid_mode !== false) &&
                                  (accountSettings?.module_hybrid_mode !== false);
          if (conversation.ai_paused) {
            const lastActive = conversation.last_message_at || conversation.created_at;
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (isHybridEnabled && lastActive && lastActive.getTime() < oneDayAgo.getTime()) {
              await prisma.conversation.updateMany({
                where: { id: conversation.id, tenant_id: tenantId },
                data: { ai_paused: false }
              });
              conversation.ai_paused = false;
              console.log(`▶️ Modo Híbrido: IA reativada automaticamente para ${contactNumber} após 24h de inatividade.`);
            } else {
              console.log(`🤚 IA permanece pausada para ${contactNumber}: aguardando reativação manual.`);
              return NextResponse.json({ success: true, ignored: "IA Pausada para Atendimento Humano" });
            }
          }

          // =========== ANTI-BOT-LOOP ===========
          // 1. Ignorar eco da própria IA (conteúdo idêntico ao último outbound gerado)
          if (!fromMe) {
            const lastBotMsg = await prisma.message.findFirst({
              where: {
                conversation_id: conversation.id,
                direction: "outbound",
                ai_generated: true,
              },
              orderBy: { created_at: 'desc' }
            });
            if (lastBotMsg && lastBotMsg.content.trim() === msgContent.trim()) {
              console.log(`[Webhook] Ignorando eco da IA para ${contactNumber}: conteúdo idêntico ao último outbound`);
              return NextResponse.json({ success: true, ignored: "Eco da IA (conteúdo)" });
            }

            // 2. Ignorar mensagens de sistema/status que não são input real do cliente
            const lowerMsg = msgContent.trim().toLowerCase();
            if (
              /^por favor, responda apenas/.test(lowerMsg) ||
              /^\[outros\]$/.test(lowerMsg) ||
              /^\[m[ií]dia:/.test(lowerMsg)
            ) {
              console.log(`[Webhook] Ignorando mensagem de sistema/status de ${contactNumber}: "${msgContent.substring(0, 60)}"`);
              return NextResponse.json({ success: true, ignored: "Sistema/Status" });
            }
          }
          // =====================================

          const debounceSetting = Number(
            connectionSettings.message_debounce_ms
              ?? accountSettings.message_debounce_ms
              ?? DEFAULT_INBOUND_DEBOUNCE_MS,
          );
          const debounceMs = Number.isFinite(debounceSetting)
            ? Math.min(3000, Math.max(300, debounceSetting))
            : DEFAULT_INBOUND_DEBOUNCE_MS;
          const processingToken = providerMessageId || incomingMessage.id;
          const isLatestInbound = await claimLatestInboundMessage(
            tenantId,
            instanceName,
            contactNumber,
            processingToken,
            debounceMs,
          );
          if (!isLatestInbound) {
            console.log(`[Webhook] Mensagem ${processingToken} agrupada; uma entrada mais recente será processada para ${contactNumber}`);
            await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "grouped", reasonCode: "debounced" });
            return NextResponse.json({ success: true, ignored: "Mensagem agrupada" });
          }

          const responseAfterInbound = await prisma.message.findFirst({
            where: {
              conversation_id: conversation.id,
              direction: "outbound",
              ai_generated: true,
              created_at: { gte: incomingMessage.created_at },
            },
            select: { id: true },
          });
          if (responseAfterInbound) {
            console.log(`[Webhook] Mensagem ${processingToken} já coberta por uma resposta concorrente para ${contactNumber}`);
            await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "ignored", reasonCode: "concurrent_response" });
            return NextResponse.json({ success: true, ignored: "Resposta concorrente já enviada" });
          }

          const processingLockKey = await acquireConversationProcessingLock(
            tenantId,
            instanceName,
            contactNumber,
            processingToken,
          );
          if (!processingLockKey) {
            console.log(`[Webhook] Processamento já em andamento para ${contactNumber}; mensagem ${processingToken} não avançará o fluxo`);
            await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "ignored", reasonCode: "processing_locked" });
            return NextResponse.json({ success: true, ignored: "Processamento em andamento" });
          }

          const usage = await reserveMonthlyAttendance({
            tenantId,
            tenantPlan: webhookTenant?.plan || "site_gratis",
            instanceName: instance.name,
            contactNumber,
            configuredLimit: accountSettings.max_attendances_per_month ?? accountSettings.max_conversations_per_month,
          });
          if (!usage.allowed) {
            await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "blocked", reasonCode: "monthly_limit" });
            const period = formatBusinessDateKey(new Date()).slice(0, 7);
            const noticeKey = `usage_limit_notice_${tenantId}_${period}`;
            let shouldNotify = false;
            try {
              await prisma.systemConfig.create({ data: { key: noticeKey, value: new Date().toISOString() } });
              shouldNotify = true;
            } catch {}
            if (shouldNotify) {
              const limitReply = "O atendimento automático está temporariamente indisponível. Sua mensagem foi recebida e será atendida pela equipe.";
              const sent = await sendTrackedWhatsAppMessage(instanceName, contactNumber, limitReply);
              if (sent) {
                await prisma.message.create({
                  data: { tenant_id: tenantId, conversation_id: conversation.id, direction: "outbound", content: limitReply, ai_generated: true },
                });
              }
            }
            await releaseConversationProcessingLock(processingLockKey, processingToken);
            return NextResponse.json({ success: true, ignored: "Limite mensal de atendimentos atingido" });
          }

          // Processamento da IA em try/catch proprio para nao derrubar o webhook inteiro
          try {
              const aiStartedAt = Date.now();
              console.log(`[Webhook] Processando mensagem IA sincronicamente para ${contactNumber} (fromMe=${fromMe}, isMessageToMyself=${isMessageToMyself}, ai_paused=${conversation.ai_paused})`);

            // Se for mídia sem texto legível (imagem/vídeo/documento sem legenda), responde direto sem chamar IA
            if (mediaType && mediaType !== "audio" && !messageData.message?.imageMessage?.caption && !messageData.message?.videoMessage?.caption) {
              if (conversation.ai_paused) {
                console.log(`[Webhook] Resposta automática para mídia ignorada: IA pausada para ${contactNumber}`);
              } else {
                const mediaReply = "📸 Não consigo visualizar imagens ou arquivos. Se preferir, me descreva o que precisa!";
                const sent = await sendTrackedWhatsAppMessage(instanceName, contactNumber, mediaReply);
                if (!sent) throw new Error("Evolution recusou a resposta automática para mídia");

                await prisma.message.create({
                  data: {
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    direction: "outbound",
                    content: mediaReply,
                    ai_generated: true,
                  }
                });
                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { last_message_at: new Date() }
                });
                console.log(`[Webhook] Resposta automática para mídia de ${contactNumber}`);
              }
            } else {
              // Carregar settings específicas da instância (se houver)
              let instanceSettings: any = null;
              try {
                const instSettingsRaw = instance?.settings;
                if (instSettingsRaw && instSettingsRaw !== "{}") {
                  instanceSettings = JSON.parse(instSettingsRaw);
                }
              } catch (e) {
                console.warn("[Webhook] Erro ao parse settings da instância:", e);
              }

              let tenantBotSettings: any = {};
              try {
                tenantBotSettings = typeof webhookTenant?.settings === "string"
                  ? JSON.parse(webhookTenant.settings || "{}")
                  : (webhookTenant?.settings || {});
              } catch (e) {
                console.warn("[Webhook] Erro ao parse settings do tenant:", e);
              }
              const pollSetting = tenantBotSettings.interactive_poll_enabled
                ?? instanceSettings?.interactive_poll_enabled
                ?? true;
              const interactivePollEnabled = pollSetting !== false && pollSetting !== "false";

              const { processMessageWithAI } = await import('@/lib/ai/engine');
              const iaResponse = await processMessageWithAI(
                tenantId,
                contactNumber,
                msgContent,
                isMessageToMyself,
                { ...(instanceSettings || {}), _instanceName: instance.name, _conversationId: conversation.id },
                conversation.id,
              );
              await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "latency", reasonCode: "automation_response", durationMs: Date.now() - aiStartedAt });
              console.log(`[Webhook] processMessageWithAI retornou: ${iaResponse ? iaResponse.substring(0, 100) + "..." : "null (pausado/erro)"}`);
            
              const normalizeText = (text: string) => {
                if (!text) return "";
                const safeText = text.trim();
                return safeText
                  .replace(/\r\n/g, "\n")
                  .replace(/[ \t]+/g, " ")
                  .replace(/\n{3,}/g, "\n\n");
              };
              const sendAndStoreResponse = async (text: string) => {
                const cleanedText = normalizeText(text);
                if (!cleanedText) return;

                let mainText = cleanedText;
                let pixCopyPayload = "";
                let imagePayload = "";
                let buttonsSection = "";
                let listSection = "";

                // Encontra todas as posições dos marcadores na string
                const markerRegex = /\n---(IMAGE|PIX-COPY|BUTTONS|LIST)---\n/g;
                const matches = Array.from(cleanedText.matchAll(markerRegex));

                if (matches.length > 0) {
                  // O texto principal fica antes do primeiro marcador
                  mainText = cleanedText.slice(0, matches[0].index!).trim();

                  for (let i = 0; i < matches.length; i++) {
                    const match = matches[i];
                    const markerType = match[1];
                    const startIndex = match.index! + match[0].length;
                    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index! : cleanedText.length;
                    const content = cleanedText.slice(startIndex, endIndex).trim();

                    if (markerType === "PIX-COPY") {
                      pixCopyPayload = content;
                    } else if (markerType === "IMAGE") {
                      imagePayload = content;
                    } else if (markerType === "BUTTONS") {
                      buttonsSection = content;
                    } else if (markerType === "LIST") {
                      listSection = content;
                    }
                  }
                }

                let buttons: { text: string; id: string }[] = [];
                let listItems: { title: string; id: string }[] = [];
                let useList = false;

                if (listSection) {
                  useList = true;
                  listItems = listSection.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.includes('|'))
                    .map(line => {
                      const [label, id] = line.split('|').map(s => s.trim());
                      return { title: label || id, id: id || label };
                    })
                    .slice(0, 10);
                } else if (buttonsSection) {
                  buttons = buttonsSection.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.includes('|'))
                    .map(line => {
                      const [label, id] = line.split('|').map(s => s.trim());
                      return { text: label || id, id: id || label };
                    })
                    .slice(0, 3);

                  // Se tiver mais de 3 opções, converte automaticamente para lista
                  const allOptions = buttonsSection.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.includes('|'))
                    .map(line => {
                      const [label, id] = line.split('|').map(s => s.trim());
                      return { title: label || id, id: id || label };
                    });
                  if (allOptions.length > 3) {
                    useList = true;
                    listItems = allOptions.slice(0, 10);
                    buttons = [];
                  }
                }

                let sent = false;
                let outboundMetadata: string | null = null;
                const pollItems = useList
                  ? listItems.map(item => ({ text: item.title, id: item.id }))
                  : buttons;
                const deliveryItems = ensureMinimumWhatsAppPollOptions(pollItems, interactivePollEnabled);
                const pollTitle = /nossos servi[cç]os e pre[cç]os|cat[aá]logo/i.test(mainText)
                  ? "Escolha um produto ou serviço"
                  : "Escolha uma opção";

                const deliveryText = formatWhatsAppOptionText(
                  mainText,
                  deliveryItems,
                  interactivePollEnabled && deliveryItems.length >= 2,
                );

                if (interactivePollEnabled && deliveryItems.length >= 2) {
                  sent = !deliveryText || await sendTrackedWhatsAppMessage(instanceName, contactNumber, deliveryText);
                  if (sent) {
                    const { sendWhatsAppPoll } = await import('@/lib/evolution');
                    const pollOptions = deliveryItems.map(item => item.text);
                    const pollSent = await sendWhatsAppPoll(
                      instanceName,
                      contactNumber,
                      pollTitle,
                      pollOptions,
                    );
                    if (!pollSent) {
                      const fallbackMenu = formatWhatsAppOptionText(mainText, deliveryItems, false);
                      sent = await sendTrackedWhatsAppMessage(instanceName, contactNumber, fallbackMenu);
                      console.log(`[Webhook] Enquete falhou para ${contactNumber}; menu textual completo enviado=${sent}`);
                    } else {
                      outboundMetadata = JSON.stringify({
                        schemaVersion: 1,
                        kind: "poll",
                        poll: {
                          title: pollTitle,
                          selectableCount: 1,
                          options: deliveryItems.map((item) => ({ id: item.id, label: item.text })),
                        },
                      });
                    }
                  }
                }
                if (!sent) {
                  sent = await sendTrackedWhatsAppMessage(instanceName, contactNumber, deliveryText);
                }
                if (!sent) {
                  throw new Error("Evolution recusou o envio da resposta (até texto puro falhou)");
                }

                if (pixCopyPayload) {
                  const pixSent = await sendTrackedWhatsAppMessage(instanceName, contactNumber, pixCopyPayload);
                  if (!pixSent) {
                    throw new Error("Evolution recusou o envio do código Pix Copia e Cola");
                  }
                }

                if (imagePayload) {
                  const imageSource = /^https?:\/\//i.test(imagePayload)
                    ? imagePayload
                    : imagePayload.replace(/\s/g, "");
                  const imageSent = await sendTrackedWhatsAppMedia(
                    instanceName,
                    contactNumber,
                    imageSource,
                    "QR Code PIX",
                    "image",
                  );
                  if (!imageSent) {
                    console.warn(`[Webhook] Não foi possível enviar o QR PIX como imagem para ${contactNumber}`);
                  }
                }

                await prisma.message.create({
                  data: {
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    direction: "outbound",
                    content: deliveryText || pollTitle,
                    ai_generated: true,
                    metadata: outboundMetadata,
                  }
                });

                await prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { last_message_at: new Date() }
                });

                console.log(`[Webhook] Resposta enviada com sucesso para ${contactNumber}`);
              };

              if (iaResponse) {
                await sendAndStoreResponse(iaResponse).catch((e) => {
                  console.error("[Webhook] Erro ao enviar resposta da IA pela Evolution:", e);
                });
              } else {
                if (conversation.ai_paused) {
                  await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "no_response", reasonCode: "ai_paused" });
                  console.log(`[Webhook] IA pausada para ${contactNumber}, não enviando fallback automático.`);
                } else {
                  const fallbackResponse = "Desculpe, no momento não consegui responder. Pode enviar novamente em alguns instantes?";
                  await sendAndStoreResponse(fallbackResponse).catch((e) => {
                    console.error("[Webhook] Erro ao enviar resposta de fallback da IA:", e);
                  });
                }
              }
            }
          } catch (aiErr) {
            const aiErrMessage = aiErr instanceof Error ? aiErr.message : String(aiErr);
            await recordDiagnostic({ tenantId, instanceName: instance.name, providerEventId: providerMessageId, category: "failure", reasonCode: "automation_error" });
            console.error(`[Webhook] ERRO ao processar IA para ${contactNumber}:`, aiErrMessage);
            // Tenta enviar um aviso genérico via texto puro como fallback emergencial
            try {
              const emergencyFallback = "Desculpe, estou com instabilidade no momento. Já estou verificando e logo volto a responder.";
              await sendTrackedWhatsAppMessage(instanceName, contactNumber, emergencyFallback);
              await prisma.message.create({
                data: {
                  tenant_id: tenantId,
                  conversation_id: conversation.id,
                  direction: "outbound",
                  content: emergencyFallback,
                  ai_generated: true,
                }
              });
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { last_message_at: new Date() }
              });
              console.log(`[Webhook] Fallback emergencial enviado para ${contactNumber}`);
            } catch (fallbackErr) {
              console.error(`[Webhook] Até o fallback emergencial falhou para ${contactNumber}:`, fallbackErr);
            }
          } finally {
            await releaseConversationProcessingLock(processingLockKey, processingToken);
          }
        }
      }
    }

    if (rawEvent === "connection.update" && instanceName) {
      const connectionState = body.data?.state;
      const connectedPhone = String(body.sender || body.data?.ownerJid || "").replace(/\D/g, "") || null;
      const persistedStatus = connectionState === "open"
        ? "open"
        : connectionState === "connecting"
          ? "connecting"
          : "disconnected";
      await prisma.whatsappInstance.updateMany({
        where: { name: instanceName },
        data: {
          status: persistedStatus,
          ...(connectedPhone ? { phone_number: connectedPhone } : {}),
        },
      });

      if (body.data?.state === "open" && body.sender) {
        const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution:8080';
        const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';
        const headers = { apikey: EVOLUTION_KEY, 'Content-Type': 'application/json' };

        try {
          const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, { headers });
          const allInstances = await res.json();
          if (Array.isArray(allInstances)) {
            const duplicates = allInstances.filter((inst: any) => 
              inst.ownerJid === body.sender && 
              inst.name !== instanceName
            );

            for (const dup of duplicates) {
              const dupName = dup.name;
              if (dupName) {
                console.log(`[Webhook Evolution] Removendo instância duplicada detectada: ${dupName}`);
                await fetch(`${EVOLUTION_URL}/instance/delete/${dupName}`, { method: 'DELETE', headers });
                await prisma.whatsappInstance.deleteMany({ where: { name: dupName } });
              }
            }
          }
        } catch (e) {
          console.error("[Webhook Evolution] Erro ao remover instâncias duplicadas:", e);
        }
      }
    }

    console.log(`[Webhook] Processado em ${Date.now() - ts}ms`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (receiptKeyForRetry) {
      await prisma.systemConfig.deleteMany({ where: { key: receiptKeyForRetry } }).catch(() => undefined);
    }
    console.error("❌ [Webhook Evolution] ERRO:", err?.message || err);
    console.error("❌ [Webhook Evolution] STACK:", err?.stack || "");
    return NextResponse.json({ success: false, error: String(err?.message || err) }, { status: 200 });
  }
}
