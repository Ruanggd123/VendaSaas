"use client";

import WorkflowCanvas from "./WorkflowCanvas";
import { useState, useEffect } from "react";
import {
  Settings,
  FileCode,
  Sparkles,
  Plus,
  Download,
  X,
  Package,
  Layers,
  Check,
  Copy,
} from "lucide-react";

interface AISettings {
  bot_type?: string;
  ai_name: string;
  ai_personality: string;
  ai_prompt: string;
  business_hours_start: string;
  business_hours_end: string;
  business_days: string[];
  schedule_per_day: Record<string, { enabled: boolean; start: string; end: string; max_appointments: number }>;
  appointment_gap_min: number;
  off_hours_message: string;
  products: any[];
  manager_phone: string;
  custom_rules_nodes?: any[];
  blocked_dates: string[];
  openai_api_key?: string;
  ia_model?: string;
  welcome_message?: string;
  enableScheduling?: boolean;
  hide_auto_catalog?: boolean;
}

const DEFAULT_SCHEDULE_PER_DAY = {
  mon: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
  tue: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
  wed: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
  thu: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
  fri: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
  sat: { enabled: false, start: "09:00", end: "14:00", max_appointments: 4 },
  sun: { enabled: false, start: "09:00", end: "12:00", max_appointments: 2 },
};

const DEFAULT_AI: AISettings = {
  bot_type: "regras",
  ai_name: "Atendente Nexus",
  ai_personality: "profissional",
  ai_prompt: "Você é um Atendente de excelência...",
  business_hours_start: "08:00",
  business_hours_end: "18:00",
  business_days: ["mon", "tue", "wed", "thu", "fri"],
  schedule_per_day: DEFAULT_SCHEDULE_PER_DAY,
  appointment_gap_min: 15,
  off_hours_message: "Olá! Estamos fora do horário de expediente. Deixe sua mensagem que responderemos assim que retornarmos!",
  products: [],
  manager_phone: "",
  blocked_dates: [],
  welcome_message: "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?",
  enableScheduling: true,
};

const TEMPLATES = [
  {
    id: "comercial",
    title: "Comercial Padrão",
    description: "Ideal para empresas que querem listar serviços, informar horários e agendar clientes.",
    welcome_message: "Olá! Seja bem-vindo(a) ao canal de atendimento da nossa empresa! Como podemos te ajudar hoje? 👋",
    enableScheduling: true,
  },
  {
    id: "saude",
    title: "Clínica Médica / Odonto",
    description: "Focado em agendamento de consultas médicas e informações de contato clínico.",
    welcome_message: "Olá! Você está no pré-atendimento da nossa Clínica de Saúde. Escolha uma das opções abaixo para agendar sua consulta: 👋",
    enableScheduling: true,
  },
  {
    id: "alimentacao",
    title: "Delivery / Restaurante",
    description: "Cardápio integrado e direcionamento direto para falar com atendentes.",
    welcome_message: "Olá! Que bom ter você aqui no nosso restaurante. Digite 1 para ver o cardápio ou 4 para falar com nossos atendentes! 🍽️",
    enableScheduling: false,
  },
  {
    id: "suporte",
    title: "Suporte Técnico",
    description: "Foco total em triagem e repasse rápido para atendimento humano.",
    welcome_message: "Olá, bem-vindo(a) ao nosso suporte técnico! Diga o que precisa ou digite 4 para falar com um técnico. 👨‍💻",
    enableScheduling: false,
  },
];

export default function WorkflowPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("start");
  const [jsonText, setJsonText] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showProductsModal, setShowProductsModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/settings/whatsapp");
      const data = await res.json();
      if (data.settings) {
        const merged = { ...DEFAULT_AI, ...data.settings };
        setSettings(merged);
        setJsonText(JSON.stringify(merged, null, 2));
      }
    } catch (e) {
      console.error("Erro ao buscar configurações:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveConfig = async (updatedSettings = settings) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error();
      setAlert({ type: "success", msg: "Configurações salvas com sucesso! ✅" });
      setJsonText(JSON.stringify(updatedSettings, null, 2));
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar as configurações. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof AISettings, val: any) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveConfig(updated);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const merged = { ...DEFAULT_AI, ...parsed };
      setSettings(merged);
      saveConfig(merged);
      setShowJsonModal(false);
      setAlert({ type: "success", msg: "Configuração JSON restaurada e importada com sucesso! ✅" });
    } catch {
      setAlert({ type: "error", msg: "JSON inválido. Verifique a sintaxe." });
    }
  };

  const handleLoadTemplate = (tpl: typeof TEMPLATES[0]) => {
    const updated = {
      ...settings,
      welcome_message: tpl.welcome_message,
      enableScheduling: tpl.enableScheduling,
      bot_type: "regras",
    };
    setSettings(updated);
    saveConfig(updated);
    setAlert({ type: "success", msg: `Template "${tpl.title}" carregado e salvo com sucesso! ✅` });
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white -m-8 overflow-hidden font-sans">
      {/* HEADER SUPERIOR */}
      <header className="h-16 border-b border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-6 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Editor Visual de Fluxo &amp; Regras
              <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                JSON CONFIG
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Configure menus numéricos, catálogo de produtos e parâmetros do JSON</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {alert && (
            <div
              onClick={() => setAlert(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                alert.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
              }`}
            >
              <span>{alert.msg}</span>
              <X className="w-3.5 h-3.5" />
            </div>
          )}

          <button
            onClick={() => setShowAIPrompt(!showAIPrompt)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              showAIPrompt
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">Prompt IA</span>
          </button>

          <button
            onClick={() => {
              setJsonText(JSON.stringify(settings, null, 2));
              setShowJsonModal(true);
            }}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">JSON Config</span>
          </button>

          <button
            onClick={() => {
              const newNodes = [...(settings.custom_rules_nodes || [])];
              newNodes.push({
                id: "node_" + Math.random().toString(36).substr(2, 9),
                parentId: selectedNodeId !== "start" ? selectedNodeId : null,
                keyword: String(newNodes.length + 1),
                title: "Nova Opção",
                actionType: "text",
                textContent: "Responda aqui...",
              });
              updateField("custom_rules_nodes", newNodes);
            }}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Nó</span>
          </button>

          <button
            onClick={() => saveConfig()}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {saving ? "Salvando..." : "Salvar Fluxo"}
          </button>
        </div>
      </header>

      {/* WORKFLOW CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ESQUERDA: TEMPLATES E MODO */}
        <aside className="w-72 border-r border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 p-5 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Modo de Operação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField("bot_type", "regras")}
                className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                  settings.bot_type === "regras"
                    ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                }`}
              >
                📋 Menu de Regras
              </button>

              <button
                type="button"
                onClick={() => updateField("bot_type", "ia")}
                className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                  settings.bot_type === "ia"
                    ? "bg-purple-50 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                }`}
              >
                🤖 Atendente IA
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">Templates Prontos</span>
            <div className="space-y-2">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 rounded-2xl cursor-pointer transition-all space-y-1 shadow-sm group"
                >
                  <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {tpl.title}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-snug font-medium">{tpl.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/10">
            <button
              onClick={() => setShowProductsModal(true)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4 text-indigo-500" /> Gerenciar Catálogo
            </button>
          </div>
        </aside>

        {/* WORKFLOW CANVAS CENTRAL */}
        <main className="flex-1 h-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
          {isLoaded && (
            <WorkflowCanvas
              settings={settings}
              updateField={updateField}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
            />
          )}
        </main>

        {/* DIREITA: PROPRIEDADES DO NÓ */}
        <aside className="w-80 border-l border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 p-5 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
            {showAIPrompt ? <FileCode className="w-5 h-5 text-purple-600" /> : <Settings className="w-5 h-5 text-indigo-600" />}
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {showAIPrompt ? "Prompt da IA" : "Propriedades do Nó"}
            </h3>
          </div>

          {selectedNodeId === "start" && !showAIPrompt && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl space-y-1">
                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300">Boas-vindas</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Primeira mensagem enviada quando o cliente inicia conversa</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Mensagem de Boas-vindas</label>
                <textarea
                  value={settings.welcome_message || ""}
                  onChange={(e) => updateField("welcome_message", e.target.value)}
                  rows={6}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hide_auto_catalog"
                  checked={settings.hide_auto_catalog || false}
                  onChange={(e) => updateField("hide_auto_catalog", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="hide_auto_catalog" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Ocultar catálogo automático de produtos
                </label>
              </div>
            </div>
          )}

          {selectedNodeId && selectedNodeId !== "start" && !showAIPrompt && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Dígito / Palavra-chave</label>
                <input
                  type="text"
                  value={settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId)?.keyword || ""}
                  onChange={(e) => {
                    const newNodes = [...(settings.custom_rules_nodes || [])];
                    const idx = newNodes.findIndex((n) => n.id === selectedNodeId);
                    if (idx > -1) {
                      newNodes[idx].keyword = e.target.value;
                      updateField("custom_rules_nodes", newNodes);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Título da Opção</label>
                <input
                  type="text"
                  value={settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId)?.title || ""}
                  onChange={(e) => {
                    const newNodes = [...(settings.custom_rules_nodes || [])];
                    const idx = newNodes.findIndex((n) => n.id === selectedNodeId);
                    if (idx > -1) {
                      newNodes[idx].title = e.target.value;
                      updateField("custom_rules_nodes", newNodes);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Ação / Tipo de Resposta</label>
                <select
                  value={settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId)?.actionType || "text"}
                  onChange={(e) => {
                    const newNodes = [...(settings.custom_rules_nodes || [])];
                    const idx = newNodes.findIndex((n) => n.id === selectedNodeId);
                    if (idx > -1) {
                      newNodes[idx].actionType = e.target.value;
                      updateField("custom_rules_nodes", newNodes);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="text">💬 Texto / Submenu</option>
                  <option value="catalog">📋 Exibir Catálogo de Produtos</option>
                  <option value="product">📦 Mostrar Produto Individual</option>
                  <option value="scheduling">📅 Iniciar Agendamento</option>
                  <option value="human">👤 Transferir para Humano</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newNodes = (settings.custom_rules_nodes || []).filter((n: any) => n.id !== selectedNodeId && n.parentId !== selectedNodeId);
                  updateField("custom_rules_nodes", newNodes);
                  setSelectedNodeId(null);
                }}
                className="w-full mt-4 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-2 text-xs font-bold hover:bg-rose-100"
              >
                Excluir Nó
              </button>
            </div>
          )}

          {showAIPrompt && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Instruções de Personalidade da IA</label>
              <textarea
                value={settings.ai_prompt || ""}
                onChange={(e) => updateField("ai_prompt", e.target.value)}
                rows={12}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>
          )}
        </aside>
      </div>

      {/* MODAL JSON CONFIG - COMPLETO COM COPIAR E IMPORTAR */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">JSON de Configuração da Automação</h3>
              </div>
              <button type="button" onClick={() => setShowJsonModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              spellCheck={false}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar JSON"}
              </button>
              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
              >
                Importar &amp; Salvar JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUTOS */}
      {showProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Gerenciar Produtos do Catálogo</h3>
              </div>
              <button type="button" onClick={() => setShowProductsModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(settings.products || []).map((p: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 rounded-2xl space-y-3 relative group shadow-sm">
                    <button
                      onClick={() => {
                        const newP = [...(settings.products || [])];
                        newP.splice(idx, 1);
                        updateField("products", newP);
                      }}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Excluir Produto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="space-y-1 pr-6">
                      <label className="text-[10px] text-slate-500 font-bold uppercase">Nome do Produto</label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold"
                        value={p.name || ""}
                        onChange={(e) => {
                          const newP = [...(settings.products || [])];
                          newP[idx].name = e.target.value;
                          updateField("products", newP);
                        }}
                        placeholder="Ex: Novo Produto"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Preço (R$)</label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-600 font-mono font-bold"
                          value={p.price}
                          onChange={(e) => {
                            const newP = [...(settings.products || [])];
                            newP[idx].price = Number(e.target.value);
                            updateField("products", newP);
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newP = [...(settings.products || [])];
                    newP.push({ name: "Novo Produto", price: 0, description: "" });
                    updateField("products", newP);
                  }}
                  className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all min-h-[160px]"
                >
                  <Plus className="w-6 h-6 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Adicionar Produto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
