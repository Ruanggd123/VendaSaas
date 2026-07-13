interface BotState {
  step: string;
  data: {
    modelo_aparelho?: string;
    defeito_relatado?: string;
    [key: string]: any;
  };
}

export class WhatsAppBot {
  private state: BotState;

  constructor() {
    this.state = {
      step: 'initial',
      data: {}
    };
  }

  public async handleMessage(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase().trim();

    switch (this.state.step) {
      case 'initial':
        this.state.step = 'confirm_assistance';
        return "Olá! Sou o assistente virtual da assistência técnica. Posso te ajudar com problemas no seu aparelho? (responda SIM ou NÃO)";
      
      case 'confirm_assistance':
        if (lowerMessage === 'sim' || lowerMessage === 's') {
          this.state.step = 'get_model';
          return "Ótimo! Para começar, qual é o modelo do seu aparelho? (Ex: Samsung Galaxy S23, iPhone 15)";
        }
        return "Tudo bem! Se precisar de ajuda depois, é só chamar. Tenha um bom dia!";
      
      case 'get_model':
        this.state.data.modelo_aparelho = message;
        this.state.step = 'get_issue';
        return "Entendido! Agora, poderia me descrever qual problema você está enfrentando?\nExemplos:\n- Não liga mais\n- Tela quebrada\n- Bateria não carrega\n- Outro problema";
      
      case 'get_issue':
        this.state.data.defeito_relatado = message;
        this.state.step = 'confirm_data';
        return `Por favor, confira se as informações estão corretas:
📱 Modelo: ${this.state.data.modelo_aparelho}
🔧 Problema: ${this.state.data.defeito_relatado}

Está tudo certo? (responda SIM ou NÃO)`;
      
      case 'confirm_data':
        if (lowerMessage === 'sim' || lowerMessage === 's') {
          this.state.step = 'complete';
          return this.generateResponse();
        }
        this.state.step = 'get_model';
        return "Vamos começar novamente então. Qual é o modelo do seu aparelho?";
      
      default:
        return "Obrigado! Um de nossos técnicos já foi notificado e entrará em contato em breve para ajudar com seu aparelho. Caso precise de mais algo, é só chamar!";
    }
  }

  private generateResponse(): string {
    return `✅ Seu chamado foi registrado com sucesso!

Detalhes:
📱 Aparelho: ${this.state.data.modelo_aparelho}
🔧 Problema: ${this.state.data.defeito_relatado}

Nossos técnicos irão analisar seu caso e entrarão em contato em breve para orientações. O número deste atendimento é #${Math.floor(10000 + Math.random() * 90000)}.

Enquanto isso, evite tentar consertar sozinho para não danificar mais o aparelho.`;
  }

  public reset(): void {
    this.state = {
      step: 'initial',
      data: {}
    };
  }
}
