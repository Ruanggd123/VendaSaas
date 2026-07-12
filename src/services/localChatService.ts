interface Message {
  id: string;
  text: string;
  timestamp: Date;
  responded: boolean;
  platform: 'whatsapp' | 'web';
  from: string;
  to: string;
}

class LocalChatService {
  private messages: Message[] = [];
  private processingQueue: Message[] = [];
  private timeoutDuration = 300000; // 5 minutos
  private whatsappResponseDelay = 10000; // 10 segundos

  addMessage(text: string, platform: 'whatsapp' | 'web', from: string, to: string) {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp: new Date(),
      responded: false,
      platform,
      from,
      to
    };
    this.messages.push(message);
    return message;
  }

  getUnansweredMessages() {
    return this.messages.filter(msg => !msg.responded);
  }

  markAsResponded(messageId: string) {
    const message = this.messages.find(msg => msg.id === messageId);
    if (message) {
      message.responded = true;
      this.processingQueue = this.processingQueue.filter(msg => msg.id !== messageId);
    }
  }

  async processWhatsappMessages() {
    const whatsappMessages = this.messages.filter(
      msg => msg.platform === 'whatsapp' && !msg.responded && !this.processingQueue.includes(msg)
    );

    for (const msg of whatsappMessages) {
      this.processingQueue.push(msg);
      await new Promise(resolve => setTimeout(resolve, this.whatsappResponseDelay));
      
      // Simula envio de resposta
      const response = `Obrigado por sua mensagem: "${msg.text}". Estamos te respondendo agora.`;
      this.addMessage(
        response,
        'whatsapp',
        'bot_phone_number',
        msg.from
      );
      
      this.markAsResponded(msg.id);
    }
  }

  async hybridModeHandler() {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, this.timeoutDuration);
    });
  }
}

export default new LocalChatService();
