// src/lib/ai/guardian/security.ts

const rateLimitMap = new Map<string, number[]>();

/**
 * Rate Limiter (Proteção de Bolso)
 * Bloqueia se houver mais de 5 mensagens em 10 segundos para o mesmo contato.
 */
export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  
  // Limpa timestamps mais velhos que 10 segundos
  const recentTimestamps = timestamps.filter(ts => now - ts < 10000);
  
  if (recentTimestamps.length >= 5) {
    // Mantém o estado atualizado para punir quem continua floodando
    recentTimestamps.push(now);
    rateLimitMap.set(identifier, recentTimestamps);
    return false; // Bloqueado
  }
  
  recentTimestamps.push(now);
  rateLimitMap.set(identifier, recentTimestamps);
  return true;
}

/**
 * Filtro de Entrada (Input Guardrail)
 * Executado antes de enviar a mensagem para a IA.
 */
export function sanitizeInput(message: string, maxLen: number = 350): string {
  if (!message) return "";
  
  let cleanMsg = message.trim();

  // 1. Limite de tamanho (previne exaustão de contexto)
  if (cleanMsg.length > maxLen) {
    cleanMsg = cleanMsg.substring(0, maxLen);
  }

  // 2. Filtro anti-jailbreak forte (Regex básico)
  // Se contiver instruções óbvias de bypass, neutraliza o comando.
  const jailbreakPatterns = [
    /ignore (todas )?as instru(ções|oes) (anteriores|acima)/gi,
    /você (agora )?(é|es) (um|o) (desenvolvedor|admin|dono)/gi,
    /escreva o (seu )?prompt (original|interno)/gi,
    /repita (tudo )?o que eu disse/gi,
  ];

  for (const pattern of jailbreakPatterns) {
    if (pattern.test(cleanMsg)) {
      console.warn("[SECURITY] Tentativa de Jailbreak interceptada no Input:", message);
      // Substitui o payload malicioso por uma saudação inofensiva
      return "Olá, gostaria de saber mais sobre o sistema.";
    }
  }

  return cleanMsg;
}

/**
 * Validação de Saída (Output Guardrail)
 * Executado após a IA retornar o JSON estruturado.
 */
export function validateOutput(aiResponse: string): string {
  try {
    let parsed: any;
    
    // Tenta fazer o parse. Se falhar, a IA cortou no meio ou não respeitou o JSON Mode.
    try {
      // Limpa possíveis marcações markdown de código
      const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("[SECURITY] Falha ao parsear o Output da IA. Possível alucinação ou limite de tokens atingido.", aiResponse);
      return "Desculpe, tive uma oscilação aqui na minha conexão. Pode repetir a sua última dúvida, por favor?";
    }

    const respostaCliente = parsed.resposta_cliente;

    if (!respostaCliente || typeof respostaCliente !== 'string') {
      console.error("[SECURITY] O JSON da IA não conteve o campo obrigatório 'resposta_cliente'.");
      return "Estou com dificuldades para processar. Pode reformular?";
    }

    // Filtros de segurança no texto de saída
    const blacklist = [
      "prompt original",
      "instruções de sistema",
      "system message",
      "regras de segurança máxima", // Evita que a IA vaze suas próprias regras
      "anti-jailbreak"
    ];

    const lowerResponse = respostaCliente.toLowerCase();
    for (const term of blacklist) {
      if (lowerResponse.includes(term)) {
        console.warn("[SECURITY] Output Guardrail bloqueou a resposta por conter termos sensíveis.", respostaCliente);
        return "Notei que você fez uma pergunta um pouco fora do nosso escopo. Posso te ajudar com dúvidas sobre a plataforma, planos ou criação de sites?";
      }
    }

    return respostaCliente;

  } catch (error) {
    console.error("[SECURITY] Erro fatal no Output Guardrail:", error);
    return "Ocorreu um erro inesperado.";
  }
}
