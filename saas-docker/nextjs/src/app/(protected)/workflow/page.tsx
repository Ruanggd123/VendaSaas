"use client";

import WorkflowCanvas from "./WorkflowCanvas";
import { SmartphoneSimulator } from "../../../components/workflow/SmartphoneSimulator";
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
  Smartphone,
  LayoutGrid,
  Bot,
  Play,
  RotateCcw,
} from "lucide-react";

const DEFAULT_SAAS_PRODUCTS = [
  {
    name: "Plano Solo (1 Conexão WhatsApp)",
    price: "147.00",
    description: "Atendimento inteligente automatizado para 1 número de WhatsApp com IA Vendedora e Agendamentos.",
    duration_min: 30,
    requires_payment: true,
    delivery_type: "virtual_instant",
    digital_content: "Acesso liberado no painel Nexus SaaS para 1 instância."
  },
  {
    name: "Plano Pro (3 Conexões WhatsApp)",
    price: "297.00",
    description: "Automação completa para até 3 números de WhatsApp, disparo em massa e suporte prioritário.",
    duration_min: 30,
    requires_payment: true,
    delivery_type: "virtual_instant",
    digital_content: "Acesso liberado para 3 instâncias com suporte VIP."
  },
  {
    name: "Plano Enterprise (Conexões Ilimitadas)",
    price: "497.00",
    description: "Solução completa para grandes empresas com instâncias ilimitadas, API dedicada e gerente de conta.",
    duration_min: 60,
    requires_payment: true,
    delivery_type: "virtual_instant",
    digital_content: "Acesso Enterprise com onboarding individualizado."
  },
  {
    name: "Módulo IA Vendedora Avançada",
    price: "97.00",
    description: "IA conversacional persuasiva com catálogo dinâmico e integração direta com fechamento de vendas.",
    duration_min: 15,
    requires_payment: true,
    delivery_type: "virtual_instant",
    digital_content: "Módulo ativado nas configurações da sua empresa."
  },
  {
    name: "Instância Adicional WhatsApp",
    price: "49.90",
    description: "Adicione mais 1 número de WhatsApp à sua automação conversacional.",
    duration_min: 15,
    requires_payment: true,
    delivery_type: "virtual_instant",
    digital_content: "Nova instância liberada na aba Conexões WhatsApp."
  }
];

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
  products: DEFAULT_SAAS_PRODUCTS,
  manager_phone: "",
  blocked_dates: [],
  welcome_message: "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?",
  enableScheduling: true,
  custom_rules_nodes: [
    { id: "opt_1", parentId: null, keyword: "1", title: "Catálogo de Produtos & Serviços", actionType: "catalog", textContent: "" },
    { id: "opt_2", parentId: null, keyword: "2", title: "Horários de Atendimento", actionType: "text", textContent: "Nosso horário de funcionamento é de Segunda a Sexta das 08:00 às 18:00." },
    { id: "opt_3", parentId: null, keyword: "3", title: "Agendar Horário", actionType: "scheduling", textContent: "" },
    { id: "opt_4", parentId: null, keyword: "4", title: "Falar com Atendente Humano", actionType: "human", textContent: "Transferindo seu atendimento para a nossa equipe humana..." },
  ],
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

function sanitizeWelcomeText(msg: any): string {
  if (!msg || typeof msg !== "string") {
    return "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
  }
  const clean = msg.replace(/[\uFFFD\u00A0]/g, "").replace(/🟣\s*¤\s*–\s*🟣\s*‘\s*‹/g, "").replace(/¤|‘|‹/g, "").trim();
  if (!clean || clean.length < 5) {
    return "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
  }
  return clean;
}

export default function WorkflowPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("start");
  const [activeTab, setActiveTab] = useState<"canvas" | "simulator" | "prompt">("canvas");
  const [jsonText, setJsonText] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showProductsModal, setShowProductsModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
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
        merged.welcome_message = sanitizeWelcomeText(merged.welcome_message);
        if (!merged.products || merged.products.length === 0) {
          merged.products = DEFAULT_SAAS_PRODUCTS;
        }
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
      merged.welcome_message = sanitizeWelcomeText(merged.welcome_message);
      if (!merged.products || merged.products.length === 0) {
        merged.products = DEFAULT_SAAS_PRODUCTS;
      }
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
              Configurador de Atendimento
              <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                WHATSAPP AUTOMATION
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Configure menus, regras, respostas e teste o fluxo em tempo real no simulador</p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS ORGANIZADA (FLUXO / SIMULADOR / PROMPT) */}
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
          <button
            onClick={() => setActiveTab("canvas")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "canvas"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-white/10"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>🎨 Fluxo Visual</span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 relative ${
              activeTab === "simulator"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>📱 Simulador WhatsApp</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </button>

          <button
            onClick={() => setActiveTab("prompt")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === "prompt"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>🤖 Prompt IA</span>
          </button>
        </div>

        {/* BOTÕES DE AÇÃO */}
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
            onClick={() => {
              setJsonText(JSON.stringify(settings, null, 2));
              setShowJsonModal(true);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          {activeTab === "canvas" && (
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
              <span>+ Opção</span>
            </button>
          )}

          <button
            onClick={() => saveConfig()}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL LIMPA E ORGANIZADA */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ESQUERDA: BARRA LATERAL DE SELEÇÃO & TEMPLATES (VISÍVEL NO MODO CANVAS) */}
        {activeTab === "canvas" && (
          <aside className="w-64 border-r border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 p-4 space-y-5 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Modo de Resposta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField("bot_type", "regras")}
                  className={`p-2.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                    settings.bot_type === "regras"
                      ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  📋 Regras
                </button>

                <button
                  type="button"
                  onClick={() => updateField("bot_type", "ia")}
                  className={`p-2.5 rounded-2xl border text-left text-xs font-bold transition-all ${
                    settings.bot_type === "ia"
                      ? "bg-purple-50 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  🤖 IA
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">Templates Prontos</span>
              <div className="space-y-2">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleLoadTemplate(tpl)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 hover:border-indigo-400 rounded-2xl cursor-pointer transition-all space-y-0.5 shadow-sm group"
                  >
                    <span className="text-xs font-black text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {tpl.title}
                    </span>
                    <p className="text-[10px] text-slate-500 leading-snug font-medium line-clamp-2">{tpl.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
              <button
                onClick={() => {
                  updateField("custom_rules_nodes", []);
                  setSelectedNodeId("start");
                  setAlert({ type: "success", msg: "Fluxo limpo! Agora você pode criar suas regras 100% do zero. 🧹" });
                }}
                className="w-full py-2 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Começar do Zero
              </button>

              <button
                onClick={() => setShowProductsModal(true)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5 text-indigo-500" /> Catálogo de Produtos
              </button>
            </div>
          </aside>
        )}

        {/* ABA 1: CANVAS VISUAL ESPAÇOSO (LIVRE E LIMPO) */}
        {activeTab === "canvas" && (
          <main className="flex-1 h-full bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
            {isLoaded && (
              <WorkflowCanvas
                settings={settings}
                updateField={updateField}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
              />
            )}

            {/* BOTÃO FLUTUANTE DE ACESSO RÁPIDO AO SIMULADOR */}
            <button
              onClick={() => setActiveTab("simulator")}
              className="absolute bottom-6 right-6 z-30 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-xl border border-emerald-400/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Testar no Simulador ao Vivo</span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
            </button>
          </main>
        )}

        {/* DIREITA: PROPRIEDADES DO NÓ SELECIONADO (NO MODO CANVAS) */}
        {activeTab === "canvas" && (
          <aside className="w-80 border-l border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 p-5 space-y-6 overflow-y-auto">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Propriedades do Nó
              </h3>
            </div>

            {selectedNodeId === "start" && (
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
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
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

            {selectedNodeId && selectedNodeId !== "start" && (
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Título do Menu</label>
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Ação</label>
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
                    <option value="text">💬 Texto Personalizado / Submenu</option>
                    <option value="catalog">📋 Exibir Catálogo de Produtos</option>
                    <option value="scheduling">📅 Iniciar Agendamento</option>
                    <option value="human">👤 Transferir para Humano</option>
                  </select>
                </div>

                {settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId)?.actionType === "text" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Texto da Resposta</label>
                    <textarea
                      rows={4}
                      value={settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId)?.textContent || ""}
                      onChange={(e) => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        const idx = newNodes.findIndex((n) => n.id === selectedNodeId);
                        if (idx > -1) {
                          newNodes[idx].textContent = e.target.value;
                          updateField("custom_rules_nodes", newNodes);
                        }
                      }}
                      placeholder="Digite a resposta personalizada enviada ao cliente..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const newNodes = [...(settings.custom_rules_nodes || [])];
                    newNodes.push({
                      id: "node_" + Math.random().toString(36).substr(2, 9),
                      parentId: selectedNodeId,
                      keyword: "1",
                      title: "Sub-opção",
                      actionType: "text",
                      textContent: "Responda a esta sub-opção...",
                    });
                    updateField("custom_rules_nodes", newNodes);
                  }}
                  className="w-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl px-4 py-2 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Sub-opção</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newNodes = (settings.custom_rules_nodes || []).filter((n: any) => n.id !== selectedNodeId && n.parentId !== selectedNodeId);
                    updateField("custom_rules_nodes", newNodes);
                    setSelectedNodeId("start");
                  }}
                  className="w-full mt-2 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-2 text-xs font-bold hover:bg-rose-100 transition-all"
                >
                  Excluir Este Nó
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ABA 2: SIMULADOR DE SMARTPHONE DEDICADO (LIMPO E CENTRALIZADO) */}
        {activeTab === "simulator" && (
          <div className="flex-1 h-full bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 gap-8 overflow-y-auto">
            {/* PAINEL DE AJUSTES RÁPIDOS AO LADO DO CELULAR */}
            <div className="w-80 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 hidden lg:block">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
                <Smartphone className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Ajustes do Simulador</h3>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Mensagem de Boas-vindas</label>
                <textarea
                  value={settings.welcome_message || ""}
                  onChange={(e) => updateField("welcome_message", e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-[11px] text-emerald-900 dark:text-emerald-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Como Testar:
                </p>
                <p className="leading-snug opacity-90">
                  Digite opções numéricas no celular (ex: <strong>1</strong>, <strong>2</strong>, <strong>3</strong>, <strong>4</strong>) ou envie mensagens de teste. O simulador responde na hora!
                </p>
              </div>
            </div>

            {/* CELULAR INTERATIVO CENTRALIZADO */}
            <SmartphoneSimulator settings={settings} />
          </div>
        )}

        {/* ABA 3: PROMPT DA IA DEDICADO */}
        {activeTab === "prompt" && (
          <div className="flex-1 h-full bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto flex items-center justify-center">
            <div className="max-w-3xl w-full bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Instruções de Personalidade da IA</h3>
                    <p className="text-xs text-slate-500">Defina o tom de voz, regras de negócio e limites de atendimento da sua IA</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Prompt Principal de Treinamento</label>
                <textarea
                  value={settings.ai_prompt || ""}
                  onChange={(e) => updateField("ai_prompt", e.target.value)}
                  rows={14}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 leading-relaxed resize-none shadow-inner"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveConfig()}
                  disabled={saving}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  {saving ? "Salvando..." : "Salvar Prompt"}
                </button>
              </div>
            </div>
          </div>
        )}
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
              <button onClick={() => setShowJsonModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copiado!" : "Copiar JSON"}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleImportJson}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  Importar &amp; Salvar JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GERENCIAR CATÁLOGO DE PRODUTOS */}
      {showProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Catálogo de Produtos &amp; Serviços</h3>
              </div>
              <button onClick={() => setShowProductsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(settings.products || []).map((prod: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-extrabold text-xs text-slate-900 dark:text-white">{prod.name}</p>
                    <p className="text-[11px] text-slate-500">{prod.description}</p>
                  </div>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                    R$ {prod.price}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setShowProductsModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
