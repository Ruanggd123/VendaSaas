"use client";

import { useState, useEffect } from "react";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
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
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/25"
    >
      {saving ? "Salvando..." : label}
    </button>
  );
}

function Alert({ type, message, onClose }: {
  type: "success" | "error"; message: string; onClose: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-bold border shadow-sm ${
      type === "success"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
        : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 font-black">✕</button>
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
    <div className="space-y-10 text-slate-900 dark:text-white">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* LOJA DE MÓDULOS SETORIAIS */}
      <section className="space-y-4">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              🏪 Loja de Especialidades (Multissetorial)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Transforme sua IA em um funcionário especialista no seu ramo de negócio. (Ative apenas 1 por vez).</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-white/10 transition-all active:scale-95 flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            {showAddForm ? "Cancelar Criação" : "➕ Nova Especialidade"}
          </button>
        </header>

        {showAddForm && (
          <div className="mb-8 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 space-y-4 max-w-2xl shadow-md">
            <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">🛠️ Criar Especialidade Customizada</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Identificador Técnico*</label>
                <input
                  type="text"
                  placeholder="ex: petshop"
                  value={newMod.key}
                  onChange={e => setNewMod(p => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Ícone Emoji</label>
                <input
                  type="text"
                  placeholder="🐶"
                  value={newMod.icon}
                  onChange={e => setNewMod(p => ({ ...p, icon: e.target.value }))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Título Comercial*</label>
              <input
                type="text"
                placeholder="ex: Clínica Veterinária & Petshop"
                value={newMod.title}
                onChange={e => setNewMod(p => ({ ...p, title: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Descrição Curta*</label>
              <input
                type="text"
                placeholder="Breve resumo da especialidade para o usuário..."
                value={newMod.description}
                onChange={e => setNewMod(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Prompt do Sistema (Comportamento da IA)*</label>
              <textarea
                rows={4}
                placeholder="Você atua como Atendente de Petshop..."
                value={newMod.system_prompt}
                onChange={e => setNewMod(p => ({ ...p, system_prompt: e.target.value }))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={addCustomModule}
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md"
            >
              Salvar Especialidade
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allSectorModules.map((mod: any) => {
            const isActive = activeSectorModules.includes(mod.key);
            return (
              <div
                key={mod.key}
                className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                  isActive
                    ? "bg-indigo-50/90 dark:bg-indigo-500/15 border-2 border-indigo-500 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-white/10 hover:border-indigo-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 bg-slate-100 dark:bg-slate-800 rounded-2xl shrink-0">{mod.icon}</span>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                          {mod.title}
                          {mod.isCustom && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-bold uppercase">
                              Custom
                            </span>
                          )}
                        </h4>
                      </div>
                    </div>
                    <Toggle enabled={isActive} onChange={() => toggleSector(mod.key)} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-4">
                    {mod.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => startEdit(mod)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    ✏️ Configurar Prompt
                  </button>
                  {mod.isCustom && (
                    <button
                      type="button"
                      onClick={() => deleteCustomModule(mod.key)}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline ml-auto"
                    >
                      🗑️ Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MÓDULOS DE AUTOMAÇÃO PADRÃO */}
      <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-white/10">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">⚙️ Módulos de Automação Padrão</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Ative ou desative recursos do sistema</p>
        </div>

        <div className="space-y-3">
          {standardModuleList.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.icon}</span>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{m.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{m.description}</p>
                </div>
              </div>
              <Toggle enabled={modules[m.key]} onChange={() => toggleStandard(m.key)} />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <SaveButton saving={saving} onClick={save} label="Salvar Módulos Padrão" />
        </div>
      </section>
    </div>
  );
}
