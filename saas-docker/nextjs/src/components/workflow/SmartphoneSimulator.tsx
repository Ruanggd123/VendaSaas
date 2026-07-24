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
  Edit3,
  Check,
  X,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  nodeId?: string | null;
  isWelcome?: boolean;
  buttons?: { label: string; value: string }[];
  products?: any[];
}

interface SmartphoneSimulatorProps {
  settings: any;
  onActiveNodeChange?: (nodeId: string | null) => void;
  onUpdateText?: (nodeId: string | null, newText: string, isWelcome?: boolean) => void;
}

export function SmartphoneSimulator({ settings, onActiveNodeChange, onUpdateText }: SmartphoneSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const generateBotInitialMenu = (): Message => {
    const welcome = settings?.welcome_message || "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
    const allNodes = settings?.custom_rules_nodes || [];
    // FILTRA APENAS NÓS PAI (sem parentId) PARA NÃO VAZAR SUB-NÓS NO MENU INICIAL
    const rootNodes = allNodes.filter((n: any) => !n.parentId);

    let menuText = welcome;

    if (rootNodes.length > 0) {
      menuText += "\n\nEscolha uma das opções abaixo:\n";
      rootNodes.forEach((node: any) => {
        const icon = node.keyword === "1" ? "🛍️" : node.keyword === "2" ? "🕒" : node.keyword === "3" ? "📅" : "👤";
        menuText += `\n*${node.keyword}* - ${icon} ${node.title}`;
      });
    } else {
      menuText += "\n\n*1* - 🛍️ Catálogo de Produtos & Serviços\n*2* - 🕒 Horários de Atendimento\n*3* - 📅 Agendar Horário\n*4* - 👤 Falar com Atendente Humano";
    }

    const defaultButtons = rootNodes.length > 0
      ? rootNodes.slice(0, 4).map((n: any) => ({ label: `${n.keyword} - ${n.title}`, value: n.keyword }))
      : [
          { label: "1 - Catálogo", value: "1" },
          { label: "2 - Horários", value: "2" },
          { label: "3 - Agendar", value: "3" },
          { label: "4 - Humano", value: "4" },
        ];

    return {
      id: "init_menu",
      sender: "bot",
      text: menuText,
      timestamp: getFormattedTime(),
      isWelcome: true,
      buttons: defaultButtons,
    };
  };

  // Inicializa a mensagem inicial APENAS na primeira montagem (sem reinstanciar ao digitar)
  useEffect(() => {
    setMessages([generateBotInitialMenu()]);
    setCurrentParentId(null);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleReset = () => {
    setMessages([generateBotInitialMenu()]);
    setInput("");
    setCurrentParentId(null);
    if (onActiveNodeChange) onActiveNodeChange(null);
  };

  const startEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const saveEditMessage = (msg: Message) => {
    if (!editingText.trim()) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, text: editingText } : m))
    );

    if (onUpdateText) {
      onUpdateText(msg.nodeId || null, editingText, msg.isWelcome);
    }

    setEditingMessageId(null);
  };

  const processUserInput = (userText: string) => {
    const clean = userText.trim().toLowerCase();
    const currentTime = getFormattedTime();

    // Mensagem do Usuário
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

      const allNodes = settings?.custom_rules_nodes || [];

      // Procura nó no nível atual
      const currentLevelNodes = currentParentId
        ? allNodes.filter((n: any) => n.parentId === currentParentId)
        : allNodes.filter((n: any) => !n.parentId);

      let matchedNode = currentLevelNodes.find(
        (n: any) => n.keyword?.trim().toLowerCase() === clean || n.title?.toLowerCase().includes(clean)
      );

      if (!matchedNode) {
        matchedNode = allNodes.find(
          (n: any) => n.keyword?.trim().toLowerCase() === clean || n.title?.toLowerCase().includes(clean)
        );
      }

      if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
        setCurrentParentId(null);
        if (onActiveNodeChange) onActiveNodeChange(null);
        const initial = generateBotInitialMenu();
        botResponseText = initial.text;
        botButtons = initial.buttons;
      } else if (matchedNode) {
        if (onActiveNodeChange) onActiveNodeChange(matchedNode.id);

        const children = allNodes.filter((n: any) => n.parentId === matchedNode.id);

        if (matchedNode.actionType === "catalog") {
          const prods = settings?.products || [];
          botResponseText = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "🛍️ *Nosso Catálogo de Produtos & Serviços*\n\nConfira os itens disponíveis abaixo. Digite o número do produto para saber mais!";
          botProducts = prods;
        } else if (matchedNode.actionType === "scheduling") {
          botResponseText = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "📅 *Agendamento de Atendimento*\n\nPor favor, escolha uma das datas disponíveis abaixo:\n\n1️⃣ Sexta-feira (24/07)\n2️⃣ Segunda-feira (27/07)\n3️⃣ Terça-feira (28/07)\n\nDigite o número ou a data desejada:";
          botButtons = [
            { label: "1 - Sex 24/07", value: "24/07" },
            { label: "2 - Seg 27/07", value: "27/07" },
            { label: "3 - Ter 28/07", value: "28/07" },
          ];
        } else if (matchedNode.actionType === "human") {
          botResponseText = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "👤 *Transferindo para Atendente Humano*\n\nAguarde um instante! Um dos nossos consultores irá assumir a conversa para te atender pessoalmente. ⏳";
        } else {
          botResponseText = matchedNode.textContent || `Você selecionou a opção *${matchedNode.title}*.`;
        }

        // APENAS PARA NÓS NORMAIS QUE NÃO SÃO CATÁLOGO: APRESENTA OS SUB-NÓS (FILHOS)
        if (children.length > 0 && matchedNode.actionType !== "catalog") {
          setCurrentParentId(matchedNode.id);
          botResponseText += "\n\nEscolha uma das sub-opções abaixo:\n";
          children.forEach((child: any) => {
            botResponseText += `\n*${child.keyword}* - ${child.title}`;
          });
          botResponseText += "\n\nDigite *0* para voltar ao menu principal.";
          botButtons = children.map((c: any) => ({ label: `${c.keyword} - ${c.title}`, value: c.keyword }));
        }
      } else if (clean === "24/07" || clean === "27/07" || clean === "28/07") {
        botResponseText = "🕒 *Horários Disponíveis para Agendamento*\n\nSelecione um dos horários livres:\n\n• 09:00\n• 10:30\n• 14:00\n• 16:30\n\nDigite o horário desejado (ex: 09:00):";
        botButtons = [
          { label: "09:00", value: "09:00" },
          { label: "10:30", value: "10:30" },
          { label: "14:00", value: "14:00" },
        ];
      } else if (clean === "09:00" || clean === "10:30" || clean === "14:00" || clean === "16:30") {
        botResponseText = `✅ *Agendamento Confirmado!*\n\nSeu atendimento foi reservado com sucesso para às *${clean}*.\n\nEnviamos a confirmação para nossa equipe. Obrigado!`;
      } else {
        botResponseText = `Entendi sua mensagem: _"${userText}"_.\n\nPara navegar, escolha uma das opções ativas:\n\n` + generateBotInitialMenu().text;
        botButtons = generateBotInitialMenu().buttons;
      }

      const botMsg: Message = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: botResponseText,
        timestamp: currentTime,
        nodeId: matchedNode?.id || null,
        buttons: botButtons,
        products: botProducts,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  return (
    <div className="w-[360px] h-[640px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col relative select-none font-sans">
      {/* BARRA DE STATUS SUPERIOR */}
      <div className="h-6 px-6 pt-1 flex items-center justify-between text-[11px] font-bold text-white z-20">
        <span>11:14</span>
        <div className="w-16 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span>5G</span>
          <div className="w-4 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
            <div className="w-full h-full bg-white rounded-xs"></div>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DO WHATSAPP */}
      <div className="bg-[#075e54] text-white px-3 py-2 rounded-t-[32px] flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100" />
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-400">
            🤖
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight">{settings?.ai_name || "Nexus Bot"}</h4>
            <span className="text-[9px] text-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-90">
          <button onClick={handleReset} title="Resetar Conversa" className="p-1 hover:bg-white/10 rounded-full">
            <RotateCcw className="w-4 h-4" />
          </button>
          <MoreVertical className="w-4 h-4" />
        </div>
      </div>

      {/* ÁREA DE CHAT DO WHATSAPP */}
      <div className="flex-1 bg-[#e5ddd5] dark:bg-[#0b141a] p-3 overflow-y-auto space-y-3 font-sans text-xs">
        <div className="text-center my-1">
          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
            🔒 Simulador ao Vivo: Clique no ✏️ para editar qualquer texto direto no balão!
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col group relative ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm space-y-2 relative transition-all ${
                msg.sender === "user"
                  ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-none"
                  : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-white rounded-tl-none"
              }`}
            >
              {/* BOTÃO DE EDIÇÃO DIRETO NO BALÃO */}
              {msg.sender === "bot" && editingMessageId !== msg.id && (
                <button
                  onClick={() => startEditMessage(msg)}
                  className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-emerald-600 text-white p-1 rounded-full shadow-md hover:scale-110 transition-all z-20"
                  title="Editar este texto diretamente no balão"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}

              {/* MODO EDIÇÃO DO BALÃO */}
              {editingMessageId === msg.id ? (
                <div className="space-y-1.5 w-full min-w-[200px]">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded-xl p-2 text-[11px] text-slate-900 dark:text-white font-medium focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingMessageId(null)}
                      className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveEditMessage(msg)}
                      className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3" /> Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-[11px] font-medium">
                  {msg.text}
                </p>
              )}

              {/* LISTA DE PRODUTOS SE FOR AÇÃO DE CATÁLOGO */}
              {msg.products && msg.products.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-white/10">
                  {msg.products.map((prod: any, pIdx: number) => (
                    <div
                      key={pIdx}
                      onClick={() => processUserInput(String(pIdx + 1))}
                      className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-between text-[10px]"
                    >
                      <div className="truncate pr-2 font-bold text-slate-900 dark:text-white">
                        {pIdx + 1}. {prod.name}
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        R$ {prod.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* BOTOES PÍLULAS DE OPÇÃO RÁPIDA */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/60 dark:border-white/10">
                  {msg.buttons.map((btn, bIdx) => (
                    <button
                      key={bIdx}
                      onClick={() => processUserInput(btn.value)}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-bold transition-all border border-indigo-200 dark:border-indigo-500/30"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                <span>{msg.timestamp}</span>
                {msg.sender === "user" && <CheckCheck className="w-3 h-3 text-sky-500" />}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white dark:bg-[#202c33] px-3 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CAMPO DE ENTRADA DO CHAT */}
      <div className="bg-[#f0f0f0] dark:bg-[#1f2c34] p-2 rounded-b-[32px] flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && input.trim() && processUserInput(input)}
          placeholder="Digite uma opção ou mensagem..."
          className="flex-1 bg-white dark:bg-[#2a3942] border-none rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-medium"
        />
        <button
          onClick={() => input.trim() && processUserInput(input)}
          className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
