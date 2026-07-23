"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bot,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Rocket,
  Headphones,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Gauge,
  Clock,
  ShieldCheck,
  Heart,
  Users,
  Wrench,
  Calculator,
  Play,
  Star,
  Check,
  BarChart3,
  Lock,
  ChevronDown,
  Calendar,
  Award,
  Coffee,
  User,
  QrCode,
  Smartphone,
  Send,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

const PHONE = "5588981885499";
const WHATSAPP_LINK = `https://wa.me/${PHONE}?text=${encodeURIComponent("Olá! Vim pelo site e quero saber mais sobre os sistemas de automação da Nexus.")}`;

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function CountUp({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const { ref, visible } = useScrollReveal();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1500;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

{/* ── Interactive WhatsApp Simulator in Hero ── */}
type NicheKey = "odonto" | "varejo" | "servicos";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  time: string;
  hasAudio?: boolean;
  hasPix?: boolean;
  pixValue?: string;
  options?: string[];
}

function InteractiveSimulator() {
  const [activeNiche, setActiveNiche] = useState<NicheKey>("odonto");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const nichePresets: Record<NicheKey, { label: string; icon: any; initial: ChatMessage[] }> = {
    odonto: {
      label: "Odontologia & Saúde",
      icon: Heart,
      initial: [
        {
          id: "1",
          sender: "bot",
          text: "Olá! Bem-vindo à Clínica Sorriso & Vida. 👋 Eu sou a secretária virtual da Dra. Mariana. Como posso te ajudar hoje?",
          time: "14:32",
          options: ["🗓️ Quero agendar uma avaliação", "💰 Saber valores de tratamento"],
        },
      ],
    },
    varejo: {
      label: "Varejo & Moda",
      icon: ShoppingBag,
      initial: [
        {
          id: "1",
          sender: "bot",
          text: "Oi! Seja bem-vindo à Moda Premium ✨ Vi que você gostou do vestido da nova coleção. Temos disponível nos tamanhos M e G!",
          time: "18:05",
          options: ["💳 Quero comprar no Pix com Desconto", "🚚 Calcular Frete para meu CEP"],
        },
      ],
    },
    servicos: {
      label: "Serviços & Assistência",
      icon: Wrench,
      initial: [
        {
          id: "1",
          sender: "bot",
          text: "Olá! Tudo bem? Sou o atendente virtual da TechFix Assistência. Podemos buscar seu aparelho ou enviar um orçamento em minutos!",
          time: "09:15",
          options: ["📱 Orçamento de Troca de Tela", "⏰ Horários livres para hoje"],
        },
      ],
    },
  };

  useEffect(() => {
    setChatHistory(nichePresets[activeNiche].initial);
  }, [activeNiche]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory, isTyping]);

  const handleOptionClick = (optionText: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: optionText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      let responseMsg: ChatMessage;

      if (optionText.includes("agendar") || optionText.includes("Horários")) {
        responseMsg = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Perfeito! Tenho vaga disponível hoje às 16:30 ou amanhã às 10:00. Qual horário prefere? Já deixo pré-reservado no sistema! 📅",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          options: ["Confirmar Hoje às 16:30", "Confirmar Amanhã às 10:00"],
        };
      } else if (optionText.includes("Pix") || optionText.includes("comprar")) {
        responseMsg = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Excelente! Geramos um desconto exclusivo de 10% no Pix. Código Pix copia e cola gerado abaixo:",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hasPix: true,
          pixValue: "00020126580014BR.GOV.BCB.PIX0136nexus-pix-key-sample520400005303986",
          options: ["Comprovante Enviado! 👍"],
        };
      } else if (optionText.includes("valores") || optionText.includes("Tela")) {
        responseMsg = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "O tratamento completo inclui limpeza profunda + moldeira personalizada. Enviei um áudio explicativo abaixo com os detalhes!",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hasAudio: true,
          options: ["🗓️ Quero Agendar Agora"],
        };
      } else {
        responseMsg = {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "Tudo pronto! Seus dados foram salvos no nosso sistema e nossa equipe foi notificada. Como deseja prosseguir?",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
      }

      setChatHistory((prev) => [...prev, responseMsg]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Niche Selector Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 mb-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl shadow-lg dark:shadow-2xl backdrop-blur-md">
        {(Object.keys(nichePresets) as NicheKey[]).map((key) => {
          const NIcon = nichePresets[key].icon;
          const isActive = activeNiche === key;
          return (
            <button
              key={key}
              onClick={() => setActiveNiche(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <NIcon className="w-3.5 h-3.5" />
              <span className="truncate">{key === "odonto" ? "Saúde" : key === "varejo" ? "Varejo" : "Serviços"}</span>
            </button>
          );
        })}
      </div>

      {/* WhatsApp Phone Box */}
      <div className="relative rounded-[2.5rem] bg-white dark:bg-[#070c18] border border-slate-200 dark:border-white/15 p-4 shadow-xl dark:shadow-2xl shadow-slate-200/80 dark:shadow-indigo-950/50 backdrop-blur-2xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden text-slate-900 dark:text-white">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Chat Top Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain bg-slate-950 rounded-[14px] p-1" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-[#070c18] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">Atendente da Empresa</h4>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-md uppercase">
                  Ativo 24h
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Online • Responde em &lt; 2s
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatHistory(nichePresets[activeNiche].initial)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-all"
            title="Reiniciar Simulação"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Message Scroll Container */}
        <div ref={chatContainerRef} className="h-[320px] overflow-y-auto pr-1 space-y-3 font-sans text-xs relative z-10 scrollbar-none">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} animate-fade-in-up`}>
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md"
                    : "bg-slate-100 dark:bg-slate-900/90 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-tl-xs shadow-sm"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">
                    <MessageSquare className="w-3 h-3" /> Atendimento Automatizado
                  </div>
                )}
                <p className="leading-relaxed font-medium">{msg.text}</p>

                {/* Audio Note Waveform Preview */}
                {msg.hasAudio && (
                  <div className="mt-2.5 p-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                        <span>Mensagem de Voz</span>
                        <span>0:24</span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3">
                        {[40, 70, 30, 90, 50, 80, 100, 40, 60, 85, 45, 95, 30, 70, 50, 90, 40].map((h, idx) => (
                          <div key={idx} className="flex-1 bg-indigo-500 rounded-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pix QR Code Mockup */}
                {msg.hasPix && (
                  <div className="mt-2.5 p-3 bg-emerald-50 dark:bg-slate-950 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px]">
                      <QrCode className="w-4 h-4" /> PIX Copia e Cola Gerado
                    </div>
                    <div className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[9px] font-mono text-slate-700 dark:text-slate-400 truncate">
                      {msg.pixValue}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold">✓ 10% de Desconto Aplicado</div>
                  </div>
                )}

                <span className="block text-[9px] text-slate-400 text-right mt-1 font-mono">{msg.time}</span>
              </div>

              {/* Option Chips */}
              {msg.options && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%] justify-start">
                  {msg.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(opt)}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition-all transform active:scale-95 shadow-sm text-left"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-xs max-w-[40%] text-slate-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 font-mono font-bold">digitando...</span>
            </div>
          )}
        </div>

        {/* Input Bar Display */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 relative z-10">
          <input
            type="text"
            disabled
            placeholder="Clique nas opções acima para testar..."
            className="flex-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 dark:text-slate-400 placeholder:text-slate-400 dark:placeholder:text-slate-500 cursor-not-allowed font-medium"
          />
          <button disabled className="p-2 rounded-xl bg-emerald-600/50 text-white cursor-not-allowed">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

{/* ── Interactive ROI Calculator ── */}
function RoiCalculator() {
  const [leadsPerDay, setLeadsPerDay] = useState(20);
  const [ticketValue, setTicketValue] = useState(250);

  const monthlyLeads = leadsPerDay * 30;
  const currentConversions = Math.floor(monthlyLeads * 0.05); // 5% manual
  const nexusConversions = Math.floor(monthlyConversions(monthlyLeads)); // ~17% automation

  function monthlyConversions(leads: number) {
    return leads * 0.17;
  }

  const extraSales = Math.max(0, nexusConversions - currentConversions);
  const estimatedRevenue = extraSales * ticketValue;

  return (
    <div className="space-y-8">
      <Reveal className="text-center space-y-3">
        <span className="inline-block px-4 py-1.5 bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-widest">
          Simulador Financeiro
        </span>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Quanto a Nexus pode faturar para a sua empresa?
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
          Ajuste os valores abaixo e descubra o aumento de faturamento estimado ao automatizar o seu atendimento.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl">
        {/* Left Input Sliders */}
        <div className="lg:col-span-6 space-y-6">
          {/* Slider 1: Leads per day */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Leads / Mensagens por dia no WhatsApp:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-base">{leadsPerDay} contatos/dia</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={leadsPerDay}
              onChange={(e) => setLeadsPerDay(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5/dia</span>
              <span>100/dia</span>
              <span>200/dia</span>
            </div>
          </div>

          {/* Slider 2: Ticket Value */}
          <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Valor Médio da sua Venda / Serviço:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base">R$ {ticketValue.toLocaleString("pt-BR")}</span>
            </div>
            <input
              type="range"
              min="50"
              max="3000"
              step="50"
              value={ticketValue}
              onChange={(e) => setTicketValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>R$ 50</span>
              <span>R$ 1.500</span>
              <span>R$ 3.000+</span>
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-500/10 via-slate-100 to-emerald-500/10 dark:from-indigo-950/60 dark:via-slate-900/90 dark:to-emerald-950/40 p-6 sm:p-8 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 text-center lg:text-left space-y-6 relative">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block font-bold">
              Retorno Estimado Mensal
            </span>
            <div className="text-3xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              + R$ {estimatedRevenue.toLocaleString("pt-BR")},00
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold block pt-1">
              Faturamento Adicional com Vendas Automáticas 24h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 text-xs font-semibold">
            <div>
              <span className="text-slate-500 block">Vendas Atuais (Manual):</span>
              <span className="text-slate-900 dark:text-white font-bold font-mono text-sm">{currentConversions} vendas/mês</span>
            </div>
            <div>
              <span className="text-slate-500 block">Vendas com Nexus AI:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-sm">{nexusConversions} vendas/mês</span>
            </div>
          </div>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Quero esse faturamento no meu negócio
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState<"combo" | "code">("combo");
  const [selected, setSelected] = useState<{ site: string | null; bot: string | null }>({
    site: "site_pro",
    bot: "bot_pro",
  });

  const toggleSite = (id: string) => setSelected((prev) => ({ ...prev, site: prev.site === id ? null : id }));
  const toggleBot = (id: string) => setSelected((prev) => ({ ...prev, bot: prev.bot === id ? null : id }));

  const handleCheckoutWhatsApp = () => {
    const text = `Olá! Quero assinar o combo da Nexus SaaS com o Plano de Atendimento 24h e ter meu site criado com isenção da taxa de setup!`;
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100 font-sans bg-[#f8fafc] dark:bg-[#030712] transition-colors duration-300 relative">
      {/* Background Lighting & Grid Texture */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20 dark:opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/10 dark:from-indigo-600/15 via-purple-600/5 dark:via-purple-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* ── Header Nav ── */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#030712]/80 backdrop-blur-2xl sticky top-0 z-50 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-white dark:bg-[#030712] rounded-[14px] flex items-center justify-center p-1">
                <img src="/nexus-logo.png" alt="Nexus AI" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">NEXUS</span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-full uppercase tracking-wider">
                  SaaS
                </span>
              </div>
              <span className="text-[9px] block text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase font-semibold">
                Sistemas &amp; Atendimento
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            <a href="#como-funciona" className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-semibold">
              Como Funciona
            </a>
            <a href="#recursos" className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-semibold">
              Recursos
            </a>
            <a href="#calculadora" className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-semibold">
              Calculadora ROI
            </a>
            <a href="#planos" className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-semibold">
              Planos &amp; Preços
            </a>
            <a href="#faq" className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors font-semibold">
              FAQ
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all text-slate-800 dark:text-slate-200"
            >
              Painel do Cliente
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-black transition-all hover:scale-105 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Falar no WhatsApp
            </a>
          </div>

          <button
            className="md:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#030712]/95 backdrop-blur-2xl px-6 py-5 space-y-4 animate-fade-in text-slate-900 dark:text-white">
            <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600">
              Como Funciona
            </a>
            <a href="#recursos" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600">
              Recursos
            </a>
            <a href="#calculadora" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600">
              Calculadora ROI
            </a>
            <a href="#planos" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600">
              Planos &amp; Preços
            </a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600">
              FAQ
            </a>
            <div className="border-t border-slate-200 dark:border-white/10 pt-4 space-y-2">
              <ThemeToggle className="w-full justify-center" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-center py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
              >
                Painel do Cliente
              </Link>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-xs font-black text-white"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section className="max-w-7xl mx-auto px-6 pt-16 sm:pt-24 pb-20 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-50 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-sm dark:shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Plataforma de Atendimento Automático</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono">| 99.9% Uptime</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            Sua Empresa Vendendo 24h por Dia no <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Piloto Automático.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Atenda seus clientes no WhatsApp sem fila de espera. Nosso sistema acolhe contatos, tira dúvidas, envia áudios explicativos e fecha vendas a qualquer hora do dia ou da noite.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="group px-8 py-4.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 text-base"
            >
              <MessageSquare className="w-5 h-5 fill-current" /> Falar com Consultor no WhatsApp
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#portfolio"
              className="px-7 py-4.5 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 hover:border-indigo-500/40 rounded-2xl text-slate-800 dark:text-slate-200 font-bold transition-all duration-300 flex items-center justify-center gap-2 text-base group shadow-sm"
            >
              <Play className="w-4 h-4 text-indigo-500 fill-indigo-500" /> Ver Demonstrações
            </a>
          </div>

          {/* Micro Trust Bullets */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-bold text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ativação Rápida em 24h
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> Envio Organizado &amp; Seguro
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.9/5 em Satisfação
            </div>
          </div>
        </div>

        {/* Hero Right: Interactive WhatsApp Simulator */}
        <div className="lg:col-span-5 relative">
          <InteractiveSimulator />
        </div>
      </section>

      {/* ── Proof Marquee Metrics ── */}
      <section className="border-y border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md relative py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 500, suffix: "+", label: "Empresas Ativas no Brasil", color: "text-indigo-600 dark:text-indigo-400" },
            { value: 98.4, suffix: "%", label: "Satisfação dos Clientes", color: "text-emerald-600 dark:text-emerald-400" },
            { value: 3, prefix: "< ", suffix: "s", label: "Tempo de Resposta", color: "text-amber-500 dark:text-amber-400" },
            { value: 3.4, suffix: "x", label: "Mais Conversões de Vendas", color: "text-cyan-600 dark:text-cyan-400" },
          ].map((m, idx) => (
            <div key={idx} className="text-center space-y-1">
              <div className={`text-3xl sm:text-4xl font-black ${m.color} font-mono tracking-tight`}>
                <CountUp target={m.value} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo Showcase / Templates Section ── */}
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-24 relative">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-800 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-widest">
            Soluções Prontas
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Veja a qualidade do trabalho da nossa equipe
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Clique abaixo para testar as demonstrações ao vivo de cada modelo de site e atendimento.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Landing Page */}
          <Reveal delay={100} className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-1.5">
            <Link href="/templates/landing-page" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src="/images/website_mockup.png"
                  alt="Landing Page de Alta Conversão"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 dark:from-[#030712] via-transparent to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Landing Page de Alta Conversão</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Design responsivo com velocidade de carregamento instantânea, otimização no Google e integração direta ao seu WhatsApp.
                </p>
                <div className="mt-5 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Card 2: E-Commerce */}
          <Reveal delay={200} className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-1.5">
            <Link href="/templates/ecommerce" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src="/images/store_mockup.png"
                  alt="E-Commerce Profissional"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 dark:from-[#030712] via-transparent to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">E-Commerce &amp; Loja Virtual</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Catálogo ilimitado de produtos, carrinho fluido, pagamentos por Pix e sem taxas de intermediação por venda.
                </p>
                <div className="mt-5 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Card 3: Bot IA WhatsApp */}
          <Reveal delay={300} className="group relative rounded-3xl overflow-hidden bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-1.5">
            <Link href="/templates/whatsapp-bot" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img
                  src="/images/chat_mockup.png"
                  alt="Atendente Automático"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 dark:from-[#030712] via-transparent to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Atendimento Automático WhatsApp</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  Automação conversacional configurada com o seu catálogo de produtos e serviços para responder com clareza e agilidade.
                </p>
                <div className="mt-5 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Bento Grid Features ── */}
      <section id="recursos" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-white/10 relative">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-emerald-800 dark:text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
            Recursos do Sistema
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Tudo o que sua empresa precisa para crescer
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            Recursos desenvolvidos sob medida para economizar tempo da sua equipe e fechar mais negócios.
          </p>
        </Reveal>

        {/* Bento Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Bento Item 1 (Wide) */}
          <Reveal delay={100} className="md:col-span-2 bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Atendimento Natural pelo WhatsApp</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-lg">
              Nada de robôs engessados com menus confusos. Nosso sistema responde dúvidas com frases naturais, ententendo o contexto do cliente e enviando mensagens explicativas por áudio ou texto.
            </p>
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-mono text-slate-800 dark:text-slate-300 font-medium">
                &quot;Entendi perfeitamente! Posso agendar seu atendimento para hoje às 15h.&quot;
              </span>
            </div>
          </Reveal>

          {/* Bento Item 2 */}
          <Reveal delay={200} className="bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative group">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Agendador 24h de Serviços</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Integração direta com a sua agenda. O sistema consulta horários disponíveis e envia lembretes automáticos para os clientes.
            </p>
          </Reveal>

          {/* Bento Item 3 */}
          <Reveal delay={300} className="bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mb-6">
              <QrCode className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Pix Instantâneo na Conversa</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Gere chaves Pix Copia e Cola diretamente no bate-papo para receber sinais de agendamento ou pagamento de pedidos na hora.
            </p>
          </Reveal>

          {/* Bento Item 4 */}
          <Reveal delay={400} className="bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative group">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center mb-6">
              <Smartphone className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Multi-WhatsApp</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Conecte um ou mais números da sua empresa no mesmo painel para separar os atendimentos de vendas e suporte.
            </p>
          </Reveal>

          {/* Bento Item 5 (Wide) */}
          <Reveal delay={500} className="md:col-span-2 bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Painel de Gestão e Relatórios</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Acompanhe o andamento dos atendimentos em tempo real e assuma a conversa manualmente com 1 clique sempre que necessário.
            </p>
          </Reveal>

          {/* Bento Item 6 */}
          <Reveal delay={600} className="bg-white dark:bg-slate-900/90 rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative group">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Envio Seguro e Estável</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Pausas graduais entre as mensagens que garantem o funcionamento perfeito e contínuo da sua conta no WhatsApp.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Interactive ROI Calculator Section ── */}
      <section id="calculadora" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-white/10">
        <RoiCalculator />
      </section>

      {/* ── Plans & Pricing Section ── */}
      <section id="planos" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-white/10 relative">
        <Reveal className="text-center space-y-4 mb-12">
          <span className="inline-block px-4 py-1.5 bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full text-amber-800 dark:text-amber-300 text-xs font-mono font-bold uppercase tracking-widest">
            Investimento Transparente
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Escolha o Plano Ideal para o seu Negócio
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Assine um plano de atendimento e ganhe a criação do seu site 100% grátis, sem taxa de setup.
          </p>

          {/* Segmented Control */}
          <div className="inline-flex p-1.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 rounded-2xl shadow-md backdrop-blur-md mt-6">
            <button
              onClick={() => setPricingTab("combo")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                pricingTab === "combo"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Combo Completo (Site Grátis + Atendimento)
            </button>
            <button
              onClick={() => setPricingTab("code")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                pricingTab === "code"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Apenas Código do Sistema Avulso
            </button>
          </div>
        </Reveal>

        {/* Pricing Cards Grid */}
        <div className="max-w-5xl mx-auto space-y-10">
          {/* SECTION 1: SITES / AVULSO */}
          {pricingTab === "code" && (
            <div className="animate-fade-in space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-center text-xs text-amber-800 dark:text-amber-300 font-semibold">
                ⚠️ <strong>Atenção:</strong> Ao adquirir o sistema avulso, você recebe o código fonte em pagamento único, ficando responsável pela hospedagem em servidor próprio.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: "site_basic",
                    name: "Site Institucional",
                    desc: "Landing page avulsa de alta conversão",
                    setup: "R$ 497",
                    color: "border-indigo-500/30",
                    badge: null,
                    features: ["Código Fonte Entregue", "Landing Page 100% Responsiva", "SEO Otimizado no Google", "Sem Robô de Atendimento", "Hospedagem por conta do cliente"],
                  },
                  {
                    id: "site_pro",
                    name: "Plataforma Completa",
                    desc: "Sistema web com CRM avulso",
                    setup: "R$ 997",
                    color: "border-purple-500/30",
                    badge: "Mais Procurado",
                    features: ["Sistema Web Completo", "Painel CRM de Vendas", "Agendador de Horários", "Instalação no seu Servidor", "Hospedagem por conta do cliente"],
                  },
                  {
                    id: "site_ent",
                    name: "E-Commerce Avulso",
                    desc: "Loja virtual completa sem mensalidade",
                    setup: "R$ 1.997",
                    color: "border-amber-500/30",
                    badge: "Completo",
                    features: ["Loja Virtual sem Comissões", "Catálogo Ilimitado + Pix", "Painel de Pedidos", "Deploy no seu Servidor", "Código 100% Seu"],
                  },
                ].map((s) => {
                  const isActive = selected.site === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSite(s.id)}
                      className={`relative text-left p-6 rounded-3xl border-2 transition-all duration-300 ${
                        isActive
                          ? "border-indigo-600 bg-white dark:bg-indigo-950/30 shadow-xl shadow-indigo-600/10 ring-1 ring-indigo-600 -translate-y-1"
                          : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      {s.badge && (
                        <span className="absolute top-4 right-4 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          {s.badge}
                        </span>
                      )}
                      <h4 className="text-lg font-black text-slate-900 dark:text-white">{s.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{s.desc}</p>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mb-4">{s.setup} <span className="text-xs font-normal text-slate-400">taxa única</span></div>
                      <ul className="space-y-2 mb-6">
                        {s.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className={`w-full py-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                        isActive ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                      }`}>
                        {isActive ? "✓ Selecionado" : "Selecionar Este"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: COMBOS */}
          {pricingTab === "combo" && (
            <div className="animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: "combo_start",
                    name: "Plano Start",
                    price: "R$ 197",
                    period: "/mês",
                    desc: "Para pequenos negócios e autônomos",
                    setupWaived: "Economia de R$ 497 de Setup",
                    features: [
                      "🎉 Site Institucional 100% GRÁTIS",
                      "Atendimento Automático no WhatsApp 24h",
                      "Até 1.000 Atendimentos/mês",
                      "Respostas com Áudio de Voz",
                      "Suporte via WhatsApp",
                    ],
                  },
                  {
                    id: "combo_pro",
                    name: "Plano Pro",
                    price: "R$ 397",
                    period: "/mês",
                    popular: true,
                    desc: "Para empresas em crescimento que querem vender mais",
                    setupWaived: "Economia de R$ 997 de Setup",
                    features: [
                      "🎉 Plataforma Web + CRM 100% GRÁTIS",
                      "Atendimento Automático no WhatsApp 24h",
                      "Atendimentos ILIMITADOS",
                      "Envio de Chave Pix no Chat",
                      "Multi-Atendentes no mesmo número",
                      "Suporte Prioritário VIP",
                    ],
                  },
                  {
                    id: "combo_scale",
                    name: "Plano E-Commerce",
                    price: "R$ 697",
                    period: "/mês",
                    desc: "Para marcas e lojas que querem vender produtos 24h",
                    setupWaived: "Economia de R$ 1.997 de Setup",
                    features: [
                      "🎉 Loja Virtual E-Commerce 100% GRÁTIS",
                      "Atendimento + Robô de Vendas",
                      "Catálogo Ilimitado de Produtos",
                      "Sem Comissões por Venda Realizada",
                      "Gerenciador de Estoque em Tempo Real",
                    ],
                  },
                ].map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl p-8 border-2 transition-all duration-300 flex flex-col justify-between ${
                      plan.popular
                        ? "bg-white dark:bg-slate-900/90 border-amber-500 shadow-2xl shadow-amber-500/10 ring-2 ring-amber-500/50 -translate-y-2"
                        : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-white/10 shadow-xl"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md">
                        🔥 Mais Vendido
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">{plan.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{plan.desc}</p>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black text-slate-900 dark:text-white">{plan.price}</span>
                          <span className="text-xs text-slate-500 font-bold">{plan.period}</span>
                        </div>
                        <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-lg border border-emerald-200 dark:border-emerald-500/30 font-mono">
                          {plan.setupWaived}
                        </span>
                      </div>

                      <ul className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10 text-xs">
                        {plan.features.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={handleCheckoutWhatsApp}
                      className={`w-full mt-8 py-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
                        plan.popular
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/25"
                          : "bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white"
                      }`}
                    >
                      <Zap className="w-4 h-4" /> Assinar Agora com Site Grátis
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" className="max-w-5xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-white/10">
        <Reveal className="text-center space-y-3 mb-14">
          <span className="inline-block px-4 py-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
            Tire Suas Dúvidas
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Perguntas Frequentes
          </h2>
        </Reveal>

        <div className="space-y-4">
          {[
            {
              q: "O site é realmente 100% grátis assinando um plano?",
              a: "Sim! Ao assinar qualquer plano de atendimento mensal, nossa equipe desenvolve o seu site personalizado sem qualquer taxa de criação ou setup (uma economia de até R$ 1.997).",
            },
            {
              q: "Preciso deixar o computador ligado para o robô funcionar?",
              a: "Não. Nossos servidores funcionam em nuvem de alta velocidade 24 horas por dia, 7 dias por semana. O robô responde seus clientes mesmo quando seu celular ou computador estiverem desligados.",
            },
            {
              q: "Posso atender manualmente quando quiser?",
              a: "Com certeza! O sistema é híbrido. Você pode deixar o robô conduzindo as conversas e assumir a qualquer momento no celular com 1 clique.",
            },
            {
              q: "Quanto tempo demora para a minha empresa começar a usar?",
              a: "Em até 24 horas após o envio das suas informações, nossa equipe deixa seu robô e site prontos para rodar.",
            },
          ].map((item, idx) => (
            <Reveal key={idx} delay={idx * 100} className="p-6 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{item.q}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {item.a}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 py-12 text-slate-600 dark:text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">NEXUS SAAS</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Tecnologia de ponta em atendimento automatizado por WhatsApp e sites de alta conversão para empresas brasileiras.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Links Rápidos</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#como-funciona" className="hover:text-slate-900 dark:hover:text-white">Como Funciona</a></li>
              <li><a href="#recursos" className="hover:text-slate-900 dark:hover:text-white">Recursos</a></li>
              <li><a href="#calculadora" className="hover:text-slate-900 dark:hover:text-white">Calculadora ROI</a></li>
              <li><a href="#planos" className="hover:text-slate-900 dark:hover:text-white">Planos</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Demonstrações</h4>
            <ul className="space-y-2 font-medium">
              <li><Link href="/templates/landing-page" className="hover:text-slate-900 dark:hover:text-white">Site Barbearia / Serviços</Link></li>
              <li><Link href="/templates/ecommerce" className="hover:text-slate-900 dark:hover:text-white">Loja Virtual E-Commerce</Link></li>
              <li><Link href="/templates/whatsapp-bot" className="hover:text-slate-900 dark:hover:text-white">Bot de WhatsApp IA</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Atendimento</h4>
            <p className="font-medium text-slate-500">WhatsApp: (88) 98188-5499</p>
            <p className="font-medium text-slate-500 mt-1">Segunda a Sábado: 08:00 às 19:00</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-200 dark:border-white/5 mt-8 pt-8 text-center text-slate-500 text-[11px]">
          &copy; {new Date().getFullYear()} Nexus SaaS. Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}
