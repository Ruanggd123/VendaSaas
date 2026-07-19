"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ChevronRight, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Send, CheckCheck, Bot, Sparkles } from "lucide-react";

type Message = { id: string; text: string; sender: 'user' | 'bot'; time: string };

export default function WhatsappBotDemo() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "Olá! Gostaria de saber mais sobre os planos da internet.", sender: 'user', time: '10:30' },
    { id: "2", text: "Olá! Sou a IA da Nexus Telecom. 👋\n\nTemos planos a partir de 500 Mega por apenas R$ 99,90/mês. Gostaria de verificar a viabilidade para o seu CEP?", sender: 'bot', time: '10:30' }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAIMode, setIsAIMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    setInputText("");

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, sender: 'user', time: timeStr }]);
    setIsTyping(true);

    try {
      let botReply = "";

      if (isAIMode) {
        // Fetch AI response
        const res = await fetch("/api/demo-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMsg })
        });
        const data = await res.json();
        botReply = data.reply || "Desculpe, não consegui entender.";
      } else {
        // Simple Bot Mode (Simulated flow)
        await new Promise(resolve => setTimeout(resolve, 1500)); // fake delay
        const lower = userMsg.toLowerCase();
        if (lower.includes("valor") || lower.includes("preço") || lower.includes("plano")) {
          botReply = "Temos o Plano Básico (R$ 97/mês) e o Plano Premium (R$ 197/mês).\n\nDigite 1 para Básico.\nDigite 2 para Premium.";
        } else if (lower === "1" || lower === "2") {
          botReply = "Ótimo! Um atendente humano irá prosseguir com seu pedido em instantes. Nosso horário de atendimento é de seg a sex das 08h às 18h.";
        } else {
          botReply = "Desculpe, sou um robô de fluxo simples e não entendi sua mensagem. Digite 'planos' para ver nossas opções ou 'falar com atendente' para aguardar na fila.";
        }
      }

      const replyTime = new Date();
      const replyTimeStr = `${String(replyTime.getHours()).padStart(2, '0')}:${String(replyTime.getMinutes()).padStart(2, '0')}`;

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: botReply, sender: 'bot', time: replyTimeStr }]);
    } catch (error) {
      const replyTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: "Tive um erro de conexão temporário. Pode tentar novamente?", sender: 'bot', time: replyTimeStr }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ece5dd] font-sans flex flex-col md:flex-row items-center justify-center p-4 gap-8">
      
      {/* Configuration Panel (For Demo Presenter) */}
      <div className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full md:w-80">
        <h3 className="font-bold text-lg text-slate-900 mb-2">Painel de Demonstração</h3>
        <p className="text-sm text-slate-500 mb-6">Mostre para o seu cliente a diferença de um bot comum engessado e a nossa Inteligência Artificial.</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => {
              setIsAIMode(false);
              setMessages([{ id: "0", text: "Bem-vindo. Digite 'planos' para ver os preços.", sender: 'bot', time: 'Agora' }]);
            }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${!isAIMode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
          >
            <Bot className="w-6 h-6" />
            <div className="text-left">
              <div className="font-bold text-sm">Bot Simples (Fluxo)</div>
              <div className="text-xs opacity-80">Limitado, menu numérico.</div>
            </div>
          </button>

          <button 
            onClick={() => {
              setIsAIMode(true);
              setMessages([
                { id: "1", text: "Olá! Gostaria de saber mais sobre os planos.", sender: 'user', time: '10:30' },
                { id: "2", text: "Olá! Sou a IA da Nexus Telecom. 👋\nTemos planos a partir de 500 Mega por apenas R$ 99,90/mês. Gostaria de verificar a viabilidade para o seu CEP?", sender: 'bot', time: '10:30' }
              ]);
            }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${isAIMode ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md shadow-purple-500/20' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
          >
            <Sparkles className="w-6 h-6" />
            <div className="text-left">
              <div className="font-bold text-sm">Inteligência Artificial</div>
              <div className="text-xs opacity-80">Vende, entende contexto.</div>
            </div>
          </button>
        </div>
      </div>

      {/* Phone Mockup Frame */}
      <div className="w-full max-w-[400px] h-[800px] bg-black rounded-[3rem] p-3 shadow-2xl relative overflow-hidden ring-1 ring-zinc-800">
        <div className="absolute top-0 inset-x-0 h-7 bg-black z-50 rounded-t-[3rem]">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full"></div>
        </div>

        {/* Screen */}
        <div className="w-full h-full bg-[#efeae2] rounded-[2.5rem] overflow-hidden flex flex-col relative">
          
          {/* WhatsApp Header */}
          <div className="bg-[#008069] text-white pt-10 pb-3 px-4 flex items-center gap-3 z-10 shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden shrink-0">
              <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${isAIMode ? 'nexus' : 'robot'}`} alt="Bot" className="w-full h-full p-1 bg-teal-50" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[17px] truncate leading-tight">
                {isAIMode ? "Assistente IA (Premium)" : "Atendimento Padrão"}
              </h2>
              <p className="text-xs text-white/80">
                {isTyping ? "digitando..." : "online"}
              </p>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <Video className="w-5 h-5 fill-current" />
              <Phone className="w-5 h-5 fill-current" />
              <MoreVertical className="w-5 h-5" />
            </div>
          </div>

          {/* Chat Background & Messages */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 relative z-0"
            style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundRepeat: 'repeat' }}
          >
            <div className="flex justify-center mb-6">
              <span className="bg-white/80 text-zinc-500 text-xs px-3 py-1 rounded-lg uppercase tracking-wide font-medium shadow-sm">
                Hoje
              </span>
            </div>
            
            {/* Encryption notice */}
            <div className="flex justify-center mb-4">
              <span className="bg-[#ffeecd] text-zinc-600 text-xs px-4 py-2 rounded-xl text-center shadow-sm max-w-[90%] leading-relaxed">
                <span className="block mb-1">🔒</span>
                Demonstração ativada: {isAIMode ? "Você está falando com a IA poderosa." : "Você está falando com um bot simples de fluxo."}
              </span>
            </div>

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-[15px] shadow-sm leading-snug whitespace-pre-wrap ${
                  m.sender === 'user' ? 'bg-[#d9fdd3] text-zinc-900 rounded-tr-sm' : 'bg-white text-zinc-900 rounded-tl-sm'
                }`}>
                  {m.text}
                  <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                    <span className="text-[10px] text-zinc-500 opacity-80">{m.time}</span>
                    {m.sender === 'user' && <CheckCheck className="w-4 h-4 text-blue-500" />}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="bg-[#f0f2f5] p-2 flex items-end gap-2 shrink-0 relative z-10">
            <div className="flex-1 bg-white rounded-3xl min-h-[44px] flex items-center px-3 gap-3 shadow-sm">
              <Smile className="w-6 h-6 text-zinc-500 shrink-0" />
              <input 
                type="text" 
                placeholder="Escreva uma mensagem" 
                className="flex-1 bg-transparent py-3 outline-none text-[15px] text-zinc-900 placeholder-zinc-500"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <Paperclip className="w-6 h-6 text-zinc-500 shrink-0" />
            </div>
            <button 
              type={inputText.trim() ? "submit" : "button"}
              className="w-11 h-11 bg-[#00a884] rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
            >
              {inputText.trim() ? (
                <Send className="w-5 h-5 text-white ml-1" />
              ) : (
                <Mic className="w-6 h-6 text-white fill-current" />
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Return Button */}
      <Link href="/" className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
      </Link>
    </div>
  );
}
