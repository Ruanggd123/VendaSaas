"use client";

import Link from "next/link";
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
} from "lucide-react";

const PHONE = "5588981885499";
const WHATSAPP_LINK = `https://wa.me/${PHONE}?text=${encodeURIComponent("Olá! Vim pelo site e quero saber mais sobre os planos.")}`;
const TEL_LINK = `tel:+${PHONE}`;
const WHATSAPP_VENDEDOR = `https://wa.me/${PHONE}?text=${encodeURIComponent("Olá! Vim pelo site e quero ser vendedor/parceiro Nexus.")}`;

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(28px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const { ref, visible } = useScrollReveal();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1400;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);
  return <span ref={ref} className="tabular-nums">{count}{suffix}</span>;
}

function AnimatedHologram() {
  const SCRIPT = [
    { sender: "bot", text: "Olá! Vi que você quer impulsionar o seu negócio. Como posso te ajudar hoje?" },
    { sender: "user", text: "Quero automatizar minhas vendas no WhatsApp" },
    { sender: "bot", text: "Perfeito! Nossa IA atende, qualifica e agenda seus clientes em segundos. Você só acompanha o dinheiro entrando na conta. 🚀" }
  ];

  const [messages, setMessages] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (index >= SCRIPT.length) {
      setIsTyping(false);
      return;
    }
    
    const isBot = SCRIPT[index].sender === "bot";
    setIsTyping(isBot);
    
    const timer = setTimeout(() => {
      setMessages((prev) => [...prev, SCRIPT[index]]);
      setIsTyping(false);
      setIndex((i) => i + 1);
    }, isBot ? 2500 : 1500);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div className="lg:col-span-5 relative flex justify-center animate-fade-in-left h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-transparent blur-[100px] rounded-full -z-10" />
      <div className="w-full max-w-sm bg-[#0a0f1a]/60 border border-white/20 rounded-[2rem] p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden ring-1 ring-white/10 h-[380px] flex flex-col">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="flex items-center gap-4 border-b border-white/10 pb-5 mb-5 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-500/40 relative">
            <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
            <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-1 relative z-10" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-white">Nexus Assistant</h4>
            <span className="text-xs text-green-400 flex items-center gap-1.5 font-bold uppercase tracking-wider mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" /> Online agora
            </span>
          </div>
        </div>
        
        <div className="flex-1 space-y-4 text-sm font-medium overflow-y-auto pr-2 flex flex-col">
          {messages.map((m, i) => (
            m.sender === "bot" ? (
              <div key={i} className="bg-white/10 rounded-2xl rounded-tl-sm p-4 max-w-[90%] text-slate-200 border border-white/5 shadow-sm animate-fade-in-up">
                {i === 2 && <span className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2"><Bot className="w-4 h-4" /> Nexus IA</span>}
                {m.text}
              </div>
            ) : (
              <div key={i} className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl rounded-tr-sm p-4 max-w-[80%] ml-auto text-white shadow-xl shadow-green-500/20 animate-fade-in-up">
                {m.text}
              </div>
            )
          ))}
          
          {isTyping && (
            <div className="bg-white/10 rounded-2xl rounded-tl-sm p-4 max-w-[40%] text-slate-200 border border-white/5 shadow-sm animate-fade-in-up flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState({ site: "" as string, bot: "" as string, modules: [] as string[] });
  const combo = !!selected.site && !!selected.bot;

  const toggleSite = (id: string) => setSelected((p) => ({ ...p, site: p.site === id ? "" : id }));
  const toggleBot = (id: string) => setSelected((p) => ({ ...p, bot: p.bot === id ? "" : id }));
  const toggleModule = (id: string) => setSelected((p) => ({
    ...p,
    modules: p.modules.includes(id) ? p.modules.filter((m) => m !== id) : [...p.modules, id],
  }));

  const siteData: Record<string, { name: string; desc: string; setup: string; monthly: number }> = {
    site_basic: { name: "Presença Digital", desc: "Landing page de alta conversão", setup: "R$ 997", monthly: 97 },
    site_pro: { name: "Secretária Inteligente", desc: "Site com agendador online automático", setup: "R$ 1.997", monthly: 197 },
    site_ent: { name: "Enterprise", desc: "Loja virtual completa", setup: "R$ 3.497", monthly: 347 },
  };
  const botData: Record<string, { name: string; desc: string; monthly: number }> = {
    bot_starter: { name: "Bot Starter", desc: "Automação com botões", monthly: 97 },
    bot_pro: { name: "Bot Pro IA", desc: "IA que atende e vende 24h", monthly: 197 },
    bot_equipe: { name: "Bot Equipe", desc: "Multi-número com painel", monthly: 397 },
  };

  const getSiteData = (id: string) => siteData[id] || null;
  const getBotData = (id: string) => botData[id] || null;
  const getSiteSetup = (id: string) => siteData[id]?.setup || "";
  const getModuleName = (id: string) => {
    const map: Record<string, string> = { mod_odonto: "Odonto", mod_varejo: "Varejo", mod_assistencia: "Assistência", mod_contabilidade: "Contabilidade" };
    return map[id] || id;
  };

  const getBotMonthly = () => selected.bot ? (botData[selected.bot]?.monthly || 0) : 0;
  const getSiteMonthly = () => selected.site ? (siteData[selected.site]?.monthly || 0) : 0;
  const getModulesMonthly = () => 0;
  const getOriginalMonthly = () => `R$ ${getSiteMonthly() + getBotMonthly() + getModulesMonthly()}`;
  const getTotalMonthly = () => {
    const siteM = getSiteMonthly();
    const botM = combo ? Math.round(getBotMonthly() * 0.8) : getBotMonthly();
    const modM = getModulesMonthly();
    return `R$ ${siteM + botM + modM}`;
  };
  const getSavings = () => {
    if (!combo) return "";
    const saving = Math.round(getBotMonthly() * 0.2);
    return `R$ ${saving}/mês`;
  };
  const getBotPrice = () => combo ? `R$ ${Math.round(getBotMonthly() * 0.8)}` : `R$ ${getBotMonthly()}`;
  const getModulesPrice = () => `R$ ${getBotMonthly()}`;

  const getSummaryText = () => {
    const parts = [];
    if (selected.site) parts.push(siteData[selected.site]?.name);
    if (selected.bot) parts.push(botData[selected.bot]?.name);
    if (combo) parts.push("Combo");
    selected.modules.forEach((m) => parts.push(getModuleName(m)));
    return parts.join(" + ") || "Plano";
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const openWhatsApp = (plan: string) => {
    const text = encodeURIComponent(`Olá! Vim pelo site e quero contratar o plano: ${plan}`);
    window.open(`https://wa.me/${PHONE}?text=${text}`, "_blank");
  };

  return (
    <main className="min-h-screen bg-[#030712] text-white overflow-hidden font-sans relative">
      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/8 blur-[200px] rounded-full -z-10 animate-pulse duration-[8000ms]" />
      <div className="absolute top-[700px] right-1/4 w-[700px] h-[700px] bg-purple-600/8 blur-[220px] rounded-full -z-10" />
      <div className="absolute bottom-[400px] left-1/3 w-[500px] h-[500px] bg-cyan-600/4 blur-[160px] rounded-full -z-10" />

      {/* ── Header ── */}
      <header className="border-b border-white/5 bg-[#030712]/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 overflow-hidden">
              <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <span className="font-extrabold text-lg md:text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">NEXUS</span>
              <span className="text-[8px] md:text-[9px] block text-slate-500 font-mono tracking-widest uppercase">Inteligência &amp; Vendas</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            <a href="#planos" className="text-xs text-slate-400 hover:text-white transition-colors font-medium">Planos</a>
            <a href="#como-funciona" className="text-xs text-slate-400 hover:text-white transition-colors font-medium">Como Funciona</a>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <Link href="/login" className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all hover:border-white/20">
              Entrar
            </Link>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-lg shadow-green-600/20 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> Falar no WhatsApp
            </a>
          </div>

          <button className="md:hidden p-2 text-slate-400 hover:text-white transition-colors" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#030712]/95 backdrop-blur-xl px-6 py-4 space-y-3">
            <a href="#planos" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-300 hover:text-white transition-colors py-2">Planos</a>
            <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-300 hover:text-white transition-colors py-2">Como Funciona</a>
            <div className="border-t border-white/5 pt-3 space-y-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-center py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold transition-all hover:bg-white/10">
                Entrar na Plataforma
              </Link>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="block text-center py-3 bg-gradient-to-r from-green-600 to-green-500 rounded-xl text-sm font-bold">
                Falar no WhatsApp
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 md:pt-32 pb-24 md:pb-40 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/10 animate-fade-in">
            <Sparkles className="w-4 h-4 text-indigo-400" /> A Nova Era da Automação
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] text-white animate-fade-in-up">
            Venda no <br className="hidden lg:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 animate-gradient-x">piloto automático.</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium animate-fade-in-up animation-delay-200">
            Chega de perder clientes por demora no atendimento. Nossos Sistemas Premium e Inteligências Artificiais agendam, qualificam e fecham vendas para você <strong className="text-white">24 horas por dia, 7 dias por semana.</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start pt-4 animate-fade-in-up animation-delay-400">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="group px-8 py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black rounded-2xl shadow-2xl shadow-green-500/30 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 text-lg">
              <MessageSquare className="w-5 h-5" /> Falar com um Consultor
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#portfolio" className="px-8 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all duration-300 flex items-center justify-center gap-2 hover:border-white/20 text-lg group">
              Ver Demonstrações <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity group-hover:translate-x-1" />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start pt-6 animate-fade-in-up animation-delay-600 opacity-80">
            {["Sem setup complexo", "Suporte dedicado VIP", "Ativação em 24h"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                <CheckCircle2 className="w-5 h-5 text-green-500" /> <span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bot Preview Hologram Animated */}
        <AnimatedHologram />
      </section>

      {/* ── Metrics ── */}
      <section className="border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 500, suffix: "+", label: "Clientes ativos", color: "from-indigo-400 to-purple-400" },
            { value: 98, suffix: "%", label: "Satisfação", color: "from-green-400 to-emerald-400" },
            { value: 24, suffix: "/7", label: "Suporte online", color: "from-amber-400 to-orange-400" },
            { value: 3, suffix: "x", label: "Mais conversões", color: "from-cyan-400 to-blue-400" },
          ].map((m) => (
            <div key={m.label} className="text-center space-y-1">
              <p className={`text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${m.color}`}>
                <CountUp target={m.value} suffix={m.suffix} />
              </p>
              <p className="text-[10px] md:text-xs text-slate-500 font-mono uppercase tracking-wider">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Portfólio / Exemplos ── */}
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-600/10 blur-[150px] rounded-full -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[150px] rounded-full -z-10 pointer-events-none" />

        <Reveal className="text-center space-y-4 mb-16 relative z-10">
          <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-full text-purple-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-purple-500/5">Demonstração ao vivo</span>
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Experimente o Futuro</h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto font-medium">Não acredite apenas na nossa palavra. Teste agora mesmo a qualidade absurda dos sistemas que vamos construir para o seu negócio.</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Reveal delay={100} className="group relative rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 block hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)]">
            <Link href="/templates/landing-page" className="block w-full h-full">
              <div className="aspect-[4/3] w-full relative">
                <img src="/images/website_mockup.png" alt="Site Institucional" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="p-8 absolute bottom-0 left-0 w-full z-10">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 border border-blue-500/30 backdrop-blur-md">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Landing Page</h3>
                <p className="text-sm text-slate-300 font-medium line-clamp-2">Acesse agora uma demonstração real de como seu site de alta conversão ficará.</p>
                <div className="mt-5 flex items-center gap-2 text-blue-400 text-sm font-bold opacity-80 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  Acessar Demonstração <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </Reveal>
          
          <Reveal delay={200} className="group relative rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 block hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.3)]">
            <Link href="/templates/ecommerce" className="block w-full h-full">
              <div className="aspect-[4/3] w-full relative">
                <img src="/images/store_mockup.png" alt="Loja Virtual" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="p-8 absolute bottom-0 left-0 w-full z-10">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4 border border-orange-500/30 backdrop-blur-md">
                  <ShoppingBag className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">E-Commerce</h3>
                <p className="text-sm text-slate-300 font-medium line-clamp-2">Teste a experiência de compra perfeita que seus clientes terão na sua loja virtual.</p>
                <div className="mt-5 flex items-center gap-2 text-orange-400 text-sm font-bold opacity-80 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  Acessar Demonstração <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </Reveal>
          
          <Reveal delay={300} className="group relative rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 block hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(34,197,94,0.3)]">
            <Link href="/templates/whatsapp-bot" className="block w-full h-full">
              <div className="aspect-[4/3] w-full relative">
                <img src="/images/chat_mockup.png" alt="Bot IA" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/80 to-transparent opacity-90 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="p-8 absolute bottom-0 left-0 w-full z-10">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 border border-green-500/30 backdrop-blur-md">
                  <Bot className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Bot IA de Vendas</h3>
                <p className="text-sm text-slate-300 font-medium line-clamp-2">Veja como a nossa IA atende perfeitamente como se fosse um humano pelo WhatsApp.</p>
                <div className="mt-5 flex items-center gap-2 text-green-400 text-sm font-bold opacity-80 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                  Acessar Demonstração <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Monte seu Plano ── */}
      <section id="planos" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-mono uppercase tracking-wider">Monte seu Plano</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">O que você precisa?</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">Escolha seu site, seu bot e complete com módulos especializados. Se levar site + bot, ganha desconto no combo.</p>
        </Reveal>

        <Reveal>
          <div className="max-w-5xl mx-auto space-y-10">

            {/* ── STEP 1: Sites ── */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <span className="text-xs font-black text-indigo-400">1</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Escolha seu Site</h3>
                  <p className="text-[11px] text-slate-500">Pagamento único + mensalidade de manutenção</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: "site_basic",
                    icon: Globe,
                    name: "Presença Digital",
                    desc: "Landing page de alta conversão",
                    setup: "R$ 997",
                    monthly: "R$ 97/mês",
                    features: ["Design responsivo", "SEO otimizado", "WhatsApp integrado", "1 ano hospedagem grátis"],
                    color: "indigo",
                    tag: null,
                  },
                  {
                    id: "site_pro",
                    icon: Rocket,
                    name: "Secretária Inteligente",
                    desc: "Site com agendador online automático",
                    setup: "R$ 1.997",
                    monthly: "R$ 197/mês",
                    features: ["Tudo do Presença Digital", "Agendador online 24/7", "Painel de horários", "Confirmação automática"],
                    color: "purple",
                    tag: "Popular",
                  },
                  {
                    id: "site_ent",
                    icon: ShoppingBag,
                    name: "Enterprise",
                    desc: "Loja virtual completa (e-commerce)",
                    setup: "R$ 3.497",
                    monthly: "R$ 347/mês",
                    features: ["Catálogo de produtos", "Carrinho e pagamento", "Gestão de pedidos", "Tudo do Secretária Inteligente"],
                    color: "amber",
                    tag: "Premium",
                  },
                ].map((s) => {
                  const Icon = s.icon;
                  const isActive = selected.site === s.id;
                  const cMap: Record<string, { border: string; ring: string; icon: string; iconBg: string; tag: string }> = {
                    indigo: { border: "border-indigo-500/30", ring: "ring-indigo-500/30", icon: "text-indigo-400", iconBg: "bg-indigo-500/10 border-indigo-500/20", tag: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                    purple: { border: "border-purple-500/30", ring: "ring-purple-500/30", icon: "text-purple-400", iconBg: "bg-purple-500/10 border-purple-500/20", tag: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                    amber: { border: "border-amber-500/30", ring: "ring-amber-500/30", icon: "text-amber-400", iconBg: "bg-amber-500/10 border-amber-500/20", tag: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                  };
                  const st = cMap[s.color];
                  return (
                    <button key={s.id} onClick={() => toggleSite(s.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                        isActive
                          ? `${st.border} bg-white/[0.04] shadow-lg ring-1 ${st.ring}`
                          : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      {s.tag && (
                        <span className={`absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${st.tag}`}>{s.tag}</span>
                      )}
                      <div className={`w-10 h-10 rounded-xl ${st.iconBg} border flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${st.icon}`} />
                      </div>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 mb-3">{s.desc}</p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-lg font-black text-white">{s.setup}</span>
                        <span className="text-[10px] text-slate-500">setup</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mb-3">+ {s.monthly} manutenção</div>
                      <ul className="space-y-1.5">
                        {s.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <CheckCircle2 className="w-3 h-3 text-green-500/70 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className={`mt-4 w-full py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                        isActive ? `${st.border} bg-white/5 text-white` : "border-white/10 text-slate-500"
                      }`}>
                        {isActive ? "Selecionado" : "Selecionar"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 2: Bots ── */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <span className="text-xs font-black text-purple-400">2</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Escolha seu Bot</h3>
                  <p className="text-[11px] text-slate-500">Atendente automatizado no WhatsApp</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: "bot_starter",
                    icon: Zap,
                    name: "Bot Starter",
                    desc: "Automação com botões e menu",
                    price: "R$ 97/mês",
                    features: ["Menu de opções numerado", "Respostas rápidas", "Agendamento guiado", "1 número WhatsApp"],
                    color: "cyan",
                    tag: null,
                  },
                  {
                    id: "bot_pro",
                    icon: Bot,
                    name: "Bot Pro IA",
                    desc: "IA que atende e vende 24h",
                    price: "R$ 197/mês",
                    features: ["Conversa livre e natural", "Qualificação de leads", "Memória de conversa", "Relatórios de desempenho"],
                    color: "purple",
                    tag: "Mais Vendido",
                  },
                  {
                    id: "bot_equipe",
                    icon: Users,
                    name: "Bot Equipe",
                    desc: "Multi-número com painel",
                    price: "R$ 397/mês",
                    features: ["Até 3 números WhatsApp", "Painel multi-atendente", "Transferência para humano", "Tudo do Bot Pro IA"],
                    color: "emerald",
                    tag: "Avançado",
                  },
                ].map((b) => {
                  const Icon = b.icon;
                  const isActive = selected.bot === b.id;
                  const cMap: Record<string, { border: string; ring: string; icon: string; iconBg: string; tag: string }> = {
                    cyan: { border: "border-cyan-500/30", ring: "ring-cyan-500/30", icon: "text-cyan-400", iconBg: "bg-cyan-500/10 border-cyan-500/20", tag: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
                    purple: { border: "border-purple-500/30", ring: "ring-purple-500/30", icon: "text-purple-400", iconBg: "bg-purple-500/10 border-purple-500/20", tag: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                    emerald: { border: "border-emerald-500/30", ring: "ring-emerald-500/30", icon: "text-emerald-400", iconBg: "bg-emerald-500/10 border-emerald-500/20", tag: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                  };
                  const st = cMap[b.color];
                  return (
                    <button key={b.id} onClick={() => toggleBot(b.id)}
                      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                        isActive
                          ? `${st.border} bg-white/[0.04] shadow-lg ring-1 ${st.ring}`
                          : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      {b.tag && (
                        <span className={`absolute top-3 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${st.tag}`}>{b.tag}</span>
                      )}
                      <div className={`w-10 h-10 rounded-xl ${st.iconBg} border flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${st.icon}`} />
                      </div>
                      <h4 className="text-sm font-bold text-white">{b.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 mb-3">{b.desc}</p>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-lg font-black text-white">{b.price}</span>
                      </div>
                      <ul className="space-y-1.5">
                        {b.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[11px] text-slate-400">
                            <CheckCircle2 className="w-3 h-3 text-green-500/70 shrink-0 mt-0.5" /> {f}
                          </li>
                        ))}
                      </ul>
                      <div className={`mt-4 w-full py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                        isActive ? `${st.border} bg-white/5 text-white` : "border-white/10 text-slate-500"
                      }`}>
                        {isActive ? "Selecionado" : "Selecionar"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 3: Módulos (BÔNUS) ── */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <span className="text-xs font-black text-emerald-400">3</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Módulos Especializados <span className="text-emerald-400 font-bold">(bônus grátis)</span></h3>
                  <p className="text-[11px] text-slate-500">Transforme sua IA em especialista do seu ramo — sem custo</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { id: "mod_odonto", icon: Heart, name: "Odontologia", desc: "Recepção IA para clínicas", color: "rose" },
                  { id: "mod_varejo", icon: ShoppingBag, name: "Varejo", desc: "IA vendedora virtual", color: "amber" },
                  { id: "mod_assistencia", icon: Wrench, name: "Assistência Técnica", desc: "Pré-diagnóstico automático", color: "cyan" },
                  { id: "mod_contabilidade", icon: Calculator, name: "Contabilidade", desc: "Assistente fiscal", color: "teal" },
                ].map((m) => {
                  const Icon = m.icon;
                  const isActive = selected.modules.includes(m.id);
                  const cMap: Record<string, { border: string; ring: string; icon: string; iconBg: string }> = {
                    rose: { border: "border-rose-500/30", ring: "ring-rose-500/30", icon: "text-rose-400", iconBg: "bg-rose-500/10 border-rose-500/20" },
                    amber: { border: "border-amber-500/30", ring: "ring-amber-500/30", icon: "text-amber-400", iconBg: "bg-amber-500/10 border-amber-500/20" },
                    cyan: { border: "border-cyan-500/30", ring: "ring-cyan-500/30", icon: "text-cyan-400", iconBg: "bg-cyan-500/10 border-cyan-500/20" },
                    teal: { border: "border-teal-500/30", ring: "ring-teal-500/30", icon: "text-teal-400", iconBg: "bg-teal-500/10 border-teal-500/20" },
                  };
                  const st = cMap[m.color];
                  return (
                    <button key={m.id} onClick={() => toggleModule(m.id)}
                      className={`text-center p-4 rounded-2xl border-2 transition-all duration-300 ${
                        isActive
                          ? `${st.border} bg-white/[0.04] shadow-lg ring-1 ${st.ring}`
                          : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${st.iconBg} border flex items-center justify-center mx-auto mb-2`}>
                        <Icon className={`w-5 h-5 ${st.icon}`} />
                      </div>
                      <h4 className="text-xs font-bold text-white">{m.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <span className="text-[10px] font-bold text-emerald-400">Grátis</span>
                      </div>
                      <div className={`mt-2 w-full py-1.5 rounded-lg text-[10px] font-bold text-center border transition-all ${
                        isActive ? `${st.border} bg-white/5 text-white` : "border-white/10 text-slate-600"
                      }`}>
                        {isActive ? "Selecionado" : "+ Ativar"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── RESUMO / RESULTADO ── */}
            {(selected.site || selected.bot || selected.modules.length > 0) && (
              <Reveal>
                <div className={`bg-[#0a0f1a]/60 border rounded-3xl p-8 backdrop-blur-sm transition-all duration-500 ${
                  combo ? "border-amber-500/30 shadow-lg shadow-amber-500/10" : "border-white/5"
                }`}>
                  {/* Combo Badge */}
                  {combo && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <div className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full text-xs font-bold text-white shadow-lg shadow-amber-500/30 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> Combo Motor de Vendas — Desconto aplicado!
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Resumo */}
                    <div className="space-y-5">
                      <h3 className="text-lg font-bold text-white">Resumo do seu plano</h3>

                      {/* Site selected */}
                      {selected.site && (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-white">{getSiteData(selected.site)?.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{getSiteData(selected.site)?.desc}</p>
                        </div>
                      )}

                      {/* Bot selected */}
                      {selected.bot && (
                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-white">{getBotData(selected.bot)?.name}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{getBotData(selected.bot)?.desc}</p>
                        </div>
                      )}

                      {/* Modules selected */}
                      {selected.modules.length > 0 && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white">Módulos Bônus</span>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400">GRÁTIS</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selected.modules.map((modId) => {
                              const modName = getModuleName(modId);
                              return (
                                <span key={modId} className="px-2 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[10px] text-emerald-300">
                                  {modName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* What's included */}
                      {(selected.site || selected.bot) && (
                        <div className="space-y-2 pt-2">
                          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Incluso:</p>
                          {(selected.site || combo) && (
                            <div className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> Site profissional com design premium
                            </div>
                          )}
                          {(selected.bot || combo) && (
                            <div className="flex items-start gap-2 text-xs text-slate-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> Atendente automatizado no WhatsApp
                            </div>
                          )}
                          {combo && (
                            <>
                              <div className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> Integração total entre site e bot
                              </div>
                              <div className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> Suporte prioritário 24/7
                              </div>
                            </>
                          )}
                          <div className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> Ativação em até 24 horas
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Preço */}
                    <div className="flex flex-col justify-center">
                      <div className={`rounded-2xl p-6 border transition-all ${
                        combo ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20" : "bg-white/[0.03] border-white/5"
                      }`}>
                        {/* Setup */}
                        {selected.site && (
                          <div className="mb-3">
                            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">Setup (pagamento único)</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-white">{getSiteSetup(selected.site)}</span>
                            </div>
                          </div>
                        )}

                        {/* Monthly total */}
                        <div className={selected.site ? "border-t border-white/5 pt-3" : ""}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Mensalidade total</span>
                            {combo && (
                              <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-bold text-green-400">
                                Economize {getSavings()}
                              </span>
                            )}
                          </div>
                          {combo && selected.site && (
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono text-slate-500 line-through">{getOriginalMonthly()}</span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className={`text-3xl font-black ${combo ? "text-amber-400" : "text-white"}`}>{getTotalMonthly()}</span>
                            <span className="text-xs text-slate-400">/mês</span>
                          </div>
                        </div>

                        {selected.modules.length > 0 && (
                          <div className="mt-2 text-[10px] text-emerald-500/70">
                            + {selected.modules.length} {selected.modules.length === 1 ? "módulo bônus" : "módulos bônus"} grátis incluso
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => openWhatsApp(getSummaryText())}
                        className="mt-4 group/btn w-full py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-500/30 flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> {combo ? "Comprar Combo Agora" : "Contratar Agora"}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            )}

            {/* Empty state */}
            {!selected.site && !selected.bot && selected.modules.length === 0 && (
              <div className="bg-[#0a0f1a]/60 border border-white/5 rounded-3xl p-12 backdrop-blur-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-slate-600" />
                </div>
                <p className="text-sm text-slate-500">Selecione acima para montar seu plano personalizado</p>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* ── Como Funciona ── */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-white/5">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono uppercase tracking-wider">Simples &amp; Rápido</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Como funciona?</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">Em 3 passos simples você já está com seu sistema rodando e vendendo.</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-amber-500/30" />
          {[
            { step: "01", title: "Entre em contato", desc: "Fale conosco pelo WhatsApp e escolha o plano ideal para o seu negócio.", icon: MessageSquare, color: "indigo" },
            { step: "02", title: "Ativação rápida", desc: "Nossa equipe configura tudo e ativa seu sistema em até 24 horas.", icon: Headphones, color: "purple" },
            { step: "03", title: "Comece a vender", desc: "Seu site e bot estão no ar. Receba contatos e feche vendas automaticamente.", icon: Rocket, color: "amber" },
          ].map((s, i) => {
            const Icon = s.icon;
            const cMap: Record<string, string> = { indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400", purple: "bg-purple-500/10 border-purple-500/20 text-purple-400", amber: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
            return (
              <Reveal key={s.step} delay={i * 150} className="relative">
                <div className="text-center space-y-5">
                  <div className="relative inline-flex">
                    <div className={`w-16 h-16 rounded-2xl ${cMap[s.color]} border flex items-center justify-center`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#0a0f1a] border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-white">{s.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{s.title}</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">{s.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-white/5">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs font-mono uppercase tracking-wider">Por que a Nexus?</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Tecnologia que gera resultado</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: MessageSquare, title: "Atendimento 24/7", desc: "Seus clientes são atendidos automaticamente a qualquer hora, sem interrupção.", color: "green" },
            { icon: TrendingUp, title: "Vendas Automatizadas", desc: "IA qualifica leads, envia propostas e fecha vendas no piloto automático.", color: "purple" },
            { icon: ShieldCheck, title: "Blindagem Total", desc: "Sistema anti-fraude, dados criptografados e proteção avançada.", color: "amber" },
            { icon: Gauge, title: "Performance Extrema", desc: "Carregamento instantâneo e conversão otimizada em todos os dispositivos.", color: "cyan" },
          ].map((f, i) => {
            const Icon = f.icon;
            const cMap: Record<string, string> = { green: "bg-green-500/10 border-green-500/20 text-green-400", purple: "bg-purple-500/10 border-purple-500/20 text-purple-400", amber: "bg-amber-500/10 border-amber-500/20 text-amber-400", cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" };
            return (
              <Reveal key={f.title} delay={i * 100}>
                <div className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]">
                  <div className={`w-12 h-12 rounded-xl ${cMap[f.color]} border flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{f.title}</h4>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-white/5">
        <Reveal className="text-center space-y-4 mb-16">
          <span className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-mono uppercase tracking-wider">Depoimentos</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Quem já usa, recomenda</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Carlos Mendoza", role: "Dono de Loja Virtual", text: "Em 15 dias meu faturamento dobrou. O bot atende melhor que muitos vendedores humanos. Incrível!", color: "indigo" },
            { name: "Fernanda Lima", role: "Consultora de Beleza", text: "O site ficou lindo e o bot agenda tudo sozinho. Não perco mais nenhuma cliente. Recomendo demais!", color: "purple" },
            { name: "Roberto Alves", role: "Clínica Odontológica", text: "A automação pelo WhatsApp transformou nossa clínica. Agendamentos subiram 40% no primeiro mês.", color: "amber" },
          ].map((t, i) => {
            const cMap: Record<string, string> = { indigo: "border-indigo-500/10 hover:border-indigo-500/20", purple: "border-purple-500/10 hover:border-purple-500/20", amber: "border-amber-500/10 hover:border-amber-500/20" };
            return (
              <Reveal key={t.name} delay={i * 120}>
                <div className={`bg-[#0a0f1a]/60 border ${cMap[t.color]} rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]`}>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t.name}</p>
                      <p className="text-[10px] text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28 border-t border-white/5">
        <Reveal>
          <div className="text-center space-y-8 bg-gradient-to-br from-green-950/20 via-[#0a0f1a]/60 to-indigo-950/20 rounded-[32px] border border-white/5 p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-green-600/8 blur-[150px] rounded-full -z-10" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Pronto para faturar no piloto automático?</h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto">Comece agora e veja seus resultados decolarem em menos de 24 horas.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold rounded-2xl shadow-lg shadow-green-600/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/30">
                <MessageSquare className="w-5 h-5" /> Começar Agora
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </a>
              <Link href="/login" className="inline-flex items-center gap-2 px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold rounded-2xl transition-all duration-300 hover:border-white/20">
                Já tenho conta — Entrar
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#030712]">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
            {/* Brand */}
            <div className="md:col-span-1 space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden">
                  <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-0.5" />
                </div>
                <span className="font-bold text-white tracking-tight">NEXUS</span>
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed">Inteligência Artificial e automação de vendas para negócios que querem crescer.</p>
              <div className="flex items-center gap-2">
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all" title="WhatsApp">
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
                <a href={`mailto:contato@nexusai.com.br`}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all" title="E-mail">
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Soluções */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Soluções</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Planos & Serviços", href: "#planos" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-xs text-slate-500 hover:text-white transition-colors">{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Empresa */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Empresa</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Como Funciona", href: "#como-funciona" },
                  { label: "Entrar no Painel", href: "/login" },
                  { label: "Ser um Vendedor", href: WHATSAPP_VENDEDOR, external: true },
                ].map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-white transition-colors">{l.label}</a>
                    ) : (
                      <a href={l.href} className="text-xs text-slate-500 hover:text-white transition-colors">{l.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contato</h4>
              <ul className="space-y-3">
                <li>
                  <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-slate-500 hover:text-green-400 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                    (88) 98188-5499
                  </a>
                </li>
                <li>
                  <a href={TEL_LINK} className="flex items-center gap-2.5 text-xs text-slate-500 hover:text-white transition-colors">
                    <Phone className="w-3.5 h-3.5 text-slate-600" />
                    (88) 98188-5499
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@nexusai.com.br" className="flex items-center gap-2.5 text-xs text-slate-500 hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                    contato@nexusai.com.br
                  </a>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                  Brasil
                </li>
              </ul>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs font-bold text-green-400 hover:bg-green-500/20 transition-all mt-2">
                <MessageSquare className="w-3.5 h-3.5" /> Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 py-6">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-[10px] text-slate-600">&copy; 2026 Nexus AI SaaS. Todos os direitos reservados.</span>
            <div className="flex items-center gap-6">
              <a href="#" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Termos de Uso</a>
              <a href="#" className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp Button ── */}
      <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-600/30 hover:scale-110 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/40"
        title="Falar no WhatsApp">
        <MessageSquare className="w-6 h-6 text-white" />
      </a>
    </main>
  );
}
