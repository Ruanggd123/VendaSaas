import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tenta pegar a API Key (mas se não existir na Vercel, o sistema não vai quebrar graças ao Fallback)
const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Função de segurança que responde caso a IA falhe ou não tenha chave (Fallback Inteligente)
function generateFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes("valor") || lowerMsg.includes("preço") || lowerMsg.includes("preco") || lowerMsg.includes("quanto")) {
    return "Nossos planos começam a partir de R$ 97/mês para o Site Institucional. Mas também temos o plano Enterprise para Lojas Virtuais (R$ 347/mês). Qual formato atende melhor o seu negócio?";
  }
  
  if (lowerMsg.includes("plano") || lowerMsg.includes("site") || lowerMsg.includes("loja") || lowerMsg.includes("ecommerce")) {
    return "Excelente! Se você quer escalar vendas, recomendamos nosso combo de Site + Robô do WhatsApp. Gostaria de ver como funciona a automação do robô?";
  }
  
  if (lowerMsg.includes("sim") || lowerMsg.includes("quero") || lowerMsg.includes("gostaria")) {
    return "Perfeito! O nosso robô atende, qualifica as dúvidas e envia o link de pagamento ou agendamento para o cliente de forma 100% autônoma. 🚀 É como ter uma secretária trabalhando 24h sem cobrar horas extras!";
  }

  if (lowerMsg.includes("ola") || lowerMsg.includes("olá") || lowerMsg.includes("oi") || lowerMsg.includes("bom dia") || lowerMsg.includes("boa tarde")) {
    return "Olá! Sou a IA de Vendas da Nexus. 👋 Como posso ajudar a alavancar o seu negócio hoje?";
  }
  
  return "Que interessante! Nossa plataforma é perfeita para negócios inovadores. Como eu sou uma demonstração, minhas respostas são um pouco curtas, mas na vida real eu seria configurada com todo o catálogo e regras da sua empresa! O que acha de conferirmos nossos planos?";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensagem não enviada" }, { status: 400 });
    }

    // Se tivermos a API KEY, tentamos chamar a Inteligência Artificial Real (Gemini)
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Você é um robô vendedor inteligente e amigável demonstrando as capacidades da plataforma Nexus (SaaS de criação de sites, e-commerces e bots de whatsapp). 
Seu objetivo é impressionar o usuário, sendo rápido, direto, persuasivo e usando emojis. Responda em português brasileiro.
Mensagem do cliente: "${message}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        return NextResponse.json({ reply: text });
      } catch (error) {
        console.error("Erro no Gemini, ativando fallback:", error);
        // Em caso de erro (ex: cota excedida), cai para o fallback
        return NextResponse.json({ reply: generateFallbackResponse(message) });
      }
    }

    // Se não tiver API Key, usa o Fallback direto
    return NextResponse.json({ reply: generateFallbackResponse(message) });

  } catch (error) {
    console.error("Erro interno do servidor:", error);
    return NextResponse.json(
      { reply: "Oops, tive um pequeno problema técnico. Mas na nossa plataforma oficial garantimos 99.9% de uptime!" },
      { status: 500 }
    );
  }
}
