import React, { useState, useEffect } from 'react';
import localChatService from '../services/localChatService';
import useChatMonitor from '../hooks/useChatMonitor';

const ChatManager: React.FC = () => {
  const [mode, setMode] = useState<'auto' | 'manual' | 'hybrid'>('auto');
  const [message, setMessage] = useState('');
  const { unansweredMessages, isMonitoring, startMonitoring } = useChatMonitor();

  const handleSendMessage = () => {
    if (message.trim()) {
      localChatService.addMessage(message, 'web');
      setMessage('');
    }
  };

  const handleRespondToUnanswered = async () => {
    const messages = localChatService.getUnansweredMessages();
    for (const msg of messages) {
      // Aqui você pode adicionar a lógica de resposta da IA
      console.log(`Respondendo à mensagem: ${msg.text}`);
      localChatService.markAsResponded(msg.id);
    }
  };

  useEffect(() => {
    if (mode === 'hybrid') {
      localChatService.hybridModeHandler().then(() => {
        setMode('auto');
      });
    }
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
