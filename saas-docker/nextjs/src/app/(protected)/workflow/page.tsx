"use client";

import WorkflowCanvas from "./WorkflowCanvas";
import { SmartphoneSimulator } from "../../../components/workflow/SmartphoneSimulator";
import { validateFlow } from "../../../lib/ai/validateFlow";
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

const MAIN_STORE_TENANT_ID = "3bc0174c-d760-4fc7-9e38-8d20577f5593";

const DEFAULT_CLIENT_GENERIC_NODES: any[] = [
  {
    id: "node_catalogo_generico",
    parentId: null,
    keyword: "1",
    title: "📋 Produtos & Serviços",
    actionType: "catalog",
    textContent: "📋 *Confira nossos produtos e serviços abaixo:*\n\nEscolha uma das opções para ver os detalhes:",
    showInPoll: true,
  },
  {
    id: "node_agendamento_generico",
    parentId: null,
    keyword: "2",
    title: "📅 Agendar Horário / Atendimento",
    actionType: "scheduling",
    textContent: "Escolha uma data e horário disponível abaixo para realizarmos o seu atendimento:",
    showInPoll: true,
  },
  {
    id: "node_atendente_generico",
    parentId: null,
    keyword: "3",
    title: "👤 Falar com Atendente Humano",
    actionType: "human",
    textContent: "Transferindo o seu atendimento para um de nossos atendentes. Por favor, aguarde um instante! 🤝",
    showInPoll: true,
  },
];


const DEFAULT_SAAS_NODES: any[] = [
  {
    id: "node_plano_start",
    parentId: null,
    keyword: "1",
    title: "Plano Start (R$ 67/mês)",
    actionType: "checkout",
    productId: "Plano Start",
    productName: "Plano Start (R$ 67/mês)",
    productPrice: "67",
    productDescription: "📌 Plano Start (R$ 67/mês)\n• Bot Fixo de Regras e Botões no WhatsApp\n• Atendimento Automático 24 horas\n• Respostas Ilimitadas via Menu\n(NÃO inclui criação de site nem IA)",
    textContent: "Você selecionou o *Plano Start (R$ 67/mês)*:\n\n✨ *O que está incluso:*\n• Bot Fixo de Regras/Botões no WhatsApp\n• Atendimento 24h automático\n• Hospedagem e suporte inclusos\n\nEscolha a forma de pagamento:",
    paymentMode: "both",
    showInPoll: true,
  },
  {
    id: "node_plano_97",
    parentId: null,
    keyword: "2",
    title: "Plano 97 (R$ 97/mês)",
    actionType: "checkout",
    productId: "Plano 97",
    productName: "Plano 97 (R$ 97/mês)",
    productPrice: "97",
    productDescription: "📌 Plano 97 (R$ 97/mês)\n• Site Institucional 100% GRÁTIS Incluso\n• Ambos os Bots (Bot de Regras + Bot com IA 5k msgs/mês)\n• Agendamento Automático de Atendimentos",
    textContent: "Você selecionou o *Plano 97 (R$ 97/mês)*:\n\n✨ *O que está incluso:*\n• Site Institucional 100% GRÁTIS\n• AMBOS OS BOTS INCLUSOS (Bot de Regras + Bot Inteligente com IA 5k msgs/mês)\n• Agendamento de Horários\n\nEscolha a forma de pagamento:",
    paymentMode: "both",
    showInPoll: true,
  },
  {
    id: "node_plano_growth",
    parentId: null,
    keyword: "3",
    title: "Plano Growth (R$ 147/mês ⭐)",
    actionType: "checkout",
    productId: "Plano Growth (Mais Vendido ⭐)",
    productName: "Plano Growth (Mais Vendido ⭐)",
    productPrice: "147",
    productDescription: "📌 Plano Growth (R$ 147/mês ⭐) — O Mais Vendido!\n• Site Institucional de até 5 Páginas\n• Ambos os Bots (Regras + IA 5k msgs/mês)\n• CRM de Vendas e Atendimento\n• Agendamento Automático + Suporte VIP",
    textContent: "Você selecionou o *Plano Growth (R$ 147/mês ⭐)*:\n\n✨ *O que está incluso:*\n• Site Institucional Completo (até 5 páginas)\n• AMBOS OS BOTS INCLUSOS (Regras + IA 5k msgs/mês)\n• CRM de Atendimento e Vendas\n• Agendamento Automático de Horários\n\nEscolha a forma de pagamento:",
    paymentMode: "both",
    showInPoll: true,
  },
  {
    id: "node_plano_scale",
    parentId: null,
    keyword: "4",
    title: "Plano Scale (R$ 497/mês)",
    actionType: "checkout",
    productId: "Plano Scale",
    productName: "Plano Scale (R$ 497/mês)",
    productPrice: "497",
    productDescription: "📌 Plano Scale (R$ 497/mês)\n• Loja Virtual E-Commerce Completa\n• Ambos os Bots (Regras + IA 20k msgs/mês)\n• Multiatendimento Ilimitado para Equipes\n• Disparos em Massa + Gestor Dedicado",
    textContent: "Você selecionou o *Plano Scale (R$ 497/mês)*:\n\n✨ *O que está incluso:*\n• Loja Virtual E-Commerce Completa (sem taxas por venda)\n• AMBOS OS BOTS (Regras + IA Enterprise 20k msgs/mês)\n• Multiatendimento Ilimitado para Atendentes\n• Disparos em Massa + Funis de Vendas\n\nEscolha a forma de pagamento:",
    paymentMode: "both",
    showInPoll: true,
  },
  {
    id: "node_site_avulso",
    parentId: null,
    keyword: "5",
    title: "Site Avulso / Sob Medida (R$ 497)",
    actionType: "checkout",
    productId: "Site Avulso / Personalizado",
    productName: "Site Avulso / Sob Medida",
    productPrice: "497",
    productDescription: "📌 Site Avulso Personalizado (R$ 497 taxa única)\n• Desenvolvimento de Site Exclusivo para seu Nicho\n• Sem mensalidade obrigatória\n• Entregue em 3 a 5 dias úteis com domínio e SSL inclusos",
    textContent: "Você selecionou *Site Avulso / Sob Medida (R$ 497 taxa única)*:\n\n✨ *O que está incluso:*\n• Design exclusivo e sob medida para a sua empresa\n• Domínio próprio, SSL e Hospedagem\n• Otimizado para Celulares e Google (SEO)\n• Botão de WhatsApp Direct-to-Chat\n\nEscolha a forma de pagamento:",
    paymentMode: "both",
    showInPoll: true,
  },
  {
    id: "node_agendamento",
    parentId: null,
    keyword: "6",
    title: "📅 Agendar Horário / Reunião",
    actionType: "scheduling",
    textContent: "Escolha uma data e horário disponível abaixo para realizarmos a sua reunião ou atendimento:",
    showInPoll: true,
  },
  {
    id: "node_atendente_humano",
    parentId: null,
    keyword: "7",
    title: "👤 Falar com Atendente Humano",
    actionType: "human",
    textContent: "Transferindo o seu atendimento para um especialista humano da nossa equipe! Por favor, aguarde um instante que já vamos te responder. 💙",
    showInPoll: true,
  },
  {
    id: "node_catalogo",
    parentId: null,
    keyword: "8",
    title: "📋 Catálogo Completo de Serviços",
    actionType: "catalog",
    textContent: "📋 *Confira nosso Catálogo Completo de Produtos & Planos:*\n\nEscolha uma das opções abaixo para ver os detalhes e contratar:",
    showInPoll: true,
  },
];

const DEFAULT_AI: AISettings = {
  bot_type: "ia",
  ai_name: "Bot da loja",
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
  welcome_menu_auto_append: true,
  enableScheduling: true,
  custom_rules_nodes: DEFAULT_CLIENT_GENERIC_NODES,
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
    welcome_message: "Olá! Que bom ter você aqui no nosso restaurante. Digite 1 para ver o cardápio ou 4 para falar com nossos atendentes! Ã°Å¸ÂÂ½Ã¯Â¸Â",
    enableScheduling: false,
  },
  {
    id: "suporte",
    title: "Suporte Técnico",
    description: "Foco total em triagem e repasse rápido para atendimento humano.",
    welcome_message: "Olá, bem-vindo(a) ao nosso suporte técnico! Diga o que precisa ou digite 4 para falar com um técnico. Ã°Å¸â€˜Â¨Ã¢â‚¬ÂÃ°Å¸â€™Â»",
    enableScheduling: false,
  },
];

function sanitizeWelcomeText(msg: any): string {
  if (!msg || typeof msg !== "string") {
    return "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";
  }
  const clean = msg
    .replace(/[\uFFFD\u00A0]/g, "")
    .replace(/Ã°Å¸Å¸Â£\s*\s*Ã¢â‚¬â€œ\s*Ã°Å¸Å¸Â£\s*\s*Ã¢â‚¬Â¹/g, "")
    .replace(/||Ã¢â‚¬Â¹/g, "")
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
  const settingsRef = useRef<AISettings>(DEFAULT_AI);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    fetchConfig();
    if (window.matchMedia("(max-width: 767px)").matches) setIsRightPanelOpen(false);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/settings/whatsapp");
      const data = await res.json();
      if (data.settings) {
        const isMainStore = data.tenantId === MAIN_STORE_TENANT_ID;
        const merged = { ...DEFAULT_AI, ...data.settings };
        merged.welcome_message = sanitizeWelcomeText(merged.welcome_message);
        if (!Array.isArray(merged.products)) merged.products = [];

        // Limpeza e Isolamento: Se for cliente e tiver nós do SaaS da loja principal, limpa para o template genérico!
        const hasSaasNodes = merged.custom_rules_nodes?.some((n: any) => n.id === "node_plano_growth" || n.productId === "Plano Growth (Mais Vendido ⭐)");
        if (!isMainStore && (hasSaasNodes || !merged.custom_rules_nodes || merged.custom_rules_nodes.length === 0)) {
          merged.custom_rules_nodes = DEFAULT_CLIENT_GENERIC_NODES;
        } else if (isMainStore && (!merged.custom_rules_nodes || merged.custom_rules_nodes.length === 0)) {
          merged.custom_rules_nodes = DEFAULT_SAAS_NODES;
        }

        settingsRef.current = merged;
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
    const updated = { ...settingsRef.current, [key]: val };
    settingsRef.current = updated;
    setSettings(updated);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => void saveConfig(updated, true), 650);
  };

  useEffect(() => () => {
    if (!autoSaveTimerRef.current) return;
    clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
    void fetch("/api/settings/whatsapp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsRef.current),
      keepalive: true,
    });
  }, []);

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const merged = { ...DEFAULT_AI, ...parsed };
      merged.welcome_message = sanitizeWelcomeText(merged.welcome_message);
      if (!Array.isArray(merged.products)) merged.products = [];

      if (Array.isArray(merged.custom_rules_nodes)) {
        const validation = validateFlow(merged.custom_rules_nodes);
        if (!validation.valid) {
          const firstError = validation.errors[0]?.message || "Fluxo inválido.";
          setAlert({ type: "error", msg: `Fluxo inválido: ${firstError}` });
          return;
        }
      }

      settingsRef.current = merged;
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
      ...settingsRef.current,
      welcome_message: tpl.welcome_message,
      enableScheduling: tpl.enableScheduling,
    };
    settingsRef.current = updated;
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
      text: "📄 Mensagem",
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
    const catalogProductNodes = nodes.filter((node: any) => node.parentId === selectedNode.id && node.actionType === "product");
    const validProductNode = (node: any) => (settings.products || []).some((product: any) => product.id != null && node.productId
      ? String(node.productId) === String(product.id)
      : String(node.productName || "") === String(product.name || ""));
    const staleIds = new Set(catalogProductNodes.filter((node: any) => !validProductNode(node)).map((node: any) => node.id));
    let foundStaleDescendant = true;
    while (foundStaleDescendant) {
      foundStaleDescendant = false;
      nodes.forEach((node: any) => {
        if (staleIds.has(node.parentId) && !staleIds.has(node.id)) {
          staleIds.add(node.id);
          foundStaleDescendant = true;
        }
      });
    }
    if (staleIds.size > 0) {
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        if (staleIds.has(nodes[index].id)) nodes.splice(index, 1);
      }
      for (let index = catalogProductNodes.length - 1; index >= 0; index -= 1) {
        if (staleIds.has(catalogProductNodes[index].id)) catalogProductNodes.splice(index, 1);
      }
    }
    const claimedProductNodeIds = new Set<string>();
    const now = Date.now();
    (settings.products || []).forEach((product: any, index: number) => {
      let productNode = catalogProductNodes.find((node: any) => !claimedProductNodeIds.has(node.id) && (product.id != null
        ? String(node.productId || "") === String(product.id) || (!node.productId && String(node.productName || "") === String(product.name || ""))
        : String(node.productName || "") === String(product.name || "")));
      if (!productNode) {
        productNode = {
          id: `product_${now}_${index}_${Math.random().toString(36).slice(2, 5)}`,
          parentId: selectedNode.id,
          actionType: "product",
          textContent: "",
          showInPoll: true,
          generatedFromCatalog: true,
        };
        nodes.push(productNode);
        catalogProductNodes.push(productNode);
      }
      claimedProductNodeIds.add(productNode.id);

      Object.assign(productNode, {
        keyword: String(index + 1),
        title: product.name || `Produto ${index + 1}`,
        productId: product.id != null ? String(product.id) : "",
        productName: product.name || "",
        productPrice: product.price != null ? String(product.price) : "",
        productDescription: product.description || "",
      });

      let checkoutNode = nodes.find((node: any) => node.parentId === productNode.id && node.actionType === "checkout");
      if (!checkoutNode) {
        checkoutNode = {
          id: `checkout_${now}_${index}_${Math.random().toString(36).slice(2, 5)}`,
          parentId: productNode.id,
          keyword: "1",
          title: "Comprar agora",
          actionType: "checkout",
          textContent: "Vamos finalizar seu pedido.",
          paymentMode: "both",
          showInPoll: true,
          generatedFromCatalog: true,
        };
        nodes.push(checkoutNode);
      }
      Object.assign(checkoutNode, {
        productId: product.id != null ? String(product.id) : "",
        productName: product.name || "",
        productPrice: product.price != null ? String(product.price) : "",
        productDescription: product.description || "",
      });
    });
    updateField("custom_rules_nodes", nodes);
    setAlert({ type: "success", msg: `${(settings.products || []).length} produto(s) sincronizado(s) com o fluxo.` });
  };

  const updateProductField = (productIndex: number, field: string, value: any) => {
    const products = [...(settingsRef.current.products || [])];
    const previous = products[productIndex];
    if (!previous) return;
    const updatedProduct = {
      ...previous,
      id: previous.id || `product_${Date.now()}_${productIndex}_${Math.random().toString(36).slice(2, 7)}`,
      [field]: value,
    };
    products[productIndex] = updatedProduct;
    updateField("products", products);

    const currentNodes = settingsRef.current.custom_rules_nodes || [];
    const catalogIds = new Set(currentNodes.filter((node: any) => node.actionType === "catalog").map((node: any) => node.id));
    const branchRoots = previous.id == null
      ? currentNodes.filter((node: any) => node.actionType === "product" && catalogIds.has(node.parentId) && String(node.keyword || "") === String(productIndex + 1) && String(node.productName || "") === String(previous.name || ""))
      : [];
    const branchIds = new Set<string>(branchRoots.map((node: any) => node.id));
    let foundBranchDescendant = true;
    while (foundBranchDescendant) {
      foundBranchDescendant = false;
      currentNodes.forEach((node: any) => {
        if (branchIds.has(node.parentId) && !branchIds.has(node.id)) {
          branchIds.add(node.id);
          foundBranchDescendant = true;
        }
      });
    }
    const nodes = currentNodes.map((node: any) => {
      const sameProduct = previous.id != null
        ? String(node.productId || "") === String(previous.id)
        : branchIds.has(node.id) || (branchRoots.length === 0 && String(node.productName || "") === String(previous.name || ""));
      if (!sameProduct) return node;
      return {
        ...node,
        productId: updatedProduct.id != null ? String(updatedProduct.id) : node.productId,
        productName: updatedProduct.name || "",
        productPrice: updatedProduct.price != null ? String(updatedProduct.price) : "",
        productDescription: updatedProduct.description || "",
        ...(node.actionType === "product" && node.generatedFromCatalog ? { title: updatedProduct.name || node.title } : {}),
      };
    });
    updateField("custom_rules_nodes", nodes);
  };

  const addProduct = () => {
    const product = {
      id: `product_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: "Novo produto",
      price: "0.00",
      description: "",
      requires_payment: true,
      delivery_type: "virtual_instant",
    };
    updateField("products", [...(settingsRef.current.products || []), product]);
  };

  const deleteProduct = (productIndex: number) => {
    const product = (settings.products || [])[productIndex];
    if (!product || !window.confirm(`Excluir "${product.name}" do catálogo?`)) return;
    const nodes = settingsRef.current.custom_rules_nodes || [];
    const catalogIds = new Set(nodes.filter((node: any) => node.actionType === "catalog").map((node: any) => node.id));
    const productBranches = nodes
      .filter((node: any) => node.actionType === "product" && catalogIds.has(node.parentId))
      .filter((node: any) => product.id != null
        ? String(node.productId || "") === String(product.id)
        : String(node.productName || "") === String(product.name || ""));
    const selectedBranches = product.id == null
      ? productBranches.filter((node: any) => String(node.keyword || "") === String(productIndex + 1))
      : productBranches;
    const deletedIds = new Set<string>((selectedBranches.length > 0 ? selectedBranches : productBranches.slice(0, 1)).map((node: any) => node.id));
    let foundDescendant = true;
    while (foundDescendant) {
      foundDescendant = false;
      nodes.forEach((node: any) => {
        if (deletedIds.has(node.parentId) && !deletedIds.has(node.id)) {
          deletedIds.add(node.id);
          foundDescendant = true;
        }
      });
    }
    if (deletedIds.size > 0) updateField("custom_rules_nodes", nodes.filter((node: any) => !deletedIds.has(node.id)));
    updateField("products", (settingsRef.current.products || []).filter((_: any, index: number) => index !== productIndex));
  };

  const availableVariables = (settings.custom_rules_nodes || [])
    .filter((node: any) => node.actionType === "collect_data" && String(node.variableName || "").trim())
    .map((node: any) => String(node.variableName).trim())
    .filter((value: string, index: number, values: string[]) => values.indexOf(value) === index);
  const selectedNodeChildren = selectedNode
    ? (settings.custom_rules_nodes || []).filter((node: any) => node.parentId === selectedNode.id)
    : [];

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
    <div className="flex h-[calc(100vh-3.5rem)] w-auto flex-col overflow-hidden bg-slate-100 -m-4 font-sans text-slate-900 dark:bg-slate-950 dark:text-white md:h-screen md:-m-8">
      {/* HEADER SUPERIOR ESPAáâ€¡OSO E SEM SOBREPOSIáâ€¡áâ€¢ES */}
      <header className="min-h-16 border-b border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-3 py-2 md:px-5 flex flex-col items-stretch sm:flex-row sm:items-center justify-between z-20 shadow-sm gap-2 sm:gap-4">
        {/* ESQUERDA: TáTULO E NAVEGAáâ€¡áÆ’O DE ABAS */}
        <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start sm:gap-4 sm:flex-shrink-0">
          <div className="hidden items-center gap-2.5 md:flex">
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
              <span>Testar e editar</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>
        </div>

        {/* DIREITA: BOTáâ€¢ES DE Aáâ€¡áÆ’O ORGANIZADOS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
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

      {/* áREA PRINCIPAL TOTALMENTE ESPAáâ€¡OSA E LIVRE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ABA 1: CANVAS VISUAL ESPAáâ€¡OSO */}
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

            {/* BOTáÆ’O FLUTUANTE DE ACESSO RáPIDO AO SIMULADOR */}
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

        {/* DIREITA: PROPRIEDADES DO Náâ€œ SELECIONADO (PAINEL DESLIZANTE QUE PODE SER ENCOLHIDO) */}
        {(activeTab === "canvas" || activeTab === "simulator") && (
          <aside
            className={`${activeTab === "simulator" ? "order-1 border-r" : "order-2 border-l"} border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl flex flex-col flex-shrink-0 z-10 transition-all duration-300 relative ${
              isRightPanelOpen ? (activeTab === "simulator" ? "fixed inset-y-0 right-0 z-50 w-full max-w-[420px] p-5 space-y-6 overflow-y-auto md:relative md:inset-auto md:z-10" : "fixed inset-y-0 right-0 z-50 w-full max-w-[380px] p-5 space-y-6 overflow-y-auto md:relative md:inset-auto md:z-10") : "w-12 p-2 items-center"
            }`}
          >
            {/* BOTáÆ’O RETRáTIL DO PAINEL LATERAL */}
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="absolute top-4 left-3 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 transition-all"
              title={isRightPanelOpen ? "Recolher Painel" : "Expandir Painel"}
            >
              {isRightPanelOpen
                ? (activeTab === "simulator" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
                : (activeTab === "simulator" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
            </button>

            {isRightPanelOpen && (
              <>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/10 pl-8">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {activeTab === "simulator" ? "Editar e visualizar ao vivo" : "Propriedades da etapa"}
                  </h3>
                </div>

                {activeTab === "simulator" && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />Prévia automática
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">Altere qualquer campo abaixo. O telefone reinicia e mostra imediatamente a versão nova do fluxo.</p>
                  </div>
                )}

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
                        Ã°Å¸â€â€˜ Gatilho de Ativação (Dígito ou Palavra-chave)
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
                        <option value="product">📦 Produto (exibe e segue submenu)</option>
                        <option value="checkout">🛒 Checkout / Pagamento</option>
                        <option value="scheduling">📅 Iniciar Agendamento</option>
                        <option value="collect_data">Ã°Å¸â€œÂ Fazer Pergunta / Coletar Dado</option>
                        <option value="human">👤 Transferir para Humano</option>
                      </select>
                    </div>

                    {selectedNode.actionType === "collect_data" && (
                      <div className="space-y-4 rounded-2xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-500/20 dark:bg-pink-500/10">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-500">1. Pergunta ao cliente</p>
                          <textarea
                            rows={4}
                            value={selectedNode.textContent || ""}
                            onChange={(e) => setSelectedNodeField("textContent", e.target.value)}
                            placeholder="Ex: Qual tamanho você deseja?"
                            className="mt-2 w-full resize-none rounded-xl border border-pink-200 bg-white p-3 text-xs font-medium leading-relaxed outline-none focus:border-pink-500 dark:border-pink-500/20 dark:bg-slate-950"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-500">2. Salvar a resposta como</label>
                          <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-pink-200 bg-white dark:border-pink-500/20 dark:bg-slate-950">
                            <span className="border-r border-pink-100 px-3 py-2 font-mono text-xs font-black text-pink-500 dark:border-pink-500/20">&#123;</span>
                            <input
                              value={selectedNode.variableName || ""}
                              onChange={(e) => setSelectedNodeField("variableName", e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
                              placeholder="tamanho"
                              className="min-w-0 flex-1 bg-transparent px-2 py-2 font-mono text-xs font-bold outline-none"
                            />
                            <span className="border-l border-pink-100 px-3 py-2 font-mono text-xs font-black text-pink-500 dark:border-pink-500/20">&#125;</span>
                          </div>
                          <p className="mt-1.5 text-[10px] leading-relaxed text-pink-700/80 dark:text-pink-300/80">A resposta fica no pedido e pode ser usada depois escrevendo <code className="rounded bg-pink-100 px-1 dark:bg-pink-500/20">&#123;{selectedNode.variableName || "tamanho"}&#125;</code> em outra mensagem.</p>
                        </div>
                        <div className="rounded-xl border border-pink-200/80 bg-white/70 p-3 text-[10px] text-pink-800 dark:border-pink-500/20 dark:bg-slate-950/50 dark:text-pink-300">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-pink-500">3. Depois da resposta</p>
                          <p className="mt-1.5 font-bold">{selectedNodeChildren.length > 0 ? `Continuar para: ${selectedNodeChildren.map((node: any) => node.title).join(", ")}` : "Voltar ao menu principal"}</p>
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
                          <option value="both">Ã¢Â­Â Cliente escolhe entre PIX e Cartão</option>
                          <option value="pix">⚡¡ Pix Direto no WhatsApp</option>
                          <option value="link">Ã°Å¸â€â€” Link de Checkout no Site</option>
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

                    {selectedNode.actionType !== "collect_data" && (
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
                        {availableVariables.length > 0 && (
                          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-indigo-500">Inserir resposta coletada</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {availableVariables.map((variable) => (
                                <button key={variable} type="button" onClick={() => setSelectedNodeField("textContent", `${selectedNode.textContent || ""}${selectedNode.textContent ? " " : ""}{${variable}}`)} className="rounded-lg border border-indigo-200 bg-white px-2 py-1 font-mono text-[9px] font-black text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-slate-950 dark:text-indigo-300">
                                  {`{${variable}}`}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
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
          <div className="order-2 flex-1 h-full bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.12),_transparent_46%)] bg-slate-100 dark:bg-slate-950 flex items-center justify-center gap-5 p-6 overflow-y-auto">
            {/* PAINEL LATERAL COMPLETO DE GERENCIAMENTO DE Náâ€œS E TESTES */}
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
                  placeholder="Ã°Å¸â€Â Buscar opção ou gatilho..."
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

              {/* áRVORE DE Náâ€œS E SUB-Náâ€œS */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    árvore de Nós ({ (settings.custom_rules_nodes || []).length })
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
                      ✨¨ Auto-Numerar
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

                {/* LISTA HIERáRQUICA RECURSIVA COM BUSCA */}
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
                          {/* LINHA DE TáTULO E GATILHO */}
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
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1 font-extrabold text-slate-900 dark:text-white text-xs min-w-0"
                              placeholder={depth === 0 ? "Nome da Opção na Enquete do WhatsApp (ex: Agendar Consulta)" : "Nome da Sub-opção na Enquete"}
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

                          {/* TIPO DE Aáâ€¡áÆ’O DO Náâ€œ */}
                          <select
                            value={node.actionType || "text"}
                            onChange={(e) => {
                              const newNodes = [...(settings.custom_rules_nodes || [])];
                              newNodes[nodeIdx].actionType = e.target.value;
                              updateField("custom_rules_nodes", newNodes);
                            }}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 font-bold text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                              <option value="text">💬 Exibir Resposta de Texto / Submenu</option>
                              <option value="collect_data">Ã°Å¸â€œÂ Fazer Pergunta / Coletar Dado (Formulário)</option>
                              <option value="catalog">📋 Exibir Catálogo de Produtos</option>
                              <option value="product">📦 Produto (exibe e segue submenu)</option>
                              <option value="checkout">💳 Pagamento / Checkout de Produto</option>
                              <option value="scheduling">📅 Abrir Agendamento de Horário</option>
                              <option value="human">👤 Transferir para Atendente Humano</option>
                            </select>

                          {/* CAMPOS ESPECáFICOS PARA FORMULáRIO / PERGUNTA (COLLECT DATA) */}
                          {node.actionType === "collect_data" && (
                            <div className="space-y-2 p-2.5 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-500/30 rounded-xl">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-pink-700 dark:text-pink-300">
                                  Ã°Å¸â€â€˜ Variável onde salvar a resposta:
                                </label>
                                <span className="text-[9px] font-mono font-bold text-pink-600 dark:text-pink-400">
                                  {node.variableName ? `{${node.variableName}}` : "sem variável"}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={node.variableName || ""}
                                onChange={(e) => {
                                  const newNodes = [...(settings.custom_rules_nodes || [])];
                                  newNodes[nodeIdx].variableName = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                                  updateField("custom_rules_nodes", newNodes);
                                }}
                                placeholder="ex: informacao_cliente, nome_cliente, cpf"
                                className="w-full bg-white dark:bg-slate-950 border border-pink-200 dark:border-pink-500/30 rounded-lg px-2 py-1 text-xs font-mono font-bold text-pink-900 dark:text-pink-200 focus:outline-none"
                              />
                              <p className="text-[9px] text-pink-700 dark:text-pink-300 italic">
                                A resposta digitada pelo cliente será gravada nesta variável. Exemplo de uso nas mensagens das etapas seguintes: <code className="font-mono bg-pink-100 dark:bg-pink-900 px-1 py-0.5 rounded text-pink-800 dark:text-pink-200">{`{${node.variableName || "informacao_cliente"}}`}</code>
                              </p>
                            </div>
                          )}

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
                                <option value="both">Ã¢Â­Â Cliente escolhe entre PIX e Cartão</option>
                                  <option value="pix">⚡¡ Pix Direto no WhatsApp (Copia e Cola)</option>
                                  <option value="link">Ã°Å¸â€â€” Link de Checkout no Site (Cartão / Boleto / Pix)</option>
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

                          {/* RESPOSTA DO ROBáâ€ */}
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

                          {/* BOTáÆ’O SINCRONIZAR PRODUTOS (SE FOR CATáLOGO) */}
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
                              <span>✨¨ Gerar Sub-nós dos Produtos</span>
                            </button>
                          )}

                          {/* RODAPáâ€° DO CARD DO Náâ€œ: ADD SUB-OPáâ€¡áÆ’O */}
                          <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 dark:border-white/10">
                            <button
                              onClick={() => {
                                const newNodes = [...(settings.custom_rules_nodes || [])];
                                const isForm = node.actionType === "collect_data";
                                newNodes.push({
                                  id: "node_" + Math.random().toString(36).substring(2, 9),
                                  parentId: node.id,
                                  keyword: String(children.length + 1),
                                  title: isForm ? `Próxima Pergunta / Etapa ${children.length + 1}` : `Sub-opção ${children.length + 1}`,
                                  actionType: isForm ? "collect_data" : "text",
                                  textContent: isForm ? "Qual a próxima pergunta que deseja fazer ao cliente?" : "Digite a resposta desta sub-opção...",
                                  showInPoll: true,
                                  variableName: "",
                                });
                                updateField("custom_rules_nodes", newNodes);
                              }}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> {node.actionType === "collect_data" ? "Add Próxima Pergunta (Formulário)" : "Add Sub-opção"}
                            </button>
                            <span className="text-[9px] text-slate-400 font-medium">{children.length} sub-opção(ões)</span>
                          </div>
                        </div>

                        {/* SUB-Náâ€œS RECURSIVOS (SUBSEáâ€¡áÆ’O DA SUBSEáâ€¡áÆ’O...) */}
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

            <div className="hidden xl:flex h-[660px] w-[240px] shrink-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <div className="border-b border-slate-100 p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-600">Mapa do atendimento</p>
                    <p className="mt-1 text-xs font-black text-slate-900 dark:text-white">Todas as etapas</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500 dark:bg-white/10">{(settings.custom_rules_nodes || []).length}</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Clique em uma etapa para editar. O telefone mostra o caminho escolhido durante o teste.</p>
              </div>
              <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("start")}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[10px] font-black transition ${selectedNodeId === "start" ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 dark:border-white/5 dark:bg-white/5 dark:text-slate-300"}`}
                >
                  <Bot className="size-3.5" />Início e boas-vindas
                </button>
                {(settings.custom_rules_nodes || []).map((node: any) => {
                  let depth = 0;
                  let parentId = node.parentId;
                  const visited = new Set<string>();
                  while (parentId && depth < 5 && !visited.has(parentId)) {
                    visited.add(parentId);
                    depth += 1;
                    parentId = (settings.custom_rules_nodes || []).find((candidate: any) => candidate.id === parentId)?.parentId;
                  }
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedNodeId(node.id)}
                      style={{ marginLeft: `${Math.min(depth, 4) * 10}px`, width: `calc(100% - ${Math.min(depth, 4) * 10}px)` }}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${selectedNodeId === node.id ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200" : "border-slate-100 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300"}`}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-black dark:bg-white/10">{node.keyword}</span>
                      <span className="min-w-0 flex-1 truncate text-[10px] font-bold">{node.title}</span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 p-3 dark:border-white/10">
                <button type="button" onClick={() => addWorkflowNode("text")} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black text-white hover:bg-indigo-500">
                  <Plus className="size-3.5" />Adicionar após {selectedNode?.title || "Início"}
                </button>
              </div>
            </div>

            {/* CELULAR SMARTPHONE SIMULATOR */}
            <SmartphoneSimulator
              settings={settings}
              tenantId={tenantId}
              onActiveNodeChange={(nodeId) => {
                setSelectedNodeId(nodeId || "start");
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

      {/* MODAL GERENCIAR CATáLOGO DE PRODUTOS */}
      {showProductsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Editar catálogo</h3>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">As alterações aparecem automaticamente no simulador e nos nós já vinculados.</p>
              </div>
              <button onClick={() => setShowProductsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(settings.products || []).map((prod: any, idx: number) => (
                <div key={prod.id || idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950">
                  <div className="grid gap-3 md:grid-cols-[1fr_130px_170px_36px]">
                    <label className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nome</span>
                      <input value={prod.name || ""} onChange={(event) => updateProductField(idx, "name", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Preço</span>
                      <input value={prod.price ?? ""} onChange={(event) => updateProductField(idx, "price", event.target.value)} inputMode="decimal" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-slate-900 dark:text-emerald-300" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tipo de entrega</span>
                      <select value={prod.delivery_type || "virtual_instant"} onChange={(event) => updateProductField(idx, "delivery_type", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900">
                        <option value="virtual_instant">Digital imediata</option>
                        <option value="virtual_deadline">Digital com prazo</option>
                        <option value="delivery">Entrega ou retirada</option>
                        <option value="both">Digital ou física</option>
                        <option value="service">Serviço agendável</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => deleteProduct(idx)} title="Excluir produto" className="mt-5 flex size-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"><X className="size-4" /></button>
                  </div>
                  <label className="mt-3 block space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Descrição mostrada ao cliente</span>
                    <textarea value={prod.description || ""} onChange={(event) => updateProductField(idx, "description", event.target.value)} rows={2} className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900" placeholder="Explique de forma curta o que o cliente está comprando." />
                  </label>
                </div>
              ))}
              {(settings.products || []).length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-500 dark:border-white/15">Seu catálogo está vazio. Adicione o primeiro produto abaixo.</div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-3">
              <button type="button" onClick={addProduct} className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-black text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Plus className="size-4" />Adicionar produto
              </button>
              <button
                onClick={() => setShowProductsModal(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                Concluir e testar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CONFIGURAáâ€¡áÆ’O DE GRUPOS DO WHATSAPP */}
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
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">Ativar Resposta do Robá´ em Grupos</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Por padrão o robá´ atende apenas conversas privadas 1-x-1.</p>
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
                    Digite o nome ou ID dos grupos autorizados separados por vírgula. O robá´ responderá <strong>apenas</strong> aos grupos cadastrados aqui.
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
