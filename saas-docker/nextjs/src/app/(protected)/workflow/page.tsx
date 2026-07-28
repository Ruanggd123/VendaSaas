"use client";

import WorkflowCanvas from "./WorkflowCanvas";
import { SmartphoneSimulator } from "../../../components/workflow/SmartphoneSimulator";
import { useState, useEffect, useRef } from "react";
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
  RotateCcw,
  Wand2,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Calendar,
  UserCheck,
  MessageCircle,
  ClipboardPenLine,
  ShoppingCart,
  Box,
  Users,
  ChevronUp,
  ChevronDown,
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
  enable_off_hours_message?: boolean;
  products: any[];
  manager_phone: string;
  custom_rules_nodes?: any[];
  blocked_dates: string[];
  openai_api_key?: string;
  ia_model?: string;
  welcome_message?: string;
  enableScheduling?: boolean;
  hide_auto_catalog?: boolean;
  welcome_menu_auto_append?: boolean;
  interactive_poll_enabled?: boolean;
  enable_groups?: boolean;
  whitelisted_groups?: string;
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
  bot_type: "ia",
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
  welcome_menu_auto_append: true,
  interactive_poll_enabled: true,
  enableScheduling: true,
  custom_rules_nodes: [
    { id: "opt_1", parentId: null, keyword: "1", title: "Catálogo de Produtos & Serviços", actionType: "catalog", textContent: "", showInPoll: true },
    { id: "opt_2", parentId: null, keyword: "2", title: "Horários de Atendimento", actionType: "text", textContent: "Nosso horário de funcionamento é de Segunda a Sexta das 08:00 às 18:00.", showInPoll: true },
    { id: "opt_3", parentId: null, keyword: "3", title: "Agendar Horário", actionType: "scheduling", textContent: "", showInPoll: true },
    { id: "opt_4", parentId: null, keyword: "4", title: "Falar com Atendente Humano", actionType: "human", textContent: "Transferindo seu atendimento para a nossa equipe humana...", showInPoll: true },
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
  const clean = msg
    .replace(/[\uFFFD\u00A0]/g, "")
    .replace(/🟣\s*¤\s*–\s*🟣\s*‘\s*‹/g, "")
    .replace(/¤|‘|‹/g, "")
    .trim();
  if (!clean || clean.length < 5) {
    return "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
  }
  return clean;
}

export default function WorkflowPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const [tenantId, setTenantId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("start");
  const [activeTab, setActiveTab] = useState<"canvas" | "simulator">("canvas");
  const [jsonText, setJsonText] = useState<string>("");
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [showProductsModal, setShowProductsModal] = useState<boolean>(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [showGroupsModal, setShowGroupsModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [nodeSearchQuery, setNodeSearchQuery] = useState("");
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (data.tenantId) setTenantId(data.tenantId);
      }
    } catch (e) {
      console.error("Erro ao buscar configurações:", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveConfig = async (updatedSettings = settings, silent = false) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error();
      if (!silent) setAlert({ type: "success", msg: "Configurações salvas com sucesso! ✅" });
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
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => void saveConfig(updated, true), 650);
  };

  useEffect(() => () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  }, []);

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
    };
    setSettings(updated);
    saveConfig(updated);
    setShowTemplatesModal(false);
    setAlert({ type: "success", msg: `Template "${tpl.title}" carregado com sucesso! ✅` });
  };

  const selectedNode = (selectedNodeId && selectedNodeId !== "start")
    ? settings.custom_rules_nodes?.find((n: any) => n.id === selectedNodeId) || null
    : null;

  const selectedNodeIndex = selectedNodeId && selectedNodeId !== "start"
    ? (settings.custom_rules_nodes || []).findIndex((n: any) => n.id === selectedNodeId)
    : -1;

  const setSelectedNodeField = (field: string, value: any) => {
    if (!selectedNode || selectedNodeIndex < 0) return;
    const newNodes = [...(settings.custom_rules_nodes || [])];
    newNodes[selectedNodeIndex] = { ...newNodes[selectedNodeIndex], [field]: value };
    updateField("custom_rules_nodes", newNodes);
  };

  const linkProductToNode = (productIdx: number) => {
    if (!selectedNode || selectedNodeIndex < 0 || !selectedNode) return;
    const product = (settings.products || [])[productIdx];
    if (!product) {
      const newNodes = [...(settings.custom_rules_nodes || [])];
      newNodes[selectedNodeIndex] = {
        ...newNodes[selectedNodeIndex],
        productId: "",
        productName: "",
        productPrice: "",
        productDescription: "",
      };
      updateField("custom_rules_nodes", newNodes);
      return;
    }

    const newNodes = [...(settings.custom_rules_nodes || [])];
    newNodes[selectedNodeIndex] = {
      ...newNodes[selectedNodeIndex],
      productId: product.id != null ? String(product.id) : "",
      productName: product.name || "",
      productPrice: product.price != null ? String(product.price) : "",
      productDescription: product.description || "",
    };
    updateField("custom_rules_nodes", newNodes);
  };

  const productOptions = (settings.products || []).map((prod: any, idx: number) => ({
    ...prod,
    __idx: idx,
  }));

  const getProductOptionValue = (node: any): string => {
    if (!node) return "";

    if (node.productId) {
      const byId = productOptions.find((p) => String(p.id || "") === String(node.productId));
      if (byId) return String(byId.__idx);
    }

    if (node.productName) {
      const byName = productOptions.find((p) => (p.name || "") === node.productName);
      if (byName) return String(byName.__idx);
    }

    return "";
  };

  const currentProductOptionValue = getProductOptionValue(selectedNode);
  const selectedKeywordConflict = selectedNode
    ? (settings.custom_rules_nodes || []).some((node: any) =>
        node.id !== selectedNode.id
        && (node.parentId || null) === (selectedNode.parentId || null)
        && String(node.keyword || "").trim().toLowerCase() === String(selectedNode.keyword || "").trim().toLowerCase()
      )
    : false;

  const nextKeywordForParent = (parentId: string | null) => {
    const siblings = (settings.custom_rules_nodes || []).filter((node: any) => (node.parentId || null) === parentId);
    const used = new Set(siblings.map((node: any) => String(node.keyword || "")));
    let candidate = 1;
    while (used.has(String(candidate))) candidate += 1;
    return String(candidate);
  };

  const addWorkflowNode = (actionType = "text", requestedParentId?: string | null) => {
    const parentId = requestedParentId !== undefined
      ? requestedParentId
      : selectedNodeId && selectedNodeId !== "start"
        ? selectedNodeId
        : null;
    const keyword = nextKeywordForParent(parentId);
    const labels: Record<string, string> = {
      text: "Nova resposta",
      catalog: "Catálogo",
      product: "Produto",
      checkout: "Comprar agora",
      scheduling: "Agendar horário",
      collect_data: "Solicitar informação",
      human: "Falar com atendente",
    };
    const node = {
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      parentId,
      keyword,
      title: labels[actionType] || "Nova etapa",
      actionType,
      textContent: actionType === "text" ? "Digite aqui a mensagem enviada ao cliente." : "",
      showInPoll: true,
      paymentMode: "both",
      variableName: actionType === "collect_data" ? "informacao_cliente" : "",
    };
    updateField("custom_rules_nodes", [...(settings.custom_rules_nodes || []), node]);
    setSelectedNodeId(node.id);
    setIsRightPanelOpen(true);
  };

  const descendantIds = (nodeId: string) => {
    const ids = new Set<string>();
    const visit = (id: string) => {
      if (ids.has(id)) return;
      ids.add(id);
      (settings.custom_rules_nodes || [])
        .filter((node: any) => node.parentId === id)
        .forEach((child: any) => visit(child.id));
    };
    visit(nodeId);
    return ids;
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const ids = descendantIds(selectedNode.id);
    if (!window.confirm(`Excluir "${selectedNode.title}" e ${Math.max(0, ids.size - 1)} etapa(s) dependente(s)?`)) return;
    updateField("custom_rules_nodes", (settings.custom_rules_nodes || []).filter((node: any) => !ids.has(node.id)));
    setSelectedNodeId(selectedNode.parentId || "start");
  };

  const moveSelectedNode = (direction: -1 | 1) => {
    if (!selectedNode) return;
    const nodes = [...(settings.custom_rules_nodes || [])];
    const siblingIndexes = nodes
      .map((node: any, index: number) => ({ node, index }))
      .filter(({ node }: any) => (node.parentId || null) === (selectedNode.parentId || null));
    const siblingPosition = siblingIndexes.findIndex(({ node }: any) => node.id === selectedNode.id);
    const target = siblingIndexes[siblingPosition + direction];
    if (!target) return;
    const currentIndex = siblingIndexes[siblingPosition].index;
    [nodes[currentIndex], nodes[target.index]] = [nodes[target.index], nodes[currentIndex]];
    updateField("custom_rules_nodes", nodes);
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    const clone = {
      ...selectedNode,
      id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      keyword: nextKeywordForParent(selectedNode.parentId || null),
      title: `${selectedNode.title} (cópia)`,
      position: undefined,
    };
    updateField("custom_rules_nodes", [...(settings.custom_rules_nodes || []), clone]);
    setSelectedNodeId(clone.id);
  };

  const createCatalogFlow = () => {
    if (!selectedNode || selectedNode.actionType !== "catalog") return;
    const nodes = [...(settings.custom_rules_nodes || [])].filter((node: any) =>
      !(node.parentId === selectedNode.id && node.actionType === "checkout")
    );
    const existingProductIds = new Set(nodes
      .filter((node: any) => node.parentId === selectedNode.id && node.actionType === "product")
      .map((node: any) => String(node.productId || node.productName || "")));
    (settings.products || []).forEach((product: any, index: number) => {
      const reference = String(product.id ?? product.name ?? "");
      if (existingProductIds.has(reference)) return;
      const productNodeId = `product_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 5)}`;
      nodes.push({
        id: productNodeId,
        parentId: selectedNode.id,
        keyword: String(index + 1),
        title: product.name,
        actionType: "product",
        textContent: "",
        productId: product.id != null ? String(product.id) : "",
        productName: product.name || "",
        productPrice: product.price != null ? String(product.price) : "",
        productDescription: product.description || "",
        showInPoll: true,
      });
      nodes.push({
        id: `checkout_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 5)}`,
        parentId: productNodeId,
        keyword: "1",
        title: "Comprar agora",
        actionType: "checkout",
        textContent: "Vamos finalizar seu pedido.",
        paymentMode: "both",
        productId: product.id != null ? String(product.id) : "",
        productName: product.name || "",
        productPrice: product.price != null ? String(product.price) : "",
        productDescription: product.description || "",
        showInPoll: true,
      });
    });
    updateField("custom_rules_nodes", nodes);
    setAlert({ type: "success", msg: "Catálogo conectado ao fluxo real." });
  };

  const applyProductToNode = (nodeIdx: number, productIdx: number) => {
    const newNodes = [...(settings.custom_rules_nodes || [])];
    const node = newNodes[nodeIdx];
    if (!node) return;

    if (productIdx < 0) {
      newNodes[nodeIdx] = {
        ...node,
        productId: "",
        productName: "",
        productPrice: "",
        productDescription: "",
      };
      updateField("custom_rules_nodes", newNodes);
      return;
    }

    const product = (settings.products || [])[productIdx];
    if (!product) {
      newNodes[nodeIdx] = {
        ...node,
        productId: "",
        productName: "",
        productPrice: "",
        productDescription: "",
      };
      updateField("custom_rules_nodes", newNodes);
      return;
    }

    newNodes[nodeIdx] = {
      ...node,
      productId: product.id != null ? String(product.id) : "",
      productName: product.name || "",
      productPrice: product.price != null ? String(product.price) : "",
      productDescription: product.description || "",
    };
    updateField("custom_rules_nodes", newNodes);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white -m-8 overflow-hidden font-sans">
      {/* HEADER SUPERIOR ESPAÇOSO E SEM SOBREPOSIÇÕES */}
      <header className="h-16 border-b border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 flex items-center justify-between z-20 shadow-sm gap-4">
        {/* ESQUERDA: TÍTULO E NAVEGAÇÃO DE ABAS */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                Fluxo do Bot
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">Menus e automações do WhatsApp</p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block"></div>

          {/* ABAS DO BOT (FLUXO VISUAL vs SIMULADOR WHATSAPP) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab("canvas")}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === "canvas"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Fluxo Visual</span>
            </button>

            <button
              onClick={() => setActiveTab("simulator")}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                activeTab === "simulator"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Simulador</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>
        </div>

        {/* DIREITA: BOTÕES DE AÇÃO ORGANIZADOS */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {alert && (
            <div
              onClick={() => setAlert(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                alert.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
              }`}
            >
              <span>{alert.msg}</span>
              <X className="w-3 h-3" />
            </div>
          )}

              <>
                <button
                  onClick={() => setShowTemplatesModal(true)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden lg:inline">Templates</span>
                </button>

                <button
                  onClick={() => setShowProductsModal(true)}
                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-sky-200 dark:border-sky-500/20"
                  title="Ver produtos disponíveis para vincular ao fluxo"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Produtos</span>
                </button>

                <button
                  onClick={() => setShowGroupsModal(true)}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-purple-200 dark:border-purple-500/20"
                  title="Configurar atendimento em grupos"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Grupos</span>
                </button>

                <button
                  onClick={() => {
                    if (!window.confirm("Limpar todo o fluxo? Esta ação remove todas as etapas personalizadas.")) return;
                    updateField("custom_rules_nodes", []);
                    setSelectedNodeId("start");
                    setAlert({ type: "success", msg: "Fluxo limpo! Crie suas regras 100% do zero. 🧹" });
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-rose-200 dark:border-rose-500/20"
                  title="Limpar todas as regras para criar do zero"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Limpar</span>
                </button>

              <button
                onClick={() => {
                  addWorkflowNode("text");
                }}
                className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 border border-indigo-200 dark:border-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Opção</span>
              </button>
            </>

          <button
            onClick={() => {
              setJsonText(JSON.stringify(settings, null, 2));
              setShowJsonModal(true);
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            onClick={() => saveConfig()}
            disabled={saving}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL TOTALMENTE ESPAÇOSA E LIVRE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ABA 1: CANVAS VISUAL ESPAÇOSO */}
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

            <div className="absolute bottom-5 left-5 z-30 w-56 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <div className="mb-2 px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Adicionar após {selectedNode?.title || "Início"}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { type: "text", label: "Mensagem", icon: MessageCircle, color: "text-indigo-600" },
                  { type: "collect_data", label: "Pergunta", icon: ClipboardPenLine, color: "text-pink-600" },
                  { type: "catalog", label: "Catálogo", icon: BookOpen, color: "text-sky-600" },
                  { type: "product", label: "Produto", icon: Box, color: "text-cyan-600" },
                  { type: "scheduling", label: "Agenda", icon: Calendar, color: "text-emerald-600" },
                  { type: "checkout", label: "Pagamento", icon: ShoppingCart, color: "text-fuchsia-600" },
                  { type: "human", label: "Humano", icon: UserCheck, color: "text-amber-600" },
                ].map(({ type, label, icon: Icon, color }) => (
                  <button key={type} type="button" onClick={() => addWorkflowNode(type)} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 text-left text-[10px] font-black text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-white/5 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-indigo-500/10">
                    <Icon className={`size-3.5 ${color}`} />{label}
                  </button>
                ))}
              </div>
            </div>

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

        {/* DIREITA: PROPRIEDADES DO NÓ SELECIONADO (PAINEL DESLIZANTE QUE PODE SER ENCOLHIDO) */}
        {(activeTab === "canvas" || activeTab === "simulator") && (
          <aside
            className={`order-2 border-l border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 transition-all duration-300 relative ${
              isRightPanelOpen ? "w-[380px] p-5 space-y-6 overflow-y-auto" : "w-12 p-2 items-center"
            }`}
          >
            {/* BOTÃO RETRÁTIL DO PAINEL LATERAL */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="absolute top-4 left-3 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 transition-all"
              title={isRightPanelOpen ? "Recolher Painel" : "Expandir Painel"}
            >
              {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {isRightPanelOpen && (
              <>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10 pl-8">
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

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="welcome_menu_auto_append"
                        checked={settings.welcome_menu_auto_append !== false}
                        onChange={(e) => updateField("welcome_menu_auto_append", e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="welcome_menu_auto_append" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                        Adicionar menu automático abaixo da mensagem
                      </label>
                    </div>

                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="interactive_poll_enabled"
                          checked={settings.interactive_poll_enabled !== false}
                          onChange={(e) => updateField("interactive_poll_enabled", e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="interactive_poll_enabled" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          Usar opções interativas (enquete)
                        </label>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Desative para enviar menus numerados em texto. Perguntas abertas continuam aguardando a resposta digitada.
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-purple-500/10">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500">Editando etapa</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{selectedNode.title}</p>
                      <p className="mt-1 text-[10px] font-medium text-slate-500">Tudo que for alterado aqui é usado no fluxo real.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Etapa anterior</label>
                      <select
                        value={selectedNode.parentId || "start"}
                        onChange={(e) => setSelectedNodeField("parentId", e.target.value === "start" ? null : e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
                      >
                        <option value="start">Início do atendimento</option>
                        {(settings.custom_rules_nodes || [])
                          .filter((node: any) => node.id !== selectedNode.id && !descendantIds(selectedNode.id).has(node.id))
                          .map((node: any) => <option key={node.id} value={node.id}>{node.title}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        🔑 Gatilho de Ativação (Dígito ou Palavra-chave)
                      </label>
                      <input
                        type="text"
                        value={selectedNode.keyword || ""}
                        onChange={(e) => setSelectedNodeField("keyword", e.target.value)}
                        placeholder="Ex: 1, 2, pix, suporte"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                      />
                      <p className="text-[10px] text-slate-500 font-medium">
                        Quando o cliente enviar este dígito ou palavra no WhatsApp, esta opção ou sub-menu será ativado.
                      </p>
                      {selectedKeywordConflict && (
                        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                          Este gatilho já é usado por outra opção no mesmo nível. Escolha outro para evitar conflito.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Título do Menu</label>
                      <input
                        type="text"
                        value={selectedNode.title || ""}
                        onChange={(e) => setSelectedNodeField("title", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tipo de Ação</label>
                      <select
                        value={selectedNode.actionType || "text"}
                        onChange={(e) => setSelectedNodeField("actionType", e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="text">💬 Texto Personalizado / Submenu</option>
                        <option value="catalog">📋 Exibir Catálogo de Produtos</option>
                        <option value="product">🧩 Produto (exibe e segue submenu)</option>
                        <option value="checkout">🛒 Checkout / Pagamento</option>
                        <option value="scheduling">📅 Iniciar Agendamento</option>
                        <option value="collect_data">📝 Fazer Pergunta / Coletar Dado</option>
                        <option value="human">👤 Transferir para Humano</option>
                      </select>
                    </div>

                    {selectedNode.actionType === "collect_data" && (
                      <div className="space-y-3 rounded-2xl border border-pink-200 bg-pink-50 p-3 dark:border-pink-500/20 dark:bg-pink-500/10">
                        <div>
                          <p className="text-xs font-black text-pink-900 dark:text-pink-200">Como funciona esta pergunta?</p>
                          <div className="mt-2 space-y-2 text-[10px] font-medium leading-relaxed text-pink-800 dark:text-pink-300">
                            <p><strong>1.</strong> O bot envia a pergunta escrita no campo abaixo.</p>
                            <p><strong>2.</strong> A próxima mensagem digitada pelo cliente é salva automaticamente.</p>
                            <p><strong>3.</strong> Depois, o bot segue para a subetapa conectada. Se não houver subetapa, volta ao menu.</p>
                          </div>
                        </div>
                        <label className="block text-xs font-bold text-pink-800 dark:text-pink-300">Identificador interno da resposta</label>
                        <input
                          value={selectedNode.variableName || ""}
                          onChange={(e) => setSelectedNodeField("variableName", e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
                          placeholder="Ex: nome, email, cidade"
                          className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-pink-500 dark:border-pink-500/20 dark:bg-slate-950"
                        />
                        <div className="rounded-xl border border-pink-200/80 bg-white/70 p-2.5 text-[10px] text-pink-800 dark:border-pink-500/20 dark:bg-slate-950/50 dark:text-pink-300">
                          Exemplo: pergunta <strong>“Qual tamanho você deseja?”</strong>, identificador <code className="rounded bg-pink-100 px-1 dark:bg-pink-500/20">tamanho</code>, resposta do cliente <strong>“M”</strong>. O pedido será salvo com <strong>tamanho = M</strong>.
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="showInPoll"
                          checked={selectedNode.showInPoll !== false}
                          onChange={(e) => setSelectedNodeField("showInPoll", e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="showInPoll" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                          Exibir esta opção na enquete
                        </label>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Se ocultar, o gatilho ainda poderá ser digitado pelo cliente.
                      </p>
                    </div>

                    {(selectedNode.actionType === "checkout" || selectedNode.actionType === "product") && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">💳 Forma de Pagamento</label>
                        <select
                          value={selectedNode.paymentMode || "both"}
                          onChange={(e) => setSelectedNodeField("paymentMode", e.target.value)}
                          className="w-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-2 py-1 font-bold text-[10px] text-indigo-900 dark:text-indigo-200 focus:outline-none"
                        >
                          <option value="both">⭐ Cliente escolhe entre PIX e Cartão</option>
                          <option value="pix">⚡ Pix Direto no WhatsApp</option>
                          <option value="link">🔗 Link de Checkout no Site</option>
                        </select>

                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Produto Vinculado</label>
                        <select
                          value={currentProductOptionValue}
                          onChange={(e) => linkProductToNode(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="">Selecione um produto</option>
                          {productOptions.map((prod: any) => (
                            <option key={prod.__idx} value={String(prod.__idx)}>
                              {prod.name} - R$ {prod.price}
                            </option>
                          ))}
                        </select>

                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nome do Produto (avulso)</label>
                        <input
                          type="text"
                          value={selectedNode.productName || ""}
                          onChange={(e) => setSelectedNodeField("productName", e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                          placeholder="Usado como fallback quando não houver id"
                        />
                      </div>
                    )}

                    {(
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {selectedNode.actionType === "collect_data"
                            ? "Pergunta enviada ao cliente"
                            : selectedNode.actionType === "human"
                              ? "Mensagem antes da transferência"
                              : selectedNode.actionType === "catalog"
                                ? "Título/introdução do catálogo"
                                : selectedNode.actionType === "product"
                                  ? "Texto antes dos detalhes do produto"
                                  : "Mensagem desta etapa"}
                        </label>
                        <textarea
                          rows={5}
                          value={selectedNode.textContent || ""}
                          onChange={(e) => setSelectedNodeField("textContent", e.target.value)}
                          placeholder="Digite a resposta personalizada enviada ao cliente..."
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-3 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                        />
                      </div>
                    )}

                    {selectedNode.actionType === "catalog" && (
                      <button type="button" onClick={createCatalogFlow} className="w-full rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 transition hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                        <Package className="mr-2 inline size-4" />Criar/atualizar opções com meus produtos
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                          addWorkflowNode("text", selectedNode.id);
                      }}
                      className="w-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl px-4 py-2 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Adicionar Sub-opção</span>
                    </button>

                    <div className="grid grid-cols-4 gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
                      <button type="button" onClick={() => moveSelectedNode(-1)} title="Mover para cima" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"><ChevronUp className="mx-auto size-4" /></button>
                      <button type="button" onClick={() => moveSelectedNode(1)} title="Mover para baixo" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"><ChevronDown className="mx-auto size-4" /></button>
                      <button type="button" onClick={duplicateSelectedNode} title="Duplicar etapa" className="rounded-xl border border-indigo-200 p-2 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/20 dark:text-indigo-300"><Copy className="mx-auto size-4" /></button>
                      <button type="button" onClick={deleteSelectedNode} title="Excluir etapa e dependências" className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-300"><X className="mx-auto size-4" /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </aside>
        )}

        {/* ABA 2: SIMULADOR DE SMARTPHONE DEDICADO COM PAINEL DE REGRAS COMPLETO */}
        {activeTab === "simulator" && (
          <div className="flex-1 h-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12),_transparent_46%)] bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 overflow-y-auto">
            {/* PAINEL LATERAL COMPLETO DE GERENCIAMENTO DE NÓS E TESTES */}
            {false && (<div className="hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Editar Regras &amp; Testar</h3>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">Ao Vivo</span>
              </div>

              {/* BARRA DE PESQUISA */}
              <div className="relative">
                <input
                  type="text"
                  value={nodeSearchQuery}
                  onChange={(e) => setNodeSearchQuery(e.target.value)}
                  placeholder="🔍 Buscar opção ou gatilho..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                />
                {nodeSearchQuery && (
                  <button onClick={() => setNodeSearchQuery("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* MENSAGENS DO SISTEMA */}
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl">
                <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                  Mensagem de Boas-vindas (Entrada)
                </span>
                <textarea
                  value={settings.welcome_message || ""}
                  onChange={(e) => updateField("welcome_message", e.target.value)}
                  rows={2}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* ÁRVORE DE NÓS E SUB-NÓS */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Árvore de Nós ({ (settings.custom_rules_nodes || []).length })
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        let rootCounter = 1;
                        const rootMap = new Map<string, number>();
                        const renumbered = newNodes.map((n: any) => {
                          if (!n.parentId) {
                            return { ...n, keyword: String(rootCounter++) };
                          } else {
                            const currentCount = (rootMap.get(n.parentId) || 0) + 1;
                            rootMap.set(n.parentId, currentCount);
                            return { ...n, keyword: String(currentCount) };
                          }
                        });
                        updateField("custom_rules_nodes", renumbered);
                      }}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      ✨ Auto-Numerar
                    </button>

                    <button
                      onClick={() => {
                        const newNodes = [...(settings.custom_rules_nodes || [])];
                        const nextNum = newNodes.filter((n) => !n.parentId).length + 1;
                        newNodes.push({
                          id: "node_" + Math.random().toString(36).substr(2, 9),
                          parentId: null,
                          keyword: String(nextNum),
                          title: `Opção ${nextNum}`,
                          actionType: "text",
                          textContent: "Digite a resposta desta opção...",
                          showInPoll: true,
                        });
                        updateField("custom_rules_nodes", newNodes);
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Nó
                    </button>
                  </div>
                </div>

                {/* LISTA HIERÁRQUICA RECURSIVA COM BUSCA */}
                {(() => {
                  const renderNodeItem = (node: any, depth = 0): React.ReactNode => {
                    const children = (settings.custom_rules_nodes || []).filter((n: any) => n.parentId === node.id);
                    const nodeIdx = (settings.custom_rules_nodes || []).findIndex((n: any) => n.id === node.id);
                    const isExpanded = expandedParents[node.id] !== false;

                    return (
                      <div key={node.id} className="space-y-2 w-full max-w-full min-w-0">
                        <div className={`p-3 rounded-2xl space-y-2 text-xs shadow-sm w-full max-w-full min-w-0 border transition-all ${
                          depth === 0
                            ? "bg-slate-50 dark:bg-slate-950 border-indigo-200 dark:border-indigo-500/30"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10"
                        }`}>
                          {/* LINHA DE TÍTULO E GATILHO */}
                          <div className="flex items-center gap-1.5 w-full min-w-0">
                            <button
                              onClick={() => setExpandedParents({ ...expandedParents, [node.id]: !isExpanded })}
                              className="text-slate-400 hover:text-indigo-600 p-0.5 font-bold text-xs shrink-0"
                              title={isExpanded ? "Recolher sub-opções" : "Expandir sub-opções"}
                            >
                              {children.length > 0 ? (isExpanded ? "▼" : "▶") : "•"}
                            </button>

                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-1.5 py-0.5 shrink-0">
                              <span className="text-[9px] font-bold text-slate-400">Gatilho:</span>
                              <input
                                type="text"
                                value={node.keyword || ""}
                                onChange={(e) => {
                                  const newNodes = [...(settings.custom_rules_nodes || [])];
                                  newNodes[nodeIdx].keyword = e.target.value;
                                  updateField("custom_rules_nodes", newNodes);
                                }}
                                className="w-5 bg-transparent font-black text-center text-indigo-600 dark:text-indigo-400 text-xs focus:outline-none"
                              />
                            </div>

                            <input
                              type="text"
                              value={node.title || ""}
                              onChange={(e) => {
                                const newNodes = [...(settings.custom_rules_nodes || [])];
                                newNodes[nodeIdx].title = e.target.value;
                                updateField("custom_rules_nodes", newNodes);
                              }}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-0.5 font-extrabold text-slate-900 dark:text-white text-xs min-w-0"
                              placeholder={depth === 0 ? "Título do Menu" : "Título da Sub-opção"}
                            />

                            <button
                              onClick={() => {
                                const deleteIds = new Set<string>();
                                const collectDelete = (id: string) => {
                                  deleteIds.add(id);
                                  (settings.custom_rules_nodes || []).filter((n: any) => n.parentId === id).forEach((c: any) => collectDelete(c.id));
                                };
                                collectDelete(node.id);
                                const newNodes = (settings.custom_rules_nodes || []).filter((n: any) => !deleteIds.has(n.id));
                                updateField("custom_rules_nodes", newNodes);
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:underline shrink-0"
                            >
                              Excluir
                            </button>
                          </div>

                          {/* TIPO DE AÇÃO DO NÓ */}
                          <select
                            value={node.actionType || "text"}
                            onChange={(e) => {
                              const newNodes = [...(settings.custom_rules_nodes || [])];
                              newNodes[nodeIdx].actionType = e.target.value;
                              updateField("custom_rules_nodes", newNodes);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                              <option value="text">💬 Exibir Resposta de Texto</option>
                              <option value="catalog">📋 Exibir Catálogo de Produtos</option>
                              <option value="product">🧩 Produto (exibe e segue submenu)</option>
                              <option value="checkout">💳 Pagamento / Checkout de Produto</option>
                              <option value="scheduling">📅 Abrir Agendamento de Horário</option>
                              <option value="human">👤 Transferir para Atendente Humano</option>
                            </select>

                          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={node.showInPoll !== false}
                              onChange={(e) => {
                                const newNodes = [...(settings.custom_rules_nodes || [])];
                                newNodes[nodeIdx].showInPoll = e.target.checked;
                                updateField("custom_rules_nodes", newNodes);
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Exibir esta opção na enquete
                          </label>

                          {/* MOSTRA FORMA DE PAGAMENTO APENAS SE FOR PAGAMENTO OU CHECKOUT! */}
                            {(node.actionType === "checkout" || node.actionType === "product") && (
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block">💳 Forma de Pagamento:</label>
                                <select
                                  value={node.paymentMode || "both"}
                                onChange={(e) => {
                                  const newNodes = [...(settings.custom_rules_nodes || [])];
                                  newNodes[nodeIdx].paymentMode = e.target.value;
                                  updateField("custom_rules_nodes", newNodes);
                                }}
                                className="w-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-2 py-1 font-bold text-[10px] text-indigo-900 dark:text-indigo-200 focus:outline-none"
                              >
                                <option value="both">⭐ Cliente escolhe entre PIX e Cartão</option>
                                  <option value="pix">⚡ Pix Direto no WhatsApp (Copia e Cola)</option>
                                  <option value="link">🔗 Link de Checkout no Site (Cartão / Boleto / Pix)</option>
                                </select>

                                <label className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block">🛒 Produto Vinculado:</label>
                                <select
                                  value={getProductOptionValue(node)}
                                  onChange={(e) => applyProductToNode(nodeIdx, parseInt(e.target.value, 10))}
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-0.5 font-bold text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                  <option value="">Selecione</option>
                                  {productOptions.map((prod: any) => (
                                    <option key={prod.__idx} value={String(prod.__idx)}>
                                      {prod.name} - R$ {prod.price}
                                    </option>
                                  ))}
                                </select>

                                <label className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 block">ou nome do produto:</label>
                                <input
                                  type="text"
                                  value={node.productName || ""}
                                  onChange={(e) => {
                                    const newNodes = [...(settings.custom_rules_nodes || [])];
                                    newNodes[nodeIdx].productName = e.target.value;
                                    updateField("custom_rules_nodes", newNodes);
                                  }}
                                  placeholder="Fallback se não houver produto vinculado"
                                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-0.5 font-medium text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                              </div>
                            )}

                          {/* RESPOSTA DO ROBÔ */}
                          <textarea
                            rows={2}
                            value={node.textContent || ""}
                            onChange={(e) => {
                              const newNodes = [...(settings.custom_rules_nodes || [])];
                              newNodes[nodeIdx].textContent = e.target.value;
                              updateField("custom_rules_nodes", newNodes);
                            }}
                            placeholder="Resposta enviada ao cliente ao selecionar esta opção..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-2 text-[11px] text-slate-800 dark:text-slate-200 font-medium focus:outline-none resize-none leading-relaxed"
                          />

                          {/* BOTÃO SINCRONIZAR PRODUTOS (SE FOR CATÁLOGO) */}
                          {node.actionType === "catalog" && (
                            <button
                              onClick={() => {
                                const newNodes = [...(settings.custom_rules_nodes || [])];
                                const prods = settings.products || [];
                                prods.forEach((prod: any, idx: number) => {
                                  const exists = newNodes.some((n) => n.parentId === node.id && n.keyword === String(idx + 1));
                                  if (!exists) {
                                  newNodes.push({
                                    id: "prod_node_" + Math.random().toString(36).substr(2, 9),
                                    parentId: node.id,
                                    keyword: String(idx + 1),
                                    title: `${prod.name} (R$ ${prod.price})`,
                                    actionType: "checkout",
                                    paymentMode: "both",
                                    textContent: `Você selecionou *${prod.name}* (R$ ${prod.price}). Escolha como deseja realizar o pagamento abaixo:`,
                                    productId: prod.id != null ? String(prod.id) : "",
                                    productName: prod.name || "",
                                    productPrice: prod.price != null ? String(prod.price) : "",
                                    productDescription: prod.description || "",
                                    showInPoll: true,
                                  });
                                }
                              });
                                updateField("custom_rules_nodes", newNodes);
                                setAlert({ type: "success", msg: "Sub-nós de produtos gerados com sucesso! 📦" });
                              }}
                              className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-2.5 py-1.5 text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <Package className="w-3.5 h-3.5 text-emerald-500" />
                              <span>✨ Gerar Sub-nós dos Produtos</span>
                            </button>
                          )}

                          {/* RODAPÉ DO CARD DO NÓ: ADD SUB-OPÇÃO */}
                          <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 dark:border-white/10">
                            <button
                              onClick={() => {
                                const newNodes = [...(settings.custom_rules_nodes || [])];
                                newNodes.push({
                                  id: "node_" + Math.random().toString(36).substr(2, 9),
                                  parentId: node.id,
                                  keyword: String(children.length + 1),
                                  title: `Sub-opção ${children.length + 1}`,
                                  actionType: "text",
                                  textContent: "Digite a resposta desta sub-opção...",
                                  showInPoll: true,
                                });
                                updateField("custom_rules_nodes", newNodes);
                              }}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Sub-opção
                            </button>
                            <span className="text-[9px] text-slate-400 font-medium">{children.length} sub-opção(ões)</span>
                          </div>
                        </div>

                        {/* SUB-NÓS RECURSIVOS (SUBSEÇÃO DA SUBSEÇÃO...) */}
                        {isExpanded && children.length > 0 && (
                          <div className="border-l-2 border-indigo-400/60 dark:border-indigo-500/50 pl-2.5 ml-2 space-y-2 relative">
                            {children.map((child: any) => renderNodeItem(child, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  const rootNodes = (settings.custom_rules_nodes || []).filter((n: any) => !n.parentId);
                  const filteredRootNodes = rootNodes.filter((rootNode: any) => {
                    if (!nodeSearchQuery) return true;
                    const q = nodeSearchQuery.toLowerCase();
                    return rootNode.title?.toLowerCase().includes(q) || rootNode.keyword?.toLowerCase().includes(q) || rootNode.textContent?.toLowerCase().includes(q);
                  });

                  return filteredRootNodes.map((rootNode: any) => renderNodeItem(rootNode, 0));
                })()}
              </div>
            </div>)}

            {/* CELULAR SMARTPHONE SIMULATOR */}
            <SmartphoneSimulator
              settings={settings}
              tenantId={tenantId}
              onActiveNodeChange={(nodeId) => {
                if (nodeId) setSelectedNodeId(nodeId);
              }}
              onUpdateText={(nodeId, newText, isWelcome) => {
                if (isWelcome) {
                  updateField("welcome_message", newText);
                } else if (nodeId) {
                  const newNodes = [...(settings.custom_rules_nodes || [])];
                  const idx = newNodes.findIndex((n) => n.id === nodeId);
                  if (idx !== -1) {
                    newNodes[idx].textContent = newText;
                    updateField("custom_rules_nodes", newNodes);
                  }
                }
              }}
            />
          </div>
        )}
      </div>

      {/* MODAL TEMPLATES PRONTOS */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Selecione um Template Pronto</h3>
              </div>
              <button onClick={() => setShowTemplatesModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 hover:border-indigo-500 dark:border-white/10 rounded-2xl cursor-pointer transition-all space-y-1 shadow-sm group hover:scale-[1.02]"
                >
                  <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {tpl.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug">{tpl.description}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL JSON CONFIG */}
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
      {/* MODAL CONFIGURAÇÃO DE GRUPOS DO WHATSAPP */}
      {showGroupsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Responder em Grupos do WhatsApp</h3>
              </div>
              <button onClick={() => setShowGroupsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Ativar Resposta do Robô em Grupos</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Por padrão o robô atende apenas conversas privadas 1-x-1.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("enable_groups", !settings.enable_groups)}
                  className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-all shrink-0 ${
                    settings.enable_groups ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                </button>
              </div>

              {settings.enable_groups && (
                <div className="space-y-2 p-3.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                    Grupos Autorizados (Nome ou ID do WhatsApp)
                  </label>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                    Digite o nome ou ID dos grupos autorizados separados por vírgula. O robô responderá <strong>apenas</strong> aos grupos cadastrados aqui.
                  </p>
                  <input
                    type="text"
                    value={settings.whitelisted_groups || ""}
                    onChange={(e) => updateField("whitelisted_groups", e.target.value)}
                    placeholder="Ex: Grupo Clientes VIP, Suporte Oficial, 120363424279225343"
                    className="w-full rounded-xl border border-purple-300 dark:border-purple-500/40 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowGroupsModal(false);
                  saveConfig();
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-md"
              >
                Salvar Configurações de Grupos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
