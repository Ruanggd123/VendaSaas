import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando a criação do Cliente de Teste (Etapa 2)...');

  // Configurações (Prompt) do Cliente
  const settings = {
    ai_prompt: "Você é a assistente da Imobiliária do João. Seu objetivo é agendar visitas para o Apartamento de Luxo (R$ 500.000) e para a Casa de Praia (R$ 850.000).",
    business_hours: {
      monday_to_friday: "08:00-18:00",
      saturday: "09:00-12:00",
      sunday: "fechado"
    },
    tone: "formal e persuasivo"
  };

  // Criação do Tenant
  const tenant = await prisma.tenant.upsert({
    where: { whatsapp_instance: 'Imobiliaria_Joao' },
    update: {},
    create: {
      name: 'Imobiliária do João',
      phone: '5511999999999',
      plan: 'enterprise',
      status: 'active',
      whatsapp_instance: 'Imobiliaria_Joao',
      settings: JSON.stringify(settings),
    },
  });

  console.log('✅ Cliente criado com sucesso!');
  console.log(tenant);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
