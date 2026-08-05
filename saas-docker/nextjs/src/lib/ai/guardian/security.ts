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
 * 
 * Normaliza a mensagem para uma forma "compacta" (minúsculas, sem acentos,
 * sem espaços/pontuação, leet trocado) e compara com padrões de jailbreak.
 * Isso detecta obfuscação comum (ex: "IgNoRe  as  inStRuçÕeS", "ign0re",
 * "i g n o r e as instruções") sem depender da digitação exata.
 */
export function sanitizeInput(message: string, maxLen: number = 350): string {
  if (!message) return "";

  let cleanMsg = message.trim();

  // 1. Limite de tamanho (previne exaustão de contexto)
  if (cleanMsg.length > maxLen) {
    cleanMsg = cleanMsg.substring(0, maxLen);
  }

  // 2. Versão compacta: sem caixa, sem acentos, sem separadores, leet trocado
  const compact = cleanMsg
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0]/g, "o")
    .replace(/[1]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/[@]/g, "a")
    .replace(/[$]/g, "s")
    .replace(/[^a-z]/g, "");

  const jailbreakPatterns: RegExp[] = [
    // Ignorar instruções/regras (PT/EN)
    /ignore(as|todasas|das)?(instrucoes|regras)(anteriores|acima|passadas|demais)?/,
    /ignore(allmy|allof|allthe|all|the|your|any|everything|above|previous|earlier|prior|old)?(instructions|rules|prompts?|messages)/,
    /ignore(everything|that|this)(above|below|before|earlier)?/,
    /(esqueca|esquecas|desconsidere|naoobedecca)(as|todasas|das)?(instrucoes|regras)/,
    /forget(all|your|the|any)?(previous|above)?(instructions|rules|prompts?)/,
    // Escrever/mostrar prompt (PT/EN)
    /(escreva|mostre|meenvie|reproduza|copie|cole|envie|imprima|saidad)?(o)?(seu)?(prompt|systemprompt|promptdesistema)(original|interno|completo|desistema|anterior)?/,
    /(write|show|output|send|print|reveal|copy|paste|dump|leak)(your|the|my)?(original|internal|system|full|entire)?(prompt|instructions?|rules|messages)/,
    // Revelar regras/instruções (PT/EN)
    /revele(as|o|os|a)?(suas|seus|tuas)?(instrucoes|regras|diretrizes|politicas|prompt)(internas|desistema|completas|ocultas)?/,
    /reveal(your|the)?(internal|system|secret)?(instructions|rules|prompt|guidelines|policies)/,
    // Repetir
    /repita(tudooque|oque|o)?(eu|voce)?(disse|falei|mandei|escreveu)/,
    /repeateverything(isaid|isay|iwas)?/,
    // Bypass
    /bypass(as)?(regras|seguranca|restricoes|limites|guardrails|filtros|rules|security|restrictions)/,
    /(quebre|quebrar|pule|pular|evite)(as)?(regras|restricoes|seguranca)/,
    // Modos secretos
    /modo(desenvolvedor|deus|dan|sudo|override|admin|oculto)/,
    /(developer|god|dan|sudo|admin|overrid[ae])mode/,
    // Persona (PT/EN)
    /hajacomo(um|o|uma|a)?(desenvolvedor|desenvolvedora|admin|hacker|deus|dono|programador|superusuario|sistema)/,
    /atuacomo(um|o|uma|a)?(desenvolvedor|desenvolvedora|admin|hacker|deus|superusuario)/,
    /actas(an|a|the)?(developer|admin|hacker|god|owner|programmer|superuser|system)/,
    /roleplay|persona|characterplay/,
    // "Você é / agora é" (PT/EN)
    /(voce|tu)(agora)?(e|era|estasendo|vaiser)(agora)?(um|o|a|uma)?(desenvolvedor|admin|deus|dono|hacker|sistema|superusuario)/,
    /(you)(are|were|havebecome|willbe|now)(now)?(are)?(a|an|the)?(developer|admin|hacker|god|owner|system|superuser)/,
    // System prompt/message solto
    /systemprompt|systemmessage|promptoriginal/,
  ];

  for (const pattern of jailbreakPatterns) {
    if (pattern.test(compact)) {
      console.warn("[SECURITY] Tentativa de Jailbreak interceptada no Input (conteúdo ocultado por privacidade).");
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
      "instrucoes de sistema",
      "instruções internas",
      "instrucoes internas",
      "minhas instruções",
      "minhas instrucoes",
      "minhas regras internas",
      "meu prompt",
      "prompt do sistema",
      "prompt de sistema",
      "regras internas",
      "regras de segurança máxima",
      "minhas regras de segurança",
      "anti-jailbreak",
      "anti-injeção",
      "anti-injecao",
      "system message",
      "system prompt",
      "internal instructions",
      "my instructions",
      "my system prompt",
      "original prompt",
      "revealed prompt",
      "modo admin",
      "modo administrador",
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
