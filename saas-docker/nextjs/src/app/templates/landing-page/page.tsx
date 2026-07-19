"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, Layout, MousePointerClick, TrendingUp, MonitorSmartphone, Layers, ShieldCheck, Zap } from "lucide-react";

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
              Adquirir Modelo
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
              O modelo-âncora para o seu portfólio premium
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white max-w-4xl mx-auto leading-[1.1] mb-8">
              TechBoost.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              Não se trata de um template. Trata-se de um <strong>ativo estratégico de posicionamento digital</strong>. O TechBoost foi arquitetado para ser a peça central do seu catálogo de serviços — o projeto que você apresenta quando o cliente exige algo além do óbvio. É o modelo que justifica um ticket elevado porque entrega, visual e estruturalmente, o que 90% das agências não conseguem produzir.
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

      {/* Arquitetura Visual Section */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
                Arquitetura Visual de <br />
                <span className="text-blue-400">Alta Performance.</span>
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                A estética do TechBoost é construída sobre uma premissa clara: <strong>autoridade imediata</strong>.
              </p>
              
              <ul className="space-y-6 mt-8">
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                    <MonitorSmartphone className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Cromática Noturna e Sofisticada</h4>
                    <p className="text-slate-400 leading-relaxed">A fusão entre o Azul Royal profundo e o Roxo Aurora não é aleatória. Essa paleta foi escolhida para transmitir ao mesmo tempo <strong>segurança corporativa</strong> e <strong>inovação tecnológica</strong>. O fundo escuro atua como uma tela de cinema, onde cada elemento ganha protagonismo absoluto.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                    <Layers className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Camadas e Profundidade (Glassmorphism)</h4>
                    <p className="text-slate-400 leading-relaxed">Utilizamos o efeito de vidro fosco e bordas com leve luminescência para criar uma hierarquia de profundidade. Os cards não são planos; eles flutuam, dando a sensação de que o sistema está "vivo" e em camadas.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                    <MousePointerClick className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Microinterações que Geram Fricção Positiva</h4>
                    <p className="text-slate-400 leading-relaxed">Em vez de animações exageradas, aplicamos movimentos sutis de <em>tilt</em> nos cards e <em>hover glow</em> nos botões. Pequenos detalhes que criam uma <strong>experiência tátil e memorável</strong>, aumentando o tempo de permanência.</p>
                  </div>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={200} className="relative">
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-1 shadow-2xl">
                 <img src="https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&q=80&w=800" alt="Interface Abstrata" className="w-full h-[600px] object-cover rounded-2xl opacity-60 mix-blend-screen" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent rounded-3xl"></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Engenharia de Conversão */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Engenharia de Conversão aplicada ao Design</h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">Beleza sem propósito é decoração. No TechBoost, cada pixel possui uma função mercadológica.</p>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Reveal delay={100} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
              <ShieldCheck className="w-10 h-10 text-blue-400 mb-6" />
              <h4 className="text-xl font-bold text-white mb-4">Leitura Térmica do Olhar</h4>
              <p className="text-slate-400 leading-relaxed">Posicionamos os selos e chamadas estrategicamente nos pontos de maior atenção visual (baseados em mapas de calor). O visitante não precisa procurar a oferta; ela encontra o olhar dele.</p>
            </Reveal>
            
            <Reveal delay={200} className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/20 rounded-3xl p-8 shadow-xl shadow-blue-900/20">
              <MousePointerClick className="w-10 h-10 text-white mb-6" />
              <h4 className="text-xl font-bold text-white mb-4">CTAs com Persuasão</h4>
              <p className="text-blue-100 leading-relaxed">O botão principal possui uma pulsação rítmica controlada que atua como um imã visual, reduzindo a taxa de hesitação e direcionando o clique de forma orgânica.</p>
            </Reveal>
            
            <Reveal delay={300} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors">
              <TrendingUp className="w-10 h-10 text-purple-400 mb-6" />
              <h4 className="text-xl font-bold text-white mb-4">Narrativa por Scroll</h4>
              <p className="text-slate-400 leading-relaxed">As animações são reveladas progressivamente, construindo uma argumentação comercial que conduz o lead do "interesse" até a "ação", exatamente como um bom vendedor faria.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Versatilidade */}
      <section className="py-24 relative bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Versatilidade Estratégica</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              A estrutura modular permite adaptação natural a diferentes mercados, sem perder a essência premium.
            </p>
          </Reveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Reveal delay={100} className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-3">SaaS e Startups</h4>
              <p className="text-sm text-slate-400">Transmite maturidade e escalabilidade, essencial para rodadas de investimento.</p>
            </Reveal>
            <Reveal delay={200} className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-3">Agências e Consultorias</h4>
              <p className="text-sm text-slate-400">Funciona como vitrine de credibilidade, mostrando que você entrega o que promete.</p>
            </Reveal>
            <Reveal delay={300} className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-3">Infoprodutos de Alto Ticket</h4>
              <p className="text-sm text-slate-400">O design escuro e tecnológico valoriza o conteúdo, criando percepção de exclusividade.</p>
            </Reveal>
            <Reveal delay={400} className="bg-[#0f172a] border border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-3">Marcas Pessoais (C-Level)</h4>
              <p className="text-sm text-slate-400">Posiciona executivos e líderes como referências inovadoras em seus segmentos.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Discurso / CTA Final */}
      <section className="py-32 relative overflow-hidden bg-gradient-to-br from-blue-900 via-[#030712] to-purple-900">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Reveal>
            <div className="mb-8 text-6xl text-blue-500/30 font-serif leading-none">"</div>
            <p className="text-2xl md:text-3xl font-bold text-white mb-10 leading-relaxed italic">
              Enquanto seus concorrentes utilizam estruturas quadradas e ultrapassadas, seu projeto rodará em uma interface fluida. Em menos de 2 segundos, o visitante entenderá que está lidando com uma empresa avaliada em milhões — e essa percepção é o que antecede qualquer venda.
            </p>
            
            <h3 className="text-xl text-blue-300 font-bold mb-12">O Diferencial que você entrega ao seu cliente.</h3>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-md max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-white mb-4">Pronto para elevar o padrão do seu portfólio.</h2>
              <p className="text-slate-400 mb-8">
                Adquira o TechBoost e tenha na mão o recurso que faltava para desbancar propostas concorrentes e fechar contratos com valores significativamente mais altos.
              </p>
              <button className="w-full sm:w-auto px-12 py-5 bg-white text-slate-900 rounded-full font-black text-lg transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 hover:bg-blue-50">
                Adquirir Modelo TechBoost
              </button>
            </div>
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
