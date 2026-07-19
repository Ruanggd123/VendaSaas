const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { id: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d' } });
  const settings = JSON.parse(tenant.settings);
  settings.products = [
    { name: "Desenvolvimento de Site Institucional", price: 1500, description: "Site completo e responsivo para sua empresa" },
    { name: "Consultoria de Vendas", price: 300, description: "Uma hora de consultoria estratégica" },
    { name: "Automação de WhatsApp", price: 800, description: "Configuração completa de chatbot no n8n" },
    { name: "Manutenção Mensal", price: 150, description: "Suporte e hospedagem mensal" }
  ];
  await prisma.tenant.update({
    where: { id: 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d' },
    data: { settings: JSON.stringify(settings) }
  });
  console.log("Produtos atualizados com sucesso!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
