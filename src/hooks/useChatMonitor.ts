import { useEffect, useState } from 'react';
import localChatService from '../services/localChatService';

const useChatMonitor = () => {
  const [unansweredMessages, setUnansweredMessages] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const updateMessages = () => {
      if (!isMounted) return;
      const messages = localChatService.getUnansweredMessages();
      setUnansweredMessages(messages);
    };

    // Atualiza imediatamente quando novas mensagens chegarem
    const unsubscribe = localChatService.subscribe(updateMessages);

    // Verificação inicial
    updateMessages();

    // Verificação periódica para garantir consistência
    const interval = setInterval(updateMessages, 1000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
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
