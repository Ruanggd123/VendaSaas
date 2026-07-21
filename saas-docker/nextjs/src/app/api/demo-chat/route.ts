import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Rate Limit in-memory (Reinicia esporadicamente na Vercel, mas ajuda a segurar spam rápido)
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = ipRequests.get(ip);
  
  if (userLimit && userLimit.resetTime > now) {
    if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) return false;
    userLimit.count++;
  } else {
    ipRequests.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
  }
  return true;
}

// Fallback super inteligente que simula uma IA de vendas conversando de forma fluida
function generateSmartFallback(message: string): string {
  const lowerMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  
  // Tratamento de negação e objeção
  if (lowerMsg.includes("nao quero") || lowerMsg.includes("outra coisa") || lowerMsg.includes("cancelar") || lowerMsg.includes("nao") || lowerMsg.includes("errado") || lowerMsg.includes("ruim")) {
    return "Entendo perfeitamente! Como esta é apenas uma demonstração do meu sistema, as vezes me empolgo. 😅 \n\nVocê gostaria de ver outras opções ou prefere falar com um atendente humano?";
  }

  // Se o usuário mandou números, como um CEP ou CPF
  if (/\d{5}/.test(lowerMsg)) {
    return "✅ Viabilidade confirmada! Temos cobertura de *Fibra Óptica 100%* na sua rua. 🎉\n\nPodemos prosseguir com o plano de *500 Mega por R$ 99,90*? Digite *'sim'* para eu te enviar o link do nosso WhatsApp oficial para finalizarmos!";
  }

  if (lowerMsg.includes("sim") || (lowerMsg.includes("quero") && !lowerMsg.includes("nao")) || lowerMsg.includes("vamos")) {
    return "Perfeito! 🚀 O seu pedido está quase pronto.\n\nPara finalizar sua ativação com total segurança, clique no link abaixo para falar com nosso atendimento no WhatsApp:\n\n👉 https://wa.me/5511999999999\n\nNossa equipe já está te aguardando lá!";
  }

  if (lowerMsg.includes("plano") || lowerMsg.includes("valor") || lowerMsg.includes("preco") || lowerMsg.includes("mega") || lowerMsg.includes("giga")) {
    return "Temos as melhores opções de Fibra! 🚀\n\n🔹 *500 Mega* - R$ 99,90/mês\n🔹 *1 Giga* - R$ 149,90/mês (Campeão de Vendas 🏆)\n\nMe passe o seu *CEP* para eu ver qual desses chega com velocidade máxima na sua casa!";
  }

  if (lowerMsg.includes("oi") || lowerMsg.includes("ola") || lowerMsg.includes("bom dia") || lowerMsg.includes("tarde") || lowerMsg.includes("noite")) {
    return "Olá! Sou a IA da Nexus. 👋\n\nPronto para acelerar sua conexão? Me envie seu *CEP* e eu te mostro os melhores planos de Fibra disponíveis para você hoje!";
  }

  // Resposta genérica super natural e persuasiva
  return "Incrível! 💡 Como eu sou uma Inteligência Artificial, consigo processar seus pedidos na hora.\n\nVocê prefere que eu veja os *Planos Disponíveis* ou já quer fazer a verificação pelo seu *CEP*?";
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown_ip";
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ 
        reply: "⚠️ Limite de demonstração atingido para evitar abusos no servidor. Aguarde um minuto para mandar mais mensagens." 
      });
    }

    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensagem não enviada" }, { status: 400 });
    }

    // Se a API Key estiver configurada na Vercel, a IA real funciona
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Você é um bot de vendas de internet fibra ótica. Seu objetivo é fechar uma venda.
Aja de forma super breve, extremamente educada, humana e persuasiva. Use emojis e *negrito*.
Se o cliente negar algo ou quiser outra coisa, mude de abordagem educadamente.
NÃO mande textos grandes, maximo 3 linhas. Você vende o plano de 500 Mega (R$99,90) e 1 Giga (R$149,90).
IMPORTANTE: Se o cliente confirmar que quer assinar, NÃO mande Pix. Envie o link do WhatsApp para ele finalizar: https://wa.me/5511999999999
Mensagem do cliente: "${message}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        return NextResponse.json({ reply: text });
      } catch (error) {
        console.error("Erro na API real da IA, caindo para o Fallback inteligente", error);
        return NextResponse.json({ reply: generateSmartFallback(message) });
      }
    }

    // Se não tiver chave, vai pro fallback inteligente
    return NextResponse.json({ reply: generateSmartFallback(message) });

  } catch (error) {
    return NextResponse.json(
      { reply: "Tive um probleminha de conexão rápida. Pode repetir seu último texto?" },
      { status: 500 }
    );
  }
}
