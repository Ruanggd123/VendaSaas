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

  // 2. Filtro anti-jailbreak forte (Regex)
  const jailbreakPatterns = [
    /ignore (todas )?as instru(ções|oes) (anteriores|acima)/gi,
    /ignore (all )?(previous|above) instructions/gi,
    /você (agora )?(é|es) (um|o) (desenvolvedor|admin|dono|deus)/gi,
    /you are (now )?(a|an|the) (developer|admin|owner|god)/gi,
    /escreva o (seu )?prompt (original|interno|completo|de sistema)/gi,
    /write (your|the) (original|internal|system) prompt/gi,
    /repita (tudo )?o que eu disse/gi,
    /repeat (everything )?(i|i just) said/gi,
    /revele (suas )?instru(ções|oes) (internas|de sistema)/gi,
    /reveal (your )?(internal|system) instructions/gi,
    /haja como|act as|atu(e|e) como/gi,
    /dê (um )?comando|execute (um )?comando|run command/gi,
    /bypass (regras|segurança|restrições|rules|security|restrictions)/gi,
    /.ignore (acima|anterior|above|previous)/gi,
    /system (message|prompt) (:|: )?/gi,
    /output (the )?(initial|original|full|entire) (prompt|instruction|message)/gi,
    /role.?play|persona|character.?play/gi,
    /modo (desenvolvedor|dan|deus|sudo|override)/gi,
    /developer mode|god mode|dan mode/gi,
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
 * Executado após a IA retornar a resposta.
 */
export function validateOutput(aiResponse: string): string {
  try {
    if (!aiResponse || typeof aiResponse !== 'string') {
      return "Desculpe, não consegui processar a resposta no momento.";
    }

    let respostaCliente = aiResponse.trim();

    // Se a IA retornar JSON estruturado, extrai o texto do cliente
    if (respostaCliente.startsWith("{") || respostaCliente.includes('"resposta_cliente"')) {
      try {
        const cleanJson = respostaCliente.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.resposta_cliente) {
          respostaCliente = parsed.resposta_cliente;
        }
      } catch (e) {}
    }

    // 1. Redação estrita de chaves de API e segredos (sk-..., tokens)
    respostaCliente = respostaCliente
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, "[CHAVE_REMOVIDA]")
      .replace(/ba1add[a-zA-Z0-9]{20,}/g, "[CHAVE_REMOVIDA]")
      .replace(/gsk_[a-zA-Z0-9_\-]{20,}/g, "[CHAVE_REMOVIDA]");

    // 2. Blacklist de vazamento de regras de sistema
    const blacklist = [
      "prompt original",
      "instruções de sistema",
      "system message",
      "regras de segurança máxima",
      "anti-jailbreak"
    ];

    const lowerResponse = respostaCliente.toLowerCase();
    for (const term of blacklist) {
      if (lowerResponse.includes(term)) {
        console.warn("[SECURITY] Output Guardrail bloqueou a resposta por conter termos sensíveis.", respostaCliente);
        return "Posso te ajudar com dúvidas sobre nossos produtos, planos ou criação de sites! Como podemos prosseguir?";
      }
    }

    return respostaCliente;

  } catch (error) {
    console.error("[SECURITY] Erro no Output Guardrail:", error);
    return "Como posso te ajudar hoje com nossos produtos e serviços?";
  }
}
