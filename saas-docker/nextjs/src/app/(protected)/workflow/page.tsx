﻿"use client";

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
  const [selectedNode, setSelectedNode] = useState<string>("start");
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
      <main className="flex-1 bg-[#09090b] bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:20px_20px] relative overflow-auto p-12 flex flex-col justify-between">
        
        {/* alerta Superior */}
        {alert && (
          <div className={`fixed top-16 left-[50%] translate-x-[-50%] px-4 py-2.5 rounded-xl text-xs font-semibold z-50 flex items-center gap-2 border shadow-lg ${
            alert.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            <span>{alert.msg}</span>
            <button onClick={() => setAlert(null)} className="ml-2 hover:text-white">âœ•</button>
          </div>
        )}

        {/* Toolbar Superior */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto shadow-xl">
            <span className="text-xs font-bold text-zinc-400">Status:</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-white">Menu de Regras Ativo</span>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setShowJsonModal(true)}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
            >
              <FileCode className="w-4 h-4 text-purple-400" />
              <span>Importar / Exportar JSON</span>
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

        {/* CANVAS DE NÓS (n8n Workspace) */}
        <div className="my-auto mx-auto w-full max-w-5xl flex flex-col items-center gap-8 py-10 relative">
          
          {/* NÓ 1: GATILHO INICIAL (START) */}
          <div 
            onClick={() => setSelectedNode("start")}
            className={`w-72 p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between ${
              selectedNode === "start" 
                ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                : "border-zinc-800 hover:border-zinc-700 shadow-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-500/10 rounded-lg">
                  <Play className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Start Node</span>
              </div>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">TRIGGER</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] text-zinc-500 uppercase font-semibold">Mensagem de Boas-vindas</div>
              <p className="text-xs text-zinc-300 leading-relaxed italic line-clamp-2">
                "{settings.welcome_message || "Olá! Seja bem-vindo..."}"
              </p>
            </div>
          </div>

          {/* Seta 1 */}
          <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500/50 to-zinc-700"></div>

          {/* NÓ 2: ROTEADOR DE OPÇÕES (OPTIONS ROUTER) */}
          <div 
            onClick={() => setSelectedNode("router")}
            className={`w-80 p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between ${
              selectedNode === "router" 
                ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                : "border-zinc-800 hover:border-zinc-700 shadow-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-500/10 rounded-lg">
                  <GitBranch className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">Opções do Menu</span>
              </div>
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">ROUTER</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              roteia o usuário para a ramificaçào correspondente ao dígito enviado (1, 2, 3 ou 4).
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="p-1.5 bg-[#09090b] rounded border border-white/5 text-center text-[10px]">
                <div className="text-purple-400 font-bold mb-0.5">Opçào 1</div>
                <span className="text-zinc-400">Catálogo</span>
              </div>
              <div className="p-1.5 bg-[#09090b] rounded border border-white/5 text-center text-[10px]">
                <div className="text-purple-400 font-bold mb-0.5">Opçào 2</div>
                <span className="text-zinc-400">Horário</span>
              </div>
              <div className="p-1.5 bg-[#09090b] rounded border border-white/5 text-center text-[10px]">
                <div className="text-purple-400 font-bold mb-0.5">Opçào 3</div>
                <span className={`text-[10px] ${settings.enableScheduling !== false ? 'text-zinc-400' : 'text-zinc-600 line-through'}`}>Agendar</span>
              </div>
              <div className="p-1.5 bg-[#09090b] rounded border border-white/5 text-center text-[10px]">
                <div className="text-purple-400 font-bold mb-0.5">Opçào 4</div>
                <span className="text-zinc-400">Atendente</span>
              </div>
            </div>
          </div>

          {/* Ramificaçào Superior de Saídas */}
          <div className="w-full max-w-4xl relative h-10 flex items-center justify-between">
            <div className="absolute top-0 bottom-0 left-[12%] right-[12%] border-t border-dashed border-zinc-800"></div>
            <div className="w-[2px] h-10 bg-zinc-800 mx-auto absolute left-[12.5%] top-0"></div>
            <div className="w-[2px] h-10 bg-zinc-800 mx-auto absolute left-[37.5%] top-0"></div>
            <div className="w-[2px] h-10 bg-zinc-800 mx-auto absolute left-[62.5%] top-0"></div>
            <div className="w-[2px] h-10 bg-zinc-800 mx-auto absolute left-[87.5%] top-0"></div>
          </div>

          {/* NÓS DE destino (OUTCOMES) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
            
            {/* Opçào 1: Catálogo */}
            <div 
              onClick={() => setSelectedNode("services")}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between h-40 ${
                selectedNode === "services" 
                  ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                  : "border-zinc-800 hover:border-zinc-700 shadow-xl"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold text-white uppercase">1⃣ Catálogo</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                Lista os serviços e produtos cadastrados no catálogo com seus respectivos preços.
              </p>
              <div className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold px-2 py-1 rounded text-center">
                Visualizar Serviços
              </div>
            </div>

            {/* Opçào 2: Funcionamento */}
            <div 
              onClick={() => setSelectedNode("hours")}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between h-40 ${
                selectedNode === "hours" 
                  ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                  : "border-zinc-800 hover:border-zinc-700 shadow-xl"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold text-white uppercase">2⃣ Funcionamento</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                Informa os horários de atendimento vigentes e fornece informações de contato comercial.
              </p>
              <div className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold px-2 py-1 rounded text-center">
                Visualizar Horários
              </div>
            </div>

            {/* Opçào 3: Agendamentos */}
            <div 
              onClick={() => setSelectedNode("scheduling")}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between h-40 ${
                selectedNode === "scheduling" 
                  ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                  : "border-zinc-800 hover:border-zinc-700 shadow-xl"
              } ${settings.enableScheduling === false ? 'opacity-40 hover:opacity-100' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-1.5 justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[11px] font-bold text-white uppercase">3⃣ Agendamento</span>
                </div>
                <div className="flex h-2 w-2 relative">
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${settings.enableScheduling !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                Inicia um fluxo guiado em 4 etapas (Escolha do serviço, data, hora e confirmaçào final).
              </p>
              <div className={`text-[9px] font-semibold px-2 py-1 rounded text-center border ${
                settings.enableScheduling !== false 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {settings.enableScheduling !== false ? "Menu de Agendamento Ativo" : "Opçào Desativada"}
              </div>
            </div>

            {/* Opçào 4: Atendente humano */}
            <div 
              onClick={() => setSelectedNode("human")}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none bg-zinc-950/80 backdrop-blur flex flex-col justify-between h-40 ${
                selectedNode === "human" 
                  ? "border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.15)] ring-1 ring-purple-500" 
                  : "border-zinc-800 hover:border-zinc-700 shadow-xl"
              }`}
            >
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-900 pb-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[11px] font-bold text-white uppercase">4⃣ humano</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed mb-3">
                Desativa as respostas automáticas da conversa e notifica o gerente para atendimento manual.
              </p>
              <div className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold px-2 py-1 rounded text-center">
                Pausa a IA/Bot
              </div>
            </div>

          </div>
        </div>

        {/* Dica do Rodapé */}
        <div className="text-center text-[10px] text-zinc-600 mt-6">
          Dica: Clique em qualquer nó no canvas central para configurar suas opções no painel direito.
        </div>
      </main>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* painel LATERAL DIREITO: CONFIGURAà‡àƒO DO NÓ SELECIONADO */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="w-80 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col flex-shrink-0">
        
        {/* Header do painel */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">configurar Propriedades</h3>
        </div>

        {/* Conteúdo dependente do Nó selecionado */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* NÓ 1: START */}
          {selectedNode === "start" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  Trigger INICIAL (Boas-vindas)
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Configure a saudaçào que o robà´ envia no WhatsApp quando Inicia uma conversa.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Mensagem de Boas-vindas</label>
                <textarea
                  value={settings.welcome_message || ""}
                  onChange={(e) => updateField("welcome_message", e.target.value)}
                  rows={6}
                  placeholder="Escreva a mensagem..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Nome da Empresa / Bot</label>
                <input
                  type="text"
                  value={settings.ai_name || ""}
                  onChange={(e) => updateField("ai_name", e.target.value)}
                  placeholder="Ex: Minha Empresa"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* NÓ 2: ROUTER */}
          {selectedNode === "router" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  ROTEADOR de Opções
                </h4>
                <p className="text-[10px] text-zinc-400">
                  O ROTEADOR gerencia as opções padrào do menu numérico enviado ao cliente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-medium text-zinc-300">1⃣ Serviços (Catálogo)</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Ativo</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-medium text-zinc-300">2⃣ Funcionamento (Horários)</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Ativo</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-xs font-medium text-zinc-300">3⃣ Agendamento (Agenda)</span>
                  <button 
                    onClick={() => updateField("enableScheduling", settings.enableScheduling === false)}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border transition-all ${
                      settings.enableScheduling !== false 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {settings.enableScheduling !== false ? "Ativo" : "Ocultado"}
                  </button>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-medium text-zinc-300">4⃣ Atendente (Falar com humano)</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">Ativo</span>
                </div>
              </div>
            </div>
          )}

          {/* NÓ 3: SERVICES */}
          {selectedNode === "services" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  Módulo Catálogo (Serviços)
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Lista de serviços que o robà´ exibe. Para adicionar novos produtos ou alterar preços, use a seçào do catálogo nas configurações gerais.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Resumo de Serviços Cadastrados</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {settings.products && settings.products.length > 0 ? (
                    settings.products.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-purple-400 mt-0.5">R$ {p.price}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-500 italic text-center py-4">Nenhum serviço cadastrado no catálogo geral.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NÓ 4: HOURS */}
          {selectedNode === "hours" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Funcionamento
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Dias e horários em que a empresa realiza atendimentos comerciais.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400">Hora INICIAL</label>
                  <input
                    type="time"
                    value={settings.business_hours_start}
                    onChange={(e) => updateField("business_hours_start", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-400">Hora Final</label>
                  <input
                    type="time"
                    value={settings.business_hours_end}
                    onChange={(e) => updateField("business_hours_end", e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NÓ 5: SCHEDULING */}
          {selectedNode === "scheduling" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  Agendamento guiado
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Permite que o bot execute passos interativos coletando serviço, data e hora da reserva do lead.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
                <span className="text-xs font-semibold text-zinc-300">Opçào Ativa no Menu</span>
                <button
                  onClick={() => updateField("enableScheduling", settings.enableScheduling === false)}
                  className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.enableScheduling !== false ? "bg-purple-600" : "bg-zinc-700"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enableScheduling !== false ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Tempo de Respiro (GAP)</label>
                <select
                  value={settings.appointment_gap_min}
                  onChange={(e) => updateField("appointment_gap_min", parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={0}>Sem intervalo</option>
                  <option value={10}>10 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                </select>
              </div>
            </div>
          )}

          {/* NÓ 6: HUMAN */}
          {selectedNode === "human" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  Atendente humano (Pausa)
                </h4>
                <p className="text-[10px] text-zinc-400">
                  Desvia a conversa para o suporte humano, pausando o bot para a interaçào manual.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">WhatsApp do gerente (Notificações)</label>
                <input
                  type="text"
                  placeholder="Ex: 5511999999999"
                  value={settings.manager_phone || ""}
                  onChange={(e) => updateField("manager_phone", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Número que receberá o alerta de novo atendimento humano solicitado.</p>
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* MODAL IMPORTAR / EXPORTAR JSON */}
      {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showJsonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#09090b]">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Importar / Exportar JSON do fluxo</h3>
              </div>
              <button 
                onClick={() => setShowJsonModal(false)}
                className="text-zinc-500 hover:text-white text-xs bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-lg transition-all"
              >
                âœ•
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <p className="text-xs text-zinc-400">
                Altere o JSON abaixo para modificar a estrutura e as configurações gerais do fluxo do seu Atendente de regras.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={12}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 font-mono leading-relaxed"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-[#09090b] flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  setAlert({ type: "success", msg: "JSON copiado para a área de transferência! 🟣“‹" });
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-4 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar JSON</span>
              </button>
              <button
                onClick={handleImportJson}
                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Configurações</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

