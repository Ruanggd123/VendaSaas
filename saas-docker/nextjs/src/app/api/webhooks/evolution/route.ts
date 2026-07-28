import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getProfilePicture, sendWhatsAppMessage } from "@/lib/evolution";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { timingSafeEqual } from "crypto";

const prisma = new PrismaClient();
const webhookTokenCache = new Map<string, { token: string; expiresAt: number }>();
export const dynamic = "force-dynamic";

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

        // 0. Verifica Lista Negra (ignored_numbers) por Telefone E por Nome
        if (webhookTenant && webhookTenant.settings) {
          const settings = typeof webhookTenant.settings === "string" ? JSON.parse(webhookTenant.settings) : webhookTenant.settings;
          if (settings?.ignored_numbers) {
            const rawList: any[] = Array.isArray(settings.ignored_numbers)
              ? settings.ignored_numbers
              : (typeof settings.ignored_numbers === "string" ? settings.ignored_numbers.split(",") : []);

            const cleanContactDigits = contactNumber.replace(/\D/g, "");
            const normalizedPushName = (contactName || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

            let isBlacklisted = false;

            for (const item of rawList) {
              let itemNum = "";
              let itemName = "";

              if (typeof item === "string") {
                const itemStr = item.trim();
                const digits = itemStr.replace(/\D/g, "");
                if (digits.length >= 8) {
                  itemNum = digits;
                } else {
                  itemName = itemStr;
                }
              } else if (item && typeof item === "object") {
                itemNum = (item.number || "").replace(/\D/g, "");
                itemName = (item.name || "").trim();
              }

              // Match por Telefone (suporta com e sem o DDI 55 e com/sem o 9º dígito)
              if (itemNum && cleanContactDigits) {
                const contactWithout55 = cleanContactDigits.startsWith("55") ? cleanContactDigits.slice(2) : cleanContactDigits;
                const itemWithout55 = itemNum.startsWith("55") ? itemNum.slice(2) : itemNum;

                if (
                  cleanContactDigits === itemNum ||
                  contactWithout55 === itemWithout55 ||
                  (contactWithout55.length >= 8 && itemWithout55.length >= 8 && (
                    contactWithout55.endsWith(itemWithout55) ||
                    itemWithout55.endsWith(contactWithout55)
                  ))
                ) {
                  isBlacklisted = true;
                  break;
                }
              }

              // Match por Nome/Apelido (ex: "Mãe", "Suporte", etc)
              if (itemName && normalizedPushName) {
                const normalizedItemName = itemName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                if (
                  normalizedPushName === normalizedItemName ||
                  normalizedPushName.includes(normalizedItemName) ||
                  normalizedItemName.includes(normalizedPushName)
                ) {
                  isBlacklisted = true;
                  break;
                }
              }
            }

            if (isBlacklisted) {
              console.log(`[Webhook] Contato ${contactNumber} (${contactName}) está na lista de ignorados (Blacklist). Ignorando mensagem.`);
              return NextResponse.json({ success: true, ignored: "Blacklist" });
            }
          }
        }

        
        // Ignorar mensagens antigas (Histórico de fato) - Mais de 24 horas atrás (86400 segundos)
        const msgTimestamp = messageData.messageTimestamp || Math.floor(Date.now() / 1000);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        if (currentTimestamp - msgTimestamp > 86400) {
          console.log(`[Ignorado] Mensagem muito antiga de ${contactNumber} (sincronização de histórico).`);
          return NextResponse.json({ success: true, ignored: "Mensagem Antiga (Sync)" });
        }

        // Extrai texto da mensagem (pode ser text, extendedTextMessage, etc)
        let msgContent = messageData.message?.conversation 
          || messageData.message?.extendedTextMessage?.text
          || "";

        // Extrair texto de botões interativos (button_reply / list_reply)
        if (!msgContent) {
          const interactive = messageData.message?.interactiveMessage
            || messageData.message?.buttonsResponseMessage;
          if (interactive) {
            try {
              const nativeFlow = interactive.nativeFlowResponseMessage;
              if (nativeFlow?.paramsJson) {
                const parsed = JSON.parse(nativeFlow.paramsJson);
                msgContent = parsed.title || parsed.id || '';
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
            msgContent = listResponse.title || listResponse.singleSelectReply?.selectedRowId || '';
          }
        }

        // Fallback: WhatsApp Cloud API format
        if (!msgContent) {
          const buttonReply = messageData.message?.interactive?.button_reply;
          const listReply = messageData.message?.interactive?.list_reply;
          if (buttonReply?.title) msgContent = buttonReply.title;
          else if (listReply?.title) msgContent = listReply.title;
        }

        let mediaType = null;
        const mediaBase64 = messageData.base64 || "";

        if (messageData.message?.imageMessage) mediaType = "image";
        else if (messageData.message?.audioMessage) mediaType = "audio";
        else if (messageData.message?.videoMessage) mediaType = "video";
        else if (messageData.message?.documentMessage || messageData.message?.documentWithCaptionMessage) mediaType = "document";

        if (mediaType && !msgContent) {
           msgContent = messageData.message?.imageMessage?.caption || messageData.message?.videoMessage?.caption || messageData.message?.documentWithCaptionMessage?.message?.documentMessage?.caption || `[Mídia: ${mediaType}]`;
        }

        if (!msgContent && !mediaType) msgContent = "[Outros]";

        // 1. Busca ou cria a conversa atomicamente (sem race condition)
        let conversation = await prisma.conversation.upsert({
          where: {
            tenant_id_contact_number: {
              tenant_id: tenantId,
              contact_number: contactNumber
            }
          },
          update: {
            instance_name: instanceName,
            ...(fromMe ? {} : { contact_name: contactName, status: "active" }) // Só atualiza o nome se não for eu enviando (para não sobreescrever os clientes com o meu nome)
          },
          create: {
            tenant_id: tenantId,
            instance_name: instanceName,
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

        // Buscar e atualizar foto de perfil se não existir
        if (!conversation.profile_picture && !fromMe) {
           const picUrl = await getProfilePicture(instanceName, remoteJid);
           if (picUrl) {
             conversation = await prisma.conversation.update({
               where: { id: conversation.id },
               data: { profile_picture: picUrl }
             });
           }
        }

        // Prevenir duplicação do echo do webhook de uma mensagem gerada pela IA
        if (fromMe) {
          
          // --- COMANDO ESPECIAL: ADICIONAR À LISTA BRANCA ---
          if (msgContent.trim().toLowerCase() === "lista branca") {
            const settingsTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
            if (settingsTenant) {
               let settings: any = {};
               try { settings = JSON.parse((settingsTenant.settings as string) || "{}"); } catch(e) {}
               const currentIgnored = settings.ignored_numbers ? settings.ignored_numbers.split(",").map((s:string) => s.trim()).filter((s:string) => s) : [];
               const cleanContact = contactNumber.replace(/\D/g, "");
               if (!currentIgnored.includes(cleanContact)) {
                 currentIgnored.push(cleanContact);
                 settings.ignored_numbers = currentIgnored.join(", ");
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
        const messageMetadata: Record<string, string> = {};
        if (providerMessageId) messageMetadata.providerMessageId = providerMessageId;
        if (mediaType && mediaBase64) {
           try {
             const bufferData = Buffer.from(mediaBase64, 'base64');
             const ext = mediaType === "image" ? "jpeg" : mediaType === "audio" ? "ogg" : mediaType === "video" ? "mp4" : "pdf";
             const filename = `${tenantId}_${Date.now()}_webhook.${ext}`;
             
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
                  ContentType: mediaType === "image" ? "image/jpeg" : mediaType === "audio" ? "audio/ogg" : "application/octet-stream",
                }));
                uploadedUrl = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${filename}` : `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${filename}`;
             }
             
             messageMetadata.type = mediaType;
             messageMetadata.url = uploadedUrl;
            } catch (err) {
              console.error("[Webhook] Erro ao salvar mídia", err);
            }
         }
        const finalMetadata = Object.keys(messageMetadata).length > 0 ? JSON.stringify(messageMetadata) : null;
        
        let isOwner = false;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { phone: true } });
        if (tenant && tenant.phone) {
          const cleanTenantPhone = tenant.phone.replace(/\D/g, '');
          const cleanContact = contactNumber.replace(/\D/g, '');
          const last8Tenant = cleanTenantPhone.slice(-8);
          const last8Contact = cleanContact.slice(-8);
          if (last8Tenant.length === 8 && last8Contact === last8Tenant) {
             isOwner = true;
          }
        }
        
        const isMessageToMyself = isOwner || contactNumber === botNumber;

        // 2. Salva a mensagem (se for mensagem para mim mesmo testando, entra como inbound)
        await prisma.message.create({
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
          if (!lastMsg?.ai_generated) {
            await prisma.conversation.updateMany({
              where: { 
                tenant_id: tenantId,
                contact_number: contactNumber
              },
              data: { ai_paused: true }
            });
            console.log(`⏸️ IA pausada para o contato ${contactNumber} pois um humano assumiu o atendimento.`);
          }
        } else {
          // Se a IA está pausada, NÃO reativa automaticamente.
          // Só um humano pode reativar manualmente pelo painel.
          if (conversation.ai_paused) {
            console.log(`🤚 IA permanece pausada para ${contactNumber}: aguardando reativação manual.`);
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

          // Processamento da IA em try/catch proprio para nao derrubar o webhook inteiro
          try {
              console.log(`[Webhook] Processando mensagem IA sincronicamente para ${contactNumber} (fromMe=${fromMe}, isMessageToMyself=${isMessageToMyself}, ai_paused=${conversation.ai_paused})`);

            // Se for mídia sem texto legível (imagem/vídeo/documento sem legenda), responde direto sem chamar IA
            if (mediaType && mediaType !== "audio" && !messageData.message?.imageMessage?.caption && !messageData.message?.videoMessage?.caption) {
              if (conversation.ai_paused) {
                console.log(`[Webhook] Resposta automática para mídia ignorada: IA pausada para ${contactNumber}`);
              } else {
                const mediaReply = "📸 Não consigo visualizar imagens ou arquivos. Se preferir, me descreva o que precisa!";
                const { sendWhatsAppMessage } = await import('@/lib/evolution');
                const sent = await sendWhatsAppMessage(instanceName, contactNumber, mediaReply);
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

              const { processMessageWithAI } = await import('@/lib/ai/engine');
              const iaResponse = await processMessageWithAI(tenantId, contactNumber, msgContent, isMessageToMyself, instanceSettings);
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

                // Detecta lista interativa no formato:
                // Texto da mensagem
                // ---LIST---
                // Label 1|id1
                // Label 2|id2
                // ...
                const listMarker = '\n---LIST---\n';
                const listIdx = cleanedText.indexOf(listMarker);

                // Detecta botões interativos no formato:
                // Texto da mensagem
                // ---BUTTONS---
                // Label 1|id1
                // Label 2|id2
                const buttonsMarker = '\n---BUTTONS---\n';
                const buttonsIdx = cleanedText.indexOf(buttonsMarker);

                let mainText = cleanedText;
                let buttons: { text: string; id: string }[] = [];
                let listItems: { title: string; id: string }[] = [];
                let useList = false;

                if (listIdx !== -1) {
                  useList = true;
                  mainText = cleanedText.slice(0, listIdx).trim();
                  const listSection = cleanedText.slice(listIdx + listMarker.length).trim();
                  listItems = listSection.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.includes('|'))
                    .map(line => {
                      const [label, id] = line.split('|').map(s => s.trim());
                      return { title: label || id, id: id || label };
                    })
                    .slice(0, 10);
                } else if (buttonsIdx !== -1) {
                  mainText = cleanedText.slice(0, buttonsIdx).trim();
                  const buttonsSection = cleanedText.slice(buttonsIdx + buttonsMarker.length).trim();
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
                if (useList && listItems.length > 0) {
                  const { sendWhatsAppList } = await import('@/lib/evolution');
                  sent = await sendWhatsAppList(
                    instanceName,
                    contactNumber,
                    "Opções",
                    mainText,
                    [{ title: "Selecione uma opção", rows: listItems.map(item => ({
                      title: item.title,
                      rowId: item.id,
                    }))}],
                    undefined,
                    "Ver opções"
                  );
                  if (!sent) {
                    console.log(`[Webhook] Lista interativa falhou para ${contactNumber}, tentando como texto puro`);
                  }
                }
                if (!sent && buttons.length > 0) {
                  const { sendWhatsAppButtons } = await import('@/lib/evolution');
                  sent = await sendWhatsAppButtons(instanceName, contactNumber, mainText, buttons);
                  if (!sent) {
                    console.log(`[Webhook] Botões falharam para ${contactNumber}, tentando como texto puro`);
                  }
                }
                if (!sent) {
                  sent = await sendWhatsAppMessage(instanceName, contactNumber, mainText);
                }
                if (!sent) {
                  throw new Error("Evolution recusou o envio da resposta (até texto puro falhou)");
                }

                await prisma.message.create({
                  data: {
                    tenant_id: tenantId,
                    conversation_id: conversation.id,
                    direction: "outbound",
                    content: mainText,
                    ai_generated: true,
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
            console.error(`[Webhook] ERRO ao processar IA para ${contactNumber}:`, aiErrMessage);
            // Tenta enviar um aviso genérico via texto puro como fallback emergencial
            try {
              const { sendWhatsAppMessage } = await import('@/lib/evolution');
              const emergencyFallback = "Desculpe, estou com instabilidade no momento. Já estou verificando e logo volto a responder.";
              await sendWhatsAppMessage(instanceName, contactNumber, emergencyFallback);
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
          }
        }
      }
    }

    if (rawEvent === "connection.update" && instanceName) {
      const connectionState = body.data?.state;
      const persistedStatus = connectionState === "open"
        ? "open"
        : connectionState === "connecting"
          ? "connecting"
          : "disconnected";
      await prisma.whatsappInstance.updateMany({
        where: { name: instanceName },
        data: { status: persistedStatus },
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
    console.error("❌ [Webhook Evolution] ERRO:", err?.message || err);
    console.error("❌ [Webhook Evolution] STACK:", err?.stack || "");
    return NextResponse.json({ success: false, error: String(err?.message || err) }, { status: 200 });
  }
}
