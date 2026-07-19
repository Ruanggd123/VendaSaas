import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const conversations = await prisma.conversation.findMany({
    include: { leads: true }
  });
  
  for (const conv of conversations) {
    if (conv.leads.length === 0) {
      await prisma.lead.create({
        data: {
          tenant_id: conv.tenant_id,
          conversation_id: conv.id,
          name: conv.contact_name || conv.contact_number,
          phone: conv.contact_number,
          status: "novo"
        }
      });
      console.log(`Lead created for conversation ${conv.contact_number}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
