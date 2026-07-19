import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: "c4c13619-a56f-4ff2-82c7-3c4503a10d13" },
    select: { settings: true, name: true }
  });
  if (!tenant?.settings) { console.log("No settings"); return; }
  
  const s = JSON.parse(tenant.settings as string);
  
  console.log("=== AI SETTINGS ===");
  console.log("ai_name:", s.ai_name || "(default)");
  console.log("ai_personality:", s.ai_personality ? s.ai_personality.substring(0, 200) + "..." : "(default)");
  console.log("ai_prompt:", s.ai_prompt ? s.ai_prompt.substring(0, 300) + "..." : "(default)");
  console.log("welcome_message:", s.welcome_message ? s.welcome_message.substring(0, 200) : "(none)");
  console.log("manager_phone:", s.manager_phone || "(none)");
  console.log("enableScheduling:", s.enableScheduling);
  console.log("ia_model:", s.ia_model || "(default)");
  
  console.log("\n=== PRODUCTS (catalog for bot) ===");
  const products = s.products || [];
  products.forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.name} - R$ ${p.price} (${p.delivery_type || "virtual_instant"})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
