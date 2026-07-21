import WorkflowCanvas from './WorkflowCanvas';
﻿﻿"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Settings, 
  GitBranch, 
  BookOpen, 
  Clock, 
  Calendar, 
  UserCheck, 
  FileCode, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Copy, 
  Download, 
  Upload, 
  HelpCircle,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Plus
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
  const [saving, setSaving] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
      {/* BARRA LATERAL ESQUERDA: CHAT DE IA E TEMPLATES */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="w-80 border-r border-zinc-800 bg-[#0c0c0e] flex flex-col flex-shrink-0">
        {/* Header da Barra Lateral */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">Assistente de fluxo IA</h3>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.sender === "user" 
                  ? "bg-purple-600 text-white rounded-br-none" 
                  : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-bl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 pl-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Processando...</span>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-zinc-800 bg-[#09090b] flex gap-2">
          <input
            type="text"
            placeholder={wizardStep > 0 ? "Responda à  pergunta..." : "Digite um comando de fluxo..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSendChat}
            className="bg-purple-600 hover:bg-purple-500 p-2 rounded-xl text-white transition-all active:scale-95 flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Seçào de Modelos Rápidos */}
        <div className="border-t border-zinc-800 p-4 bg-[#09090b] max-h-60 overflow-y-auto">
          <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2.5">Modelos Prontos</h4>
          <div className="space-y-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleLoadTemplate(tpl)}
                className="w-full text-left p-2.5 rounded-xl border border-zinc-800 bg-[#0c0c0e] hover:border-purple-500/50 hover:bg-purple-950/5 transition-all text-xs"
              >
                <div className="font-bold text-white mb-0.5">{tpl.title}</div>
                <div className="text-[10px] text-zinc-500 line-clamp-1">{tpl.description}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* CANVAS CENTRAL: ESTILO n8n */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
        {/* NEW CANVAS */}
        <main className="flex-1 relative flex flex-col">
          {alert && (
            <div className={`absolute top-4 left-[50%] translate-x-[-50%] px-4 py-2.5 rounded-xl text-xs font-semibold z-50 flex items-center gap-2 border shadow-lg ${
              alert.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}>
              <span>{alert.msg}</span>
              <button onClick={() => setAlert(null)} className="ml-2 hover:text-white">✕</button>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto shadow-xl">
              <span className="text-xs font-bold text-zinc-400">Status:</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-white">Editor Visual Ativo</span>
            </div>

            <div className="flex gap-2 pointer-events-auto">
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
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
              >
                <span>{saving ? "Salvando..." : "Salvar fluxo"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full">
            <WorkflowCanvas 
              settings={settings} 
              updateField={updateField} 
              setSelectedNodeId={setSelectedNodeId} 
            />
          </div>
        </main>

        {/* PAINEL LATERAL DIREITO: CONFIGURAÇÃO DO NÓ SELECIONADO */}
        <aside className="w-80 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col flex-shrink-0 z-10">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Propriedades do Nó</h3>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {!selectedNodeId && (
              <div className="text-center text-xs text-zinc-500 mt-10">
                Selecione um nó no canvas para editar suas propriedades.
              </div>
            )}

            {selectedNodeId === 'start' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                  <h4 className="text-xs font-bold text-white mb-1">Boas-vindas</h4>
                  <p className="text-[10px] text-zinc-400">
                    A primeira mensagem que o bot envia.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Mensagem</label>
                  <textarea
                    value={settings.welcome_message || ""}
                    onChange={(e) => updateField("welcome_message", e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {selectedNodeId && selectedNodeId !== 'start' && (
              <div className="space-y-4">
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
                    <option value="scheduling">Fluxo de Agendamento</option>
                    <option value="human">Transferir para Humano</option>
                  </select>
                </div>
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const newNodes = settings.custom_rules_nodes.filter((n:any)=>n.id!==selectedNodeId && n.parentId!==selectedNodeId);
                    updateField("custom_rules_nodes", newNodes);
                    setSelectedNodeId(null);
                  }}
                  className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-xs font-bold transition-all"
                >
                  Excluir Nó
                </button>
              </div>
            )}
          </div>
        </aside>
    </div>
  );
}
