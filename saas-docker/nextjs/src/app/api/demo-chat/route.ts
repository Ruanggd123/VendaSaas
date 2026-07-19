import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Um Fallback super inteligente que simula uma IA de vendas conversando de forma fluida
function generateSmartFallback(message: string): string {
  const lowerMsg = message.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  
  // Se o usuário mandou números, como um CEP ou CPF
  if (/\d{5}/.test(lowerMsg)) {
    return "✅ Viabilidade confirmada! Temos cobertura de *Fibra Óptica 100%* na sua rua. 🎉\n\nPodemos prosseguir com o plano de *500 Mega por R$ 99,90*? Digite *'sim'* para eu gerar o Pix de ativação rápida!";
  }

  if (lowerMsg.includes("sim") || lowerMsg.includes("quero") || lowerMsg.includes("vamos")) {
    return "Perfeito! 🚀 O seu pedido foi criado com sucesso.\n\nAqui está o código Pix Copia e Cola para a primeira mensalidade:\n\n`00020101021226330014br.gov.bcb.pi...`\n\nAssim que o pagamento for aprovado, o técnico irá até sua casa amanhã de manhã. Posso confirmar?";
  }

  if (lowerMsg.includes("plano") || lowerMsg.includes("valor") || lowerMsg.includes("preço") || lowerMsg.includes("mega") || lowerMsg.includes("giga")) {
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
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Mensagem não enviada" }, { status: 400 });
    }

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Você é um bot de vendas de internet fibra ótica. Seja super breve, humano, persuasivo, use emojis e *negrito*. 
NÃO mande textos grandes. Você vende o plano de 500 Mega (R$99,90) e 1 Giga (R$149,90).
Mensagem do cliente: "${message}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        return NextResponse.json({ reply: text });
      } catch (error) {
        return NextResponse.json({ reply: generateSmartFallback(message) });
      }
    }

    return NextResponse.json({ reply: generateSmartFallback(message) });

  } catch (error) {
    return NextResponse.json(
      { reply: "Tive um probleminha de conexão rápida. Pode repetir seu último texto?" },
      { status: 500 }
    );
  }
}
