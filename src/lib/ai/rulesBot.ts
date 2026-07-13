interface Appointment {
  date: string;
  time: string;
  confirmed: boolean;
}

interface BotState {
  step: string;
  data: {
    modelo_aparelho?: string;
    defeito_relatado?: string;
    appointment?: Appointment;
    [key: string]: any;
  };
  availableSlots: string[];
}

export class WhatsAppBot {
  private state: BotState;

  constructor() {
    this.state = {
      step: 'initial',
      data: {},
      availableSlots: this.generateAvailableSlots()
    };
  }

  private generateAvailableSlots(): string[] {
    // Gerar horários disponíveis (9h às 17h, a cada 30 minutos)
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  }

  private getAvailableDates(): string[] {
    // Retorna os próximos 7 dias
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  public async handleMessage(message: string): Promise<string> {
    const lowerMessage = message.toLowerCase().trim();

    // Resetar o bot se receber "iniciar" ou "novo atendimento"
    if (lowerMessage === 'iniciar' || lowerMessage === 'novo atendimento') {
      this.reset();
    }

    switch (this.state.step) {
      case 'initial':
        // Se já tiver dados preenchidos, oferece opção de novo atendimento
        if (Object.keys(this.state.data).length > 0) {
          return `Parece que você já tem um atendimento em andamento. Deseja:\n1. Continuar o atendimento anterior\n2. Iniciar um novo atendimento\n\nResponda "1" ou "2"`;
        }
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
          this.state.step = 'schedule_appointment';
          const dates = this.getAvailableDates();
          return `Ótimo! Agora vamos agendar seu atendimento. Estes são os próximos dias disponíveis:\n\n${dates.map((d, i) => `${i+1}. ${d}`).join('\n')}\n\nPor favor, escolha um dia pelo número (1-7):`;
        } else if (lowerMessage === 'não' || lowerMessage === 'nao' || lowerMessage === 'n') {
          this.state.step = 'get_model';
          return "Vamos começar novamente então. Qual é o modelo do seu aparelho?";
        }
        return "Por favor, responda SIM ou NÃO";

      case 'schedule_appointment':
        const dayIndex = parseInt(lowerMessage) - 1;
        const dates = this.getAvailableDates();
        if (isNaN(dayIndex) || dayIndex < 0 || dayIndex >= dates.length) {
          return `Por favor, escolha um número entre 1 e ${dates.length} para selecionar o dia.`;
        }
        this.state.data.appointment = {
          date: dates[dayIndex],
          time: '',
          confirmed: false
        };
        this.state.step = 'choose_time';
        return `Você escolheu ${dates[dayIndex]}. Agora escolha um horário:\n\n${this.state.availableSlots.map((t, i) => `${i+1}. ${t}`).join('\n')}\n\nDigite o número do horário desejado:`;

      case 'choose_time':
        const timeIndex = parseInt(lowerMessage) - 1;
        if (isNaN(timeIndex) || timeIndex < 0 || timeIndex >= this.state.availableSlots.length) {
          return `Por favor, escolha um número entre 1 e ${this.state.availableSlots.length} para selecionar o horário.`;
        }
        if (this.state.data.appointment) {
          this.state.data.appointment.time = this.state.availableSlots[timeIndex];
          this.state.data.appointment.confirmed = true;
          this.state.step = 'appointment_confirmed';
          return this.generateAppointmentResponse();
        }
        return "Ocorreu um erro. Vamos começar novamente.";

      case 'appointment_confirmed':
        const response = this.generateResponse();
        this.reset();
        return response;
      
      default:
        return "Obrigado! Um de nossos técnicos já foi notificado e entrará em contato em breve para ajudar com seu aparelho. Caso precise de mais algo, é só chamar!";
    }
  }

  private generateAppointmentResponse(): string {
    return `📅 Agendamento confirmado!

Detalhes do serviço:
📱 Aparelho: ${this.state.data.modelo_aparelho}
🔧 Problema: ${this.state.data.defeito_relatado}
📅 Data: ${this.state.data.appointment?.date}
⏰ Horário: ${this.state.data.appointment?.time}

Número do protocolo: #${Math.floor(10000 + Math.random() * 90000)}

Você receberá um lembrete no dia anterior. Obrigado por agendar conosco!`;
  }

  private generateResponse(): string {
    if (this.state.data.appointment?.confirmed) {
      return this.generateAppointmentResponse();
    }
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
