"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronRight, CheckCircle2, Play, Star, BarChart3, Zap, Shield, Globe, Users, ArrowUpRight } from "lucide-react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
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
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(30px)",
      transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

export default function LightLandingPageDemo() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">TaskFlow.</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
            <a href="#recursos" className="hover:text-blue-600 transition-colors">Recursos</a>
            <a href="#depoimentos" className="hover:text-blue-600 transition-colors">Depoimentos</a>
            <a href="#planos" className="hover:text-blue-600 transition-colors">Planos</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="hidden md:block text-slate-600 font-medium hover:text-slate-900">Login</button>
            <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-lg shadow-slate-900/20">
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Soft Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100/50 blur-[120px] rounded-full -z-10" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-purple-100/50 blur-[100px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-6 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                Novo: Inteligência Artificial Integrada
              </div>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                Organize sua equipe, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  multiplique resultados.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
                O TaskFlow é a plataforma de gestão que une tarefas, comunicação e automação de forma simples e incrivelmente rápida.
              </p>
            </Reveal>
            <Reveal delay={300} className="flex flex-col sm:flex-row items-center gap-4">
              <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-base transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                Comece seu teste de 14 dias <ArrowRight className="w-4 h-4" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-current" /> Ver demonstração
              </button>
            </Reveal>
            
            <Reveal delay={400} className="mt-10 flex items-center gap-4 text-sm text-slate-500 font-medium">
              <div className="flex -space-x-2">
                <img src="https://i.pravatar.cc/100?img=1" alt="User" className="w-8 h-8 rounded-full border-2 border-slate-50" />
                <img src="https://i.pravatar.cc/100?img=2" alt="User" className="w-8 h-8 rounded-full border-2 border-slate-50" />
                <img src="https://i.pravatar.cc/100?img=3" alt="User" className="w-8 h-8 rounded-full border-2 border-slate-50" />
              </div>
              <p>Mais de 10.000 equipes confiam no TaskFlow.</p>
            </Reveal>
          </div>

          {/* Hero Image / Dashboard Mockup */}
          <Reveal delay={400} className="relative lg:ml-10">
            <div className="relative rounded-2xl bg-white p-2 shadow-2xl shadow-slate-200/50 border border-slate-200 transform lg:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000" alt="Dashboard" className="w-full rounded-xl" />
              
              {/* Floating Element */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce [animation-duration:3s]">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Projeto Entregue</p>
                  <p className="text-xs text-slate-500">Há 2 minutos</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-10 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Empresas que confiam na nossa tecnologia</p>
          <div className="flex flex-wrap justify-center gap-10 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Fake Logos using icons/text */}
             <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Globe className="w-6 h-6"/> GlobalTech</div>
             <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Shield className="w-6 h-6"/> SecurIt</div>
             <div className="flex items-center gap-2 font-black text-xl text-slate-800"><BarChart3 className="w-6 h-6"/> DataCorp</div>
             <div className="flex items-center gap-2 font-black text-xl text-slate-800"><Users className="w-6 h-6"/> Synergy</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Tudo que você precisa em um só lugar</h2>
            <p className="text-lg text-slate-600">Chega de usar 5 aplicativos diferentes para gerenciar sua empresa. O TaskFlow centraliza tudo com elegância.</p>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Reveal delay={100} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Relatórios Precisos</h3>
              <p className="text-slate-600 leading-relaxed">Acompanhe a produtividade da sua equipe em tempo real com gráficos visuais fáceis de entender.</p>
            </Reveal>
            
            <Reveal delay={200} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Automação Rápida</h3>
              <p className="text-slate-600 leading-relaxed">Crie regras automáticas para mover tarefas, enviar e-mails e notificar clientes sem trabalho manual.</p>
            </Reveal>
            
            <Reveal delay={300} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Segurança Bancária</h3>
              <p className="text-slate-600 leading-relaxed">Seus dados estão protegidos com criptografia de ponta a ponta e backups diários automáticos.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Showcase / Alternating layout */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal className="order-2 lg:order-1 relative">
               <div className="absolute inset-0 bg-blue-100/50 rounded-3xl transform rotate-3 scale-105 -z-10"></div>
               <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=1000" alt="Equipe trabalhando" className="rounded-3xl shadow-lg border border-slate-100 w-full object-cover" />
            </Reveal>
            <Reveal delay={200} className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6">Feito para equipes que não gostam de perder tempo.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Nossa interface foi desenhada para ser invisível. Menos cliques, menos confusão e muito mais foco no que realmente importa: o crescimento do seu negócio.
              </p>
              <ul className="space-y-4">
                {["Sem curva de aprendizado complexa", "Integração nativa com Slack e Google Drive", "Suporte humano 24 horas por dia"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" /> {item}
                  </li>
                ))}
              </ul>
              <button className="mt-10 flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-colors">
                Ver todas as integrações <ArrowUpRight className="w-4 h-4" />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">O que dizem sobre nós</h2>
          </Reveal>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Reveal delay={100} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex gap-1 text-yellow-400 mb-4"><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/></div>
              <p className="text-slate-700 mb-6 font-medium leading-relaxed">"O TaskFlow mudou a forma como nossa agência opera. Economizamos cerca de 10 horas semanais em processos que antes eram manuais."</p>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/150?img=32" alt="Foto" className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Mariana Silva</h4>
                  <p className="text-xs text-slate-500">CEO, DigitalGrowth</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex gap-1 text-yellow-400 mb-4"><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/></div>
              <p className="text-slate-700 mb-6 font-medium leading-relaxed">"A melhor ferramenta de gestão que já usei. A curva de aprendizado é quase nula e a equipe aderiu no primeiro dia."</p>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/150?img=11" alt="Foto" className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Roberto Almeida</h4>
                  <p className="text-xs text-slate-500">Diretor de Operações</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={300} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex gap-1 text-yellow-400 mb-4"><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/><Star className="w-5 h-5 fill-current"/></div>
              <p className="text-slate-700 mb-6 font-medium leading-relaxed">"O suporte é fenomenal e as novas atualizações de inteligência artificial colocaram a ferramenta em outro nível."</p>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/150?img=5" alt="Foto" className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Carolina Torres</h4>
                  <p className="text-xs text-slate-500">Tech Lead</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Preços simples e transparentes</h2>
            <p className="text-lg text-slate-600">Sem taxas ocultas, cancele a qualquer momento.</p>
          </Reveal>
          
          <div className="grid md:grid-cols-2 lg:w-2/3 mx-auto gap-8">
            <Reveal delay={100} className="bg-white border border-slate-200 rounded-3xl p-8 hover:border-blue-200 hover:shadow-xl transition-all">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Básico</h3>
              <p className="text-slate-500 mb-6 text-sm">Perfeito para pequenas equipes.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-slate-900">R$ 49</span><span className="text-slate-500">/mês</span>
              </div>
              <button className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl mb-6 hover:bg-blue-100 transition-colors">Testar Grátis</button>
              <ul className="space-y-3 text-sm text-slate-600 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Até 5 usuários</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Projetos ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Suporte por email</li>
              </ul>
            </Reveal>

            <Reveal delay={200} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative transform md:-translate-y-4">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Mais Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 mb-6 text-sm">Para times que precisam escalar.</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-white">R$ 99</span><span className="text-slate-400">/mês</span>
              </div>
              <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl mb-6 hover:bg-blue-500 transition-colors">Assinar Agora</button>
              <ul className="space-y-3 text-sm text-slate-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Usuários ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Automações de IA</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Suporte 24/7 (Prioritário)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400" /> Relatórios avançados</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Pronto para transformar a gestão da sua equipe?</h2>
            <p className="text-xl text-blue-100 mb-10">Junte-se a milhares de empresas que já aumentaram sua produtividade.</p>
            <button className="px-10 py-5 bg-white text-blue-900 rounded-full font-extrabold text-lg transition-transform shadow-xl shadow-blue-900/20 hover:scale-105">
              Criar conta gratuita
            </button>
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
