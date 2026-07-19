"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Play, Star, Users, Zap, Shield, Rocket, MonitorSmartphone, MousePointerClick, TrendingUp, Layers } from "lucide-react";

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

export default function TechBoostPresentation() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 blur-[150px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 blur-[150px] rounded-full -z-10 pointer-events-none" />

      {/* Navigation */}
      <nav className="border-b border-white/5 sticky top-0 bg-[#030712]/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">TechBoost.</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button className="bg-white text-slate-900 px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Quero este Modelo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Modelo Premium de Alta Conversão
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white max-w-4xl mx-auto leading-[1.1] mb-8">
              A cereja do bolo dos <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 animate-gradient-x">seus projetos digitais.</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              Apresentamos o <strong>TechBoost</strong>. Não é apenas mais um site; é uma máquina de conversão com visual de revista internacional, criado para te colocar no mesmo patamar das gigantes da tecnologia como Apple, Microsoft e Stripe.
            </p>
          </Reveal>
          <Reveal delay={300} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-black text-lg transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 hover:scale-105">
              Adquirir Modelo TechBoost <ArrowRight className="w-5 h-5" />
            </button>
          </Reveal>

          {/* Holographic Dashboard Preview */}
          <Reveal delay={500} className="mt-20 relative max-w-5xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative rounded-2xl border border-white/10 bg-[#0f172a] p-2 shadow-2xl overflow-hidden ring-1 ring-white/5">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000" alt="Dashboard Preview" className="w-full rounded-xl opacity-80 mix-blend-screen group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Vantagens Section */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5" id="vantagens">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                Visual "Uau" do <br />
                <span className="text-blue-400">Primeiro ao Último Pixel.</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                O front-end do TechBoost foi arquitetado com uma identidade visual arrojada e premium, perfeita para empresas que querem se posicionar como líderes inovadoras no mercado digital.
              </p>
              
              <ul className="space-y-6 mt-8">
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <MonitorSmartphone className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Paleta Noturna Premium</h4>
                    <p className="text-slate-400">Degradê profundo que mescla Azul Royal e Roxo Aurora. O fundo escuro faz com que sua mensagem salte aos olhos e seja lida sem esforço.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Layers className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Glassmorphism & Neon</h4>
                    <p className="text-slate-400">Bordas de vidro fosco com brilhos neon que dão um ar futurista. Causa um impacto visual imediato em qualquer apresentação.</p>
                  </div>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={200} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 translate-y-8">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
                    <MousePointerClick className="w-8 h-8 text-blue-400 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Micro-interações</h4>
                    <p className="text-sm text-slate-400">Botões com preenchimento líquido e brilho externo viciante.</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
                    <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Gatilhos Visuais</h4>
                    <p className="text-sm text-slate-400">Elementos posicionados nos locais de maior atenção térmica do olho humano.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-blue-900/50">
                    <Rocket className="w-8 h-8 text-white mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Animações Dinâmicas</h4>
                    <p className="text-sm text-blue-100">Não é poluição visual; é narrativa que prende a atenção do visitante do início ao fim.</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-colors">
                    <Shield className="w-8 h-8 text-green-400 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">Botões Magnéticos</h4>
                    <p className="text-sm text-slate-400">CTAs que pulsam sutilmente, aumentando a taxa de cadastro em até 40%.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Versatilidade */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Versatilidade Total para Qualquer Nicho</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-16">
              Este modelo é a coringa do seu portfólio. Por ter um design moderno e tecnológico, ele se adapta perfeitamente a diversos mercados.
            </p>
          </Reveal>
          
          <div className="grid md:grid-cols-4 gap-6">
            {["SaaS & Softwares", "Agências de Marketing", "Startups Buscando Investimento", "Marcas Pessoais de Alto Padrão"].map((nicho, i) => (
              <Reveal key={i} delay={i * 100} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-colors flex items-center justify-center text-center">
                <span className="font-bold text-slate-300">{nicho}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Discurso / CTA Final */}
      <section className="py-32 relative overflow-hidden bg-gradient-to-br from-blue-900 via-[#030712] to-purple-900 border-t border-white/10">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Reveal>
            <div className="mb-10 text-6xl text-blue-500/30 font-serif leading-none">"</div>
            <p className="text-2xl md:text-4xl font-bold text-white mb-12 leading-tight tracking-tight">
              O site que fecha vendas <br className="hidden md:block"/> enquanto você dorme.
            </p>
            <p className="text-lg text-blue-200 mb-12 max-w-3xl mx-auto font-medium">
              Imagine seu cliente chegando ao seu site e, em menos de 2 segundos, sentir que está visitando uma plataforma avaliada em milhões de dólares. Com o modelo TechBoost, você entrega isso. Um ativo digital de alto valor agregado que justifica um ticket mais alto.
            </p>
            <button className="px-12 py-5 bg-white text-slate-900 rounded-full font-black text-lg transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 hover:bg-blue-50">
              Quero Vender com o TechBoost
            </button>
          </Reveal>
        </div>
      </section>

      {/* Return Button */}
      <Link href="/" className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-white text-slate-900 rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao Portfólio
      </Link>
    </div>
  );
}
