import React, { useState, useEffect } from 'react';
import localChatService from '../services/localChatService';
import useChatMonitor from '../hooks/useChatMonitor';

const ChatManager: React.FC = () => {
  const [mode, setMode] = useState<'auto' | 'manual' | 'hybrid'>('auto');
  const [message, setMessage] = useState('');
  const { unansweredMessages, isMonitoring, startMonitoring } = useChatMonitor();

  const handleSendMessage = (platform: 'whatsapp' | 'web' = 'web') => {
    if (message.trim()) {
      localChatService.addMessage(
        message, 
        platform,
        platform === 'whatsapp' ? 'user_phone_number' : 'web_user',
        platform === 'whatsapp' ? 'bot_phone_number' : 'web_bot'
      );
      setMessage('');
      
      if (platform === 'whatsapp' && mode === 'auto') {
        handleRespondToUnanswered();
      }
    }
  };

  const handleRespondToUnanswered = async () => {
    const messages = localChatService.getUnansweredMessages();
    for (const msg of messages) {
      if (msg.platform === 'whatsapp') {
        // Aqui você pode adicionar a lógica de resposta da IA
        const response = `Resposta automática para: ${msg.text}`;
        
        // Simulando envio de resposta pelo WhatsApp
        console.log(`Enviando para WhatsApp: ${response}`);
        localChatService.addMessage(
          response,
          'whatsapp',
          'bot_phone_number',
          msg.from
        );
      }
      localChatService.markAsResponded(msg.id);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'auto' || mode === 'hybrid') {
        localChatService.processWhatsappMessages();
      }
      
      if (mode === 'hybrid') {
        localChatService.hybridModeHandler().then(() => {
          setMode('auto');
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [mode]);

  return (
    <div className="chat-manager">
      <div className="mode-selector">
        <button onClick={() => setMode('auto')}>Automático</button>
        <button onClick={() => setMode('manual')}>Manual</button>
        <button onClick={() => setMode('hybrid')}>Híbrido</button>
      </div>
      
      <div className="chat-window">
        {unansweredMessages.map(msg => (
          <div key={msg.id} className="message">
            <p>{msg.text}</p>
            <button onClick={() => localChatService.markAsResponded(msg.id)}>
              Marcar como respondida
            </button>
          </div>
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button onClick={handleSendMessage}>Enviar</button>
      </div>

      <button onClick={handleRespondToUnanswered}>
        Responder mensagens não respondidas
      </button>

      <div className="monitoring-status">
        {isMonitoring ? 'Monitorando...' : 'Monitoramento pausado'}
        <button onClick={startMonitoring}>Iniciar monitoramento</button>
      </div>
    </div>
  );
};

export default ChatManager;
