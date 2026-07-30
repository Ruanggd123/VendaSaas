import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true }, take: 5 });
  if (tenants.length === 0) {
    console.log("Nenhum tenant encontrado.");
    return;
  }

  const tenantId = tenants[0].id;
  const email = "carlos.silva@email.com";
  const name = "Carlos Eduardo Silva";
  const referralCode = "CARLOS01";
  const rawPassword = "carlos123";
  const password_hash = await bcrypt.hash(rawPassword, 10);
  const createdDate = new Date("2026-01-05T10:00:00Z");

  let partner = await prisma.partner.findFirst({ where: { email } });

  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        tenant_id: tenantId,
        name,
        email,
        password_hash,
        referralCode,
        type: "vendedor",
        commissionRate: 30,
        created_at: createdDate,
      },
    });
  } else {
    partner = await prisma.partner.update({
      where: { id: partner.id },
      data: {
        name,
        email,
        referralCode,
        password_hash,
        type: "vendedor",
        commissionRate: 30,
        created_at: createdDate,
      },
    });
  }

  // Limpa comissões e saques antigos para resetar 100% limpo
  await prisma.partnerCommission.deleteMany({ where: { partner_id: partner.id } });
  await prisma.partnerWithdrawal.deleteMany({ where: { partner_id: partner.id } });

  console.log(`✅ Parceiro configurado: ${partner.name} (ID: ${partner.id})`);

  // Criar histórico de Leads e Vendas/Comissões de 2026 com produtos oficiais da loja
  const dummyClients = [
    { name: "Marcos Oliveira (Empresa Tech)", phone: "5511988881111", product: "Plano Scale", amount: 497, date: "2026-01-12" },
    { name: "Patrícia Souza (Clínica Estética)", phone: "5511988882222", product: "Plano Growth", amount: 147, date: "2026-01-25" },
    { name: "Luciana Lima (Advocacia)", phone: "5521977773333", product: "Plano Growth", amount: 147, date: "2026-02-08" },
    { name: "Roberto Santos (Autopeças)", phone: "5531966664444", product: "Plano Start", amount: 67, date: "2026-02-19" },
    { name: "Fernanda Costa (Imobiliária)", phone: "5541955555555", product: "Plano Scale", amount: 497, date: "2026-03-05" },
    { name: "Academia Forma Top", phone: "5511944446666", product: "Plano Growth", amount: 147, date: "2026-03-22" },
    { name: "Restaurante Sabor Real", phone: "5511933337777", product: "Só Bot (Assinatura)", amount: 97, date: "2026-04-10" },
    { name: "Bruno Castro (Consultoria)", phone: "5521922228888", product: "Plano Growth", amount: 147, date: "2026-04-28" },
    { name: "Camila Ribeiro (E-commerce)", phone: "5531911119999", product: "Plano Scale", amount: 497, date: "2026-05-15" },
    { name: "Drogaria Central", phone: "5541900001111", product: "Plano Growth", amount: 147, date: "2026-05-29" },
    { name: "Agência Digital X", phone: "5511999992222", product: "Plano Scale", amount: 497, date: "2026-06-12" },
    { name: "Construtora Horizonte", phone: "5521988883333", product: "Plano Growth", amount: 147, date: "2026-06-27" },
    { name: "Dr. Marcelo Santos", phone: "5531977774444", product: "Só Bot (Assinatura)", amount: 97, date: "2026-07-08" },
    { name: "Studio Beleza VIP", phone: "5541966665555", product: "Plano Start", amount: 67, date: "2026-07-19" },
    { name: "Eduardo Fonseca (SaaS)", phone: "5511955556666", product: "Plano Growth", amount: 147, date: "2026-07-26" },
  ];

  for (const c of dummyClients) {
    const dt = new Date(c.date);
    let lead = await prisma.lead.findFirst({
      where: { tenant_id: tenantId, phone: c.phone },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          tenant_id: tenantId,
          partner_id: partner.id,
          name: c.name,
          phone: c.phone,
          interested_product: c.product,
          status: "CONVERTED",
          value: c.amount,
          created_at: dt,
        },
      });
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          interested_product: c.product,
          value: c.amount,
          status: "CONVERTED",
        },
      });
    }

    const commAmount = (c.amount * 30) / 100;
    const sale = await prisma.sale.create({
      data: {
        tenant_id: tenantId,
        lead_id: lead.id,
        product_name: `Assinatura: ${c.name}`,
        amount: c.amount,
        status: "paid",
        paid_at: dt,
        created_at: dt,
      },
    });

    await prisma.partnerCommission.create({
      data: {
        partner_id: partner.id,
        sale_id: sale.id,
        amount: commAmount,
        type: "recurring (30%)",
        status: "paid",
        created_at: dt,
      },
    });
  }

  // Criar histórico de Saques (Withdrawals) Frequentes via Pix efetuados ao longo de 2026 com chaves variadas
  const withdrawalsData = [
    { amount: 599.10, status: "paid", date: "2026-01-30", pixKey: "11987654321", pixKeyType: "phone" },
    { amount: 748.20, status: "paid", date: "2026-02-15", pixKey: "carlos.financeiro@gmail.com", pixKeyType: "email" },
    { amount: 418.20, status: "paid", date: "2026-02-28", pixKey: "341.892.108-72", pixKeyType: "cpf" },
    { amount: 1048.20, status: "paid", date: "2026-03-31", pixKey: "48.192.831/0001-95", pixKeyType: "cnpj" },
    { amount: 568.20, status: "paid", date: "2026-04-30", pixKey: "c3f8b1a2-9e4d-4c12-8a90-7d6f5e4c3b2a", pixKeyType: "random" },
    { amount: 1199.10, status: "paid", date: "2026-05-31", pixKey: "11987654321", pixKeyType: "phone" },
    { amount: 2698.20, status: "paid", date: "2026-06-30", pixKey: "341.892.108-72", pixKeyType: "cpf" },
    { amount: 568.20, status: "paid", date: "2026-07-15", pixKey: "carlos.eduardo.silva@gmail.com", pixKeyType: "email" },
    { amount: 998.90, status: "paid", date: "2026-07-28", pixKey: "e9a1b2c3-8f7e-6d5c-4b3a-2f1e0d9c8b7a", pixKeyType: "random" },
  ];

  for (const w of withdrawalsData) {
    const wDate = new Date(w.date);
    await prisma.partnerWithdrawal.create({
      data: {
        partner_id: partner.id,
        amount: w.amount,
        status: w.status,
        pixKey: w.pixKey,
        pixKeyType: w.pixKeyType,
        created_at: wDate,
        approved_at: wDate,
      },
    });
  }

  console.log(`\n🎉 Conta do Carlos Eduardo Silva alimentada com histórico de 2026!`);
  console.log(`Login: ${email} / Senha: ${rawPassword}`);
  console.log(`Código de Indicação: ${referralCode}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
