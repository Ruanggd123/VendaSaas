import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Últimas comissões registradas
  const commissions = await prisma.partnerCommission.findMany({
    orderBy: { created_at: "desc" },
    take: 5,
    include: {
      partner: { select: { name: true, referralCode: true } },
      sale: { select: { product_name: true, amount: true, status: true } },
    }
  });

  console.log("=== ÚLTIMAS COMISSÕES ===");
  if (commissions.length === 0) {
    console.log("Nenhuma comissão encontrada.");
  }
  for (const c of commissions) {
    console.log(`${c.id}`);
    console.log(`  Parceiro: ${c.partner.name} (${c.partner.referralCode})`);
    console.log(`  Venda: ${c.sale?.product_name} - R$ ${c.sale?.amount}`);
    console.log(`  Comissão: R$ ${c.amount} (${c.type})`);
    console.log(`  Status: ${c.status}`);
    console.log("");
  }

  // Saldo total por parceiro
  console.log("=== SALDO POR PARCEIRO ===");
  const partners = await prisma.partner.findMany({
    select: {
      id: true, name: true, referralCode: true,
      commissions: {
        select: { amount: true, status: true }
      }
    }
  });

  for (const p of partners) {
    const available = p.commissions.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
    const pending = p.commissions.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    console.log(`${p.name} (${p.referralCode}): Disponível R$ ${available.toFixed(2)} | Pendente R$ ${pending.toFixed(2)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
