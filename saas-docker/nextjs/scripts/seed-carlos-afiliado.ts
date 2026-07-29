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
  const createdDate = new Date("2024-01-15T10:00:00Z");

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
        referralCode,
        password_hash,
        type: "vendedor",
        commissionRate: 30,
        created_at: createdDate,
      },
    });
  }

  console.log(`✅ Parceiro configurado: ${partner.name} (ID: ${partner.id})`);

  // Criar histórico de Leads e Vendas/Comissões de 2024, 2025 e 2026
  const dummyClients = [
    { name: "Marcos Oliveira", phone: "5511988881111", amount: 197, date: "2024-02-10" },
    { name: "Patrícia Souza", phone: "5511988882222", amount: 397, date: "2024-03-15" },
    { name: "Luciana Lima", phone: "5521977773333", amount: 997, date: "2024-05-20" },
    { name: "Roberto Santos", phone: "5531966664444", amount: 197, date: "2024-07-01" },
    { name: "Fernanda Costa", phone: "5541955555555", amount: 397, date: "2024-09-12" },
    { name: "Empresa Alfa Tech", phone: "5511944446666", amount: 1997, date: "2024-11-05" },
    { name: "Clínica Vida Ativa", phone: "5511933337777", amount: 1497, date: "2025-01-20" },
    { name: "Bruno Castro", phone: "5521922228888", amount: 197, date: "2025-03-10" },
    { name: "Camila Ribeiro", phone: "5531911119999", amount: 397, date: "2025-05-18" },
    { name: "Academia Forma Top", phone: "5541900001111", amount: 997, date: "2025-08-22" },
    { name: "Agência Digital X", phone: "5511999992222", amount: 2497, date: "2025-10-14" },
    { name: "Advocacia Mendes", phone: "5521988883333", amount: 1497, date: "2025-12-05" },
    { name: "Restaurante Sabor Real", phone: "5531977774444", amount: 397, date: "2026-02-11" },
    { name: "Drogaria Central", phone: "5541966665555", amount: 997, date: "2026-04-19" },
    { name: "Construtora Horizonte", phone: "5511955556666", amount: 2997, date: "2026-06-25" },
    { name: "Eduardo Fonseca", phone: "5521944447777", amount: 197, date: "2026-07-10" },
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
          status: "CONVERTED",
          value: c.amount,
          created_at: dt,
        },
      });
    }

    const commAmount = (c.amount * 30) / 100;
    const sale = await prisma.sale.create({
      data: {
        tenant_id: tenantId,
        lead_id: lead.id,
        product_name: `Plano/Serviço: ${c.name}`,
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

  // Criar histórico de Saques (Withdrawals) efetuados no Pix
  const withdrawalsData = [
    { amount: 1500, status: "paid", date: "2024-06-15" },
    { amount: 2200, status: "paid", date: "2024-12-20" },
    { amount: 3500, status: "paid", date: "2025-06-10" },
    { amount: 4800, status: "paid", date: "2025-12-18" },
    { amount: 3000, status: "paid", date: "2026-04-15" },
  ];

  for (const w of withdrawalsData) {
    const wDate = new Date(w.date);
    await prisma.partnerWithdrawal.create({
      data: {
        partner_id: partner.id,
        amount: w.amount,
        status: w.status,
        pixKey: email,
        pixKeyType: "email",
        created_at: wDate,
        approved_at: wDate,
      },
    });
  }

  console.log(`\n🎉 Conta do Carlos Eduardo Silva alimentada com histórico de 2024-2026!`);
  console.log(`Login: ${email} / Senha: ${rawPassword}`);
  console.log(`Código de Indicação: ${referralCode}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
