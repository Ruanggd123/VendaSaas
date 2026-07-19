import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getProfilePicture } from "@/lib/evolution";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // O evento da Evolution API geralmente vem no formato:
    // { event: "messages.upsert", instance: "nome_instancia", data: { messages: [...] } }
    
    const event = body.event || body.type;
    const instanceName = body.instance;
    console.log("[Webhook Debug] Payload recebido:", JSON.stringify(body).substring(0, 500));
    
    if (event === "messages.upsert" && instanceName) {
      // Procurar qual Tenant é dono dessa instância
      const instance = await prisma.whatsappInstance.findUnique({
        where: { name: instanceName }
      });
      
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
        // Ignorar status do whatsapp e grupos se não for o foco
        const remoteJid = messageData.key.remoteJid;
        if (remoteJid.includes("@g.us") || remoteJid === "status@broadcast") {
          return NextResponse.json({ success: true, ignored: "Grupo ou Status" });
        }

        const contactNumber = remoteJid.replace("@s.whatsapp.net", "");
        const contactName = messageData.pushName || contactNumber;
        const fromMe = messageData.key.fromMe || false;

        // 0. Verifica Lista Negra (ignored_numbers)
        let webhookTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (webhookTenant && webhookTenant.settings) {
          const settings = typeof webhookTenant.settings === "string" ? JSON.parse(webhookTenant.settings) : webhookTenant.settings;
          if (settings?.ignored_numbers) {
            const ignoredList = settings.ignored_numbers.split(",").map((n: string) => n.trim().replace(/\D/g, ""));
            const cleanContact = contactNumber.replace(/\D/g, "");
            if (ignoredList.includes(cleanContact)) {
              console.log(`[Webhook] Contato ${contactNumber} está na lista de ignorados (Blacklist). Ignorando mensagem.`);
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
        const msgContent = messageData.message?.conversation 
          || messageData.message?.extendedTextMessage?.text
          || "[Mensagem de Mídia/Outros]";

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

            // Adiciona o contato à blacklist
            if (webhookTenant) {
              let settings: any = {};
              try { settings = JSON.parse((webhookTenant.settings as string) || "{}"); } catch {}
              const currentIgnored = settings.ignored_numbers || "";
              const list = currentIgnored ? currentIgnored.split(",").map((n: string) => n.trim()).filter(Boolean) : [];
              const cleanContact = contactNumber.replace(/\D/g, "");
              if (!list.includes(cleanContact)) {
                list.push(cleanContact);
                settings.ignored_numbers = list.join(",");
                await prisma.tenant.update({
                  where: { id: tenantId },
                  data: { settings: JSON.stringify(settings) },
                });
                console.log(`[Blacklist] Contato ${contactNumber} adicionado à blacklist (humano assumiu).`);
              }
            }
          }
        } else {
          // Se a mensagem veio do cliente (ou é eu testando enviando para mim mesmo), despacha para IA
          const { messageQueue } = await import('@/lib/queue');
          await messageQueue.add('process-message', {
            tenantId,
            instanceName,
            from: contactNumber,
            message: msgContent,
            isMessageToMyself
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ [Webhook Evolution] Erro:", err);
    return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
  }
}
