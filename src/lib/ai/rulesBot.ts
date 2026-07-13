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
    switch (this.state.step) {
      case 'initial':
        this.state.step = 'get_model';
        return "Por favor, informe o modelo do aparelho:";
      
      case 'get_model':
        this.state.data.modelo_aparelho = message;
        this.state.step = 'get_issue';
        return "Agora, descreva o defeito relatado:";
      
      case 'get_issue':
        this.state.data.defeito_relatado = message;
        this.state.step = 'complete';
        return this.generateResponse();
      
      default:
        return "Obrigado pelas informações! Nossa equipe já está analisando seu caso.";
    }
  }

  private generateResponse(): string {
    return `Resumo do atendimento:
    - Modelo: ${this.state.data.modelo_aparelho}
    - Defeito: ${this.state.data.defeito_relatado}
    
    Em breve um técnico entrará em contato para ajudar!`;
  }

  public reset(): void {
    this.state = {
      step: 'initial',
      data: {}
    };
  }
}
