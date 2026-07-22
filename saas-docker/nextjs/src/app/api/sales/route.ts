import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcryptjs';
import { sendWhatsAppMessage } from '@/lib/evolution';

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  return pwd;
}

import { getAppBaseUrl } from "@/lib/auth";
const APP_URL = getAppBaseUrl();

async function processProvisioning(sale: any) {
  try {
    const clientPhone = sale.lead?.phone || "";
    const clientName = sale.lead?.name || "Cliente";
    const clientEmail = sale.lead?.email || "";
    const productName = sale.product_name?.toLowerCase() || "";
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const providerInstance = await prisma.whatsappInstance.findFirst({
      where: { tenant_id: sale.tenant_id, status: 'open' }
    });
    const providerPhone = providerInstance?.phone_number || "";

    const isBot = productName.includes('bot') || productName.includes('starter') || productName.includes('pro ia') || productName.includes('equipe');

    if (isBot && clientEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: clientEmail } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            tenant_id: sale.tenant_id,
            name: clientName,
            email: clientEmail,
            password_hash: hashedPassword,
            role: 'agent',
          }
        });
      }

      if (clientPhone && providerInstance) {
        await sendWhatsAppMessage(providerInstance.name, clientPhone,
          `🎉 *Pagamento Confirmado!*\n\nOlá ${clientName}, seu *${sale.product_name}* já está liberado!\n\n📋 *Seus dados de acesso:*\n🔗 ${APP_URL}/login\n📧 ${clientEmail}\n🔑 ${password}\n\nQualquer dúvida, estamos aqui! 🚀`);
      }
    }

    const isSite = productName.includes('presença') || productName.includes('secretária') || productName.includes('enterprise') || productName.includes('digital') || productName.includes('inteligente') || productName.includes('site');

    if (isSite) {
      await prisma.project.create({
        data: {
          tenant_id: sale.tenant_id,
          name: `Site: ${sale.product_name} - ${clientName}`,
          status: 'pendente',
          prazo_entrega: new Date(Date.now() + 15 * 86400000),
        }
      });
    }

    // ── CONTROLE DE ESTOQUE ──
    const tenant = await prisma.tenant.findUnique({
      where: { id: sale.tenant_id },
      select: { settings: true }
    });
    let settings: any = {};
    try { settings = JSON.parse(tenant?.settings as string || '{}'); } catch {}
    const products = settings.products || [];
    const productConfig = products.find((p: any) =>
      p.name?.toLowerCase() === sale.product_name?.toLowerCase()
    );

    if (productConfig?.stock && productConfig.stock > 0) {
      const newStock = productConfig.stock - 1;
      productConfig.stock = newStock;

      const updatedProducts = products.map((p: any) =>
        p.name?.toLowerCase() === sale.product_name?.toLowerCase()
          ? { ...p, stock: newStock }
          : p
      );
      settings.products = updatedProducts;
      await prisma.tenant.update({
        where: { id: sale.tenant_id },
        data: { settings: JSON.stringify(settings) }
      });

      // Alerta de estoque baixo
      const threshold = productConfig.low_stock_threshold || 0;
      if (newStock <= threshold && newStock > 0 && providerInstance && providerPhone) {
        await sendWhatsAppMessage(providerInstance.name, providerPhone,
          `⚠️ *Estoque Baixo!*\n\nProduto: *${sale.product_name}*\nRestam apenas *${newStock} unidade(s)*\n\nConsidere repor o estoque.`);
      } else if (newStock <= 0 && providerInstance && providerPhone) {
        await sendWhatsAppMessage(providerInstance.name, providerPhone,
          `❌ *ESGOTADO!*\n\nProduto: *${sale.product_name}*\nEstoque zerado após a venda para ${clientName}.\n\nProduto marcado como esgotado na loja.`);
      }

      // Marca entrega como "pendente" se for produto físico
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

    // ── SE FOR SERVIÇO: Criar agendamento ──
    if (productConfig?.delivery_type === 'service') {
      let notesParsed: any = {};
      try { notesParsed = JSON.parse(sale.notes || '{}'); } catch {}
      const scheduledAt = notesParsed.scheduled_at;

      if (scheduledAt) {
        await prisma.appointment.create({
          data: {
            tenant_id: sale.tenant_id,
            lead_id: sale.lead_id,
            service_name: sale.product_name,
            duration_min: productConfig.duration_min || 60,
            scheduled_at: new Date(scheduledAt),
            status: 'scheduled',
            notes: `Criado automaticamente pelo checkout`,
          }
        }).catch(e => console.error("Erro ao criar agendamento:", e));

        // Avisa o comprador sobre o agendamento
        if (clientPhone && providerInstance) {
          const dataFormatada = new Date(scheduledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const horaFormatada = new Date(scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          await sendWhatsAppMessage(providerInstance.name, clientPhone,
            `📅 *Agendamento Confirmado!*\n\nOlá ${clientName}, seu horário para *${sale.product_name}* foi reservado!\n\n🗓 ${dataFormatada}\n⏰ ${horaFormatada}\n\nEstamos aguardando você! 🚀`);
        }
      }
    }

    if (sale.lead) {
      await prisma.lead.update({
        where: { id: sale.lead.id },
        data: { status: "CONVERTED" }
      }).catch(() => {});
    }

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
        await sendWhatsAppMessage(providerInstance.name, providerPhone, msgNotificacao);
      }
    }

    console.log(`✅ [Provisionamento] Concluído para ${clientName}`);
  } catch (err) {
    console.error("❌ [Provisionamento] Erro:", err);
  }
}

// GET — lista vendas/cobranças do tenant
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const isPartner = session.role === 'partner';
    const partnerLeadIds = isPartner
      ? (await prisma.lead.findMany({
          where: { partner_id: session.id, tenant_id: session.tenant_id },
          select: { id: true },
        })).map(l => l.id)
      : null;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const baseWhere: Record<string, unknown> = { tenant_id: session.tenant_id };
    if (isPartner && partnerLeadIds) {
      baseWhere.OR = [
        { lead_id: { in: partnerLeadIds } },
        { lead_id: null },
      ];
    }
    if (status) baseWhere.status = status;

    // Busca todas as vendas para estatísticas
    const allSales = await prisma.sale.findMany({
      where: { tenant_id: session.tenant_id, ...(isPartner && partnerLeadIds ? { OR: [{ lead_id: { in: partnerLeadIds } }, { lead_id: null }] } : {}) },
      include: { lead: { select: { name: true, phone: true } } },
    });

    const allTotal = allSales.reduce((acc, s) => acc + s.amount, 0);
    const allPaid = allSales.filter((s) => s.status === "paid").reduce((acc, s) => acc + s.amount, 0);
    const allPending = allSales.filter((s) => s.status === "pending").reduce((acc, s) => acc + s.amount, 0);
    const allOverdue = allSales.filter((s) => s.status === "overdue");
    const overdueAmount = allOverdue.reduce((acc, s) => acc + s.amount, 0);

    // Busca filtrada para exibição
    let salesQuery: any = { ...baseWhere };
    if (search) {
      const searchOR = [
        { product_name: { contains: search, mode: "insensitive" } },
        { lead: { name: { contains: search, mode: "insensitive" } } },
      ];
      if (baseWhere.OR) {
        // Combina OR do parceiro com OR da busca via AND
        salesQuery.AND = [{ OR: baseWhere.OR }, { OR: searchOR }];
        delete salesQuery.OR;
      } else {
        salesQuery.OR = searchOR;
      }
    }

    const sales = await prisma.sale.findMany({
      where: salesQuery,
      include: { lead: { select: { name: true, phone: true } } },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      sales,
      stats: {
        total: allTotal,
        paid: allPaid,
        pending: allPending,
        overdue: allOverdue.length,
        overdueAmount,
      },
    });
  } catch (err) {
    console.error("GET /api/sales:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST — criar cobrança
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { product_name, amount, lead_id, due_date, notes } = body;

    if (!product_name || !amount) {
      return NextResponse.json({ error: "product_name e amount são obrigatórios" }, { status: 400 });
    }

    // Parceiro só pode criar venda para lead próprio
    if (session.role === 'partner' && lead_id) {
      const lead = await prisma.lead.findFirst({
        where: { id: lead_id, partner_id: session.id },
      });
      if (!lead) return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const sale = await prisma.sale.create({
      data: {
        tenant_id: session.tenant_id,
        lead_id: lead_id || null,
        product_name,
        amount: parseFloat(amount),
        due_date: due_date ? new Date(due_date) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (err) {
    console.error("POST /api/sales:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PATCH — atualizar status da venda ou entrega
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const { id, status, delivery_status, shipping_address } = body;

    const sale = await prisma.sale.findFirst({
      where: { id, tenant_id: session.tenant_id },
      include: { lead: true }
    });
    if (!sale) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });

    // Parceiro só pode alterar vendas dos seus leads (ou sem lead)
    if (session.role === 'partner' && sale.lead_id) {
      const lead = await prisma.lead.findFirst({
        where: { id: sale.lead_id, partner_id: session.id },
      });
      if (!lead) return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 });
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === "paid") updateData.paid_at = new Date();
    }

    // Atualizar informações de entrega no notes (JSON)
    if (delivery_status || shipping_address !== undefined) {
      let deliveryInfo: any = {};
      try { deliveryInfo = JSON.parse(sale.notes || '{}'); } catch { deliveryInfo = {}; }
      if (delivery_status) deliveryInfo.status = delivery_status;
      if (shipping_address !== undefined) deliveryInfo.address = shipping_address;
      deliveryInfo.updatedAt = new Date().toISOString();
      updateData.notes = JSON.stringify(deliveryInfo);
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updateData,
      include: { lead: true }
    });

    // Se marcou como pago, dispara a entrega automática
    if (status === "paid") {
      processProvisioning(updated).catch(console.error);
    }

    // ── Se atualizou entrega, envia WhatsApp pro comprador ──
    if (delivery_status && updated.lead?.phone) {
      const providerInstance = await prisma.whatsappInstance.findFirst({
        where: { tenant_id: session.tenant_id, status: 'open' }
      });

      if (providerInstance) {
        const clientName = updated.lead.name || "Cliente";
        const clientPhone = updated.lead.phone;

        if (delivery_status === 'shipped') {
          await sendWhatsAppMessage(providerInstance.name, clientPhone,
            `📦 *Pedido Enviado!*\n\nOlá ${clientName}, seu pedido *${updated.product_name}* foi enviado!\n\n${shipping_address ? `📍 *Endereço:* ${shipping_address}\n` : ''}🚚 Em breve chega ao destino!\n\nQualquer dúvida, estamos aqui!`);
        } else if (delivery_status === 'delivered') {
          await sendWhatsAppMessage(providerInstance.name, clientPhone,
            `✅ *Pedido Entregue!*\n\nOlá ${clientName}, seu pedido *${updated.product_name}* foi entregue!\n\nEsperamos que esteja tudo certo. Continue contando com a gente! 🚀`);
        }
      }
    }

    return NextResponse.json({ sale: updated });
  } catch (err) {
    console.error("PATCH /api/sales:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
