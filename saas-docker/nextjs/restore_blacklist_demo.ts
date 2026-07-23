import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== RESTAURANDO NÚMEROS DE EXEMPLO / DEMO NA LISTA NEGRA ===");

  const adminUser = await prisma.user.findUnique({ where: { email: "fraruann159@gmail.com" } });
  if (!adminUser) throw new Error("Superadmin não encontrado");

  const tenant = await prisma.tenant.findUnique({ where: { id: adminUser.tenant_id } });
  if (!tenant) throw new Error("Tenant não encontrado");

  let settings: any = {};
  try {
    settings = JSON.parse((tenant.settings as string) || "{}");
  } catch {}

  const sampleBlacklist = [
    { number: "5588981885499", name: "Ruan Gomes (Gerente / Suporte)" },
    { number: "5511999999999", name: "Contato de Teste Bloqueado" }
  ];

  settings.ignored_numbers = sampleBlacklist;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { settings: JSON.stringify(settings) }
  });

  console.log("✅ Lista Negra restaurada no banco de dados para o Tenant Admin com sucesso!");
  console.log("Contatos na Lista Negra:", sampleBlacklist);
}

main()
  .catch((err) => console.error("Erro ao restaurar lista negra:", err))
  .finally(() => prisma.$disconnect());
