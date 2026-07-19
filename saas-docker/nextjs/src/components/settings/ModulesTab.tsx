"use client";

import { useState, useEffect } from "react";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-purple-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SaveButton({ saving, onClick, label = "Salvar Configurações" }: {
  saving: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-500/20"
    >
      {saving ? "Salvando..." : label}
    </button>
  );
}

function Alert({ type, message, onClose }: {
  type: "success" | "error"; message: string; onClose: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
      type === "success"
        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
        : "bg-red-500/10 border border-red-500/20 text-red-300"
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

const DEFAULT_MODULES = {
  module_scheduling: true,
  module_payments: false,
  module_debt_collection: false,
  module_reminders: true,
  module_hybrid_mode: false,
  module_google_calendar: false,
};

type ModuleSettings = typeof DEFAULT_MODULES;

export function ModulesTab() {
  const [modules, setModules] = useState<ModuleSettings>(DEFAULT_MODULES);
  const [activeSectorModules, setActiveSectorModules] = useState<string[]>([]);
  const [customModules, setCustomModules] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMod, setNewMod] = useState({ key: "", title: "", icon: "🏪", description: "", system_prompt: "" });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    // Carrega módulos padrão
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setModules((m) => ({
            ...m,
            ...Object.fromEntries(
              Object.entries(data.settings)
                .filter(([k]) => k.startsWith("module_"))
                .map(([k, v]) => [k, v === true || v === "true"])
            ),
          }));
        }
      });
      
    // Carrega módulos setoriais (Marketplace e Customizados)
    fetch("/api/modules")
      .then(r => r.json())
      .then(data => {
        if (data.activeModules) {
          setActiveSectorModules(data.activeModules.map((m: any) => m.module_name));
        }
        if (data.customModules) {
          setCustomModules(data.customModules);
        }
      });
  }, []);

  const addCustomModule = async () => {
    if (!newMod.key || !newMod.title || !newMod.description || !newMod.system_prompt) {
      setAlert({ type: "error", msg: "Preencha todos os campos obrigatórios." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/modules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMod)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCustomModules(prev => [...prev.filter(m => m.key !== data.customModule.key), data.customModule]);
      setShowAddForm(false);
      setNewMod({ key: "", title: "", icon: "🏪", description: "", system_prompt: "" });
      setAlert({ type: "success", msg: "Especialidade customizada criada! 🚀" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar especialidade." });
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomModule = async (key: string) => {
    try {
      const res = await fetch("/api/modules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
      if (!res.ok) throw new Error();
      setCustomModules(prev => prev.filter(m => m.key !== key));
      setActiveSectorModules(prev => prev.filter(m => m !== key));
      setAlert({ type: "success", msg: "Especialidade excluída com sucesso." });
    } catch {
      setAlert({ type: "error", msg: "Erro ao excluir especialidade." });
    }
  };

  const startEdit = (mod: any) => {
    const existingCustom = customModules.find(c => c.key === mod.key);
    const defaultPrompts: Record<string, string> = {
      odontologia: "Você atua como Recepcionista de Clínica. Você deve ajudar a agendar consultas, informar sobre procedimentos e perguntar sobre convênios. Use vocabulário empático e focado na saúde do paciente.",
      varejo: "Você atua como Vendedor(a) Virtual. Foco em vender, recomendar produtos, ajudar com opções e sugerir itens complementares.",
      assistencia: "Você atua como Especialista em Triagem. Pergunte o modelo do aparelho e os defeitos. Recomende a avaliação técnica.",
      contabilidade: "Você atua como Assistente Contábil/Fiscal. Mantenha um tom profissional, orientando sobre prazos e documentos empresariais."
    };

    setNewMod({
      key: mod.key,
      title: mod.title,
      icon: mod.icon || "🏪",
      description: mod.description,
      system_prompt: existingCustom?.system_prompt || defaultPrompts[mod.key] || ""
    });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStandard = (key: keyof ModuleSettings) =>
    setModules((m) => ({ ...m, [key]: !m[key] }));

  const toggleSector = async (moduleName: string) => {
    const isActivating = !activeSectorModules.includes(moduleName);
    const previousActive = [...activeSectorModules];
    
    // Otimista UI: Apenas 1 módulo ativo por vez
    if (isActivating) {
      setActiveSectorModules([moduleName]);
    } else {
      setActiveSectorModules([]);
    }

    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_name: moduleName, action: isActivating ? "activate" : "deactivate" })
      });
      if (!res.ok) throw new Error();
      setAlert({ type: "success", msg: `Especialidade ${isActivating ? 'ativada' : 'desativada'} com sucesso! 🚀` });
    } catch {
      // Reverte se der erro
      setActiveSectorModules(previousActive);
      setAlert({ type: "error", msg: "Erro ao atualizar especialidade." });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modules),
      });
      if (!res.ok) throw new Error();
      setAlert({ type: "success", msg: "Módulos padrão atualizados com sucesso! ✅" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar módulos." });
    } finally {
      setSaving(false);
    }
  };

  const sectorModulesList = [
    {
      key: "odontologia",
      icon: "🦷",
      title: "Clínica Odontológica / Saúde",
      description: "Habilita a IA como Recepcionista Médica. Ela irá fazer agendamentos, tirar dúvidas sobre procedimentos e convênios usando vocabulário médico adequado."
    },
    {
      key: "varejo",
      icon: "🛍️",
      title: "Varejo & E-commerce",
      description: "Habilita a IA como Vendedora Virtual. Foca em recomendação de looks, venda de produtos, controle de carrinho e fretes."
    },
    {
      key: "assistencia",
      icon: "🔧",
      title: "Assistência Técnica",
      description: "Habilita a IA para pré-diagnóstico. Ela recolhe defeitos de aparelhos (celulares, eletrônicos), passa orçamentos prévios e agenda visitas ou envios."
    },
    {
      key: "contabilidade",
      icon: "📊",
      title: "Escritório de Contabilidade",
      description: "Habilita a IA como Assistente Fiscal. Responde dúvidas sobre guias de impostos, prazos e documentos."
    }
  ];

  const standardModuleList = [
    {
      key: "module_scheduling" as keyof ModuleSettings,
      icon: "📅",
      title: "Agendamento Automático",
      description: "A IA identifica quando o cliente quer marcar algo e agenda automaticamente, verificando os horários disponíveis.",
      warning: null,
    },
    {
      key: "module_payments" as keyof ModuleSettings,
      icon: "💳",
      title: "Vendas com Pagamento",
      description: "A IA gera links de pagamento ao detectar interesse de compra. Se o módulo de Pagamento estiver configurado, o link é gerado automaticamente.",
      warning: "Requer configuração da API de pagamento",
    },
    {
      key: "module_debt_collection" as keyof ModuleSettings,
      icon: "⚠️",
      title: "Cobrança de Inadimplentes",
      description: "O sistema varre diariamente os clientes com pagamentos vencidos e envia cobranças automáticas via WhatsApp com juros/multa configurados.",
      warning: "Use com cuidado — dispara mensagens automáticas",
    },
    {
      key: "module_reminders" as keyof ModuleSettings,
      icon: "🔔",
      title: "Lembretes Automáticos",
      description: "Envia lembretes de compromissos 24h e 1h antes, além de avisos de pagamento pendente.",
      warning: null,
    },
    {
      key: "module_hybrid_mode" as keyof ModuleSettings,
      icon: "👤",
      title: "Modo Híbrido (Humano + IA)",
      description: "Permite que seus atendentes respondam manualmente às conversas. Quando um atendente assume, a IA pausa automaticamente.",
      warning: null,
    },
  ];

  const allSectorModules = [
    ...sectorModulesList,
    ...customModules.map(m => ({
      key: m.key,
      icon: m.icon || "🏪",
      title: m.title,
      description: m.description,
      isCustom: true
    }))
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}
 
      {/* LOJA DE MÓDULOS SETORIAIS */}
      <section>
        <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              🏪 Loja de Especialidades (Multissetorial)
            </h3>
            <p className="text-sm text-zinc-400">Transforme sua IA em um funcionário especialista no seu ramo de negócio. (Ative apenas 1 por vez).</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-xl border border-white/10 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            {showAddForm ? "Cancelar Criação" : "➕ Nova Especialidade"}
          </button>
        </header>

        {showAddForm && (
          <div className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="font-bold text-white flex items-center gap-2">🛠️ Criar Especialidade Customizada</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Identificador Técnico (Sem espaços/acentos)*</label>
                <input
                  type="text"
                  placeholder="ex: petshop"
                  value={newMod.key}
                  onChange={e => setNewMod(p => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Título da Especialidade*</label>
                <input
                  type="text"
                  placeholder="ex: Petshop & Veterinária"
                  value={newMod.title}
                  onChange={e => setNewMod(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Ícone Emoji</label>
                <input
                  type="text"
                  placeholder="🏪"
                  value={newMod.icon}
                  onChange={e => setNewMod(p => ({ ...p, icon: e.target.value }))}
                  className="w-full text-center bg-zinc-900 border border-white/10 rounded-xl px-2 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="col-span-5">
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Descrição Curta (Exibida no Card)*</label>
                <input
                  type="text"
                  placeholder="ex: IA que agenda consultas veterinárias e recomenda rações..."
                  value={newMod.description}
                  onChange={e => setNewMod(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Prompt de Sistema do Especialista (Instruções da IA)*</label>
              <textarea
                placeholder="Você atua como um médico veterinário extremamente calmo e empático. Responda sobre banho e tosa..."
                value={newMod.system_prompt}
                onChange={e => setNewMod(p => ({ ...p, system_prompt: e.target.value }))}
                rows={4}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={addCustomModule}
                disabled={saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-all"
              >
                {saving ? "Salvando..." : "Salvar e Disponibilizar"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allSectorModules.map((mod) => {
            const isActived = activeSectorModules.includes(mod.key);
            return (
              <div 
                key={mod.key} 
                className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  isActived ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{mod.icon}</span>
                      <div>
                        <h4 className="font-bold text-white flex items-center gap-2">
                          {mod.title}
                          {mod.isCustom && (
                            <span className="text-[9px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                              Customizado
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                    {mod.isCustom && (
                      <button
                        onClick={() => deleteCustomModule(mod.key)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                        title="Excluir especialidade"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mb-6">{mod.description}</p>
                </div>
                
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => toggleSector(mod.key)}
                    className={`flex-grow py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActived 
                        ? "bg-white/10 text-white border border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30" 
                        : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg"
                    }`}
                  >
                    {isActived ? "Desativar Módulo" : "Ativar Especialidade"}
                  </button>
                  <button
                    onClick={() => startEdit(mod)}
                    className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 rounded-xl text-sm transition-all flex items-center justify-center shrink-0"
                    title="Editar Prompt / Regras do Especialista"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* COMPORTAMENTOS PADRÃO */}
      <section>
        <header className="mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            ⚙️ Comportamentos Padrão
          </h3>
          <p className="text-sm text-zinc-400">Regras gerais que se aplicam a qualquer setor escolhido acima.</p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
          {standardModuleList.map((mod, i) => (
            <div
              key={mod.key}
              className={`flex items-start justify-between gap-4 p-5 rounded-xl transition-colors hover:bg-white/5 ${
                i < standardModuleList.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <span className="text-2xl mt-0.5">{mod.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white">{mod.title}</h4>
                    {modules[mod.key] && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{mod.description}</p>
                  {mod.warning && (
                    <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
                      <span>⚡</span> {mod.warning}
                    </p>
                  )}
                </div>
              </div>
              <Toggle enabled={modules[mod.key]} onChange={() => toggleStandard(mod.key)} />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <SaveButton saving={saving} onClick={save} label="Salvar Comportamentos Padrão" />
        </div>
      </section>
    </div>
  );
}
