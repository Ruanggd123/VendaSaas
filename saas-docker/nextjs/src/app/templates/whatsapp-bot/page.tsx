"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ChevronRight, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Send, CheckCheck, Bot, Sparkles } from "lucide-react";

type Message = { id: string; text: string; sender: 'user' | 'bot'; time: string };

const AUTOPLAY_SCRIPT = [
  { sender: 'user', text: "Olá! Gostaria de saber mais sobre os planos da internet.", delay: 1000 },
  { sender: 'bot', text: "Olá! Sou a IA da Nexus Telecom. 👋\n\nTemos planos a partir de 500 Mega por apenas R$ 99,90/mês. Gostaria de verificar a viabilidade para o seu CEP?", delay: 2000 },
  { sender: 'user', text: "62130000", delay: 2500 },
  { sender: 'bot', text: "✅ Viabilidade confirmada! Temos cobertura de *Fibra Óptica 100%* na sua rua. 🎉\n\nPodemos prosseguir com o plano de *500 Mega por R$ 99,90*? Digite *'sim'* para eu te enviar o link do nosso WhatsApp oficial!", delay: 2000 },
  { sender: 'user', text: "sim", delay: 2500 },
  { sender: 'bot', text: "Perfeito! 🚀 O seu pedido está quase pronto.\n\nClique no link abaixo para falar com nosso atendimento no WhatsApp:\n\n👉 https://wa.me/5588981885499", delay: 2000 }
];

export default function WhatsappBotDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isAIMode, setIsAIMode] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Autoplay states
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [scriptIndex, setScriptIndex] = useState(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Autoplay Logic
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (scriptIndex >= AUTOPLAY_SCRIPT.length) {
      setIsAutoPlaying(false);
      return;
    }

    const currentAction = AUTOPLAY_SCRIPT[scriptIndex];
    
    // Simulate typing indicator if the bot is about to send
    if (currentAction.sender === 'bot') {
       const typingTimer = setTimeout(() => setIsTyping(true), currentAction.delay - 1000);
       var timer = setTimeout(() => {
         setIsTyping(false);
         const now = new Date();
         const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
         setMessages(prev => [...prev, { id: Date.now().toString(), text: currentAction.text, sender: currentAction.sender as 'user'|'bot', time: timeStr }]);
         setScriptIndex(prev => prev + 1);
       }, currentAction.delay);
       
       return () => { clearTimeout(timer); clearTimeout(typingTimer); };
    } else {
       // Simulate user thinking then typing
       var timer = setTimeout(() => {
         const now = new Date();
         const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
         setMessages(prev => [...prev, { id: Date.now().toString(), text: currentAction.text, sender: currentAction.sender as 'user'|'bot', time: timeStr }]);
         setScriptIndex(prev => prev + 1);
       }, currentAction.delay);
       
       return () => clearTimeout(timer);
    }
  }, [scriptIndex, isAutoPlaying]);

  // If user interacts, stop autoplay forever
  const handleUserInteraction = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setIsTyping(false); // Clear typing if bot was fake typing
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;
    handleUserInteraction();

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
        const lower = userMsg.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        if (lower.includes("valor") || lower.includes("preco") || lower.includes("plano") || lower.includes("planos")) {
          botReply = "Temos o Plano Básico (R$ 97/mês) e o Plano Premium (R$ 197/mês).\n\nDigite 1 para Básico.\nDigite 2 para Premium.";
        } else if (lower === "1") {
          botReply = "Ótimo! Você escolheu o Plano Básico. 🚀\n\nPara finalizar sua ativação com total segurança, clique no link abaixo para falar com nosso atendimento no WhatsApp:\n\n👉 https://wa.me/5588981885499";
        } else if (lower === "2") {
          botReply = "Ótimo! Você escolheu o Plano Premium. 🚀\n\nPara finalizar sua ativação com total segurança, clique no link abaixo para falar com nosso atendimento no WhatsApp:\n\n👉 https://wa.me/5588981885499";
        } else {
          botReply = "Desculpe, não entendi. Digite 'planos' para ver nossas opções e preços.";
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden relative selection:bg-emerald-500/30">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-400/20 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-400/20 blur-[120px] rounded-full -z-10" />

      <div className="max-w-5xl w-full grid lg:grid-cols-[1fr,380px] gap-8 items-center">
        
        {/* Left Side: Copy & Features */}
        <div className="hidden lg:flex flex-col justify-center animate-fade-in-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-6 w-fit">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Simulador Interativo
          </div>
          <h1 className="text-4xl xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
            O robô de vendas que <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">nunca dorme</span>.
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-md">
            Veja na prática como a nossa Inteligência Artificial atende, qualifica e vende para seus clientes automaticamente pelo WhatsApp.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-emerald-600" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">100% Autônomo</h4>
                 <p className="text-sm text-slate-500">Ele lê, interpreta e responde qualquer dúvida como se fosse um humano.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-teal-600" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">Focado em Conversão</h4>
                 <p className="text-sm text-slate-500">O robô é treinado com técnicas de persuasão para não deixar o cliente escapar.</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Side: The Phone Interface */}
        <div className="relative animate-fade-in-up flex flex-col items-center">
          
          {/* Controls / Demo Panel */}
          <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-xl border border-slate-200 p-4 mb-6 z-10 relative">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Painel de Demonstração</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => { setIsAIMode(false); setMessages([]); setIsAutoPlaying(false); }}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border ${!isAIMode ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                Bot Simples (Fluxo)
              </button>
              <button 
                onClick={() => { setIsAIMode(true); setMessages([]); setIsAutoPlaying(false); }}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${isAIMode ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                <Sparkles className="w-3 h-3" /> I.A (Premium)
              </button>
            </div>
          </div>

          <div className="w-full max-w-[380px] h-[700px] sm:h-[700px] bg-zinc-100 rounded-[3rem] p-3 shadow-2xl relative border-8 border-slate-800 shrink-0 mx-auto">
            {/* Phone Notch/Dynamic Island */}
            <div className="absolute top-0 inset-x-0 flex justify-center z-50">
              <div className="w-32 h-6 bg-slate-800 rounded-b-2xl"></div>
            </div>

            <div className="w-full h-full bg-[#EFEAE2] rounded-[2.2rem] overflow-hidden flex flex-col relative shadow-inner">
              {/* WhatsApp Header */}
              <div className="bg-[#008069] text-white px-4 py-3 pt-10 flex items-center justify-between shadow-md shrink-0 z-10">
                <div className="flex items-center gap-3">
                  <button className="hover:bg-white/10 p-1 rounded-full transition-colors -ml-2">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <div className="relative">
                    <img src="https://i.pravatar.cc/150?img=32" alt="Avatar" className="w-10 h-10 rounded-full border border-white/20" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#008069] rounded-full"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[15px] leading-tight">Nexus Assistente</span>
                    {isTyping ? (
                      <span className="text-xs text-white/80 font-medium">digitando...</span>
                    ) : (
                      <span className="text-xs text-white/80">online</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Video className="w-5 h-5 cursor-pointer hover:text-white/80" />
                  <Phone className="w-5 h-5 cursor-pointer hover:text-white/80" />
                  <MoreVertical className="w-5 h-5 cursor-pointer hover:text-white/80" />
                </div>
              </div>

              {/* Chat Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 pb-32"
                style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: 'contain', backgroundRepeat: 'repeat' }}
              >
                <div className="text-center mb-6">
                  <span className="bg-[#E1F3FB] text-slate-500 text-[11px] font-medium px-3 py-1 rounded-lg uppercase shadow-sm">Hoje</span>
                </div>

                <div className="bg-[#FFEECD] text-slate-600 text-xs text-center p-2 rounded-lg mb-4 shadow-sm font-medium">
                  🔒 Mensagens protegidas com a tecnologia Nexus.
                </div>

                {isAutoPlaying && messages.length === 0 && (
                  <div className="text-center mt-10 animate-pulse text-slate-500 text-xs bg-white/80 mx-auto w-fit px-3 py-1 rounded-full shadow-sm">
                    Iniciando demonstração automática...
                  </div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in-up`}>
                    <div 
                      className={`relative max-w-[85%] rounded-2xl p-2 px-3 shadow-sm ${msg.sender === 'user' ? 'bg-[#D9FDD3] rounded-tr-sm' : 'bg-white rounded-tl-sm'}`}
                    >
                      <p className="text-[#111B21] text-[14.5px] whitespace-pre-wrap leading-snug break-words pr-2">
                        {msg.text.split(/(✅|🎉|🚀|🔹|🏆|👋|💡|💰)/).map((part, i) => (
                          <span key={i}>{part}</span>
                        ))}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                        {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex flex-col items-start animate-fade-in-up">
                    <div className="bg-white rounded-2xl rounded-tl-sm p-3 px-4 shadow-sm flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="absolute bottom-0 inset-x-0 bg-transparent p-2 z-20 pb-6">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <div className="flex-1 bg-white rounded-2xl flex items-center shadow-md overflow-hidden relative">
                    <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                      <Smile className="w-6 h-6" />
                    </button>
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={handleUserInteraction}
                      placeholder={isAutoPlaying ? "Clique aqui para interagir..." : "Mensagem"}
                      className="flex-1 bg-transparent py-3.5 px-2 outline-none text-[15px] text-zinc-900 font-medium placeholder-slate-400"
                    />
                    <button type="button" className="p-3 text-slate-400 hover:text-slate-600 transition-colors">
                      <Paperclip className="w-5 h-5 -rotate-45" />
                    </button>
                  </div>
                  {inputText.trim() ? (
                    <button type="submit" className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center shadow-md text-white shrink-0 hover:bg-[#008F6F] transition-colors">
                      <Send className="w-5 h-5 ml-1" />
                    </button>
                  ) : (
                    <button type="button" className="w-12 h-12 bg-[#00A884] rounded-full flex items-center justify-center shadow-md text-white shrink-0 hover:bg-[#008F6F] transition-colors">
                      <Mic className="w-5 h-5" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Return Button */}
      <Link href="/" className="fixed bottom-6 left-6 z-50 px-4 py-2 bg-white text-slate-900 rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 border border-slate-200">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
      </Link>
    </div>
  );
}
