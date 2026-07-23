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
  Star,
  Play,
  Sliders,
  DollarSign,
  Activity,
  Check,
  ChevronDown,
  Layers,
  Lock,
  Cpu,
  Smartphone,
  BarChart3,
  Calendar,
  QrCode,
  Send,
  RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

const PHONE = "5588981885499";
const WHATSAPP_LINK = `https://wa.me/${PHONE}?text=${encodeURIComponent("Olá! Vim pelo site e quero saber mais sobre os sistemas de automação da Nexus.")}`;
const TEL_LINK = `tel:+${PHONE}`;
const WHATSAPP_VENDEDOR = `https://wa.me/${PHONE}?text=${encodeURIComponent("Olá! Vim pelo site e quero ser vendedor/parceiro Nexus.")}`;

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
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

function CountUp({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const { ref, visible } = useScrollReveal();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1600;
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
      <div className="flex items-center gap-1.5 p-1.5 mb-4 bg-slate-900/80 border border-white/10 rounded-2xl backdrop-blur-md">
        {(Object.keys(nichePresets) as NicheKey[]).map((key) => {
          const NIcon = nichePresets[key].icon;
          const isActive = activeNiche === key;
          return (
            <button
              key={key}
              onClick={() => setActiveNiche(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <NIcon className="w-3.5 h-3.5" />
              <span className="truncate">{key === "odonto" ? "Saúde" : key === "varejo" ? "Varejo" : "Serviços"}</span>
            </button>
          );
        })}
      </div>

      {/* WhatsApp Phone Box */}
      <div className="relative rounded-[2.5rem] bg-[#070c18] border border-white/15 p-4 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Chat Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain bg-slate-950 rounded-[14px] p-1" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#070c18] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-white tracking-tight">Atendente da Empresa</h4>
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-md uppercase">
                  Ativo 24h
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online • Responde em &lt; 2s
              </p>
            </div>
          </div>

          <button
            onClick={() => setChatHistory(nichePresets[activeNiche].initial)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
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
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-lg shadow-emerald-600/20"
                    : "bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-xs shadow-md"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">
                    <MessageSquare className="w-3 h-3 text-indigo-400" /> Atendimento Automatizado
                  </div>
                )}
                <p className="leading-relaxed font-medium">{msg.text}</p>

                {/* Audio Note Waveform Preview */}
                {msg.hasAudio && (
                  <div className="mt-2.5 p-2 bg-indigo-950/60 border border-indigo-500/30 rounded-xl flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[9px] text-indigo-300 font-mono">
                        <span>Mensagem de Voz</span>
                        <span>0:24</span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3">
                        {[40, 70, 30, 90, 50, 80, 100, 40, 60, 85, 45, 95, 30, 70, 50, 90, 40].map((h, idx) => (
                          <div key={idx} className="flex-1 bg-indigo-400 rounded-full" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pix QR Code Mockup */}
                {msg.hasPix && (
                  <div className="mt-2.5 p-3 bg-slate-950 border border-emerald-500/30 rounded-xl text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-[11px]">
                      <QrCode className="w-4 h-4" /> PIX Copia e Cola Gerado
                    </div>
                    <div className="p-1.5 bg-slate-900 border border-white/10 rounded-lg text-[9px] font-mono text-slate-400 truncate">
                      {msg.pixValue}
                    </div>
                    <div className="text-[10px] text-emerald-300 font-bold">✓ 10% de Desconto Aplicado automaticamente</div>
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
                      className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/50 rounded-xl text-[11px] font-bold text-indigo-300 transition-all transform active:scale-95 shadow-sm text-left"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 bg-slate-900/90 border border-white/10 rounded-2xl rounded-tl-xs max-w-[40%] text-slate-400">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              <span className="text-[10px] text-slate-400 ml-1 font-mono">digitando...</span>
            </div>
          )}
        </div>

        {/* Input Bar Display */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 relative z-10">
          <input
            type="text"
            disabled
            placeholder="Clique nas opções acima para testar..."
            className="flex-1 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-400 placeholder:text-slate-500 cursor-not-allowed"
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
  const [leadsPerDay, setLeadsPerDay] = useState(25);
  const [ticketValue, setTicketValue] = useState(250);

  const lostLeadsPerMonth = Math.round(leadsPerDay * 30 * 0.38);
  const recoveredSales = Math.round(lostLeadsPerMonth * 0.25);
  const extraRevenue = recoveredSales * ticketValue;

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/15 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
              <Sliders className="w-3.5 h-3.5" /> Simule o Impacto no seu Caixa
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Quanto dinheiro você perde sem atendimento 24h?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed mt-2">
              Ajuste os valores de acordo com o movimento da sua empresa e veja quanto pode faturar a mais atendendo todos os contatos no WhatsApp sem atraso.
            </p>
          </div>

          {/* Slider 1: Leads per day */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Leads / Mensagens por dia no WhatsApp:</span>
              <span className="text-indigo-400 font-mono text-base">{leadsPerDay} contatos/dia</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={leadsPerDay}
              onChange={(e) => setLeadsPerDay(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5/dia</span>
              <span>100/dia</span>
              <span>200/dia</span>
            </div>
          </div>

          {/* Slider 2: Ticket Value */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Valor Médio da sua Venda / Serviço:</span>
              <span className="text-emerald-400 font-mono text-base">R$ {ticketValue.toLocaleString("pt-BR")}</span>
            </div>
            <input
              type="range"
              min="50"
              max="3000"
              step="50"
              value={ticketValue}
              onChange={(e) => setTicketValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>R$ 50</span>
              <span>R$ 1.500</span>
              <span>R$ 3.000+</span>
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div className="lg:col-span-6 bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-emerald-950/40 p-6 sm:p-8 rounded-2xl border border-indigo-500/20 text-center lg:text-left space-y-6 relative">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
              Faturamento Extra Estimado / Mês
            </span>
            <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 font-sans tracking-tight">
              + R$ {extraRevenue.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-emerald-400/90 font-bold pt-1">
              ✨ Representa cerca de {recoveredSales} novas vendas concluídas no automático!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-left">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 block font-mono">Contatos Não Atendidos/Mês</span>
              <span className="text-sm font-bold text-red-400">~{lostLeadsPerMonth} clientes</span>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 block font-mono">Retorno Estimado</span>
              <span className="text-sm font-bold text-indigo-300">
                {Math.round(extraRevenue / 147)}x o valor do plano
              </span>
            </div>
          </div>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 rounded-xl text-white font-black text-sm transition-all duration-300 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2 group"
          >
            <MessageSquare className="w-4 h-4" /> Ativar Atendimento Automático Agora
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  );
}

{/* ── FAQ Accordion Item ── */}
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-2xl bg-slate-900/40 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-white hover:text-indigo-300 transition-colors"
      >
        <span>{question}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-indigo-400" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3 animate-fade-in font-medium">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState<"combo" | "code">("combo");

  const [selected, setSelected] = useState({ site: "" as string, bot: "" as string, modules: [] as string[] });
  const combo = !!selected.site && !!selected.bot;

  const toggleSite = (id: string) => setSelected((p) => ({ ...p, site: p.site === id ? "" : id }));

  const siteData: Record<string, { name: string; desc: string; setup: string; setupValue: number; monthly: number }> = {
    site_basic: { name: "Site Institucional", desc: "Landing page de alta conversão", setup: "R$ 497", setupValue: 497, monthly: 0 },
    site_pro: { name: "Plataforma Completa", desc: "Sistema web com CRM e Agendamento", setup: "R$ 997", setupValue: 997, monthly: 0 },
    site_ent: { name: "E-Commerce Completo", desc: "Loja virtual avançada sem comissões", setup: "R$ 1.997", setupValue: 1997, monthly: 0 },
  };

  const botData: Record<string, { name: string; desc: string; monthly: number; discountValue: number }> = {
    bot_starter: { name: "Plano Start", desc: "Perfeito para profissionais autônomos", monthly: 67, discountValue: 497 },
    bot_pro: { name: "Plano Growth", desc: "Para pequenas e médias empresas", monthly: 147, discountValue: 997 },
    bot_equipe: { name: "Plano Scale", desc: "Para grandes operações e equipes", monthly: 497, discountValue: 1997 },
  };

  const getSiteData = (id: string) => siteData[id] || null;
  const getBotData = (id: string) => botData[id] || null;
  const getSiteSetup = (id: string) => siteData[id]?.setup || "";
  const getSiteSetupValue = (id: string) => siteData[id]?.setupValue || 0;
  const getBotDiscountValue = (id: string) => botData[id]?.discountValue || 0;

  const getFinalSetupValue = () => {
    if (!selected.site) return 0;
    const setup = getSiteSetupValue(selected.site);
    if (!combo) return setup;
    const discount = getBotDiscountValue(selected.bot);
    return Math.max(0, setup - discount);
  };

  const getBotMonthly = () => (selected.bot ? botData[selected.bot]?.monthly || 0 : 0);
  const getSiteMonthly = () => (selected.site ? siteData[selected.site]?.monthly || 0 : 0);
  const getTotalMonthly = () => {
    const siteM = getSiteMonthly();
    const botM = getBotMonthly();
    return `R$ ${siteM + botM}`;
  };

  const getSummaryText = () => {
    const parts = [];
    if (selected.site) parts.push(siteData[selected.site]?.name);
    if (selected.bot) parts.push(botData[selected.bot]?.name);
    if (combo) parts.push("Combo Completo");
    return parts.join(" + ") || "Plano";
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const goToCheckout = () => {
    const summary = getSummaryText();
    const setupVal = getFinalSetupValue();
    const monthlyVal = getSiteMonthly() + getBotMonthly();

    let text = `Olá! Quero contratar o plano: *${summary}*.\n\n`;
    if (selected.site) {
      text += `• Criação do Site: R$ ${setupVal.toLocaleString("pt-BR")}${combo && setupVal === 0 ? " (ISENTO NO COMBO 🎉)" : ""}\n`;
    }
    if (selected.bot) {
      text += `• Plano de Atendimento: R$ ${monthlyVal.toLocaleString("pt-BR")}/mês\n`;
    }
    text += `\nPode me enviar os detalhes para começarmos agora?`;

    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100 font-sans bg-slate-50 dark:bg-[#030712] transition-colors duration-300 relative">
      {/* Background Lighting & Grid Texture */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20 dark:opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/10 dark:from-indigo-600/15 via-purple-600/5 dark:via-purple-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* ── Header Nav ── */}
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
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
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full uppercase tracking-wider">
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
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 dark:border-white/10 rounded-xl text-xs font-bold transition-all hover:border-white/20 text-slate-700 dark:text-slate-200"
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
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#030712]/95 backdrop-blur-2xl px-6 py-5 space-y-4 animate-fade-in">
            <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-white">
              Como Funciona
            </a>
            <a href="#recursos" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-white">
              Recursos
            </a>
            <a href="#calculadora" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-white">
              Calculadora ROI
            </a>
            <a href="#planos" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-white">
              Planos &amp; Preços
            </a>
            <a href="#faq" onClick={() => setMobileOpen(false)} className="block text-sm font-semibold text-slate-300 hover:text-white">
              FAQ
            </a>
            <div className="border-t border-white/10 pt-4 space-y-2">
              <ThemeToggle className="w-full justify-center" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block text-center py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white"
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
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-[#030712]/5 dark:bg-slate-900/80 border border-indigo-500/20 dark:border-indigo-500/30 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-sm dark:shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Plataforma de Atendimento Automático</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono">| 99.9% Uptime</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-6xl font-black tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            Sua Empresa Vendendo 24h por Dia no <span className="text-gradient-purple">Piloto Automático.</span>
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
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-bold text-slate-400 border-t border-white/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Ativação Rápida em 24h
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Envio Organizado &amp; Seguro
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
      <section className="border-y border-white/10 bg-slate-950/60 backdrop-blur-md relative py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 500, suffix: "+", label: "Empresas Ativas no Brasil", color: "text-indigo-400" },
            { value: 98.4, suffix: "%", label: "Satisfação dos Clientes", color: "text-emerald-400" },
            { value: 3, prefix: "< ", suffix: "s", label: "Tempo de Resposta", color: "text-amber-400" },
            { value: 3.4, suffix: "x", label: "Mais Conversões de Vendas", color: "text-cyan-400" },
          ].map((m, idx) => (
            <div key={idx} className="text-center space-y-1">
              <div className={`text-3xl sm:text-4xl font-black ${m.color} font-mono tracking-tight`}>
                <CountUp target={m.value} prefix={m.prefix} suffix={m.suffix} />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo Showcase / Templates Section ── */}
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-24 relative">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-mono font-bold uppercase tracking-widest">
            Soluções Prontas
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Veja a qualidade do trabalho da nossa equipe
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium">
            Clique abaixo para testar as demonstrações ao vivo de cada modelo de site e atendimento.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Landing Page */}
          <Reveal delay={100} className="group relative rounded-3xl overflow-hidden glass-panel glass-card-hover block border border-white/10">
            <Link href="/templates/landing-page" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-900">
                <img
                  src="/images/website_mockup.png"
                  alt="Landing Page de Alta Conversão"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
                  <Globe className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Landing Page de Alta Conversão</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Design responsivo com velocidade de carregamento instantânea, otimização no Google e integração direta ao seu WhatsApp.
                </p>
                <div className="mt-5 flex items-center gap-2 text-indigo-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Card 2: E-Commerce */}
          <Reveal delay={200} className="group relative rounded-3xl overflow-hidden glass-panel glass-card-hover block border border-white/10">
            <Link href="/templates/ecommerce" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-900">
                <img
                  src="/images/store_mockup.png"
                  alt="E-Commerce Profissional"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">E-Commerce &amp; Loja Virtual</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Catálogo ilimitado de produtos, carrinho fluido, pagamentos por Pix e sem taxas de intermediação por venda.
                </p>
                <div className="mt-5 flex items-center gap-2 text-amber-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Card 3: Bot IA WhatsApp */}
          <Reveal delay={300} className="group relative rounded-3xl overflow-hidden glass-panel glass-card-hover block border border-white/10">
            <Link href="/templates/whatsapp-bot" className="block w-full h-full">
              <div className="aspect-[16/10] w-full relative overflow-hidden bg-slate-900">
                <img
                  src="/images/chat_mockup.png"
                  alt="Atendente Automático"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/60 to-transparent" />
              </div>
              <div className="p-7">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Atendimento Automático WhatsApp</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Automação conversacional configurada com o seu catálogo de produtos e serviços para responder com clareza e agilidade.
                </p>
                <div className="mt-5 flex items-center gap-2 text-emerald-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                  Ver Demonstração Interativa <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Bento Grid Features ── */}
      <section id="recursos" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 relative">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest">
            Recursos do Sistema
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Tudo o que sua empresa precisa para crescer
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium">
            Recursos desenvolvidos sob medida para economizar tempo da sua equipe e fechar mais negócios.
          </p>
        </Reveal>

        {/* Bento Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Bento Item 1 (Wide) */}
          <Reveal delay={100} className="md:col-span-2 glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Atendimento Natural pelo WhatsApp</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-lg">
              Nada de robôs engessados com menus confusos. Nosso sistema responde dúvidas com frases naturais, ententendo o contexto do cliente e enviando mensagens explicativas por áudio ou texto.
            </p>
            <div className="mt-6 p-4 bg-slate-950/80 border border-white/10 rounded-2xl flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-mono text-slate-300">
                &quot;Entendi perfeitamente! Posso agendar seu atendimento para hoje às 15h.&quot;
              </span>
            </div>
          </Reveal>

          {/* Bento Item 2 */}
          <Reveal delay={200} className="glass-panel rounded-3xl p-8 border border-white/10 relative group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Agendador 24h de Serviços</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Integração direta com a sua agenda. O sistema consulta horários disponíveis e envia lembretes automáticos para os clientes.
            </p>
          </Reveal>

          {/* Bento Item 3 */}
          <Reveal delay={300} className="glass-panel rounded-3xl p-8 border border-white/10 relative group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Pix Instantâneo na Conversa</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Gere chaves Pix Copia e Cola diretamente no bate-papo para receber sinais de agendamento ou pagamento de pedidos na hora.
            </p>
          </Reveal>

          {/* Bento Item 4 */}
          <Reveal delay={400} className="glass-panel rounded-3xl p-8 border border-white/10 relative group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6">
              <Smartphone className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Multi-WhatsApp</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Conecte um ou mais números da sua empresa no mesmo painel para separar os atendimentos de vendas e suporte.
            </p>
          </Reveal>

          {/* Bento Item 5 (Wide) */}
          <Reveal delay={500} className="md:col-span-2 glass-panel rounded-3xl p-8 border border-white/10 relative group">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Painel de Gestão e Relatórios</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Acompanhe o andamento dos atendimentos em tempo real e assuma a conversa manualmente com 1 clique sempre que necessário.
            </p>
          </Reveal>

          {/* Bento Item 6 */}
          <Reveal delay={600} className="glass-panel rounded-3xl p-8 border border-white/10 relative group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Envio Seguro e Estável</h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Pausas graduais entre as mensagens que garantem o funcionamento perfeito e contínuo da sua conta no WhatsApp.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Interactive ROI Calculator Section ── */}
      <section id="calculadora" className="max-w-7xl mx-auto px-6 py-20 border-t border-white/10">
        <RoiCalculator />
      </section>

      {/* ── Plans & Pricing Section ── */}
      <section id="planos" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 relative">
        <Reveal className="text-center space-y-4 mb-12">
          <span className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-300 text-xs font-mono font-bold uppercase tracking-widest">
            Investimento Transparente
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Escolha o Plano Ideal para o seu Negócio
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-medium">
            Assine um plano de atendimento e ganhe a criação do seu site 100% grátis, sem taxa de setup.
          </p>

          {/* Segmented Control */}
          <div className="inline-flex p-1.5 bg-slate-900/90 border border-white/10 rounded-2xl backdrop-blur-md mt-6">
            <button
              onClick={() => setPricingTab("combo")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                pricingTab === "combo"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" /> Combo Completo (Site Grátis + Atendimento)
            </button>
            <button
              onClick={() => setPricingTab("code")}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                pricingTab === "code"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-white"
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
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center text-xs text-amber-300 font-semibold">
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
                          ? "border-indigo-500 bg-indigo-950/30 shadow-xl shadow-indigo-500/20 ring-1 ring-indigo-500 -translate-y-1"
                          : "glass-panel hover:border-white/20"
                      }`}
                    >
                      {s.badge && (
                        <span className="absolute top-4 right-4 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {s.badge}
                        </span>
                      )}
                      <h4 className="text-lg font-black text-white">{s.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">{s.desc}</p>
                      <div className="text-2xl font-black text-white mb-4">{s.setup} <span className="text-xs font-normal text-slate-400">taxa única</span></div>
                      <ul className="space-y-2 mb-6">
                        {s.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className={`w-full py-2.5 rounded-xl text-xs font-bold text-center border transition-all ${
                        isActive ? "bg-indigo-600 border-indigo-500 text-white" : "border-white/10 text-slate-400"
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
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300 font-semibold leading-relaxed">
                  <strong>Vantagem Exclusiva:</strong> Ao assinar qualquer plano de atendimento mensal abaixo, nossa equipe cuida de toda a criação do seu site, hospedagem e suporte técnico. <strong>Criação do Site Grátis!</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    id: "bot_starter",
                    icon: Zap,
                    name: "Plano Start",
                    desc: "Ideal para profissionais autônomos",
                    price: "R$ 67",
                    period: "/mês",
                    setupFree: "Site Institucional Grátis (Economia R$ 497)",
                    color: "cyan",
                    tag: null,
                    features: [
                      "Site Institucional INCLUSO GRÁTIS",
                      "Até 350 conversas/mês ativas",
                      "1 WhatsApp Conectado",
                      "Atendimento Personalizado para seu Nicho",
                      "Hospedagem & Suporte 100% Inclusos",
                      "Sem Contrato de Fidelidade",
                    ],
                  },
                  {
                    id: "bot_pro",
                    icon: Bot,
                    name: "Plano Growth",
                    desc: "O mais escolhido por empresas em crescimento",
                    price: "R$ 147",
                    period: "/mês",
                    setupFree: "Plataforma Completa Grátis (Economia R$ 997)",
                    color: "purple",
                    tag: "🔥 Mais Vendido",
                    features: [
                      "Plataforma Completa INCLUSA GRÁTIS",
                      "Até 1.000 conversas/mês ativas",
                      "Atendimento com Mensagens de Voz",
                      "Agendador Online Sincronizado",
                      "Painel de Gestão de Leads",
                      "Suporte Prioritário por WhatsApp",
                    ],
                  },
                  {
                    id: "bot_equipe",
                    icon: Rocket,
                    name: "Plano Scale",
                    desc: "Para grandes demandas e equipes",
                    price: "R$ 497",
                    period: "/mês",
                    setupFree: "E-Commerce Completo Grátis (Economia R$ 1.997)",
                    color: "emerald",
                    tag: "Operação Escala",
                    features: [
                      "E-Commerce Completo INCLUSO GRÁTIS",
                      "Conversas Ilimitadas no Mês",
                      "Até 3 WhatsApps simultâneos",
                      "Painel Multiatendimento para Equipe",
                      "Gerente de Conta Dedicado",
                      "Suporte Prioritário 24/7",
                    ],
                  },
                ].map((b) => {
                  const Icon = b.icon;
                  const isActive = selected.bot === b.id;
                  const isPopular = b.id === "bot_pro";
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelected({
                          bot: b.id,
                          site: b.id === "bot_starter" ? "site_basic" : b.id === "bot_pro" ? "site_pro" : "site_ent",
                          modules: [],
                        });
                      }}
                      className={`relative text-left p-7 rounded-3xl border-2 transition-all duration-300 ${
                        isActive || isPopular
                          ? "border-emerald-500 bg-slate-900/90 shadow-2xl shadow-emerald-500/20 ring-1 ring-emerald-500 -translate-y-1"
                          : "glass-panel hover:border-white/20"
                      }`}
                    >
                      {b.tag && (
                        <span className="absolute top-4 right-4 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {b.tag}
                        </span>
                      )}

                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
                        <Icon className="w-5 h-5 text-emerald-400" />
                      </div>

                      <h4 className="text-xl font-black text-white">{b.name}</h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4">{b.desc}</p>

                      <div className="flex items-baseline gap-1 mb-3">
                        <span className="text-3xl sm:text-4xl font-black text-white">{b.price}</span>
                        <span className="text-xs font-semibold text-slate-400">{b.period}</span>
                      </div>

                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 font-bold mb-5 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {b.setupFree}
                      </div>

                      <ul className="space-y-2 mb-6">
                        {b.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>

                      <div
                        className={`w-full py-3 rounded-xl text-xs font-black text-center border transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-transparent"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {isActive ? "✓ Selecionado" : "Escolher Este Plano"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Business Specialization Banner */}
          <div className="p-6 rounded-3xl glass-panel border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  Atendimento Configurado para o Seu Segmento
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase rounded-md border border-emerald-500/30">
                    Sem Taxa Extra
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Nossa equipe adapta o atendimento para seu segmento: Odontologia, Varejo, Estética, Assistência Técnica, Imobiliárias e Serviços.
                </p>
              </div>
            </div>
          </div>

          {/* Summary / Order Review Card */}
          {(selected.site || selected.bot) && (
            <div className="glass-panel rounded-3xl p-8 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 space-y-6 animate-fade-in">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block font-bold">
                    Resumo do Seu Pedido
                  </span>
                  <h3 className="text-2xl font-black text-white mt-1">{getSummaryText()}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">Investimento Mensal</span>
                  <div className="text-3xl font-black text-emerald-400">{getTotalMonthly()} <span className="text-xs text-slate-400 font-semibold">/mês</span></div>
                  {combo && <span className="text-[10px] text-emerald-300 font-bold">Criação do Site: R$ 0 (ISENTO NO COMBO 🎉)</span>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-400 font-medium">
                  ✓ Ativação em até 24h • Sem fidelidade • Suporte direto no WhatsApp
                </p>
                <button
                  onClick={goToCheckout}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl text-white font-black text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group"
                >
                  <MessageSquare className="w-4 h-4 fill-current" /> Finalizar Pedido no WhatsApp
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10 relative">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
            Sem Passo a Passo Complexo
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Como Funciona a Ativação?</h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto font-medium">
            Em apenas 3 passos simples a sua empresa estará pronta para atender e vender a qualquer horário.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Escolha seu Plano", desc: "Fale com nossos consultores no WhatsApp e defina a melhor solução para o seu negócio.", icon: MessageSquare, color: "text-indigo-400" },
            { step: "02", title: "Configuração em 24h", desc: "Nossa equipe estrutura seu site, organiza seus dados e conecta seu WhatsApp.", icon: Cpu, color: "text-purple-400" },
            { step: "03", title: "Atendimento no Ar", desc: "Seu sistema entra em funcionamento atendendo clientes, tirando dúvidas e realizando agendamentos.", icon: Rocket, color: "text-emerald-400" },
          ].map((s, idx) => {
            const SIcon = s.icon;
            return (
              <Reveal key={s.step} delay={idx * 150} className="glass-panel p-8 rounded-3xl border border-white/10 text-center relative group hover:border-white/20">
                <span className="absolute top-6 right-6 text-3xl font-black font-mono text-white/10 group-hover:text-white/20 transition-colors">
                  {s.step}
                </span>
                <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 ${s.color}`}>
                  <SIcon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white mb-3">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{s.desc}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-mono font-bold uppercase tracking-widest">
            Clientes Satisfeitos
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">O que dizem os empresários que usam</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Dra. Vanessa Lima",
              role: "Clínica OdontoSmile",
              text: "O atendimento durante a noite é excelente. Os pacientes mandam mensagem de madrugada e já deixam a avaliação agendada. Reduzimos as faltas significativamente!",
              stars: 5,
            },
            {
              name: "Lucas Alencar",
              role: "CEO Moda Urbana Store",
              text: "O envio rápido do Pix na conversa aumentou muito nossa taxa de fechamento. Pagou a mensalidade do sistema logo nos primeiros dias de uso.",
              stars: 5,
            },
            {
              name: "Rodrigo Mendes",
              role: "Mendes Assistência Técnica",
              text: "Antes eu perdia muitos clientes por demorar a responder enquanto estava em atendimento. Agora o sistema passa orçamentos com mensagens claras e áudios naturais.",
              stars: 5,
            },
          ].map((t, idx) => (
            <Reveal key={idx} delay={idx * 150} className="glass-panel p-8 rounded-3xl border border-white/10 space-y-4">
              <div className="flex gap-1">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">&ldquo;{t.text}&rdquo;</p>
              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                  {t.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{t.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{t.role}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 border-t border-white/10">
        <Reveal className="text-center space-y-4 mb-14">
          <span className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Perguntas Frequentes</h2>
        </Reveal>

        <div className="space-y-4">
          <FaqItem
            question="Preciso de conhecimentos técnicos para usar a plataforma?"
            answer="Não! Nossa equipe realiza toda a configuração e entrega o sistema pronto em até 24 horas. Você só precisa conectar seu WhatsApp escaneando o QR Code."
          />
          <FaqItem
            question="Como funciona a isenção de R$ 997 na criação do site?"
            answer="Ao assinar qualquer plano de atendimento (Start, Growth ou Scale), zeramos a taxa de desenvolvimento do seu site. O site fica pronto e no ar sem custos adicionais."
          />
          <FaqItem
            question="O envio de mensagens é seguro no WhatsApp?"
            answer="Sim! O sistema utiliza intervalos naturais entre as respostas, simulando a digitação de um atendente humano para garantir estabilidade e segurança."
          />
          <FaqItem
            question="Posso cancelar meu plano quando quiser?"
            answer="Sim! Não exigimos contrato de fidelidade. Você pode cancelar sua assinatura mensal a qualquer momento sem taxas ou multas."
          />
          <FaqItem
            question="E se eu quiser comprar apenas o código do site avulso?"
            answer="Basta selecionar a guia 'Apenas Código do Sistema Avulso' na tabela de preços para realizar a compra única com entregável completo."
          />
        </div>
      </section>

      {/* ── Radiant Final CTA ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/10">
        <Reveal>
          <div className="rounded-[3rem] bg-gradient-to-br from-indigo-950/80 via-slate-900 to-emerald-950/70 p-10 sm:p-16 border border-white/15 text-center space-y-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-mono font-extrabold uppercase tracking-widest">
              🔥 Comece Ainda Hoje
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
              Pronto para ter seu atendimento no WhatsApp rodando 24 horas por dia?
            </h2>

            <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto font-medium">
              Fale com a nossa equipe agora mesmo e coloque seu atendimento automático no ar em menos de 24 horas.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center justify-center gap-3 group"
              >
                <MessageSquare className="w-5 h-5 fill-current" /> Falar no WhatsApp Agora
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href="/login"
                className="px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl text-slate-200 font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                Acessar Painel do Cliente
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-[#02050e] text-slate-400">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Col 1 */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5">
                <div className="w-full h-full bg-[#030712] rounded-[10px] flex items-center justify-center p-1">
                  <img src="/nexus-logo.png" alt="Nexus AI" className="w-full h-full object-contain" />
                </div>
              </div>
              <span className="font-black text-lg text-white">NEXUS</span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Plataforma completa de automação e atendimento de vendas para pequenas, médias e grandes empresas.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">Nossas Soluções</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#recursos" className="hover:text-white transition-colors">Atendimento WhatsApp 24h</a></li>
              <li><a href="/templates/landing-page" className="hover:text-white transition-colors">Landing Pages Premium</a></li>
              <li><a href="/templates/ecommerce" className="hover:text-white transition-colors">E-Commerce &amp; Loja Virtual</a></li>
              <li><a href="#calculadora" className="hover:text-white transition-colors">Calculadora de ROI</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">Links Úteis</h4>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#planos" className="hover:text-white transition-colors">Planos &amp; Preços</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Painel do Cliente</Link></li>
              <li><a href={WHATSAPP_VENDEDOR} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Seja um Parceiro/Vendedor</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Central de Ajuda</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-widest">Contato &amp; Suporte</h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  (88) 98188-5499
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <a href="mailto:contato@nexusai.com.br" className="hover:text-white">
                  contato@nexusai.com.br
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-purple-400" />
                Brasil • Atendimento Nacional
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-400">
            <span>&copy; {new Date().getFullYear()} Nexus Technology. Todos os direitos reservados.</span>
            <div className="flex items-center gap-6 font-medium">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Fixed Floating WhatsApp Button ── */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all duration-300 group"
        title="Falar com Consultor no WhatsApp"
      >
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#030712] rounded-full animate-ping" />
        <MessageSquare className="w-6 h-6 text-white fill-current group-hover:rotate-6 transition-transform" />
      </a>
    </main>
  );
}
