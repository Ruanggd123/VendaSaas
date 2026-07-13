'use client';
import { WhatsAppBot } from '@/lib/ai/rulesBot';
import { useState, useEffect, useRef } from 'react';

export default function WhatsAppIntegration() {
  const [messages, setMessages] = useState<Array<{text: string, sender: 'user' | 'bot'}>>([]);
  const [inputValue, setInputValue] = useState('');
  const botRef = useRef(new WhatsAppBot());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    setMessages(prev => [...prev, {text: inputValue, sender: 'user'}]);
    
    // Get bot response
    const botResponse = botRef.current.handleMessage(inputValue);
    
    // Add bot response after a small delay
    setTimeout(() => {
      setMessages(prev => [...prev, {text: botResponse, sender: 'bot'}]);
    }, 500);
    
    setInputValue('');
  };

  useEffect(() => {
    // Initial bot message
    setTimeout(() => {
      setMessages([{
        text: "Olá! 👋 Sou o assistente virtual da assistência técnica.\nPosso te ajudar com problemas no seu aparelho celular?",
        sender: 'bot'
      }]);
    }, 1000);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                msg.sender === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Digite sua mensagem..."
        />
        <button
          onClick={handleSendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 transition"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
