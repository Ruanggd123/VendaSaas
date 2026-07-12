import { useEffect, useState } from 'react';
import localChatService from '../services/localChatService';

const useChatMonitor = () => {
  const [unansweredMessages, setUnansweredMessages] = useState([]);

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

  return {
    unansweredMessages
  };
};

export default useChatMonitor;
