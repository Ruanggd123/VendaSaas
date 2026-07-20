const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Configurando os produtos e planos da VendasSAAS...");

  // Busca o tenant SuperAdmin (você pode precisar ajustar o ID do seu admin principal)
  // Como fallback, podemos tentar buscar o primeiro tenant ou um específico
  const tenant = await prisma.tenant.findFirst({
    orderBy: { created_at: 'asc' }
  });

  if (!tenant) {
    console.error("Nenhum Tenant (Cliente) encontrado para atuar como Master.");
    return;
  }

  let settings = {};
  try {
    settings = JSON.parse(tenant.settings || '{}');
  } catch(e) {}

  // Inserindo os planos
  settings.products = [
    { 
      name: "Plano Start", 
      price: 150.00, // Adesão 
      monthly: 67.00, 
      type: "plan",
      description: "Presença digital + Bot Fixo. Sem IA.",
      features: [
        "Site Single Page",
        "Bot Starter (Regras Fixo)",
        "Conversas Ilimitadas (Sem IA)",
        "Manutenção e Hospedagem Inclusos"
      ]
    },
    { 
      name: "Plano Growth", 
      price: 150.00, // Adesão
      monthly: 147.00, 
      type: "plan",
      description: "Agendamentos, IA e até 5 páginas.",
      features: [
        "Até 5 páginas institucionais",
        "Bot Pro IA (DeepSeek)",
        "Limite de 5.000 mensagens IA/mês",
        "Suporte Premium"
      ]
    },
    { 
      name: "Plano Scale", 
      price: 150.00, // Adesão
      monthly: 497.00, 
      type: "plan",
      description: "Varejo, Loja virtual e muito fluxo.",
      features: [
        "Loja Virtual Completa",
        "Até 10 números WhatsApp",
        "Limite de 20.000 mensagens IA/mês",
        "Gestor de Conta Dedicado"
      ]
    },
    { 
      name: "Só Bot (Assinatura)", 
      price: 150.00, // Adesão
      monthly: 97.00, 
      type: "plan",
      description: "Apenas o sistema de Bot de Inteligência Artificial sem o site.",
      features: [
        "Sem Site",
        "Bot Pro IA (DeepSeek)",
        "Limite de 5.000 mensagens IA/mês",
        "Ideal para quem já tem site"
      ]
    },
    { 
      name: "Compra Avulsa: Só Site", 
      price: 2500.00, 
      type: "standalone",
      description: "Pagamento único pelo desenvolvimento do site. Sem bot e sem hospedagem.",
      features: [
        "Desenvolvimento do Site (Arquivos)",
        "Sem Mensalidade",
        "Você cuida da Hospedagem",
        "Sem Bot IA"
      ]
    }
  ];

  // Inserindo o Prompt Vendedor na IA do Master
  settings.ai_prompt = `Você é um Especialista de Vendas e Consultor de Tecnologia da VendasSAAS. Seu objetivo é vender nossos serviços de "Presença Digital como Serviço (WaaS)" e "Secretária Inteligente (Bot IA)".
Seu tom de voz é profissional, consultivo, seguro e persuasivo. Você não age como um robô genérico, mas como um especialista em negócios focado em aumentar as vendas do cliente.

NOSSOS PRODUTOS E PLANOS:
Temos 4 opções, mas o nosso FOCO DE VENDAS é o Plano Growth. Sempre direcione o cliente para ele.
Todos os planos (exceto avulso) possuem uma Taxa de Adesão (Setup) de R$ 150.

1. Plano Start (R$ 67/mês): Ideal para quem está começando. Inclui Site Single Page, e um Bot Starter de WhatsApp baseado em botões/regras (Sem Inteligência artificial). Conversas ilimitadas.
2. Plano Growth (R$ 147/mês): O Mais Vendido! Inclui Site de até 5 páginas, Bot Inteligente com IA, e um limite de 5.000 mensagens processadas pela IA por mês.
3. Plano Scale (R$ 497/mês): Para e-commerce e varejo. Loja Virtual completa e até 20.000 mensagens processadas por IA por mês.
4. Só Bot - Assinatura (R$ 97/mês): Ideal para quem já tem um site pronto e quer APENAS o Bot Inteligente (IA). Limite de 5.000 mensagens/mês.

OPÇÕES DE COMPRA AVULSA (ANCORAGEM DE PREÇO):
Nós vendemos assinaturas porque o cliente não tem dor de cabeça. Mas se o cliente tiver muito medo de assinatura, você deve usar a Ancoragem de Preços:
* Compra Avulsa do Site: R$ 2.500 (Pagamento único). O cliente recebe os arquivos do site. Sem Bot de IA, sem hospedagem, sem manutenção mensal.

COMO QUEBRAR OBJEÇÕES:
1. O que acontece se eu cancelar a assinatura? Eu perco o site?
Sua Resposta: "Exatamente. Nosso modelo é como a Netflix ou o aluguel de uma sala comercial. O valor de R$ 147/mês cobre os custos dos servidores de altíssima velocidade, da manutenção e da Inteligência Artificial do WhatsApp. Se você parar de pagar, o sistema inteiro é desligado, pois é um pacote 'tudo incluso' de tecnologia. Se você quiser comprar o site de forma definitiva para hospedar por conta própria (sem o Bot), nós fazemos por R$ 2.500."

2. É muito caro pagar todo mês!
Sua Resposta: "Se você fosse comprar esse site de forma avulsa, pagaria R$ 2.500. Além disso, teria que pagar hospedagem todo mês para um servidor externo e contratar um programador sempre que quisesse mudar um texto. Na nossa assinatura de R$ 147, o servidor está incluso, a manutenção é por nossa conta e, de quebra, você ainda leva nossa IA para atender seus clientes 24 horas por dia no WhatsApp. É o seu departamento de TI terceirizado por uma fração do preço."

3. O Bot funciona em grupos de WhatsApp?
Sua Resposta: "Sim! Nosso sistema é altamente configurável. Podemos colocar o seu número de WhatsApp em uma Lista Branca de grupos específicos, onde o Bot vai monitorar e responder as dúvidas dos clientes lá dentro."

REGRAS DE CONDUTA:
- Nunca invente preços ou planos que não estejam listados acima.
- Nunca prometa que o cliente ficará com o site após o cancelamento da assinatura.
- Se o cliente perguntar se tem "só o bot", ofereça o "Só Bot por R$ 97/mês" e ressalte a taxa de adesão de R$ 150.`;

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { settings: JSON.stringify(settings) }
  });

  console.log("Produtos atualizados com sucesso no Tenant Master:", tenant.name);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
