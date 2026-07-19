'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Clock, 
  ShoppingBag, 
  PhoneCall,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  Coins
} from "lucide-react";

interface Product {
  name: string;
  price: string;
  description: string;
  duration_min?: number;
  requires_payment?: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [aiPersonality, setAiPersonality] = useState("profissional");
  const [customPrompt, setCustomPrompt] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  
  const [hoursStart, setHoursStart] = useState("08:00");
  const [hoursEnd, setHoursEnd] = useState("18:00");
  const [businessDays, setBusinessDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [offHoursMessage, setOffHoursMessage] = useState("Olá! Estamos fora do horário de atendimento. Retornaremos em breve! 🌙");
  
  const [moduleScheduling, setModuleScheduling] = useState(true);
  const [modulePayments, setModulePayments] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([{ name: "", price: "", description: "" }]);

  const DAYS = [
    { id: "mon", label: "Seg" }, { id: "tue", label: "Ter" }, { id: "wed", label: "Qua" },
    { id: "thu", label: "Qui" }, { id: "fri", label: "Sex" }, { id: "sat", label: "Sáb" }, { id: "sun", label: "Dom" }
  ];

  // Carrega configurações existentes se houver
  useEffect(() => {
    async function loadTenantData() {
      try {
        const res = await fetch("/api/settings/whatsapp");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            const settings = data.settings || {};
            
            if (settings.ai_name) setCompanyName(settings.ai_name);
            if (settings.ai_personality) setAiPersonality(settings.ai_personality);
            if (settings.ai_prompt) setCustomPrompt(settings.ai_prompt);
            if (settings.manager_phone) setManagerPhone(settings.manager_phone);
            if (settings.business_hours_start) setHoursStart(settings.business_hours_start);
            if (settings.business_hours_end) setHoursEnd(settings.business_hours_end);
            if (settings.business_days) setBusinessDays(settings.business_days);
            if (settings.off_hours_message) setOffHoursMessage(settings.off_hours_message);
            if (settings.module_scheduling !== undefined) setModuleScheduling(settings.module_scheduling);
            if (settings.module_payments !== undefined) setModulePayments(settings.module_payments);
            
            if (settings.products && settings.products.length > 0) {
              setProducts(settings.products.map((p: any) => ({
                name: p.name || "",
                price: p.price || "",
                description: p.description || ""
              })));
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar configurações do tenant:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    loadTenantData();
  }, []);

  const toggleDay = (id: string) => {
    setBusinessDays(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // 1. Fetch current settings to preserve other variables
      const resSettings = await fetch("/api/settings/whatsapp");
      const currentTenant = await resSettings.json();
      const currentSettings = currentTenant.settings || {};

      // 2. Merge with new/edited data
      const newSettings = {
        ...currentSettings,
        ai_name: companyName,
        ai_personality: aiPersonality,
        ai_prompt: aiPersonality === "personalizada" ? customPrompt : getPresetPrompt(aiPersonality, companyName),
        manager_phone: managerPhone,
        business_hours_start: hoursStart,
        business_hours_end: hoursEnd,
        business_days: businessDays,
        off_hours_message: offHoursMessage,
        module_scheduling: moduleScheduling,
        module_payments: modulePayments,
        products: products.filter(p => p.name.trim() !== "").map(p => ({
          name: p.name,
          price: p.price,
          description: p.description,
          duration_min: 60,
          requires_payment: false
        }))
      };

      // 3. Save
      await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });

      // Redireciona para o painel de configurações (Tabs)
      router.push("/settings");
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#07070a] text-slate-900 dark:text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mb-4 z-10"></div>
        <p className="text-slate-500 dark:text-zinc-400 text-sm z-10 font-medium">Carregando perfil corporativo...</p>
      </div>
    );
  }

  const stepsInfo = [
    { title: "Empresa", icon: <Building2 className="w-4 h-4" /> },
    { title: "Contato", icon: <PhoneCall className="w-4 h-4" /> },
    { title: "Atendimento", icon: <Clock className="w-4 h-4" /> },
    { title: "Recursos", icon: <ShieldCheck className="w-4 h-4" /> },
    { title: "Produtos", icon: <ShoppingBag className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-transparent text-slate-900 dark:text-white p-4 relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-3xl bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative z-10 flex flex-col">
        
        {/* Step Header / Progress Indicators */}
        <div className="mb-10">
          <div className="flex justify-between items-center relative mb-4">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-100 dark:bg-white/5 -z-10"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / (stepsInfo.length - 1)) * 100}%` }}></div>
            
            {stepsInfo.map((info, index) => {
              const active = step >= index + 1;
              const current = step === index + 1;
              return (
                <button 
                  key={index} 
                  onClick={() => setStep(index + 1)}
                  className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${active ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-900 dark:text-white border-transparent shadow-[0_0_20px_rgba(168,85,247,0.4)]" : "bg-black/40 text-zinc-600 border-slate-100 dark:border-white/5 group-hover:bg-slate-100 dark:bg-white/5 group-hover:text-slate-500 dark:text-zinc-400"} ${current ? "scale-110" : ""}`}>
                    {info.icon}
                  </div>
                  <span className={`text-[10px] md:text-xs font-semibold ${current ? "text-purple-400" : active ? "text-slate-600 dark:text-zinc-300" : "text-zinc-600 group-hover:text-slate-500 dark:text-zinc-400"}`}>{info.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-grow min-h-[320px]">
          {/* Step 1: Company Profile */}
          {step === 1 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><Sparkles className="w-3.5 h-3.5" /> Identidade Básica</span>
                <h1 className="text-3xl font-bold mb-2">Configure sua Empresa</h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm">Insira o nome principal e defina o comportamento que a inteligência artificial adotará no atendimento.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Nome da Empresa / Nome da IA</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Barber Shop Matriz"
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Personalidade da IA</label>
                  <select 
                    value={aiPersonality}
                    onChange={(e) => setAiPersonality(e.target.value)}
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors text-sm appearance-none shadow-inner"
                  >
                    <option value="profissional" className="bg-zinc-900">Profissional & Cortês 👔</option>
                    <option value="amigavel" className="bg-zinc-900">Amigável & Prestativo 🤗</option>
                    <option value="descontraido" className="bg-zinc-900">Casual & Jovem ⚡</option>
                    <option value="formal" className="bg-zinc-900">Muito Formal & Direto 💼</option>
                    <option value="personalizada" className="bg-zinc-900">Personalizada ✍️</option>
                  </select>
                </div>
              </div>

              {aiPersonality === "personalizada" && (
                <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Instruções Personalizadas da IA</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Escreva como a IA deve agir, qual o tom de voz e o que responder (ex: Você é a atendente Sofia da empresa X. Ajude os clientes de forma rápida...)"
                    rows={4}
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Emergency contacts */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><PhoneCall className="w-3.5 h-3.5" /> Canal de Escalonamento</span>
                <h1 className="text-3xl font-bold mb-2">Contatos e Gerência</h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm">Defina o número do administrador. A IA mandará alertas ou pausará o atendimento se o cliente solicitar falar com um gerente.</p>
              </div>

              <div className="space-y-4 pt-4 max-w-md">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">WhatsApp do Gerente / Dono</label>
                  <input 
                    type="text" 
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    placeholder="Ex: 5511999998888"
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner"
                  />
                  <p className="text-[10px] text-zinc-500">Insira com o DDI (55) + DDD (ex: 11) + número, sem espaços ou hifens.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Attendance Hours */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><Clock className="w-3.5 h-3.5" /> Cronograma Semanal</span>
                <h1 className="text-3xl font-bold mb-2">Horário de Atendimento</h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm">Configure os dias e horários de funcionamento. Fora deste escopo, a IA enviará a mensagem de ausência.</p>
              </div>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Abertura</label>
                    <input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Fechamento</label>
                    <input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors text-sm shadow-inner" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Dias de Funcionamento</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(day => (
                      <button 
                        key={day.id}
                        onClick={() => toggleDay(day.id)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${businessDays.includes(day.id) ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-900 dark:text-white border-transparent shadow-[0_0_15px_rgba(168,85,247,0.3)]" : "bg-black/40 text-slate-500 dark:text-zinc-400 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:bg-white/5"}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300">Mensagem para Fora do Horário</label>
                  <textarea 
                    value={offHoursMessage}
                    onChange={(e) => setOffHoursMessage(e.target.value)}
                    className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors resize-none h-20 text-sm shadow-inner"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Active Modules */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5" /> Recursos & Permissões</span>
                <h1 className="text-3xl font-bold mb-2">Módulos e Recursos do Robô</h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm">Habilite ou desabilite as funções que a inteligência artificial tem autorização para realizar.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <button 
                  onClick={() => setModuleScheduling(!moduleScheduling)}
                  className={`p-6 rounded-2xl border text-left transition-all flex items-start gap-4 shadow-lg ${moduleScheduling ? "bg-purple-500/10 border-purple-500/30 text-slate-900 dark:text-white shadow-purple-500/5" : "bg-black/40 border-slate-100 dark:border-white/5 text-slate-500 dark:text-zinc-400 hover:bg-white/[0.03]"}`}
                >
                  <div className={`p-2 rounded-xl border ${moduleScheduling ? "bg-purple-500/20 border-purple-500/30 text-purple-400" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-zinc-500"}`}>
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Agendamento</h3>
                    <p className="text-[11px] text-zinc-500 leading-tight">Permite que a IA crie, consulte e reagende horários com base no calendário.</p>
                  </div>
                </button>

                <button 
                  onClick={() => setModulePayments(!modulePayments)}
                  className={`p-6 rounded-2xl border text-left transition-all flex items-start gap-4 shadow-lg ${modulePayments ? "bg-purple-500/10 border-purple-500/30 text-slate-900 dark:text-white shadow-purple-500/5" : "bg-black/40 border-slate-100 dark:border-white/5 text-slate-500 dark:text-zinc-400 hover:bg-white/[0.03]"}`}
                >
                  <div className={`p-2 rounded-xl border ${modulePayments ? "bg-purple-500/20 border-purple-500/30 text-purple-400" : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-zinc-500"}`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Pagamentos</h3>
                    <p className="text-[11px] text-zinc-500 leading-tight">Habilita a IA a consultar cobranças vencidas e enviar links (Pix/Cartão).</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Products/Services */}
          {step === 5 && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><ShoppingBag className="w-3.5 h-3.5" /> Portfólio de Ofertas</span>
                <h1 className="text-3xl font-bold mb-2">Serviços e Produtos</h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm">Atualize os produtos ou serviços cadastrados da sua empresa para que a IA possa vendê-los.</p>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {products.map((prod, i) => (
                  <div key={i} className="p-4 bg-black/40 border border-slate-100 dark:border-white/5 rounded-2xl relative flex flex-col gap-3 shadow-inner">
                    {products.length > 1 && (
                      <button onClick={() => setProducts(products.filter((_, idx) => idx !== i))} className="absolute top-2 right-3 text-zinc-500 hover:text-red-400 text-xs transition-colors">✕ Remover</button>
                    )}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome do Item</label>
                        <input type="text" value={prod.name} onChange={(e) => { const np = [...products]; np[i].name = e.target.value; setProducts(np); }} placeholder="Ex: Corte Degradê" className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 transition-colors" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Preço (R$)</label>
                        <input type="text" value={prod.price} onChange={(e) => { const np = [...products]; np[i].price = e.target.value; setProducts(np); }} placeholder="50.00" className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Descrição para a IA</label>
                      <input type="text" value={prod.description} onChange={(e) => { const np = [...products]; np[i].description = e.target.value; setProducts(np); }} placeholder="Inclui lavagem e finalização..." className="w-full bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-purple-500 transition-colors" />
                    </div>
                  </div>
                ))}
                
                {products.length < 10 && (
                  <button onClick={() => setProducts([...products, { name: "", price: "", description: "" }])} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5 hover:border-purple-500/40 transition-all text-xs font-semibold shadow-inner">
                    + Adicionar outro item ao portfólio
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between pt-6 border-t border-slate-200 dark:border-white/10">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 rounded-xl font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-white/5 transition-all flex items-center gap-1.5 text-sm">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          ) : <div />}

          {step < stepsInfo.length ? (
            <button 
              onClick={() => setStep(step + 1)} 
              disabled={step === 1 && !companyName}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-900 dark:text-white rounded-xl font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed ml-auto active:scale-95"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleFinish} 
              disabled={loading}
              className="px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-900 dark:text-white rounded-xl font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 text-sm disabled:opacity-50 active:scale-95"
            >
              {loading ? "Finalizando..." : "Finalizar & Configurar ✨"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

const getPresetPrompt = (personality: string, name: string) => {
  const aiName = name || "Sofia";
  switch (personality) {
    case "profissional":
      return `Você é a ${aiName}, assistente virtual profissional e direta. Seu objetivo é ajudar o cliente de forma objetiva, mantendo um tom corporativo, polido, educado e focado em resolver as dúvidas de forma ágil.`;
    case "descontraido":
      return `Você é a ${aiName}, assistente virtual descontraída e muito amigável. Use um tom leve, casual, simpático e acolhedor. Converse de forma natural e próxima ao cliente, sendo muito prestativa.`;
    case "amigavel":
      return `Você é a ${aiName}, assistente virtual amigável e prestativa. Use um tom empático, educado e acolhedor. Ajude os clientes tirando suas dúvidas e facilitando o atendimento de forma atenciosa.`;
    case "formal":
      return `Você é a ${aiName}, assistente de atendimento formal e direta. Mantenha a formalidade, use vocabulário polido e formal, focando em passar as informações solicitadas com máxima seriedade e exatidão.`;
    default:
      return "";
  }
};

