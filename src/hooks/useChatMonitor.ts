import { useEffect, useState } from 'react';
import localChatService from '../services/localChatService';

const useChatMonitor = () => {
  const [unansweredMessages, setUnansweredMessages] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    const checkMessages = () => {
      const messages = localChatService.getUnansweredMessages();
      setUnansweredMessages(messages);
      
      // Verifica se há novas mensagens do WhatsApp
      const whatsappMessages = messages.filter(msg => 
        msg.platform === 'whatsapp' && !msg.responded
      );
      
      if (whatsappMessages.length > 0) {
        console.log('Novas mensagens do WhatsApp detectadas:', whatsappMessages);
        if (mode === 'auto') {
          localChatService.processWhatsappMessages();
        }
      }
    };

    const interval = setInterval(checkMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const startMonitoring = () => {
    setIsMonitoring(true);
    // Lógica adicional de monitoramento pode ser adicionada aqui
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  return {
    unansweredMessages,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
};

export default useChatMonitor;
