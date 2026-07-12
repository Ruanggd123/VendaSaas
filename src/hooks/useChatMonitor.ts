import { useEffect, useState } from 'react';
import localChatService from '../services/localChatService';

const useChatMonitor = () => {
  const [unansweredMessages, setUnansweredMessages] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const checkMessages = async () => {
      if (!isMounted) return;

      try {
        const messages = localChatService.getUnansweredMessages();
        if (isMounted) setUnansweredMessages(messages);
        
        const whatsappMessages = messages.filter(msg => 
          msg.platform === 'whatsapp' && !msg.responded
        );
        
        if (whatsappMessages.length > 0) {
          console.log('Novas mensagens do WhatsApp detectadas:', whatsappMessages);
          if (mode === 'auto') {
            await localChatService.processWhatsappMessages();
          }
          retryCount = 0;
        } else if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Nenhuma mensagem encontrada, tentativa ${retryCount}/${maxRetries}`);
        }
      } catch (error) {
        console.error('Erro ao verificar mensagens:', error);
      }
    };

    const interval = setInterval(checkMessages, 1000); // Verifica a cada 1 segundo
    
    // Verificação imediata ao montar
    checkMessages();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [mode]);

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
