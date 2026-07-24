import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getProfilePicture } from "@/lib/evolution";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // O evento da Evolution API geralmente vem no formato:
    // { event: "messages.upsert", instance: "nome_instancia", data: { messages: [...] } }
    
    const rawEvent = (body.event || body.type || "").toString().toLowerCase().replace(/_/g, ".").replace(/-/g, ".");
    const instanceName = body.instance;
    console.log("[Webhook Debug] Payload recebido:", JSON.stringify(body).substring(0, 500));
    
    const isMessageEvent =
      rawEvent.includes("messages") ||
      rawEvent.includes("message") ||
      rawEvent.includes("upsert") ||
      rawEvent.includes("send");

    if (isMessageEvent && instanceName) {
      // Procurar qual Tenant é dono dessa instância (por name ou connectionName)
      let instance = await prisma.whatsappInstance.findFirst({
        where: {
          OR: [
            { name: instanceName },
            { connectionName: instanceName }
          ]
        }
      });
      
      // Fallback: se houver apenas 1 instância cadastrada no banco, associa a ela
      if (!instance) {
        instance = await prisma.whatsappInstance.findFirst();
      }

      if (!instance) {
        console.warn(`[Webhook Evolution] Instância ${instanceName} não encontrada no banco.`);
        return NextResponse.json({ success: true, ignored: "Instância desconhecida" });
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
        let webhookTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

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

        let mediaType = null;
        let mediaBase64 = messageData.base64 || "";

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
            last_message_at: new Date(),
            ...(fromMe ? {} : { contact_name: contactName }) // Só atualiza o nome se não for eu enviando (para não sobreescrever os clientes com o meu nome)
          },
          create: {
            tenant_id: tenantId,
            instance_name: instanceName,
            contact_number: contactNumber,
            contact_name: contactName,
            last_message_at: new Date()
          }
        });

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
               let currentIgnored = settings.ignored_numbers ? settings.ignored_numbers.split(",").map((s:string) => s.trim()).filter((s:string) => s) : [];
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
        }

        const botNumber = (body.sender || "").replace("@s.whatsapp.net", "");
        
        // --- Processamento de Mídia ---
        let finalMetadata = null;
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
                const { writeFile, mkdir } = require('fs/promises');
                const { join } = require('path');
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
             
             finalMetadata = JSON.stringify({ type: mediaType, url: uploadedUrl });
           } catch (err) {
             console.error("[Webhook] Erro ao salvar mídia", err);
           }
        }
        
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
          // Processamento Síncrono direto no Webhook (pois a Vercel não roda o worker do BullMQ)
          console.log(`[Webhook] Processando mensagem IA sincronicamente para ${contactNumber}`);
          const { processMessageWithAI } = await import('@/lib/ai/engine');
          const iaResponse = await processMessageWithAI(tenantId, contactNumber, msgContent, isMessageToMyself);
          
          if (iaResponse) {
             const evolutionUrl = process.env.EVOLUTION_URL || 'http://evolution:8080';
             const evolutionKey = process.env.EVOLUTION_API_KEY || '';
             
             try {
               await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
                 method: "POST",
                 headers: { 'apikey': evolutionKey, 'Content-Type': 'application/json' },
                 body: JSON.stringify({ 
                   number: contactNumber,
                   text: iaResponse,
                   delay: 1200
                 })
               });
               console.log(`[Webhook] Resposta enviada com sucesso para ${contactNumber}`);

               // Salvar a resposta da IA no banco de dados para aparecer na interface
               await prisma.message.create({
                 data: {
                   tenant_id: tenantId,
                   conversation_id: conversation.id,
                   direction: "outbound",
                   content: iaResponse,
                   ai_generated: true,
                 }
               });
               await prisma.conversation.update({
                 where: { id: conversation.id },
                 data: { last_message_at: new Date() }
               });
             } catch (e) {
               console.error("[Webhook] Erro ao enviar resposta da IA pela Evolution:", e);
             }
          }
        }
      }
    }

    if (event === "connection.update" && instanceName) {
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ [Webhook Evolution] Erro:", err);
    return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
  }
}
