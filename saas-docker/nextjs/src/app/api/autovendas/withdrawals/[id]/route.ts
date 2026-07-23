import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    const userRole = session?.role?.toLowerCase();
    if (!session || !['admin', 'superadmin', 'manager'].includes(userRole || '')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tenantId = session.tenantId || session.tenant_id;

    const { action } = await req.json();
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida. Use "approve" ou "reject"' }, { status: 400 });
    }

    const withdrawal = await prisma.partnerWithdrawal.findUnique({
      where: { id: params.id },
      include: { partner: true },
    });

    if (!withdrawal) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    if (withdrawal.partner.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Solicitação já foi processada' }, { status: 400 });
    }

    if (action === 'approve') {
      // Tenta realizar a transferência PIX automática via Asaas se houver chave configurada
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      let settings: any = {};
      try { settings = JSON.parse(tenant?.settings as string || '{}'); } catch {}

      const asaasApiKey = settings.asaasApiKey || process.env.ASAAS_API_KEY;
      const asaasEnv = settings.asaasEnvironment || process.env.ASAAS_ENVIRONMENT || "sandbox";
      const asaasUrl = asaasEnv === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";

      if (asaasApiKey && withdrawal.pixKey) {
        try {
          const pixTypeMap: Record<string, string> = {
            cpf: "CPF",
            cnpj: "CNPJ",
            phone: "PHONE",
            email: "EMAIL",
            random: "EVP"
          };
          const pixType = pixTypeMap[withdrawal.pixKeyType?.toLowerCase()] || "PHONE";

          console.log(`🏦 [Asaas PIX Transfer] Enviando R$ ${withdrawal.amount} para ${withdrawal.pixKey} (${pixType})...`);
          
          const transferRes = await fetch(`${asaasUrl}/transfers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "access_token": asaasApiKey,
              "User-Agent": "NexusSaaS/1.0"
            },
            body: JSON.stringify({
              value: withdrawal.amount,
              pixAddressKey: withdrawal.pixKey,
              pixAddressKeyType: pixType,
              description: `Saque de Comissão Afiliado Nexus SaaS (${withdrawal.partner?.name || 'Afiliado'})`
            })
          });

          const transferData = await transferRes.json();
          if (transferRes.ok) {
            console.log("✅ [Asaas PIX Transfer] Transferência realizada com sucesso! ID:", transferData.id);
          } else {
            console.warn("⚠️ [Asaas PIX Transfer] Transferência automática não concluída:", transferData.errors || transferData);
          }
        } catch (transferErr) {
          console.error("❌ Erro ao tentar transferência automática no Asaas:", transferErr);
        }
      }

      // Mark withdrawal as approved
      await prisma.partnerWithdrawal.update({
        where: { id: params.id },
        data: { status: 'approved', approved_at: new Date(), admin_id: session.id },
      });

      // Mark enough pending commissions as paid (oldest first)
      const commissions = await prisma.partnerCommission.findMany({
        where: { partner_id: withdrawal.partner_id, status: 'pending' },
        orderBy: { created_at: 'asc' },
      });

      let remaining = withdrawal.amount;
      const toUpdate: string[] = [];

      for (const c of commissions) {
        if (remaining <= 0) break;
        toUpdate.push(c.id);
        remaining -= c.amount;
      }

      if (toUpdate.length > 0) {
        await prisma.partnerCommission.updateMany({
          where: { id: { in: toUpdate } },
          data: { status: 'paid', withdrawal_id: withdrawal.id },
        });
      }
    } else {
      // Reject
      await prisma.partnerWithdrawal.update({
        where: { id: params.id },
        data: { status: 'rejected', rejected_at: new Date(), admin_id: user.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Withdrawal action]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
