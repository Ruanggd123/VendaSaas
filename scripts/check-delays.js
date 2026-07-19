const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDelays() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Buscar todos os projetos com status "em_construcao" ou "pendente" e que passaram de 7 dias
  // NOTA: Como você não criou uma tabela 'Project' no schema.prisma ainda, isso é uma projeção 
  // do futuro. Caso 'Project' exista, essa lógica roda.
  
  try {
      const projects = await prisma.project.findMany({
        where: {
          status: { in: ['em_construcao', 'pendente'] },
          prazo_entrega: { lt: now }
        },
        include: {
          tenant: true
        }
      });

      for (const project of projects) {
        const daysLate = Math.floor((now - new Date(project.prazo_entrega)) / (86400000));
        const discount = Math.min(daysLate * 0.10, 0.50); // Máximo 50% de desconto

        // Atualizar o projeto com o desconto
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'atrasado',
            desconto_aplicado: discount,
            dias_atraso: daysLate
          }
        });

        // Disparar mensagem via WhatsApp
        await sendWhatsAppMessage(
          project.tenant.phone,
          `Olá! Seu site está em atraso. Devido à nossa garantia, você recebeu ${discount * 100}% de desconto. Pedimos desculpas pelo transtorno.`
        );

        console.log(`Desconto de ${discount * 100}% aplicado ao projeto ${project.id}`);
      }
      
      console.log("Cron job de checagem de atrasos finalizado com sucesso!");
  } catch (e) {
      if (e.message.includes("project")) {
          console.log("Tabela 'Project' ainda não existe no Prisma. Execute 'npx prisma migrate' após criá-la.");
      } else {
          console.error(e);
      }
  }
}

async function sendWhatsAppMessage(to, message) {
  // Chamar a Evolution API
  try {
      const response = await fetch('http://localhost:8080/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance: 'joao_imobiliaria',
          to: to,
          text: message
        })
      });

      return await response.json();
  } catch(e) {
      console.log("Erro ao enviar msg para Evolution API (Ela está offline?)", e.message);
  }
}

// Executar diariamente (usar cron job)
checkDelays().catch(console.error);
