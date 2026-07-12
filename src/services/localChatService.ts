interface Message {
  id: string;
  text: string;
  timestamp: Date;
  responded: boolean;
  platform: 'whatsapp' | 'web';
}

class LocalChatService {
  private messages: Message[] = [];
  private timeoutDuration = 300000; // 5 minutos

  addMessage(text: string, platform: 'whatsapp' | 'web') {
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp: new Date(),
      responded: false,
      platform
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
