"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  RotateCcw,
  Smartphone,
  CheckCheck,
  Bot,
  User,
  ShoppingBag,
  Clock,
  Calendar,
  Headphones,
  Sparkles,
  ChevronLeft,
  MoreVertical,
  Phone,
  Video,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  buttons?: { label: string; value: string }[];
  products?: any[];
}

interface SmartphoneSimulatorProps {
  settings: any;
  onClose?: () => void;
}

export function SmartphoneSimulator({ settings, onClose }: SmartphoneSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const generateBotInitialMenu = (): Message => {
    const welcome = settings?.welcome_message || "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
    const nodes = settings?.custom_rules_nodes || [];

    let menuText = welcome;

    if (nodes.length > 0) {
      menuText += "\n\nEscolha uma das opções abaixo:\n";
      nodes.forEach((node: any) => {
        const icon = node.keyword === "1" ? "🛍️" : node.keyword === "2" ? "🕒" : node.keyword === "3" ? "📅" : "👤";
        menuText += `\n*${node.keyword}* - ${icon} ${node.title}`;
      });
    } else {
      menuText += "\n\n*1* - 🛍️ Catálogo de Produtos & Serviços\n*2* - 🕒 Horários de Atendimento\n*3* - 📅 Agendar Horário\n*4* - 👤 Falar com Atendente Humano";
    }

    const defaultButtons = [
      { label: "1 - Catálogo", value: "1" },
      { label: "2 - Horários", value: "2" },
      { label: "3 - Agendar", value: "3" },
      { label: "4 - Humano", value: "4" },
    ];

    return {
      id: "init_" + Date.now(),
      sender: "bot",
      text: menuText,
      timestamp: getFormattedTime(),
      buttons: defaultButtons,
    };
  };

  useEffect(() => {
    setMessages([generateBotInitialMenu()]);
  }, [settings?.welcome_message, JSON.stringify(settings?.custom_rules_nodes)]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleReset = () => {
    setMessages([generateBotInitialMenu()]);
    setInput("");
  };

  const processUserInput = (userText: string) => {
    const clean = userText.trim().toLowerCase();
    const currentTime = getFormattedTime();

    // Adiciona mensagem do usuário
    const userMsg: Message = {
      id: "user_" + Date.now(),
      sender: "user",
      text: userText,
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      let botResponseText = "";
      let botButtons: { label: string; value: string }[] | undefined = undefined;
      let botProducts: any[] | undefined = undefined;

      const nodes = settings?.custom_rules_nodes || [];
      const matchedNode = nodes.find((n: any) => n.keyword?.trim() === clean || n.title?.toLowerCase().includes(clean));

      if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
        const initial = generateBotInitialMenu();
        botResponseText = initial.text;
        botButtons = initial.buttons;
      } else if (matchedNode) {
        if (matchedNode.actionType === "catalog") {
          const prods = settings?.products || [];
          botResponseText = "🛍️ *Nosso Catálogo de Produtos & Serviços*\n\nConfira os itens disponíveis abaixo. Digite o número ou nome do produto para saber mais!";
          botProducts = prods.length > 0 ? prods : [
            { name: "Plano Solo (1 WhatsApp)", price: "147.00", description: "Automação para 1 número" },
            { name: "Plano Pro (3 WhatsApp)", price: "297.00", description: "Automação para 3 números" },
            { name: "Plano Enterprise", price: "497.00", description: "Conexões ilimitadas + Suporte VIP" }
          ];
        } else if (matchedNode.actionType === "scheduling") {
          botResponseText = "📅 *Agendamento de Atendimento*\n\nPor favor, escolha uma das datas disponíveis abaixo:\n\n1️⃣ Sexta-feira (24/07)\n2️⃣ Segunda-feira (27/07)\n3️⃣ Terça-feira (28/07)\n4️⃣ Quarta-feira (29/07)\n\nDigite o número ou a data desejada:";
          botButtons = [
            { label: "1 - Sex 24/07", value: "24/07" },
            { label: "2 - Seg 27/07", value: "27/07" },
            { label: "3 - Ter 28/07", value: "28/07" },
          ];
        } else if (matchedNode.actionType === "human") {
          botResponseText = "👤 *Transferindo para Atendente Humano*\n\nAguarde um instante! Um dos nossos consultores irá assumir a conversa para te atender pessoalmente. ⏳";
        } else {
          botResponseText = matchedNode.textContent || `Você selecionou a opção *${matchedNode.title}*. Como podemos te ajudar?`;
        }
      } else if (clean === "24/07" || clean === "27/07" || clean === "28/07" || clean === "1" && messages[messages.length - 1]?.text.includes("Agendamento")) {
        botResponseText = "🕒 *Horários Disponíveis para Agendamento*\n\nSelecione um dos horários livres:\n\n• 09:00\n• 10:30\n• 14:00\n• 16:30\n\nDigite o horário desejado (ex: 09:00):";
        botButtons = [
          { label: "09:00", value: "09:00" },
          { label: "10:30", value: "10:30" },
          { label: "14:00", value: "14:00" },
        ];
      } else if (clean === "09:00" || clean === "10:30" || clean === "14:00" || clean === "16:30") {
        botResponseText = `✅ *Agendamento Confirmado!*\n\nSeu atendimento foi reservado com sucesso para às *${clean}*.\n\nEnviamos a confirmação para nossa equipe. Obrigado!`;
      } else if (clean === "1" || clean.includes("catalogo") || clean.includes("produto")) {
        const prods = settings?.products || [];
        botResponseText = "🛍️ *Nosso Catálogo de Produtos & Serviços*\n\nConfira os itens disponíveis abaixo:";
        botProducts = prods.length > 0 ? prods : [
          { name: "Plano Solo (1 WhatsApp)", price: "147.00", description: "Automação conversacional" },
          { name: "Plano Pro (3 WhatsApp)", price: "297.00", description: "Automação para 3 números" },
          { name: "Plano Enterprise", price: "497.00", description: "Instâncias ilimitadas" }
        ];
      } else if (clean === "2" || clean.includes("horario") || clean.includes("funcionamento")) {
        botResponseText = "🕒 *Horários de Atendimento*\n\nNosso expediente é de *Segunda a Sexta-feira*, das *08:00 às 18:00*.\n\nFora desse horário, suas mensagens são registradas e respondidas na abertura!";
      } else if (clean === "3" || clean.includes("agendar") || clean.includes("marcar")) {
        botResponseText = "📅 *Agendamento de Horário*\n\nEscolha um dos horários abaixo para confirmar sua reserva:";
        botButtons = [
          { label: "09:00", value: "09:00" },
          { label: "14:00", value: "14:00" },
          { label: "16:00", value: "16:00" },
        ];
      } else if (clean === "4" || clean.includes("humano") || clean.includes("atendente")) {
        botResponseText = "👤 *Atendimento Humano*\n\nNotificação enviada à nossa equipe. Em breves instantes você será atendido(a) por um especialista!";
      } else {
        botResponseText = `Entendi sua mensagem: _"${userText}"_.\n\nPara navegar, escolha uma das opções abaixo:\n\n*1* - 🛍️ Catálogo\n*2* - 🕒 Horários\n*3* - 📅 Agendar\n*4* - 👤 Falar com Humano\n\nOu digite *0* a qualquer momento para voltar ao menu.`;
        botButtons = [
          { label: "1 - Catálogo", value: "1" },
          { label: "2 - Horários", value: "2" },
          { label: "3 - Agendar", value: "3" },
          { label: "4 - Humano", value: "4" },
        ];
      }

      const botMsg: Message = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: botResponseText,
        timestamp: getFormattedTime(),
        buttons: botButtons,
        products: botProducts,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    processUserInput(input);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto select-none">
      {/* FRAME DO SMARTPHONE */}
      <div className="relative w-full h-[650px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
        {/* DYNAMIC ISLAND / NOTCH */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-30 flex items-center justify-center gap-2 border border-slate-800">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950"></div>
          <div className="w-2 h-2 rounded-full bg-indigo-950"></div>
        </div>

        {/* ESTRUTURA DA TELA INTERNA */}
        <div className="relative flex-1 bg-[#efeae2] dark:bg-slate-950 rounded-[38px] overflow-hidden flex flex-col z-20">
          {/* BARRA DE STATUS DO CELULAR */}
          <div className="h-7 bg-[#075e54] dark:bg-slate-900 text-white text-[11px] px-6 pt-1 flex items-center justify-between font-mono font-medium z-30">
            <span>{getFormattedTime()}</span>
            <div className="flex items-center gap-1.5 opacity-90 text-[10px]">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* CABEÇALHO DO WHATSAPP */}
          <div className="bg-[#075e54] dark:bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between shadow-md z-30">
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-5 h-5 text-white/90 cursor-pointer" />
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-white/20 flex items-center justify-center text-white font-bold text-xs">
                  <Bot className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#075e54] rounded-full"></div>
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight text-white truncate max-w-[140px]">
                  {settings?.ai_name || "Atendente Nexus"}
                </h3>
                <p className="text-[10px] text-emerald-200 font-medium leading-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-white/90">
              <button onClick={handleReset} title="Resetar Simulador" className="p-1 hover:bg-white/10 rounded-full transition-all">
                <RotateCcw className="w-4 h-4 text-emerald-200" />
              </button>
              <MoreVertical className="w-4 h-4" />
            </div>
          </div>

          {/* CORPO DE MENSAGENS (BACKGROUND WHATSAPP PATTERN) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]">
            {/* BADGE DE SEGURANÇA */}
            <div className="text-center my-1">
              <span className="inline-block bg-[#ffeebd] dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 text-[10px] px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-500/20 font-medium">
                🔒 Simulador ao Vivo: As mensagens seguem o seu fluxo em tempo real.
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} space-y-1`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-sm font-sans ${
                    msg.sender === "user"
                      ? "bg-[#dcf8c6] dark:bg-emerald-600 dark:text-white text-slate-900 rounded-tr-none"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/80 dark:border-white/10"
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed font-medium">{msg.text}</p>

                  {/* PRODUTOS DO CATÁLOGO NO CHAT */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-2.5 space-y-2 border-t border-slate-100 dark:border-white/10 pt-2">
                      {msg.products.slice(0, 3).map((prod: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-extrabold text-[11px] text-slate-900 dark:text-white">{prod.name}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{prod.description}</p>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg whitespace-nowrap">
                            R$ {prod.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BOTÕES / PILS DE OPÇÃO */}
                  {msg.buttons && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-white/10 pt-2">
                      {msg.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => processUserInput(btn.value)}
                          className="bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[10px] font-extrabold px-2.5 py-1 rounded-xl transition-all active:scale-95"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                    <span>{msg.timestamp}</span>
                    {msg.sender === "user" && <CheckCheck className="w-3 h-3 text-sky-500" />}
                  </div>
                </div>
              </div>
            ))}

            {/* DIGITANDO INDICATOR */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-2xl rounded-tl-none w-20 shadow-sm border border-slate-200/80 dark:border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* BARRA DE ENVIO DE MENSAGEM */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 z-30">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite uma opção ou mensagem..."
              className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-sm flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
