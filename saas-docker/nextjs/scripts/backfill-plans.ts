import { PrismaClient } from '@prisma/client';
import { normalizePlanId } from '../src/lib/plans';

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run") || process.env.BACKFILL_DRY_RUN === "1";

async function waitForConfirmation(): Promise<boolean> {
  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => rl.question("Aplicar normalização? Digite APLICAR para confirmar: ", resolve));
  rl.close();
  return answer.trim().toUpperCase() === "APLICAR";
}

async function main() {
  console.log("Verificando planos de todos os tenants...");

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, plan: true }
  });

  let updated = 0;
  let dirty: { id: string; name: string; from: string | null; to: string }[] = [];

  for (const t of tenants) {
    const normalized = normalizePlanId(t.plan ?? "");
    if (normalized !== (t.plan ?? "").trim()) {
      dirty.push({ id: t.id, name: t.name, from: t.plan ?? "", to: normalized });
    }
  }

  if (dirty.length === 0) {
    console.log("✅ Nenhum plano precisa de normalização. Todos os tenants estão com ids canônicos.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\n⚠️ Encontrados ${dirty.length} tenants com plano não canônico:\n`);
  for (const d of dirty) {
    console.log(`  • ${d.name} (${d.id})`);
    console.log(`      ${JSON.stringify(d.from)}  →  ${d.to}`);
  }

  if (DRY_RUN) {
    console.log(`\n🔎 DRY-RUN: nenhuma alteração aplicada. Rode sem --dry-run para normalizar.`);
    await prisma.$disconnect();
    return;
  }

  const confirmed = await waitForConfirmation();
  if (!confirmed) {
    console.log("❌ Abortado pelo usuário. Nenhuma alteração aplicada.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nAplicando normalização...`);
  for (const d of dirty) {
    await prisma.tenant.update({
      where: { id: d.id },
      data: { plan: d.to }
    });
    updated++;
  }

  console.log(`🎉 ${updated} tenants normalizados com sucesso!`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });