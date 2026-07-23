"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Send,
  CheckCheck,
  Bot,
  Sparkles,
  Play,
  QrCode,
  Check,
  Copy,
  RefreshCw,
  Zap,
  ShoppingBag,
  Heart,
  Scissors,
  Smartphone,
  ShieldCheck,
  MessageSquare,
  Moon,
  Sun,
} from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";

type ScenarioKey = "telecom" | "odonto" | "barber" | "ecommerce";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  time: string;
  hasAudio?: boolean;
  audioDuration?: string;
  hasPix?: boolean;
  pixCode?: string;
  options?: string[];
}

const SCENARIOS: Record<
  ScenarioKey,
  {
    title: string;
    subtitle: string;
    avatar: string;
    icon: any;
    initialMessages: Message[];
  }
> = {
  telecom: {
    title: "Nexus Telecom & Fibra",
    subtitle: "Atendimento Automático 24h",
    avatar: "/nexus-logo.png",
    icon: Zap,
    initialMessages: [
      {
        id: "1",
        sender: "bot",
        text: "Olá! Seja bem-vindo à Nexus Telecom. 🚀 Como posso te ajudar hoje?",
        time: "10:00",
        options: ["📶 Ver Planos de Internet", "💳 Segunda Via da Fatura", "⚡ Testar Viabilidade no CEP"],
      },
    ],
  },
  odonto: {
    title: "Clínica Sorriso & Vida",
    subtitle: "Secretária Virtual • Agendamentos",
    avatar: "/nexus-logo.png",
    icon: Heart,
    initialMessages: [
      {
        id: "1",
        sender: "bot",
        text: "Olá! Sou a assistente virtual da Clínica Sorriso. 👋 Posso agendar sua consulta ou passar valores dos procedimentos!",
        time: "14:15",
        options: ["🗓️ Agendar Avaliação", "💰 Tabela de Preços & Clareamento", "📍 Ver Endereço da Clínica"],
      },
    ],
  },
  barber: {
    title: "Royal Barber Club",
    subtitle: "Atendimento com Hora Marcada",
    avatar: "/nexus-logo.png",
    icon: Scissors,
    initialMessages: [
      {
        id: "1",
        sender: "bot",
        text: "Fala parceiro! Seja bem-vindo à Royal Barber. 💈 Quer agendar um horário para hoje ou tirar alguma dúvida?",
        time: "16:20",
        options: ["✂️ Agendar Corte + Barba", "⏰ Horários Disponíveis Hoje", "💳 Chave Pix para Sinal"],
      },
    ],
  },
  ecommerce: {
    title: "Nexus Moda & Estilo",
    subtitle: "Vendedor Virtual • Envio Rápido",
    avatar: "/nexus-logo.png",
    icon: ShoppingBag,
    initialMessages: [
      {
        id: "1",
        sender: "bot",
        text: "Oi! Seja bem-vindo à nossa Loja Oficial. ✨ Temos frete grátis e 5% de desconto no Pix hoje!",
        time: "18:40",
        options: ["📦 Ver Catálogo em Promoção", "💳 Chave Pix para Compra", "🚚 Calcular Frete"],
      },
    ],
  },
};

export default function WhatsappBotDemo() {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("telecom");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [phoneTheme, setPhoneTheme] = useState<"light" | "dark">("light");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scenarioInfo = SCENARIOS[activeScenario];

  useEffect(() => {
    setMessages(scenarioInfo.initialMessages);
  }, [activeScenario]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getTimeString = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  const copyPixKey = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 3000);
  };

  // Smart Response Engine
  const processUserMessage = (userText: string) => {
    const time = getTimeString();
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let botResponse: Message;
      const lower = userText.toLowerCase();

      if (lower.includes("plano") || lower.includes("internet") || lower.includes("500 mega") || lower.includes("ver planos")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Temos 3 opções incríveis com Wi-Fi 6 grátis:\n\n1. *300 Mega:* R$ 79,90/mês\n2. *500 Mega:* R$ 99,90/mês (Mais Pedido 🔥)\n3. *1 Giga:* R$ 149,90/mês\n\nQual opção fica melhor para a sua casa?",
          time: getTimeString(),
          options: ["Quero o de 500 Mega por R$ 99,90", "Testar Viabilidade no CEP"],
        };
      } else if (lower.includes("agendar") || lower.includes("horário") || lower.includes("avaliação") || lower.includes("corte")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Perfeito! Tenho vaga disponível para *hoje às 16:00* ou *amanhã às 10:00*. Qual horário prefere?",
          time: getTimeString(),
          options: ["Confirmar Hoje às 16:00", "Confirmar Amanhã às 10:00"],
        };
      } else if (lower.includes("pix") || lower.includes("fatura") || lower.includes("comprar") || lower.includes("desconto")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Excelente! Geramos um desconto exclusivo de 5% no Pix. Utilize a chave Pix abaixo para pagamento instantâneo:",
          time: getTimeString(),
          hasPix: true,
          pixCode: "00020126580014BR.GOV.BCB.PIX0136nexus-whatsapp-bot-demo-key520400005303986",
          options: ["Comprovante Enviado! 👍", "Falar com Atendente Humano"],
        };
      } else if (lower.includes("áudio") || lower.includes("preco") || lower.includes("procedimento") || lower.includes("clareamento")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Enviei uma mensagem de voz com os detalhes dos nossos procedimentos abaixo! 🎙️",
          time: getTimeString(),
          hasAudio: true,
          audioDuration: "0:28",
          options: ["🗓️ Agendar Avaliação", "📍 Ver Endereço"],
        };
      } else if (lower.includes("humano") || lower.includes("atendente") || lower.includes("pessoa")) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Sem problemas! Estou transferindo seu atendimento. Para ir direto ao WhatsApp oficial, clique no botão abaixo:",
          time: getTimeString(),
          options: ["👉 Entrar em Contato Direto"],
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Entendi perfeitamente! Como posso te ajudar melhor? Escolha uma das opções abaixo ou digite sua dúvida:",
          time: getTimeString(),
          options: ["🗓️ Agendar Horário", "💳 Pedir Chave Pix", "📞 Atendimento Humano"],
        };
      }

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    const txt = inputText.trim();
    setInputText("");
    processUserMessage(txt);
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-stone-900 font-sans selection:bg-emerald-100 overflow-x-hidden relative flex flex-col justify-between">
      {/* Top Demo Banner Bar */}
      <div className="bg-stone-900 text-stone-200 text-xs font-bold py-2.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-extrabold">Demonstração de Atendimento WhatsApp (Tema Claro &amp; Responsivo)</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[11px] font-black transition-all flex items-center gap-1 shrink-0 shadow-sm"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Voltar ao Painel Nexus
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10 flex-1 w-full flex flex-col justify-center">
        {/* Scenario & Theme Switcher Bar */}
        <div className="mb-6 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-full text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Selecione o Ramo da Empresa para Testar o Atendimento</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
            {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => {
              const item = SCENARIOS[key];
              const SIcon = item.icon;
              const isActive = activeScenario === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveScenario(key)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border ${
                    isActive
                      ? "bg-stone-900 border-stone-900 text-white shadow-lg shadow-stone-900/20 scale-105"
                      : "bg-white border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <SIcon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-stone-500"}`} />
                  {item.title.split(" ")[0]}
                </button>
              );
            })}
          </div>

          {/* Theme Toggle Button */}
          <div className="pt-1 flex items-center justify-center gap-2 text-xs font-bold text-stone-600">
            <span>Visual do WhatsApp:</span>
            <button
              onClick={() => setPhoneTheme(phoneTheme === "light" ? "dark" : "light")}
              className="px-3 py-1 bg-white border border-stone-300 rounded-xl text-stone-800 font-semibold transition-all hover:bg-stone-100 flex items-center gap-1.5 shadow-sm"
            >
              {phoneTheme === "light" ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              {phoneTheme === "light" ? "Modo Claro" : "Modo Escuro"}
            </button>
          </div>
        </div>

        {/* WhatsApp Phone Container (100% Mobile Responsive) */}
        <div className="w-full max-w-[420px] mx-auto">
          <div className="rounded-[2.5rem] sm:rounded-[3rem] bg-stone-900 p-2.5 sm:p-3 shadow-2xl border-4 border-stone-800 ring-1 ring-stone-900/50 relative overflow-hidden">
            {/* Phone Display */}
            <div
              className={`w-full h-[580px] sm:h-[620px] rounded-[2rem] flex flex-col overflow-hidden relative shadow-inner transition-colors duration-300 ${
                phoneTheme === "light" ? "bg-[#efeae2]" : "bg-[#0b141a]"
              }`}
            >
              {/* WhatsApp Header Bar */}
              <div className="bg-[#008069] text-white px-4 py-3.5 pt-4 flex items-center justify-between shadow-md shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-md">
                      <img
                        src="/nexus-logo.png"
                        alt="Nexus"
                        className="w-full h-full object-contain rounded-full bg-stone-950 p-1"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#008069] rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white leading-tight">{scenarioInfo.title}</h4>
                    <p className="text-[10px] text-emerald-100 font-medium">
                      {isTyping ? (
                        <span className="font-mono text-white animate-pulse">digitando...</span>
                      ) : (
                        <span>online • resposta em &lt; 2s</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMessages(scenarioInfo.initialMessages)}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/90 transition-all"
                  title="Reiniciar Chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Scroll Container */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 font-sans text-xs relative z-10 scrollbar-none"
              >
                <div className="text-center my-1">
                  <span
                    className={`text-[10px] font-mono px-3 py-1 rounded-md uppercase border shadow-sm ${
                      phoneTheme === "light"
                        ? "bg-white/90 text-stone-500 border-stone-200"
                        : "bg-[#182229] text-slate-400 border-white/5"
                    }`}
                  >
                    Hoje
                  </span>
                </div>

                <div
                  className={`text-[10px] text-center p-2 rounded-xl font-medium shadow-sm ${
                    phoneTheme === "light"
                      ? "bg-[#ffeecd] text-stone-700 border border-amber-200"
                      : "bg-[#182229] text-emerald-300 border border-emerald-500/20 font-mono"
                  }`}
                >
                  🔒 Mensagens protegidas com tecnologia Nexus.
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-fade-in-up`}
                  >
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl shadow-sm ${
                        msg.sender === "user"
                          ? "bg-[#d9fdd3] text-stone-900 rounded-tr-xs"
                          : phoneTheme === "light"
                          ? "bg-white text-stone-900 rounded-tl-xs border border-stone-100"
                          : "bg-[#202c33] text-slate-100 rounded-tl-xs border border-white/5"
                      }`}
                    >
                      {msg.sender === "bot" && (
                        <div className="flex items-center gap-1 text-[9px] text-emerald-700 font-bold uppercase tracking-wider mb-1">
                          <Bot className="w-3.5 h-3.5 text-emerald-600" /> {scenarioInfo.title}
                        </div>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed font-medium text-[13px]">{msg.text}</p>

                      {/* Interactive Audio Note */}
                      {msg.hasAudio && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-xl border flex items-center gap-3 ${
                            phoneTheme === "light"
                              ? "bg-stone-50 border-stone-200"
                              : "bg-[#111b21] border-emerald-500/30"
                          }`}
                        >
                          <button
                            onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                            className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 hover:scale-105 transition-transform"
                          >
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </button>
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-[9px] text-emerald-700 font-bold font-mono">
                              <span>Mensagem de Voz</span>
                              <span>{msg.audioDuration || "0:24"}</span>
                            </div>
                            <div className="flex items-center gap-0.5 h-3">
                              {[40, 70, 30, 90, 50, 80, 100, 40, 60, 85, 45, 95, 30, 70, 50, 90, 40].map((h, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-full ${
                                    isPlayingAudio ? "bg-emerald-500 animate-pulse" : "bg-emerald-600/60"
                                  }`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Pix QR Code Card */}
                      {msg.hasPix && (
                        <div
                          className={`mt-2.5 p-3 rounded-xl border text-center space-y-2 ${
                            phoneTheme === "light"
                              ? "bg-emerald-50/80 border-emerald-200"
                              : "bg-[#111b21] border-emerald-500/40"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                            <QrCode className="w-4 h-4" /> Chave Pix Gerada
                          </div>
                          <div
                            className={`p-2 rounded-lg text-[9px] font-mono truncate border ${
                              phoneTheme === "light"
                                ? "bg-white text-stone-700 border-stone-200"
                                : "bg-[#1f2c34] text-slate-300 border-white/10"
                            }`}
                          >
                            {msg.pixCode}
                          </div>
                          <button
                            onClick={() => copyPixKey(msg.id, msg.pixCode || "")}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            {copiedPixId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Chave Copiada!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar Chave Pix
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-stone-400 font-mono">{msg.time}</span>
                        {msg.sender === "user" && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                      </div>
                    </div>

                    {/* Quick Options Pills */}
                    {msg.options && (
                      <div className="flex flex-wrap gap-1.5 mt-2 max-w-[95%]">
                        {msg.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => processUserMessage(opt)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all active:scale-95 text-left shadow-sm ${
                              phoneTheme === "light"
                                ? "bg-white border-stone-300 text-emerald-800 hover:bg-emerald-50"
                                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-2xl rounded-tl-xs max-w-[45%] border animate-fade-in ${
                      phoneTheme === "light"
                        ? "bg-white border-stone-200 text-stone-500"
                        : "bg-[#202c33] border-white/5 text-slate-400"
                    }`}
                  >
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="text-[10px] text-emerald-600 font-mono font-bold ml-1">digitando...</span>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div
                className={`p-2.5 border-t shrink-0 ${
                  phoneTheme === "light" ? "bg-[#f0f2f5] border-stone-200" : "bg-[#1f2c34] border-slate-800"
                }`}
              >
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <div
                    className={`flex-1 rounded-2xl flex items-center px-3 py-1.5 border ${
                      phoneTheme === "light"
                        ? "bg-white border-stone-200 text-stone-900"
                        : "bg-[#2a3942] border-white/5 text-white"
                    }`}
                  >
                    <input
                      type="text"
                      placeholder="Digite para testar o atendimento..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none font-medium placeholder:text-stone-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center font-bold transition-all shrink-0 shadow-md"
                  >
                    <Send className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="border-t border-stone-200 bg-stone-100 py-6 text-center text-xs text-stone-500 font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} Nexus AI Bot Engine. Atendimento Automático 24h.</span>
          <Link href="/" className="text-emerald-700 font-bold hover:underline">
            ← Voltar para a Nexus AI SaaS
          </Link>
        </div>
      </footer>
    </div>
  );
}
