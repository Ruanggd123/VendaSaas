import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFICANDO DADOS E HISTÓRICO PARA RECUPERAÇÃO DE LISTA NEGRA ===");

  const tenants = await prisma.tenant.findMany();
  console.log(`Tenants encontrados: ${tenants.length}`);

  for (const t of tenants) {
    console.log(`\nTenant ID: ${t.id} (${t.name})`);
    console.log("Settings atuais:", t.settings);

    // Buscar conversas do tenant
    const conversations = await prisma.conversation.findMany({
      where: { tenant_id: t.id },
      select: { id: true, contact_number: true, contact_name: true, status: true, created_at: true }
    });

    console.log(`Conversas registradas (${conversations.length}):`);
    for (const c of conversations) {
      console.log(` - Número: ${c.contact_number} | Nome: ${c.contact_name || "Sem nome"} | Status: ${c.status}`);
    }

    // Buscar leads do tenant
    const leads = await prisma.lead.findMany({
      where: { tenant_id: t.id },
      select: { id: true, phone: true, name: true, status: true }
    });

    console.log(`Leads registrados (${leads.length}):`);
    for (const l of leads) {
      console.log(` - Telefone: ${l.phone} | Nome: ${l.name || "Sem nome"} | Status: ${l.status}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
