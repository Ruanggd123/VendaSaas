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
        if (isMounted) {
          setUnansweredMessages(messages);
          // Força o processamento imediato quando novas mensagens chegarem
          if (messages.length > 0) {
            await localChatService.processWhatsappMessages();
          }
        }
        retryCount = 0;
      } catch (error) {
        console.error('Erro ao verificar mensagens:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkMessages, 1000);
        }
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
