"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Play, Star, Users, Zap, Shield, Rocket } from "lucide-react";

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

export default function LandingPageDemo() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Top Banner */}
      <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium tracking-wide">
        Oferta especial de lançamento: 50% de desconto no plano anual. <a href="#" className="underline font-bold ml-2">Assine agora</a>
      </div>

      {/* Navigation */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">TechBoost</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
            <a href="#recursos" className="hover:text-blue-600 transition-colors">Recursos</a>
            <a href="#depoimentos" className="hover:text-blue-600 transition-colors">Depoimentos</a>
            <a href="#precos" className="hover:text-blue-600 transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hidden md:block text-sm font-semibold text-slate-600 hover:text-slate-900">Entrar</a>
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"></div>
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
              Novo: Integração nativa com IA
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight mb-8">
              Acelere suas vendas com <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Inteligência</span>.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Plataforma completa para captura de leads, automação de emails e fechamento de vendas em piloto automático. Sem precisar de código.
            </p>
          </Reveal>
          <Reveal delay={300} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 hover:scale-105">
              Criar Conta Gratuita <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-2xl font-bold text-lg transition-all shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50">
              <Play className="w-5 h-5" fill="currentColor" /> Ver Demonstração
            </button>
          </Reveal>
          
          <Reveal delay={400} className="mt-12 flex items-center justify-center gap-6 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Sem cartão de crédito</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Setup em 2 minutos</div>
          </Reveal>

          {/* Dashboard Mockup */}
          <Reveal delay={600} className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10"></div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/50 p-2 shadow-2xl backdrop-blur-3xl">
              <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video relative flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000" alt="Dashboard Preview" className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">Empresas que confiam em nós</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-50 grayscale">
            {/* Logos falsos em texto */}
            <h3 className="text-2xl font-black font-serif">ACME Corp</h3>
            <h3 className="text-2xl font-black tracking-tighter">GlobalTech</h3>
            <h3 className="text-2xl font-bold uppercase">Stark Ind.</h3>
            <h3 className="text-2xl font-black italic">Wayne Ent.</h3>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 bg-white" id="recursos">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Tudo que você precisa para crescer</h2>
              <p className="text-lg text-slate-600">Nossa plataforma oferece ferramentas poderosas desenhadas para aumentar sua taxa de conversão em até 300%.</p>
            </div>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: Rocket, title: "Velocidade Extrema", desc: "Seus sites carregam em milissegundos, garantindo que você nunca perca um lead impaciente." },
              { icon: Shield, title: "Segurança Bancária", desc: "Dados protegidos com criptografia de ponta a ponta. Seus clientes e sua empresa sempre seguros." },
              { icon: Users, title: "CRM Integrado", desc: "Gerencie todos os seus contatos em um só lugar com nossa ferramenta de relacionamento simples e direta." }
            ].map((f, i) => (
              <Reveal key={i} delay={i * 100} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 transition-colors group">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-6 group-hover:scale-110 transition-transform">
                  <f.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">Pronto para dominar o mercado?</h2>
            <p className="text-xl text-blue-100 mb-12">Junte-se a mais de 10.000 empresas que já transformaram suas operações com o TechBoost.</p>
            <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-bold text-lg transition-all shadow-xl hover:scale-105 hover:bg-blue-50">
              Comece seu Teste de 14 Dias Grátis
            </button>
            <p className="mt-6 text-sm text-slate-400">Cancele quando quiser. Sem taxas ocultas.</p>
          </Reveal>
        </div>
      </section>

      {/* Return Button */}
      <Link href="/" className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-slate-900 text-white rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao Nexus
      </Link>
    </div>
  );
}
