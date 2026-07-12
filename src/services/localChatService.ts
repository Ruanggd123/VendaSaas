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
  private subscribers: ((msg: Message) => void)[] = [];
  private processingQueue: Message[] = [];
  private timeoutDuration = 300000; // 5 minutos
  private whatsappResponseDelay = 2000; // Reduzido para 2 segundos

  addMessage(text: string, platform: 'whatsapp' | 'web', from: string, to: string) {
    try {
      // Verifica se a mensagem já existe para evitar duplicação
      const existingMessage = this.messages.find(msg => 
        msg.platform === platform && 
        msg.from === from && 
        msg.text === text &&
        Math.abs(new Date().getTime() - msg.timestamp.getTime()) < 1000 // Dentro de 1 segundo
      );
      
      if (existingMessage) {
        console.log('Mensagem duplicada ignorada:', existingMessage);
        return existingMessage;
      }

      const message: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text,
        timestamp: new Date(),
        responded: false,
        platform,
        from,
        to
      };
      
      this.messages = [...this.messages, message];
      console.log('Mensagem adicionada:', message);
      this.notifySubscribers(message);
      
      // Processa imediatamente se for WhatsApp
      if (platform === 'whatsapp') {
        this.processWhatsappMessages();
      }
      
      return message;
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error);
      throw error;
    }
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
    try {
      // Verifica se há mensagens pendentes
      const whatsappMessages = this.messages
        .filter(msg => 
          msg.platform === 'whatsapp' && 
          !msg.responded &&
          !this.processingQueue.includes(msg)
        )
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Ordena por tempo
        .slice(0, 5); // Processa até 5 mensagens por vez

      if (whatsappMessages.length === 0) {
        console.log('[WhatsApp] Nenhuma mensagem pendente para processar');
        return;
      }
      
      for (const msg of whatsappMessages) {
        try {
          console.log(`[WhatsApp] Processando mensagem ${msg.id} de ${msg.from}`);
          this.processingQueue.push(msg);
          
          await new Promise(resolve => setTimeout(resolve, this.whatsappResponseDelay));
          
          const response = `Obrigado por sua mensagem: "${msg.text}". Estamos te respondendo agora.`;
          console.log(`[WhatsApp] Enviando resposta para ${msg.from}: ${response}`);
          
          this.addMessage(
            response,
            'whatsapp',
            'bot_phone_number',
            msg.from
          );
          
          this.markAsResponded(msg.id);
          console.log(`[WhatsApp] Mensagem ${msg.id} marcada como respondida`);
        } catch (error) {
          console.error(`[WhatsApp] Erro ao processar mensagem ${msg.id}:`, error);
          this.processingQueue = this.processingQueue.filter(m => m.id !== msg.id);
        }
      }
    } catch (error) {
      console.error('[WhatsApp] Erro no processamento de mensagens:', error);
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

  // Métodos para inscrição de listeners
  subscribe(callback: (msg: Message) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(message: Message) {
    this.subscribers.forEach(callback => callback(message));
  }
}

export default new LocalChatService();
