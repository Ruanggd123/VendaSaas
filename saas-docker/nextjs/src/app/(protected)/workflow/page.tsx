"use client";
import WorkflowCanvas from './WorkflowCanvas';

import { useState, useEffect } from "react";
import { 
  Settings, 
  FileCode, 
  Sparkles, 
  ArrowRight, 
  RefreshCw,
  Plus,
  Download,
  Upload,
  X,
  Package
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
  mon: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  tue: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  wed: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  thu: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  fri: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  sat: { enabled: false, start: "09:00", end: "14:00", max_appointments: 4 },
  sun: { enabled: false, start: "09:00", end: "12:00", max_appointments: 2 },
};

const DEFAULT_AI: AISettings = {
  bot_type: "regras",
  ai_name: "Atendente Nexus",
  ai_personality: "profissional",
  ai_prompt: "Você é um Atendente...",
  business_hours_start: "08:00",
  business_hours_end: "18:00",
  business_days: ["mon", "tue", "wed", "thu", "fri"],
  schedule_per_day: DEFAULT_SCHEDULE_PER_DAY,
  appointment_gap_min: 15,
  off_hours_message: "Olá! Estamos fora do horário de atendimento. Retornaremos em breve! 🟣Œ™",
  products: [],
  manager_phone: "",
  blocked_dates: [],
  welcome_message: "Olá! Seja bem-vindo(a) ao nosso atendimento! 🟣¤–🟣‘‹",
  enableScheduling: true,
};

// Templates Prontos
const TEMPLATES = [
  {
    id: "comercial",
    title: "Comercial Padrào",
    description: "Ideal para empresas que querem listar serviços, informar horários e agendar clientes.",
    welcome_message: "Olá! Seja bem-vindo(a) ao canal de atendimento da nossa empresa! Como podemos te ajudar hoje? 🟣’¼🟣¤–",
    enableScheduling: true,
  },
  {
    id: "saude",
    title: "Clínica MéDica / Odonto",
    description: "Focado em agendamento de consultas méDicas e informações de contato clínico.",
    welcome_message: "Olá! Você está no pré-atendimento da nossa Clínica de Saúde. Escolha as opções abaixo para prosseguir com seu agendamento: 🟣¥🟣©º",
    enableScheduling: true,
  },
  {
    id: "alimentacao",
    title: "Delivery / Restaurante",
    description: "Cardápio integrado e direcionamento direto para falar com Atendente.",
    welcome_message: "Olá! Que bom ter você aqui no nosso restaurante. Escolha 1 para ver as delícias do nosso cardápio ou 4 para falar com nossos garçons! 🟣•🟣”",
    enableScheduling: false,
  },
  {
    id: "suporte",
    title: "suporte Técnico",
    description: "Foco total em triagem e repasse rápido para atendimento de Atendentes humanos.",
    welcome_message: "Olá, bem-vindo(a) ao nosso suporte técnico! Diga o que precisa ou digite 4 para que um técnico assuma a conversa imediatamente. 🟣› 🟣“ž",
    enableScheduling: false,
  }
];

export default function WorkflowPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('start');
  const [jsonText, setJsonText] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showProductsModal, setShowProductsModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // IA Chatbot local state
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "ai", text: "Olá! Eu sou o Assistente de fluxos. Me diga qual o seu negócio ou o que você deseja criar e eu monto todo o seu menu de regras automaticamente! 🟣š€" }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  
  // AI Wizard State (interactive questionnaire)
  const [wizardStep, setWizardStep] = useState<number>(0);
  const [wizardData, setWizardData] = useState<any>({
    ai_name: "",
    welcome_message: "",
    enableScheduling: true,
    manager_phone: ""
  });

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
      setAlert({ type: "success", msg: "Configurações de fluxo salvas com sucesso! 🟣š€" });
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

  // Importar JSON
  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const merged = { ...DEFAULT_AI, ...parsed };
      setSettings(merged);
      saveConfig(merged);
      setShowJsonModal(false);
      setAlert({ type: "success", msg: "fluxo importado do JSON com sucesso! âœ…" });
    } catch {
      setAlert({ type: "error", msg: "JSON inválido. Verifique a sintaxe e tente novamente." });
    }
  };

  // Carregar Template
  const handleLoadTemplate = (tpl: typeof TEMPLATES[0]) => {
    const updated = {
      ...settings,
      welcome_message: tpl.welcome_message,
      enableScheduling: tpl.enableScheduling,
      bot_type: "regras"
    };
    setSettings(updated);
    saveConfig(updated);
    setAlert({ type: "success", msg: `Template "${tpl.title}" carregado e salvo com sucesso! 🟣Ž­` });
  };

  // AI Chat processor (commands and wizard questionnaire)
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userText }]);
    setChatInput("");
    setAiLoading(true);

    setTimeout(() => {
      // Simple Wizard State Check
      if (wizardStep > 0) {
        processWizardAnswer(userText);
        setAiLoading(false);
        return;
      }

      // Keyword matching
      const clean = userText.toLowerCase();
      if (clean.includes("criar") || clean.includes("mudar") || clean.includes("restaurante") || clean.includes("clinica") || clean.includes("suporte") || clean.includes("fluxo") || clean.includes("bot")) {
        setChatMessages(prev => [...prev, { sender: "ai", text: "Excelente! Para estruturar o melhor fluxo para o seu WhatsApp, vou te fazer um rápido questionário de 4 perguntas. Vamos lá?" }]);
        setChatMessages(prev => [...prev, { sender: "ai", text: "🟣¤– Pergunta 1: Qual o nome da sua empresa ou do seu Atendente?" }]);
        setWizardStep(1);
      } else if (clean.includes("agendamento") || clean.includes("agenda")) {
        const toggleVal = clean.includes("ativar") || clean.includes("habilitar") || clean.includes("sim");
        updateField("enableScheduling", toggleVal);
        setChatMessages(prev => [...prev, { sender: "ai", text: `Entendido! Acabei de ${toggleVal ? 'habilitar' : 'desabilitar'} o agendamento guiado (Opçào 3) no seu menu de regras.` }]);
      } else if (clean.includes("boas vindas") || clean.includes("saudacao") || clean.includes("welcome")) {
        // Extract message inside quotes or take the rest of text
        const match = userText.match(/"([^"]+)"/) || userText.match(/'([^']+)'/);
        const msg = match ? match[1] : userText.replace(/alterar|mudar|boas vindas|sauda[cç]ao/gi, "").trim();
        if (msg.length > 5) {
          updateField("welcome_message", msg);
          setChatMessages(prev => [...prev, { sender: "ai", text: `Prontinho! Sua mensagem de boas-vindas foi alterada para: "${msg}"` }]);
        } else {
          setChatMessages(prev => [...prev, { sender: "ai", text: "Envie a mensagem desejada entre aspas. Ex: mudar boas vindas para \"Olá, seja bem-vindo!\"" }]);
        }
      } else {
        setChatMessages(prev => [...prev, { sender: "ai", text: "Nào entendi muito bem. Você pode pedir coisas como: 'criar fluxo comercial', 'ativar agendamento' ou 'mudar boas-vindas para \"Oi!\"'" }]);
      }
      setAiLoading(false);
    }, 1000);
  };

  const processWizardAnswer = (ans: string) => {
    if (wizardStep === 1) {
      setWizardData((d: any) => ({ ...d, ai_name: ans }));
      setChatMessages(prev => [...prev, { sender: "ai", text: `Legal! O nome configurado é "${ans}".` }]);
      setChatMessages(prev => [...prev, { sender: "ai", text: "🟣¤– Pergunta 2: Qual mensagem de boas-vindas quer exibir no menu INICIAL?" }]);
      setWizardStep(2);
    } else if (wizardStep === 2) {
      setWizardData((d: any) => ({ ...d, welcome_message: ans }));
      setChatMessages(prev => [...prev, { sender: "ai", text: "Salvo! Mensagem gravada." }]);
      setChatMessages(prev => [...prev, { sender: "ai", text: "🟣¤– Pergunta 3: deseja habilitar agendamentos online de serviços? (Responda com 'Sim' ou 'Nào')" }]);
      setWizardStep(3);
    } else if (wizardStep === 3) {
      const isScheduling = ans.toLowerCase().includes("sim") || ans.toLowerCase().includes("s");
      setWizardData((d: any) => ({ ...d, enableScheduling: isScheduling }));
      setChatMessages(prev => [...prev, { sender: "ai", text: `${isScheduling ? 'Agendamento ativado!' : 'Agendamento desativado.'}` }]);
      setChatMessages(prev => [...prev, { sender: "ai", text: "🟣¤– Pergunta 4: Qual o número do gerente para repassar o atendimento humano? (Digite com DDD, ex: 11999999999)" }]);
      setWizardStep(4);
    } else if (wizardStep === 4) {
      const phone = ans.replace(/[^0-9]/g, "");
      const finalSettings = {
        ...settings,
        ai_name: wizardData.ai_name,
        welcome_message: wizardData.welcome_message,
        enableScheduling: wizardData.enableScheduling,
        manager_phone: phone,
        bot_type: "regras"
      };
      setSettings(finalSettings);
      saveConfig(finalSettings);
      
      setChatMessages(prev => [...prev, { sender: "ai", text: "🟣Ž‰ Maravilha! Questionário finalizado! Montei todo o seu fluxo de decisào estilo n8n com base nas suas respostas e já o salvei. Veja o painel ao lado!" }]);
      setWizardStep(0);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#09090b] text-zinc-100 font-sans overflow-hidden -m-8">
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* CANVAS CENTRAL: ESTILO n8n */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
        {/* NEW CANVAS */}
        <main className="flex-1 relative flex flex-col">
          {alert && (
            <div className={`absolute bottom-6 left-[50%] translate-x-[-50%] px-4 py-3 rounded-xl text-xs font-semibold z-50 flex items-center gap-2 border shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 ${
              alert.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}>
              <span>{alert.msg}</span>
              <button onClick={() => setAlert(null)} className="ml-2 hover:text-white transition-colors">✕</button>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex items-start sm:items-center justify-between pointer-events-none z-10 gap-4 flex-col sm:flex-row">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto shadow-xl">
              <span className="text-xs font-bold text-zinc-400">Status:</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-white whitespace-nowrap">Editor Visual Ativo</span>
            </div>

            <div className="flex flex-wrap gap-2 pointer-events-auto justify-end">
              <button
                onClick={() => setShowAIPrompt(!showAIPrompt)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl ${
                  showAIPrompt
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
                title="Mostrar/esconder o prompt de IA do bot"
              >
                <FileCode className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap hidden lg:inline">Prompt IA</span>
              </button>
              <button
                onClick={() => setShowJsonModal(true)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
                title="Importar ou exportar configurações como JSON"
              >
                <Download className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="whitespace-nowrap hidden lg:inline">JSON</span>
              </button>
              <button
                onClick={() => {
                  const newNodes = [...(settings.custom_rules_nodes || [])];
                  newNodes.push({
                    id: 'node_' + Math.random().toString(36).substr(2, 9),
                    parentId: selectedNodeId !== 'start' ? selectedNodeId : null,
                    keyword: newNodes.length + 1 + '',
                    title: 'Nova Opção',
                    actionType: 'text',
                    textContent: 'Responda aqui...'
                  });
                  updateField('custom_rules_nodes', newNodes);
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>+ Novo Nó</span>
              </button>
              <button
                onClick={() => saveConfig()}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl shadow-purple-500/10"
              >
                <span>{saving ? "Salvando..." : "Salvar fluxo"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full">
            {isLoaded && (
              <WorkflowCanvas 
                settings={settings} 
                setSettings={setSettings} 
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                saveConfig={saveConfig}
              />
            )}
          </div>
        </main>

        {/* PAINEL LATERAL DIREITO: CONFIGURAÇÃO DO NÓ SELECIONADO / PROMPT DE IA */}
        <aside className="w-80 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col flex-shrink-0 z-10">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            {showAIPrompt ? (
              <FileCode className="w-5 h-5 text-purple-400" />
            ) : (
              <Settings className="w-5 h-5 text-purple-400" />
            )}
            <h3 className="font-bold text-sm text-white">
              {showAIPrompt ? 'Prompt de IA' : 'Propriedades do Nó'}
            </h3>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {!selectedNodeId && !showAIPrompt && (
              <div className="text-center text-xs text-zinc-500 mt-10 space-y-2">
                <div className="text-3xl opacity-20">☰</div>
                <p>Selecione um nó no canvas</p>
                <p className="text-[10px] text-zinc-600">ou clique em &quot;Prompt de IA&quot; para configurar</p>
              </div>
            )}

            {selectedNodeId === 'start' && !showAIPrompt && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-600/10 to-purple-500/5 border border-purple-500/10">
                  <h4 className="text-xs font-bold text-white mb-1">Boas-vindas</h4>
                  <p className="text-[10px] text-zinc-400">
                    A primeira mensagem que o bot envia quando inicia a conversa.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Mensagem de Boas-vindas</label>
                  <textarea
                    value={settings.welcome_message || ""}
                    onChange={(e) => updateField("welcome_message", e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                  <input
                    type="checkbox"
                    id="hide_auto_catalog"
                    checked={settings.hide_auto_catalog || false}
                    onChange={(e) => updateField("hide_auto_catalog", e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-950"
                  />
                  <label htmlFor="hide_auto_catalog" className="text-xs text-zinc-300 cursor-pointer select-none">
                    Ocultar lista automática de produtos
                  </label>
                </div>
              </div>
            )}

            {selectedNodeId && selectedNodeId !== 'start' && !showAIPrompt && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-800/30 border border-zinc-700/30">
                  <h4 className="text-xs font-bold text-white mb-1">{settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.title || 'Nó selecionado'}</h4>
                  <p className="text-[10px] text-zinc-400">
                    Configure a resposta e o comportamento deste nó.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Dígito / Palavra-chave</label>
                  <input
                    type="text"
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.keyword || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].keyword = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Título do Menu</label>
                  <input
                    type="text"
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.title || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].title = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Ação / Tipo de Resposta</label>
                  <select
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType || 'text'}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].actionType = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="text">Texto Simples / Submenu</option>
                    <option value="catalog">Mostrar Catálogo de Produtos</option>
                    <option value="product">Produto Individual (do Catálogo)</option>
                    <option value="scheduling">Fluxo de Agendamento</option>
                    <option value="human">Transferir para Humano</option>
                    <option value="collect_data">Coletar Dados / Texto Aberto</option>
                    <option value="checkout">Gerar Link de Pagamento (Checkout)</option>
                  </select>
                </div>
                {settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType === 'collect_data' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">Salvar resposta na variável (Nome)</label>
                    <input
                      type="text"
                      value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.variableName || ''}
                      onChange={(e) => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                        if(idx>-1) { newNodes[idx].variableName = e.target.value; updateField("custom_rules_nodes", newNodes); }
                      }}
                      placeholder="Ex: tamanho_camiseta"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
                {settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType === 'checkout' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">Vincular a qual Produto?</label>
                    <select
                      value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.productId || ''}
                      onChange={(e) => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                        if(idx>-1) { newNodes[idx].productId = e.target.value; updateField("custom_rules_nodes", newNodes); }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">Selecione um Produto...</option>
                      {(settings.products || []).map((p: any, i: number) => (
                        <option key={i} value={p.id || p.name}>{p.name} (R$ {p.price})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Conteúdo da Resposta</label>
                  <textarea
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.textContent || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].textContent = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType === 'catalog' && (
                  <div className="mt-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-3">
                    <p className="text-[10px] text-purple-300">Este nó exibe os seus produtos automaticamente. Você tem {settings.products?.length || 0} produtos cadastrados.</p>
                    <button
                      onClick={() => setShowProductsModal(true)}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                    >
                      <Package className="w-4 h-4" />
                      <span>Gerenciar Produtos</span>
                    </button>
                  </div>
                )}

                {settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType === 'product' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-300">Vincular a qual Produto?</label>
                    <select
                      value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.productId || ''}
                      onChange={(e) => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                        if(idx>-1) { newNodes[idx].productId = e.target.value; updateField("custom_rules_nodes", newNodes); }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Selecione um produto --</option>
                      {(settings.products || []).map((p: any, i: number) => (
                        <option key={i} value={p.name}>{p.name} - R$ {p.price}</option>
                      ))}
                    </select>
                    {!settings.products?.length && (
                      <p className="text-[10px] text-zinc-500">Nenhum produto cadastrado. Vá em Settings para adicionar produtos.</p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    const newNodes = (settings.custom_rules_nodes || []).filter((n:any)=>n.id!==selectedNodeId && n.parentId!==selectedNodeId);
                    updateField("custom_rules_nodes", newNodes);
                    setSelectedNodeId(null);
                  }}
                  className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
                >
                  Excluir Nó
                </button>
              </div>
            )}

            {/* Configuração do Prompt de IA (colapsável) */}
            {showAIPrompt && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-600/10 to-indigo-500/5 border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold text-white">Prompt de IA do Bot</h4>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Instruções de personalidade e comportamento que a IA deve seguir.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Nome do Atendente</label>
                  <input
                    type="text"
                    value={settings.ai_name || ''}
                    onChange={(e) => updateField("ai_name", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    placeholder="Ex: Atendente Nexus"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Personalidade</label>
                  <select
                    value={settings.ai_personality || 'profissional'}
                    onChange={(e) => updateField("ai_personality", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="profissional">Profissional</option>
                    <option value="casual">Casual e Amigável</option>
                    <option value="tecnico">Técnico</option>
                    <option value="persuasivo">Persuasivo / Vendas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-300">Prompt do Sistema</label>
                    <button
                      onClick={() => setShowAIPrompt(false)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Esconder ✕
                    </button>
                  </div>
                  <textarea
                    value={settings.ai_prompt || ''}
                    onChange={(e) => updateField("ai_prompt", e.target.value)}
                    rows={16}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-mono leading-relaxed"
                    placeholder="Digite as instruções do sistema para a IA..."
                  />
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-[10px] text-amber-400/80 leading-relaxed">
                    O prompt define como a IA se comporta. Seja específico sobre regras, tom de voz, 
                    informações do negócio e limites de atuação.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Modal Produtos */}
        {showProductsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Gerenciar Produtos do Catálogo</h3>
                </div>
                <button
                  onClick={() => setShowProductsModal(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-zinc-900/50">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {(settings.products || []).map((p: any, idx: number) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-3 relative group">
                      <button onClick={() => {
                        const newP = [...(settings.products || [])];
                        newP.splice(idx, 1);
                        updateField('products', newP);
                      }} className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Excluir Produto">
                         <X className="w-4 h-4" />
                      </button>
                      
                      <div className="space-y-1 pr-6">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Nome do Produto</label>
                        <input type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors font-semibold" value={p.name || ''} onChange={e => {
                          const newP = [...(settings.products || [])];
                          newP[idx].name = e.target.value;
                          updateField('products', newP);
                        }} placeholder="Ex: 🌐 Site Avulso" />
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Preço (R$)</label>
                          <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono focus:border-purple-500 focus:outline-none transition-colors" value={p.price} onChange={e => {
                            const newP = [...(settings.products || [])];
                            newP[idx].price = Number(e.target.value);
                            updateField('products', newP);
                          }} placeholder="0" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Mensalidade (R$)</label>
                          <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-purple-400 font-mono focus:border-purple-500 focus:outline-none transition-colors" value={p.monthly || 0} onChange={e => {
                            const newP = [...(settings.products || [])];
                            newP[idx].monthly = Number(e.target.value);
                            updateField('products', newP);
                          }} placeholder="0" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Descrição P/ Cliente</label>
                        <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 h-20 resize-none focus:border-purple-500 focus:outline-none transition-colors leading-relaxed" value={p.description || ''} onChange={e => {
                          const newP = [...(settings.products || [])];
                          newP[idx].description = e.target.value;
                          updateField('products', newP);
                        }} placeholder="Explique os benefícios deste produto..." />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => {
                    const newP = [...(settings.products || [])];
                    newP.push({ name: 'Novo Produto', price: 0, description: '' });
                    updateField('products', newP);
                  }} className="bg-zinc-900 border border-dashed border-zinc-700 hover:border-purple-500 hover:bg-purple-500/5 text-zinc-400 hover:text-purple-400 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all min-h-[250px] group">
                    <div className="p-3 bg-zinc-800 rounded-full group-hover:bg-purple-500/20 transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold">Adicionar Produto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal JSON */}
        {showJsonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Importar / Exportar JSON</h3>
                </div>
                <button
                  onClick={() => setShowJsonModal(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={20}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-mono leading-relaxed"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(jsonText);
                    setAlert({ type: "success", msg: "JSON copiado para a área de transferência!" });
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95"
                >
                  Copiar
                </button>
                <button
                  onClick={handleImportJson}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95"
                >
                  Importar JSON
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
