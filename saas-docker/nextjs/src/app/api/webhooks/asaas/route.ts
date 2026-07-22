import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';
import { sendWhatsAppMessage } from '@/lib/evolution';

const prisma = new PrismaClient();

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

import { getAppBaseUrl } from "@/lib/auth";
const APP_URL = getAppBaseUrl();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔔 [Webhook Asaas] Recebido evento:", body.event);

    // O Asaas envia um evento PAYMENT_RECEIVED ou PAYMENT_CONFIRMED
    if (body.event === "PAYMENT_RECEIVED" || body.event === "PAYMENT_CONFIRMED") {
      const paymentId = body.payment?.id;
      const externalRef = body.payment?.externalReference; // Formato esperado: "tenantId_saleId"
      const installment = body.payment?.installmentNumber;

      let tenantId = "";
      let saleId = "";

      if (externalRef && externalRef.includes("_")) {
        [tenantId, saleId] = externalRef.split("_");
      } else {
        // Fallback: Tenta encontrar a venda pelo payment_id ou invoiceUrl no banco
        const matchedSale = await prisma.sale.findFirst({
          where: {
            OR: [
              { payment_id: paymentId },
              { payment_link: { contains: paymentId || "___xyz" } },
              { payment_link: { contains: body.payment?.invoiceUrl || "___xyz" } }
            ]
          }
        });
        if (matchedSale) {
          tenantId = matchedSale.tenant_id;
          saleId = matchedSale.id;
        }
      }

      if (saleId && tenantId) {
          // Para pagamentos recorrentes (installment > 1), cria nova venda
          let sale;
          const existingSale = await prisma.sale.findUnique({ where: { id: saleId } });

          if (existingSale && installment && installment > 1) {
            // Já foi paga antes → criar nova Sale para esta recorrência
            sale = await prisma.sale.create({
              data: {
                tenant_id: tenantId,
                lead_id: existingSale.lead_id,
                product_name: existingSale.product_name,
                amount: existingSale.amount,
                status: "paid",
                paid_at: new Date(),
                payment_id: paymentId,
                notes: `Recorrência #${installment} da venda original ${saleId}`,
              },
              include: {
                lead: {
                  include: { partner: true }
                }
              }
            });
          } else {
            // Primeiro pagamento ou pagamento avulso
            sale = await prisma.sale.update({
              where: { id: saleId },
              data: { status: "paid", paid_at: new Date(), payment_id: paymentId },
              include: {
                lead: {
                  include: { partner: true }
                }
              }
            });
          }

          // Atualiza o lead como convertido
          if (sale.lead) {
            await prisma.lead.update({
              where: { id: sale.lead.id },
              data: { status: "CONVERTED" }
            }).catch(e => console.error("Erro ao atualizar lead:", e));
          }

          // Lógica de Comissão de Afiliados
          if (sale.lead && sale.lead.partner) {
            const partner = sale.lead.partner;
            const productName = sale.product_name.toLowerCase();

            let commissionAmount = 0;
            let commissionType = "percentage";

            const isFirstPayment = !installment || installment === 1;

            // Tenta encontrar commission_fixed no produto
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
            let products: any[] = [];
            try { products = JSON.parse(tenant?.settings as string || '{}').products || []; } catch {}
            const product = products.find((p: any) => p.name?.toLowerCase() === productName);

            if (product?.commission_fixed && !sale.is_recurring) {
              commissionAmount = product.commission_fixed;
              commissionType = "fixed";
            } else if (productName.includes("site") || productName.includes("setup")) {
              commissionAmount = productName.includes("avulso") ? (sale.amount * partner.commissionRate) / 100 : 200.00;
              commissionType = partner.type === 'dev' ? `repasse (${partner.commissionRate}%)` : "fixed";
            } else {
              if (partner.type === 'dev') {
                commissionAmount = (sale.amount * partner.commissionRate) / 100;
                commissionType = `repasse (${partner.commissionRate}%)`;
              } else if (isFirstPayment) {
                commissionAmount = (sale.amount * 50) / 100;
                commissionType = "activation_bonus (50%)";
              } else {
                commissionAmount = (sale.amount * partner.commissionRate) / 100;
                commissionType = `recurring (${partner.commissionRate}%)`;
              }
            }

            console.log(`💰 [Comissão] ${productName} | Parceiro: ${partner.name} | Tipo: ${commissionType} | R$ ${commissionAmount.toFixed(2)}`);

            try {
              await prisma.partnerCommission.create({
                data: {
                  partner_id: partner.id,
                  sale_id: sale.id,
                  amount: commissionAmount,
                  type: commissionType,
                  status: "pending"
                }
              });
            } catch (dbErr) {
              console.error("❌ Erro ao gravar comissão:", dbErr);
            }
          }

          // ========================================================
          // PROVISIONAMENTO AUTOMÁTICO (ENTREGA DO PRODUTO)
          // ========================================================
          console.log(`🚀 [Entrega Automática] Iniciando provisionamento para a venda ${saleId}`);
          
          try {
            const clientPhone = sale.lead?.phone || body.payment?.customerPhone || "";
            const clientName = sale.lead?.name || body.payment?.customerName || "Cliente";
            const clientEmail = sale.lead?.email || body.payment?.customerEmail || "";
            const productName = sale.product_name?.toLowerCase() || "";
            const password = generatePassword();
            const hashedPassword = await bcrypt.hash(password, 10);

            // Pegar a instância WhatsApp do provedor (tenant dono da loja)
            const providerInstance = await prisma.whatsappInstance.findFirst({
              where: { tenant_id: tenantId, status: 'open' }
            });
            const providerPhone = providerInstance?.phone_number || "";

            // ── SE FOR BOT: Criar usuário de acesso ──
            const isBot = productName.includes('bot') || productName.includes('starter') || productName.includes('pro ia') || productName.includes('equipe');

            if (isBot && clientEmail) {
              const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
              if (!existingUser) {
                await prisma.user.create({
                  data: {
                    tenant_id: tenantId,
                    name: clientName,
                    email: clientEmail,
                    password_hash: hashedPassword,
                    role: 'agent',
                  }
                });
              }

              // Sempre envia WhatsApp (inclusive se reativar)
              if (clientPhone && providerInstance) {
                const msg = `🎉 *Pagamento Confirmado!*\n\nOlá ${clientName}, seu *${sale.product_name}* já está liberado!\n\n📋 *Seus dados de acesso:*\n🔗 ${APP_URL}/login\n📧 ${clientEmail}\n🔑 ${password}\n\nRecomendamos trocar a senha após o primeiro acesso.\nQualquer dúvida, estamos aqui! 🚀`;
                await sendWhatsAppMessage(providerInstance.name, clientPhone, msg);
              }
            }

            // ── SE FOR SITE: Criar projeto/ordem ──
            const isSite = productName.includes('presença') || productName.includes('secretária') || productName.includes('enterprise') || productName.includes('digital') || productName.includes('inteligente') || productName.includes('site');

            if (isSite) {
              await prisma.project.create({
                data: {
                  tenant_id: tenantId,
                  name: `Site: ${sale.product_name} - ${clientName}`,
                  status: 'pendente',
                  prazo_entrega: new Date(Date.now() + 15 * 86400000), // 15 dias pra entrega
                }
              });
            }

            // ── CONTROLE DE ESTOQUE ──
            const tenantDb = await prisma.tenant.findUnique({
              where: { id: tenantId },
              select: { settings: true }
            });
            let tenantSettings: any = {};
            try { tenantSettings = JSON.parse(tenantDb?.settings as string || '{}'); } catch {}
            const tenantProducts = tenantSettings.products || [];
            const productConfig = tenantProducts.find((p: any) =>
              p.name?.toLowerCase() === sale.product_name?.toLowerCase()
            );

            if (productConfig?.stock && productConfig.stock > 0) {
              const newStock = productConfig.stock - 1;
              productConfig.stock = newStock;

              const updatedProducts = tenantProducts.map((p: any) =>
                p.name?.toLowerCase() === sale.product_name?.toLowerCase()
                  ? { ...p, stock: newStock }
                  : p
              );
              tenantSettings.products = updatedProducts;
              await prisma.tenant.update({
                where: { id: tenantId },
                data: { settings: JSON.stringify(tenantSettings) }
              });

              const threshold = productConfig.low_stock_threshold || 0;
              if (newStock <= threshold && newStock > 0 && providerInstance && providerPhone) {
                await sendWhatsAppMessage(providerInstance.name, providerPhone,
                  `⚠️ *Estoque Baixo!*\n\nProduto: *${sale.product_name}*\nRestam apenas *${newStock} unidade(s)*\n\nConsidere repor o estoque.`);
              } else if (newStock <= 0 && providerInstance && providerPhone) {
                await sendWhatsAppMessage(providerInstance.name, providerPhone,
                  `❌ *ESGOTADO!*\n\nProduto: *${sale.product_name}*\nEstoque zerado após a venda para ${clientName}.\n\nProduto marcado como esgotado na loja.`);
              }

              if (productConfig.delivery_type === 'physical') {
                const deliveryInfo = JSON.stringify({
                  status: 'pending',
                  product: sale.product_name,
                  client: clientName,
                  clientPhone: clientPhone,
                  address: '',
                  updatedAt: new Date().toISOString()
                });
                await prisma.sale.update({
                  where: { id: sale.id },
                  data: { notes: deliveryInfo }
                });
              }
            }

            // ── SE FOR SERVIÇO OU AGENDAMENTO PENDENTE DA IA ──
            const pendingAppointment = await prisma.appointment.findFirst({
              where: {
                tenant_id: tenantId,
                lead_id: sale.lead_id,
                status: "pending_payment"
              },
              orderBy: { created_at: 'desc' }
            });

            if (pendingAppointment) {
              // Confirma agendamento criado pela IA (agendar_compromisso)
              await prisma.appointment.update({
                where: { id: pendingAppointment.id },
                data: { status: "scheduled" }
              });

              if (clientPhone && providerInstance) {
                const dataFormatada = pendingAppointment.scheduled_at.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                const horaFormatada = pendingAppointment.scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                await sendWhatsAppMessage(providerInstance.name, clientPhone,
                  `✅ *Pagamento Aprovado!*\n\nOlá ${clientName}, seu agendamento para *${sale.product_name}* foi confirmado para:\n🗓 ${dataFormatada} às ⏰ ${horaFormatada}.\n\nNos vemos em breve!`);
              }
            } else if (productConfig?.delivery_type === 'service') {
              // Confirma agendamento criado pelo Checkout
              let notesParsed: any = {};
              try { notesParsed = JSON.parse(sale.notes || '{}'); } catch {}
              const scheduledAt = notesParsed.scheduled_at;

              if (scheduledAt) {
                await prisma.appointment.create({
                  data: {
                    tenant_id: tenantId,
                    lead_id: sale.lead_id,
                    service_name: sale.product_name,
                    duration_min: productConfig.duration_min || 60,
                    scheduled_at: new Date(scheduledAt),
                    status: 'scheduled',
                    notes: `Criado automaticamente pelo checkout`,
                  }
                }).catch(e => console.error("Erro ao criar agendamento:", e));

                if (clientPhone && providerInstance) {
                  const dataFormatada = new Date(scheduledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                  const horaFormatada = new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                  await sendWhatsAppMessage(providerInstance.name, clientPhone,
                    `📅 *Agendamento Confirmado!*\n\nOlá ${clientName}, seu horário para *${sale.product_name}* foi reservado!\n\n🗓 ${dataFormatada}\n⏰ ${horaFormatada}\n\nEstamos aguardando você! 🚀`);
                }
              }
            } else if (productConfig?.delivery_type === 'virtual_instant' && productConfig?.digital_content && clientPhone && providerInstance) {
              // Entrega Digital
              let contentToDeliver = productConfig.digital_content;
              let keysWarning = "";

              if (productConfig.is_unique_keys) {
                const keys = productConfig.digital_content.split('\n').map((k: string) => k.trim()).filter(Boolean);
                if (keys.length > 0) {
                  contentToDeliver = keys[0];
                  productConfig.digital_content = keys.slice(1).join('\n');
                  
                  // Save updated digital_content to DB
                  const updatedProducts = tenantProducts.map((p: any) =>
                    p.name?.toLowerCase() === sale.product_name?.toLowerCase()
                      ? { ...p, digital_content: productConfig.digital_content }
                      : p
                  );
                  tenantSettings.products = updatedProducts;
                  await prisma.tenant.update({
                    where: { id: tenantId },
                    data: { settings: JSON.stringify(tenantSettings) }
                  });

                  // Mark the delivered key in Sale notes
                  await prisma.sale.update({
                    where: { id: sale.id },
                    data: { notes: `Chave Entregue: ${contentToDeliver}` }
                  });

                  if (keys.length - 1 === 0) {
                    keysWarning = `\n🚨 *ATENÇÃO*: O estoque de chaves para este produto ACABOU!`;
                  } else if (keys.length - 1 <= 5) {
                    keysWarning = `\n⚠️ *Aviso*: Restam apenas ${keys.length - 1} chaves no estoque.`;
                  }
                } else {
                  contentToDeliver = "Infelizmente estamos sem estoque temporário de chaves/licenças para este produto. Um de nossos atendentes entrará em contato em breve para realizar a sua entrega!";
                  keysWarning = `\n🚨 *URGENTE*: Cliente pagou, mas não havia chaves no estoque! Entre em contato com ele.`;
                }
              }

              const mediaRegex = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|bmp|pdf|zip|rar|docx|doc|xlsx|mp4|avi|mkv|mov|webm|mp3|ogg|wav))/i;
              const match = contentToDeliver.match(mediaRegex);
              
              if (match) {
                const { sendWhatsAppMedia } = await import('@/lib/evolution');
                await sendWhatsAppMessage(providerInstance.name, clientPhone, `🎉 *Pagamento Aprovado!*\n\nOlá ${clientName}, recebemos a confirmação!\n✅ *Seu acesso/conteúdo está logo abaixo:*\n\nAproveite! 🚀`);
                await sendWhatsAppMedia(providerInstance.name, clientPhone, match[1]);
              } else {
                await sendWhatsAppMessage(providerInstance.name, clientPhone,
                  `🎉 *Pagamento Aprovado!*\n\nOlá ${clientName}, recebemos a confirmação!\n✅ *Seu acesso/conteúdo está pronto!*\n\n${contentToDeliver}\n\nAproveite! 🚀`);
              }

              // Save keysWarning to pass down to provider message
              (sale as any).keysWarning = keysWarning;
            } else if (clientPhone && providerInstance && !isBot) {
              // Envio de mensagem padrão caso não seja serviço, não seja bot e não seja digital imediato
              await sendWhatsAppMessage(providerInstance.name, clientPhone,
                `🎉 *Pagamento Aprovado!*\n\nOlá ${clientName}, recebemos a confirmação do seu pagamento para *${sale.product_name}* no valor de R$ ${sale.amount.toFixed(2)}.\n\nSeu pedido já está sendo encaminhado para separação/entrega! 🚀`);
            }

            // ── NOTIFICAR O PROVEDOR (dono da loja) com detalhes da venda + credenciais ──
            if (providerInstance) {
              if (providerPhone) {
                let msgNotificacao = `🛒 *Nova Venda Confirmada!*\n\n👤 ${clientName}\n📱 ${clientPhone || "(sem telefone)"}\n📦 ${sale.product_name}\n💰 R$ ${sale.amount?.toFixed(2)}\n`;
                if (isBot && clientEmail) {
                  msgNotificacao += `\n📋 *Credenciais enviadas ao comprador:*\n🔗 ${APP_URL}/login\n📧 ${clientEmail}\n🔑 ${password}\n\n✅ Já pode acessar!`;
                } else {
                  msgNotificacao += `\n📌 Lembrete: Providenciar a entrega do produto.`;
                }
                if (productConfig?.stock !== undefined) {
                  msgNotificacao += `\n📦 Estoque restante: *${productConfig.stock} unidades*`;
                }
                if ((sale as any).keysWarning) {
                  msgNotificacao += (sale as any).keysWarning;
                }
                await sendWhatsAppMessage(providerInstance.name, providerPhone, msgNotificacao);
              }
            }

            console.log(`✅ [Entrega Automática] Provisionamento concluído para ${clientName}. Senha: ${password}`);
          } catch (deliveryErr) {
            console.error("❌ [Entrega Automática] Erro ao provisionar:", deliveryErr);
          }
          
          console.log(`✅ [Webhook Asaas] Venda ${saleId} totalmente processada!`);
        }
      }
    } else if (body.event === "PAYMENT_OVERDUE") {
      // Pagamento Vencido (Cliente não pagou o Pix/Boleto no prazo)
      const externalRef = body.payment?.externalReference;
      if (externalRef) {
        const [tenantId, saleId] = externalRef.split("_");
        if (saleId) {
          console.log(`⚠️ [Webhook Asaas] Pagamento VENCIDO para a venda ${saleId}`);
          await prisma.sale.update({
            where: { id: saleId },
            data: { status: "overdue" }
          }).catch(() => {});
        }
      }
    } else if (body.event === "PAYMENT_REFUNDED" || body.event === "PAYMENT_CHARGEBACK_REQUESTED") {
      // Reembolso / Estorno efetuado
      const externalRef = body.payment?.externalReference;
      if (externalRef) {
        const [tenantId, saleId] = externalRef.split("_");
        if (saleId) {
          console.log(`↺ [Webhook Asaas] Pagamento REEMBOLSADO para a venda ${saleId}`);
          await prisma.sale.update({
            where: { id: saleId },
            data: { status: "refunded" }
          }).catch(() => {});
        }
      }
    } else if (body.event === "SUBSCRIPTION_INACTIVE" || body.event === "SUBSCRIPTION_DELETED") {
      // Assinatura Cancelada / Inativa
      const subId = body.subscription?.id;
      if (subId) {
        console.log(`❌ [Webhook Asaas] Assinatura CANCELADA: ${subId}`);
        await prisma.sale.updateMany({
          where: { subscription_id: subId },
          data: { status: "canceled" }
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err) {
    console.error("❌ [Webhook Asaas] Erro:", err);
    return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
  }
}
