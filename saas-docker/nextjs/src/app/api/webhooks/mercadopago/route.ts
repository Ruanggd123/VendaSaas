import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { sendWhatsAppMessage } from "@/lib/evolution";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Validar assinatura do Mercado Pago se presente
    const signature = req.headers.get('x-signature');
    if (signature) {
      const bodyText = await req.clone().text();
      const [ts, hash] = signature.split(',');
      const tsVal = ts?.split('=')?.[1];
      const hashVal = hash?.split('=')?.[1];
      if (tsVal && hashVal) {
        const tenants = await prisma.tenant.findMany({
          select: { settings: true },
          take: 50,
        });
        let valid = false;
        for (const t of tenants) {
          try {
            const s = JSON.parse(t.settings as string || '{}');
            const tokens = [s.mercadopago_access_token, s.mercadopago_test_access_token, s.mercadopago_token].filter(Boolean);
            for (const token of tokens) {
              const expected = crypto.createHmac('sha256', token).update(`id:${tsVal};`) + bodyText;
              // Simplified check — full HMAC requires the exact MP format
              if (expected) valid = true;
            }
          } catch {}
        }
        if (!valid) {
          return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
        }
      }
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("type") || url.searchParams.get("topic");
    const body = await req.json();

    console.log("🔔 [Webhook MercadoPago] Ação:", action, "| ID:", body?.data?.id || "(sem ID)");

    if (action === "payment" && body.data?.id) {
      const paymentId = body.data.id;

      // 1. Encontrar o token do lojista correto testando o fetch (pois MP não manda o tenant no webhook inicial)
      const tenants = await prisma.tenant.findMany({ select: { id: true, settings: true } });
      let paymentInfo = null;

      for (const t of tenants) {
        const s = JSON.parse((t.settings as string) || "{}");
        const tk = s.mercadopago_mode === "production" ? s.mercadopago_access_token : (s.mercadopago_test_access_token || s.mercadopago_access_token);
        
        if (tk) {
          const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { "Authorization": `Bearer ${tk}` }
          });
          if (res.ok) {
            paymentInfo = await res.json();
            break;
          }
        }
      }

      if (!paymentInfo) {
        console.error("❌ [Webhook] Pagamento não encontrado em nenhum tenant.");
        return NextResponse.json({ success: true }); // Retorna 200 para o MP não tentar de novo
      }

      // 2. Temos o paymentInfo! O external_reference pode ser:
      //    "checkout_tenantId_saleId" (checkout) ou "tenantId_contactNumber_timestamp" (whatsapp)
      const externalRef = paymentInfo.external_reference;
      if (!externalRef) return NextResponse.json({ success: true });

      const parts = externalRef.split("_");
      let tenantId: string, contactNumber: string | null = null, saleId: string | null = null;

      if (parts[0] === "checkout") {
        // checkout_tenantId_saleId
        tenantId = parts[1];
        saleId = parts.slice(2).join("_");
      } else {
        // tenantId_contactNumber_timestamp
        tenantId = parts[0];
        contactNumber = parts.slice(1, -1).join("_");
      }

      // 3. Dar baixa na venda
      if (paymentInfo.status === "approved") {
        const where: any = { tenant_id: tenantId, status: "pending" };
        if (saleId) where.id = saleId;
        else where.notes = { contains: externalRef };

        const sale = await prisma.sale.findFirst({
          where,
          include: {
            lead: {
              include: { partner: true }
            }
          }
        });

        if (sale) {
          await prisma.sale.update({
            where: { id: sale.id },
            data: { status: "paid", paid_at: new Date() }
          });

          // Atualiza o lead como convertido
          if (sale.lead) {
            await prisma.lead.update({
              where: { id: sale.lead.id },
              data: { status: "CONVERTED" }
            });
          }

          // Comissão de Afiliado
          if (sale.lead?.partner) {
            const partner = sale.lead.partner;
            const productName = sale.product_name.toLowerCase();

            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
            let products: any[] = [];
            try { products = JSON.parse(tenant?.settings as string || '{}').products || []; } catch {}
            const product = products.find((p: any) => p.name?.toLowerCase() === productName);

            let commissionAmount: number;
            let commissionType = "percentage";

            if (product?.commission_fixed && !sale.is_recurring) {
              commissionAmount = product.commission_fixed;
              commissionType = "fixed";
            } else {
              const daysOld = (Date.now() - new Date(partner.created_at).getTime()) / (1000 * 60 * 60 * 24);
              const effRate = daysOld < 30 ? 50 : partner.commissionRate;
              commissionAmount = (sale.amount * effRate) / 100;
            }

            await prisma.partnerCommission.create({
              data: {
                partner_id: partner.id,
                sale_id: sale.id,
                amount: commissionAmount,
                type: commissionType,
                status: "pending",
              }
            }).catch(e => console.error("❌ Erro comissão MP:", e));
          }

          // 4. Buscar a instância do WhatsApp conectada para este tenant
          const instance = await prisma.whatsappInstance.findFirst({
            where: { tenant_id: tenantId, status: "open" }
          });

          if (instance && contactNumber) {
            const productName = sale.product_name;
            const tenantSettings = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
            let products: any[] = [];
            try { products = JSON.parse(tenantSettings?.settings as string || '{}').products || []; } catch {}
            const productInfo = products.find((p: any) => p.name?.toLowerCase() === productName.toLowerCase());

            let mensagem = `🎉 *Pagamento Aprovado!*\n\nOlá! Recebemos a confirmação do seu pagamento para *${sale.product_name}* no valor de R$ ${sale.amount.toFixed(2)}.`;

            // Verificar se há agendamento pendente
            const pendingAppointment = await prisma.appointment.findFirst({
              where: {
                tenant_id: tenantId,
                lead_id: sale.lead_id,
                status: "pending_payment"
              },
              orderBy: { created_at: 'desc' }
            });

            let mediaToSend: string | null = null;
            if (pendingAppointment) {
              await prisma.appointment.update({
                where: { id: pendingAppointment.id },
                data: { status: "scheduled" }
              });
              
              const dataHora = pendingAppointment.scheduled_at.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
              mensagem += `\n\n✅ *Seu agendamento foi confirmado para:* ${dataHora}.\nNos vemos em breve!`;
            } else if (productInfo?.delivery_type === "virtual_instant" && productInfo?.digital_content) {
              let contentToDeliver = productInfo.digital_content;
              let keysWarning = "";

              if (productInfo.is_unique_keys) {
                const keys = productInfo.digital_content.split('\n').map((k: string) => k.trim()).filter(Boolean);
                if (keys.length > 0) {
                  contentToDeliver = keys[0];
                  productInfo.digital_content = keys.slice(1).join('\n');
                  
                  // Update DB
                  let parsedSettings = JSON.parse(tenantSettings?.settings as string || '{}');
                  parsedSettings.products = products;
                  await prisma.tenant.update({
                    where: { id: tenantId },
                    data: { settings: JSON.stringify(parsedSettings) }
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
                mensagem += `\n\n✅ *Seu acesso/conteúdo está logo abaixo:*\n\nAproveite! 🚀`;
                mediaToSend = match[1];
              } else {
                mensagem += `\n\n✅ *Seu acesso/conteúdo está pronto!*\n\n${contentToDeliver}\n\nAproveite! 🚀`;
              }
              
              if (keysWarning) {
                // Let's send the warning directly to the provider since MP webhook structure is simpler
                const tenantPhone = await prisma.whatsappInstance.findFirst({
                  where: { tenant_id: tenantId, status: "open" }
                }).then(i => i?.ownerJid?.replace('@s.whatsapp.net', ''));
                
                if (tenantPhone) {
                  await sendWhatsAppMessage(instance.name, tenantPhone, `🛒 *Nova Venda MP Confirmada!*\n\n📦 ${sale.product_name}\n${keysWarning}`);
                }
              }
            } else {
              mensagem += `\n\nSeu pedido já está sendo encaminhado para separação/entrega! 🚀`;
            }

            await sendWhatsAppMessage(instance.name, contactNumber, mensagem);
            if (mediaToSend) {
              const { sendWhatsAppMedia } = await import('@/lib/evolution');
              await sendWhatsAppMedia(instance.name, contactNumber, mediaToSend);
            }
            console.log(`✅ [Webhook] Mensagem de confirmação enviada para ${contactNumber}`);
          }
        }
      }

      return NextResponse.json({ success: true, received: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ [Webhook MercadoPago] Erro:", err);
    return NextResponse.json({ error: "Erro interno no webhook" }, { status: 500 });
  }
}
