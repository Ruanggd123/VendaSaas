"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  RotateCcw,
  CheckCheck,
  ChevronLeft,
  MoreVertical,
  Edit3,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { botMessageTemplates } from "@/lib/ai/botMessageTemplates";
import { formatWhatsAppOptionText } from "@/lib/whatsappOptions";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  nodeId?: string | null;
  isWelcome?: boolean;
  buttons?: { label: string; value: string }[];
  products?: any[];
}

interface SchedulingState {
  phase: "selectService" | "selectDate" | "selectPeriod" | "selectTime" | "confirm";
  services: Array<{ id: number; name: string; price?: string; durationMin: number }>;
  availableDates?: string[];
  selectedDateIso?: string;
  selectedDateLabel?: string;
  selectedService?: { id: number; name: string; price?: string; durationMin: number };
  availableSlots?: string[];
  selectedTime?: string;
}

interface CheckoutDeliveryState {
  phase: "chooseDeliveryMethod" | "collectAddress";
  product: any;
  paymentMode: string;
  deliveryType: "both" | "delivery";
  sourceNodeId?: string | null;
  deadline?: string;
  addressLabel?: string;
}

interface SmartphoneSimulatorProps {
  settings: any;
  tenantId?: string;
  onActiveNodeChange?: (nodeId: string | null) => void;
  onUpdateText?: (nodeId: string | null, newText: string, isWelcome?: boolean) => void;
}

const DEFAULT_SIMULATOR_WELCOME = "Olá! Seja bem-vindo(a) ao nosso atendimento! 👋 Como posso te ajudar hoje?";

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeTextValue(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function normalizeDurationMinutes(value: unknown, fallback = 60): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(parsed));
}

function parseProductPrice(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value == null) {
    return NaN;
  }

  const normalized = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^0-9.,-]/g, "");

  if (!normalized) {
    return NaN;
  }

  const hasExplicitSign = normalized.startsWith("-");
  const unsigned = hasExplicitSign ? normalized.slice(1) : normalized;

  if (!/[0-9]/.test(unsigned)) {
    return NaN;
  }

  const hasComma = unsigned.includes(",");
  const hasDot = unsigned.includes(".");

  if (!hasComma && !hasDot) {
    const parsed = Number(unsigned);
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    return hasExplicitSign ? -parsed : parsed;
  }

  const lastComma = unsigned.lastIndexOf(",");
  const lastDot = unsigned.lastIndexOf(".");
  const separatorIndex = Math.max(lastComma, lastDot);
  const integerPart = unsigned.slice(0, separatorIndex);
  const decimalPart = unsigned.slice(separatorIndex + 1);

  let parsedValue = "";

  if (decimalPart.length > 0 && decimalPart.length <= 2) {
    parsedValue = `${integerPart.replace(/[.,]/g, "")}.${decimalPart}`;
  } else {
    parsedValue = unsigned.replace(/[.,]/g, "");
  }

  let parsed = Number(parsedValue);
  if (!Number.isFinite(parsed)) {
    const parsedFallback = Number(unsigned.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(parsedFallback)) {
      return NaN;
    }

    parsed = parsedFallback;
  }

  return hasExplicitSign ? -parsed : parsed;
}

function formatProductPrice(value: unknown): string {
  const parsed = parseProductPrice(value);
  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return parsed.toFixed(2);
}

function isPaymentRequired(product: any): boolean {
  const value = product?.requires_payment;
  return !(value === false || String(value).toLowerCase() === "false");
}

function getProductDeliveryType(product: any): string {
  return String(product?.delivery_type || "virtual_instant").trim().toLowerCase() || "virtual_instant";
}

const buildNoPaymentMessage = (product: any, addressLabel = botMessageTemplates.labels.digitalImmediate()): string =>
  botMessageTemplates.checkout.withoutPayment({
    product,
    address: addressLabel,
  });

function appendNodeCustomText(node: any, generatedText: string): string {
  const customText = normalizeTextValue(node?.textContent).trim();
  if (!customText) {
    return generatedText;
  }

  return `${customText}\n\n${generatedText}`;
}

function normalizeButtons(buttons: any): { label: string; value: string }[] {
  if (!Array.isArray(buttons)) return [];

  return buttons
    .filter(Boolean)
    .map((btn) => ({
      label: normalizeTextValue(btn?.label),
      value: normalizeTextValue(btn?.value),
    }));
}

function normalizeMessagesProducts(products: any): any[] {
  return ensureArray<any>(products)
    .filter((product) => Boolean(product) && typeof product === "object")
    .map((product) => product);
}

function parseSchedulingServiceList(
  products: any[]
): Array<{ id: number; name: string; price?: string; durationMin: number }> {
  const safeProducts = ensureArray<any>(products);
  const explicitServices = safeProducts
    .filter((prod) => isSchedulableProduct(prod))
    .map((prod, idx) => ({
      id: idx + 1,
      name: prod?.name || `Serviço ${idx + 1}`,
      price: prod?.price,
      durationMin: normalizeDurationMinutes(prod?.duration_min || prod?.duration, 60),
    }))
    .filter((service) => service.name && service.name.trim().length > 0);

  if (explicitServices.length > 0) {
    return explicitServices;
  }

  return safeProducts
    .filter((prod) => String(prod?.name || "").trim().length > 0)
    .map((prod, idx) => ({
      id: idx + 1,
      name: prod?.name || `Serviço ${idx + 1}`,
      price: prod?.price,
      durationMin: normalizeDurationMinutes(prod?.duration_min || prod?.duration, 60),
    }));
}

function sanitizeWelcomeMessage(message: any): string {
  const safeMessage = typeof message === "string" ? message : "";
  const clean = safeMessage
    .replace(/[\uFFFD\u00A0]/g, "")
    .replace(/🟣\s*¤\s*–\s*🟣\s*‘\s*‹/g, "")
    .replace(/¤|‘|‹|¼/g, "")
    .trim();

  if (!clean || clean.length < 5) {
    return DEFAULT_SIMULATOR_WELCOME;
  }

  return clean;
}

function normalizeLookupValueText(value: unknown): string {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasExplicitMenuSection(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (
    normalized.includes("escolha uma das opcoes abaixo") ||
    normalized.includes("selecione uma das opcoes abaixo")
  ) {
    return true;
  }

  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const menuLikeLines = lines.filter((line) => /^\*?\d+\*?\s+/.test(line));
  return menuLikeLines.length >= 2;
}

function isSchedulableProduct(product: any): boolean {
  const deliveryType = String(product?.delivery_type || "").trim().toLowerCase();
  if (deliveryType) return deliveryType === "service";

  const type = String(product?.type || "").trim().toLowerCase();
  return type === "service";
}

const WEEKDAY_NAMES_SIMULATOR = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const BUSINESS_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getScheduleWindowForDate(settings: any, date: Date): { start: string; end: string } | null {
  const dayKey = BUSINESS_DAY_KEYS[date.getDay()];

  const schedulePerDay = settings?.schedule_per_day || {};
  if (schedulePerDay[dayKey] && typeof schedulePerDay[dayKey] === "object") {
    const cfg = schedulePerDay[dayKey];
    if (cfg.enabled === false) return null;
    return {
      start: cfg.start || settings.business_hours_start || "08:00",
      end: cfg.end || settings.business_hours_end || "18:00",
    };
  }

  const businessDays: string[] = settings?.business_days || ["mon", "tue", "wed", "thu", "fri"];
  if (!businessDays.includes(dayKey)) return null;

  return {
    start: settings?.business_hours_start || "08:00",
    end: settings?.business_hours_end || "18:00",
  };
}

function parseDateISO(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDateLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${WEEKDAY_NAMES_SIMULATOR[date.getDay()]} (${day}/${month})`;
}

function getNextSchedulingDates(settings: any): string[] {
  const blockedDates = Array.isArray(settings?.blocked_dates) ? settings.blocked_dates : [];
  const dates: string[] = [];
  const today = new Date();
  const current = new Date(today.getTime());

  if (current.getFullYear() < 2026) {
    current.setFullYear(2026);
  }

  for (let i = 0; i < 14; i++) {
    const dayDate = new Date(current.getTime());
    const schedule = getScheduleWindowForDate(settings, dayDate);
    const isToday = i === 0;

    if (schedule) {
      const endParts = (schedule.end || settings.business_hours_end || "18:00").split(":").map((v: string) => parseInt(v || "0", 10));
      const endHour = endParts[0] || 18;
      const endMinute = endParts[1] || 0;
      const dayEndLimit = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), endHour, endMinute, 0);

      const dateIso = parseDateISO(dayDate);
      if (!blockedDates.includes(dateIso) && !(isToday && new Date().getTime() > dayEndLimit.getTime())) {
        dates.push(dateIso);
      }
    }

    if (dates.length >= 5) break;
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function buildLabeledListText(items: string[], prefix: string): string {
  let text = "";
  items.forEach((item, idx) => {
    text += `\n*${idx + 1}* - ${prefix}${item}`;
  });
  return text;
}

function buildDateButtons(dates: string[]): { label: string; value: string }[] {
  return dates.map((dateISO, idx) => ({
    label: `${idx + 1} - ${formatDateLabel(new Date(`${dateISO}T00:00:00`))}`,
    value: String(idx + 1),
  }));
}

function getAvailableSlots(dateISO: string, durationMinutes: number, settings: any): string[] {
  const date = new Date(`${dateISO}T00:00:00`);
  const schedule = getScheduleWindowForDate(settings, date);
  if (!schedule) return [];

  const startParts = schedule.start.split(":").map((v: string) => parseInt(v || "0", 10));
  const endParts = schedule.end.split(":").map((v: string) => parseInt(v || "0", 10));
  const startHour = startParts[0] || 8;
  const startMinute = startParts[1] || 0;
  const endHour = endParts[0] || 18;
  const endMinute = endParts[1] || 0;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute, 0);
  const slots: string[] = [];

  const slot = new Date(start.getTime());
  const stepMs = 30 * 60 * 1000;
  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  while (slot.getTime() + durationMinutes * 60 * 1000 <= end.getTime()) {
    if (!isToday || slot.getTime() > now.getTime()) {
      const h = String(slot.getHours()).padStart(2, "0");
      const m = String(slot.getMinutes()).padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
    slot.setTime(slot.getTime() + stepMs);
  }

  return slots;
}

export function SmartphoneSimulator({ settings, tenantId, onActiveNodeChange, onUpdateText }: SmartphoneSimulatorProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [schedulingState, setSchedulingState] = useState<SchedulingState | null>(null);
  const [checkoutDeliveryState, setCheckoutDeliveryState] = useState<CheckoutDeliveryState | null>(null);
  const [collectingNodeId, setCollectingNodeId] = useState<string | null>(null);
  const [collectedData, setCollectedData] = useState<Record<string, string>>({});
  const [isHumanHandoff, setIsHumanHandoff] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [inCatalogView, setInCatalogView] = useState(false);
  const [bubbleMaxWidthPercent, setBubbleMaxWidthPercent] = useState(88);
  const [showUserNumbers, setShowUserNumbers] = useState(true);
  const [simulatedUserNumber] = useState(() => {
    const areaCodes = ["11", "21", "31", "41", "51"];
    const selectedArea = areaCodes[Math.floor(Math.random() * areaCodes.length)] || "11";
    const middle = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
    const end = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
    return `+55 (${selectedArea}) 9 ${middle}-${end}`;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const normalizeLookupValue = (value: any): string => {
    return normalizeLookupValueText(value);
  };

  const findProductByReference = (products: any[], productRef: any) => {
    if (!Array.isArray(products) || !productRef) return null;

    const ref = String(productRef).trim();
    if (!ref) return null;

    const byId = products.find((prod: any) => String(prod?.id || "") === ref);
    if (byId) return byId;

    const exactName = products.find((prod: any) => String(prod?.name || "") === ref);
    if (exactName) return exactName;

    const normalizedRef = normalizeLookupValue(ref);
    const normalizedExact = products.find((prod: any) => normalizeLookupValue(prod?.name || "") === normalizedRef);
    if (normalizedExact) return normalizedExact;

    const fuzzyMatch = products.find((prod: any) => {
      const candidate = normalizeLookupValue(prod?.name || "");
      return candidate.includes(normalizedRef) || normalizedRef.includes(candidate);
    });

    return fuzzyMatch || null;
  };

  const resolveProductFromNode = (node: any) => {
    if (!node) return null;
    const products = settings?.products || [];
    const refs = [node.productId, node.productName, node.title];
    for (const ref of refs) {
      const found = findProductByReference(products, ref);
      if (found) return found;
    }
    return null;
  };

  const simulatorMenuFingerprint = JSON.stringify({
    nodes: ensureArray(settings?.custom_rules_nodes)
      .map((n: any) => ({
        id: n?.id,
        keyword: normalizeTextValue(n?.keyword),
        title: normalizeTextValue(n?.title),
        actionType: normalizeTextValue(n?.actionType),
        textContent: normalizeTextValue(n?.textContent),
        productName: normalizeTextValue(n?.productName),
        productId: normalizeTextValue(n?.productId),
        paymentMode: normalizeTextValue(n?.paymentMode),
        showInPoll: n?.showInPoll !== false,
      })),
    welcome: normalizeTextValue(settings?.welcome_message),
    autoAppend: String(settings?.welcome_menu_auto_append ?? true),
    interactiveOptions: String(settings?.interactive_poll_enabled ?? true),
    hideAutoCatalog: String(settings?.hide_auto_catalog ?? false),
    products: ensureArray(settings?.products).map((product: any) => ({
      id: product?.id,
      name: product?.name,
      price: product?.price,
      monthly: product?.monthly,
      stock: product?.stock,
      deliveryType: product?.delivery_type,
      deliveryDeadline: product?.delivery_deadline,
    })),
  });

  const presentOptionMessage = (
    text: string,
    buttons: { label: string; value: string }[] | undefined,
  ) => {
    const normalizedButtons = normalizeButtons(buttons);
    const interactiveEnabled = settings?.interactive_poll_enabled !== false && normalizedButtons.length >= 2;
    return {
      text: formatWhatsAppOptionText(
        normalizeTextValue(text),
        normalizedButtons.map((button) => ({ text: button.label, id: button.value })),
        interactiveEnabled,
      ),
      buttons: interactiveEnabled ? normalizedButtons : [],
    };
  };

  const getCatalogDisplayPrice = (product: any): string => {
    if (!product) return "";
    return product.type === "plan" || product.monthly ? `${product.monthly || product.price}` : `${product.price}`;
  };

  const buildCatalogTextFromNode = (catalogNode: any, allCatalogNodes: any[], catalogProducts: any[]) => {
    const nodeProductRefs = allCatalogNodes.filter(
      (node: any) =>
        String(node?.parentId || "") === String(catalogNode?.id || "") &&
        String(node?.actionType || "").trim().toLowerCase() === "product"
    );

    const appendCatalogLines = (productsToRender: any[], shouldResolve = false) => {
      let result = "📋 *Nossos Serviços e Preços:*\n\n";

      productsToRender.forEach((product: any, idx: number) => {
        const resolvedProduct = shouldResolve ? resolveProductFromNode(product) : null;
        const source = resolvedProduct || product;

        if (resolvedProduct) {
          const prodName = resolvedProduct?.name || source?.title || `Produto ${idx + 1}`;
          const prodPrice = getCatalogDisplayPrice(resolvedProduct);
          const description = resolvedProduct?.description;

          result += `${idx + 1}️⃣ *${prodName}* - R$ ${prodPrice}\n`;
          if (description) {
            result += `   _${description}_\n\n`;
          } else {
            result += "\n";
          }
          return;
        }

        if (shouldResolve) {
          const fallbackName = source?.title || `Produto ${idx + 1}`;
          result += `${idx + 1}️⃣ *${fallbackName}*\n`;
          return;
        }

        result += `${idx + 1}️⃣ *${source?.name || source?.title || `Produto ${idx + 1}`}* - R$ ${getCatalogDisplayPrice(source)}\n`;
        if (source?.description) {
          result += `   _${source.description}_\n\n`;
        } else {
          result += "\n";
        }
      });

      result +=
        "✍️ Se deseja contratar ou comprar algum destes serviços/produtos, responda enviando o número dele (ex: *1* ou *2*).\n\nDigite *0* ou *voltar* para retornar ao menu principal.";

      return result;
    };

    if (nodeProductRefs.length > 0) {
      return appendCatalogLines(nodeProductRefs, true);
    }

    if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
      return "📋 No momento não temos serviços cadastrados no catálogo.";
    }

    return appendCatalogLines(catalogProducts);
  };

  const buildCheckoutFlow = (
    product: any,
    paymentMode: string,
    originNode: any,
    addressLabel: string = botMessageTemplates.labels.digitalImmediate()
    ) => {
    if (!product) {
      return {
        text: "❌ Produto não encontrado no catálogo.",
        buttons: [{ label: "🏠 Menu Principal", value: "0" }, { label: "👤 Atendimento humano", value: "4" }],
      };
    }

    if (!isPaymentRequired(product)) {
      return {
        text: appendNodeCustomText(
          originNode,
          buildNoPaymentMessage(product, addressLabel)
        ),
        buttons: [{ label: "🏠 Menu Principal", value: "0" }],
      };
    }

    const originUrl = typeof window !== "undefined" ? window.location.origin : "https://sua-loja.exemplo";
    const checkoutLink = `${originUrl}/checkout/${tenantId || "loja"}?product=${encodeURIComponent(product.name || "")}&order=pre-visualizacao`;

    if (paymentMode === "pix") {
      return {
        text: appendNodeCustomText(originNode, botMessageTemplates.checkout.withPayment({
          product,
          address: addressLabel,
          paymentMode: "pix",
          pixCopiaECola: "CODIGO-PIX-GERADO-PELO-GATEWAY",
          paymentMethod: "PIX no WhatsApp",
        })),
        buttons: [{ label: "🏠 Menu Principal", value: "0" }],
      };
    }

    if (paymentMode === "both") {
      return {
        text: appendNodeCustomText(originNode, `🛒 *${product.name}*\n💰 R$ ${formatProductPrice(product.price)}\n\nComo você prefere pagar?`),
        buttons: [
          { label: "⚡ PIX no WhatsApp", value: `gen_pix_chat_${product.name}` },
          { label: "💳 Cartão no checkout", value: `open_link_${checkoutLink}` },
        ],
      };
    }

    return {
      text: appendNodeCustomText(
        originNode,
        botMessageTemplates.checkout.withPayment({
          product,
          address: addressLabel,
          checkoutLink,
        })
      ),
      buttons: [
        { label: "💳 Acessar Site de Checkout", value: `open_link_${checkoutLink}` },
        { label: "🏠 Menu Principal", value: "0" },
      ],
    };
  };

  const generateBotInitialMenu = (): Message => {
    const welcome = sanitizeWelcomeMessage(settings?.welcome_message || DEFAULT_SIMULATOR_WELCOME);
    const shouldAutoAppendMenu = settings?.welcome_menu_auto_append !== false;

    const allNodes = settings?.custom_rules_nodes || [];
    // FILTRA APENAS NÓS PAI (sem parentId) PARA NÃO VAZAR SUB-NÓS NO MENU INICIAL
    const rootNodes = allNodes.filter((n: any) => !n.parentId);

    if (!shouldAutoAppendMenu) {
      return {
        id: "init_menu",
        sender: "bot",
        text: welcome,
        timestamp: getFormattedTime(),
        isWelcome: true,
      };
    }

    const pollNodes = rootNodes.filter((node: any) => node.showInPoll !== false);
    const defaultButtons = rootNodes.length > 0
      ? pollNodes.slice(0, 10).map((n: any) => ({ label: n.title, value: n.keyword }))
      : settings?.hide_auto_catalog === true
        ? []
        : ensureArray<any>(settings?.products).slice(0, 10).map((product, index) => ({
            label: `${product.name || `Produto ${index + 1}`} - R$ ${getCatalogDisplayPrice(product)}`,
            value: String(index + 1),
          }));
    const presentation = presentOptionMessage(welcome, defaultButtons);

    return {
      id: "init_menu",
      sender: "bot",
      text: presentation.text,
      timestamp: getFormattedTime(),
      isWelcome: true,
      buttons: presentation.buttons,
    };
  };

  useEffect(() => {
    setMessages([generateBotInitialMenu()]);
    setCurrentParentId(null);
    setSchedulingState(null);
    setCheckoutDeliveryState(null);
    setInCatalogView(false);
    setCollectingNodeId(null);
    setCollectedData({});
    setIsHumanHandoff(false);
  }, [simulatorMenuFingerprint]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleReset = () => {
    setMessages([generateBotInitialMenu()]);
    setInput("");
    setCurrentParentId(null);
    setSchedulingState(null);
    setCheckoutDeliveryState(null);
    setCollectingNodeId(null);
    setCollectedData({});
    setIsHumanHandoff(false);
    setInCatalogView(false);
    if (onActiveNodeChange) onActiveNodeChange(null);
  };

  const startEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const saveEditMessage = (msg: Message) => {
    if (!editingText.trim()) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, text: editingText } : m))
    );

    if (onUpdateText) {
      onUpdateText(msg.nodeId || null, editingText, msg.isWelcome);
    }

    setEditingMessageId(null);
  };

  const processUserInput = (userText: string) => {
    const safeUserText = normalizeTextValue(userText);
    const clean = safeUserText.trim().toLowerCase();
    const cleanLookup = normalizeLookupValue(clean);
    const currentTime = getFormattedTime();

    // Mensagem do Usuário
    const userMsg: Message = {
      id: "user_" + Date.now(),
      sender: "user",
      text: safeUserText,
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      try {
        setIsTyping(false);

      let botResponseText = "";
      let botButtons: { label: string; value: string }[] | undefined = undefined;
      let botProducts: any[] | undefined = undefined;

        const allNodes = ensureArray<any>(settings?.custom_rules_nodes);
        const prods = ensureArray<any>(settings?.products);
        const schedulingStateActive = schedulingState?.phase;
        const checkoutDeliveryStateActive = checkoutDeliveryState?.phase;

        const serviceListForScheduling = parseSchedulingServiceList(prods);

        if (collectingNodeId) {
          const sourceNode = allNodes.find((node: any) => node.id === collectingNodeId);
          const children = allNodes.filter((node: any) => node.parentId === collectingNodeId);
          if (["0", "voltar", "menu", "inicio"].includes(clean)) {
            setCollectingNodeId(null);
            setCurrentParentId(null);
            const initial = generateBotInitialMenu();
            const presentation = presentOptionMessage(initial.text, initial.buttons);
            setMessages((previous) => [...previous, { ...initial, id: "bot_" + Date.now(), text: presentation.text, buttons: presentation.buttons }]);
            return;
          }
          const variableName = sourceNode?.variableName || "dado_coletado";
          setCollectedData((previous) => ({ ...previous, [variableName]: safeUserText.trim() }));
          setCollectingNodeId(null);
          if (children.length > 0) {
            setCurrentParentId(collectingNodeId);
            botResponseText = `✅ Informação registrada em *${variableName}*.\n\nEscolha como deseja continuar:`;
            botButtons = children
              .filter((child: any) => child.showInPoll !== false)
              .map((child: any) => ({ label: child.title, value: child.keyword }));
          } else {
            const initial = generateBotInitialMenu();
            setCurrentParentId(null);
            botResponseText = `✅ Informação registrada em *${variableName}*.\n\n${initial.text}`;
            botButtons = initial.buttons;
          }
          const presentation = presentOptionMessage(botResponseText, botButtons);
          setMessages((previous) => [...previous, {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: presentation.text,
            timestamp: currentTime,
            buttons: presentation.buttons,
          }]);
          return;
        }

        const handoffLookup = cleanLookup.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
        const hasConfiguredOptionFour = allNodes.some((node: any) => !node.parentId && normalizeLookupValue(node.keyword) === "4")
          || prods.length >= 4;
        const requestedLegacyHandoff = handoffLookup === "4"
          && !hasConfiguredOptionFour
          && !currentParentId
          && !schedulingStateActive
          && !checkoutDeliveryStateActive
          && !inCatalogView;
        if (["atendente", "falar com atendente", "humano", "suporte", "chamar atendente"].includes(handoffLookup) || requestedLegacyHandoff) {
          setSchedulingState(null);
          setCheckoutDeliveryState(null);
          setIsHumanHandoff(true);
          setMessages((previous) => [...previous, {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: "👤 *Atendimento automático pausado*\n\nUm atendente humano continuará esta conversa.",
            timestamp: currentTime,
          }]);
          return;
        }

        if (schedulingStateActive) {
          const currentState = schedulingState as SchedulingState;
          setInCatalogView(false);

          if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
            setSchedulingState(null);
            setCurrentParentId(null);
            setInCatalogView(false);
            if (onActiveNodeChange) onActiveNodeChange(null);
            const initial = generateBotInitialMenu();
            botResponseText = initial.text;
            botButtons = initial.buttons;
          } else if (currentState.phase === "selectService") {
            const index = parseInt(clean, 10) - 1;
            const chosen = currentState.services[index];

            if (!chosen) {
              botResponseText = "❌ Opção inválida. Digite o número do serviço ou *0* para voltar.";
              botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
            } else {
              const dates = getNextSchedulingDates(settings).slice(0, 5);
              if (dates.length === 0) {
                setSchedulingState(null);
                botResponseText = `📅 Não há datas disponíveis para *${chosen.name}* no momento. Escolha *0* para voltar e tentar novamente depois.`;
                botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
              } else {
                const mappedDates = dates.map((dateISO) => formatDateLabel(new Date(`${dateISO}T00:00:00`)));

                setSchedulingState({
                  phase: "selectDate",
                  services: currentState.services,
                  selectedService: chosen,
                  availableDates: dates,
                });

                botResponseText = `📅 Você selecionou *${chosen.name}*.\n\nEscolha um dos dias disponíveis:`;
                botResponseText += buildLabeledListText(mappedDates, "");
                botResponseText += "\n\nDigite o número da data ou *0* para voltar.";
                botButtons = buildDateButtons(dates);
                botButtons.push({ label: "🏠 Voltar", value: "0" });
              }
            }
          } else if (currentState.phase === "selectDate") {
            const index = parseInt(clean, 10) - 1;
            const availableDates = currentState.availableDates || [];
            const selectedDateIso = availableDates[index];

            if (!selectedDateIso) {
              botResponseText = "❌ Data inválida. Digite o número da opção ou *0* para voltar.";
              botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
            } else {
              const duration = currentState.selectedService?.durationMin || 60;
              const slots = getAvailableSlots(selectedDateIso, duration, settings);
              const hasMorning = slots.some((slot) => parseInt(slot.split(":")[0], 10) < 12);
              const hasAfternoon = slots.some((slot) => parseInt(slot.split(":")[0], 10) >= 12);

              const chosenDate = new Date(`${selectedDateIso}T00:00:00`);
              const dateLabel = formatDateLabel(chosenDate);

              if (slots.length === 0) {
                botResponseText = `❌ Não há horários disponíveis em *${dateLabel}*. Escolha outra data ou digite *0* para voltar.`;
                botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
              } else if (!hasMorning || !hasAfternoon) {
                const isOnlyMorning = hasMorning;
                const periodSlots = isOnlyMorning
                  ? slots.filter((s) => parseInt(s.split(":")[0], 10) < 12)
                  : slots.filter((s) => parseInt(s.split(":")[0], 10) >= 12);

                setSchedulingState({
                  ...currentState,
                  phase: "selectTime",
                  selectedDateIso,
                  selectedDateLabel: dateLabel,
                  availableSlots: periodSlots,
                });

                botResponseText = `🕒 Horários disponíveis (${isOnlyMorning ? "Manhã" : "Tarde"}) para *${dateLabel}*:`;
                periodSlots.forEach((slot, idx) => {
                  botResponseText += `\n*${idx + 1}* - ${slot}`;
                });
                botResponseText += "\n\nDigite o número do horário ou *0* para voltar.";
                botButtons = periodSlots.map((slot, idx) => ({ label: `${idx + 1} - ${slot}`, value: String(idx + 1) }));
                botButtons.push({ label: "🏠 Voltar", value: "0" });
              } else {
                setSchedulingState({
                  ...currentState,
                  phase: "selectPeriod",
                  selectedDateIso,
                  selectedDateLabel: dateLabel,
                });

                botResponseText = `🕒 Data definida: *${dateLabel}*.\n\nEscolha o período desejado:`;
                botButtons = [
                  { label: "1 - Manhã", value: "1" },
                  { label: "2 - Tarde", value: "2" },
                  { label: "🏠 Voltar", value: "0" },
                ];
              }
            }
          } else if (currentState.phase === "selectPeriod") {
            if (clean !== "1" && clean !== "2") {
              botResponseText = "❌ Opção inválida. Digite *1* para Manhã ou *2* para Tarde.";
              botButtons = [
                { label: "1 - Manhã", value: "1" },
                { label: "2 - Tarde", value: "2" },
                { label: "🏠 Voltar", value: "0" },
              ];
            } else {
              const chosenDateIso = currentState.selectedDateIso || "";
              const duration = currentState.selectedService?.durationMin || 60;
              const allSlots = getAvailableSlots(chosenDateIso, duration, settings);
              const slotsByPeriod = allSlots.filter((slot) => {
                const hour = parseInt(slot.split(":")[0], 10);
                return clean === "1" ? hour < 12 : hour >= 12;
              });

              if (slotsByPeriod.length === 0) {
                setSchedulingState((prev) => prev ? { ...prev, phase: "selectDate", selectedDateIso: undefined, selectedDateLabel: undefined, availableSlots: undefined } : prev);
                botResponseText = `❌ Não há horários disponíveis nesse período em *${currentState.selectedDateLabel || "esta data"}*.\n\nEscolha outra data ou *0* para voltar.`;
                botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
              } else {
                setSchedulingState({
                  ...currentState,
                  phase: "selectTime",
                  availableSlots: slotsByPeriod,
                });

                botResponseText = `🕒 *Horários disponíveis* (${clean === "1" ? "Manhã" : "Tarde"}):`;
                slotsByPeriod.forEach((slot, idx) => {
                  botResponseText += `\n*${idx + 1}* - ${slot}`;
                });
                botResponseText += "\n\nDigite o número do horário ou *0* para voltar.";
                botButtons = slotsByPeriod.map((slot, idx) => ({ label: `${idx + 1} - ${slot}`, value: String(idx + 1) }));
                botButtons.push({ label: "🏠 Voltar", value: "0" });
              }
            }
          } else if (currentState.phase === "selectTime") {
            const slots = currentState.availableSlots || [];
            const index = parseInt(clean, 10) - 1;
            const chosenTime = slots[index];

            if (!chosenTime) {
              botResponseText = "❌ Horário inválido. Digite o número do horário ou *0* para voltar.";
              botButtons = (slots || []).map((slot, idx) => ({ label: `${idx + 1} - ${slot}`, value: String(idx + 1) }));
              botButtons.push({ label: "🏠 Voltar", value: "0" });
            } else {
              setSchedulingState({
                ...currentState,
                phase: "confirm",
                selectedTime: chosenTime,
              });

              const price = currentState.selectedService?.price
                ? `R$ ${formatProductPrice(currentState.selectedService.price)}`
                : null;
              const serviceName = currentState.selectedService?.name || "Serviço";
              const dateLabel = currentState.selectedDateLabel || "Data";

              botResponseText = `📋 Resumo do agendamento:\n\n- Serviço: *${serviceName}*\n`;
              if (price) {
                botResponseText += `- Valor: *${price}*\n`;
              }
              botResponseText += `- Data: *${dateLabel}*\n- Horário: *${chosenTime}*\n\nConfirma esse agendamento?`;

              botButtons = [
                { label: "✅ Confirmar", value: "1" },
                { label: "🔁 Alterar horário", value: "2" },
                { label: "🏠 Menu Principal", value: "0" },
              ];
            }
          } else if (currentState.phase === "confirm") {
            if (clean === "1") {
              setSchedulingState(null);
              botResponseText = `✅ *Agendamento confirmado!*

Serviço: *${currentState.selectedService?.name || "Serviço"}*
Data: *${currentState.selectedDateLabel || "-"}*
Horário: *${currentState.selectedTime || "-"}*

Seu agendamento foi registrado no simulador.`;
            } else if (clean === "2") {
              const dates = getNextSchedulingDates(settings).slice(0, 5);

              setSchedulingState({
                ...currentState,
                phase: "selectDate",
                availableDates: dates,
                selectedDateIso: undefined,
                selectedDateLabel: undefined,
                availableSlots: undefined,
                selectedTime: undefined,
              });

              botResponseText = "🔁 Perfeito! Escolha outro dia para seu agendamento:";
              botResponseText += buildLabeledListText(dates.map((dateISO) => formatDateLabel(new Date(`${dateISO}T00:00:00`))), "");
              botButtons = buildDateButtons(dates);
              botButtons.push({ label: "🏠 Voltar", value: "0" });
            } else {
              botResponseText = "❌ Opção inválida. Digite *1* para Confirmar, *2* para Alterar horário ou *0* para voltar ao menu principal.";
              botButtons = [
                { label: "✅ Confirmar", value: "1" },
                { label: "🔁 Alterar horário", value: "2" },
                { label: "🏠 Menu Principal", value: "0" },
              ];
            }
          }
        }

        if (schedulingStateActive) {
          const presentation = presentOptionMessage(botResponseText, botButtons);

          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: presentation.text,
            timestamp: currentTime,
            buttons: presentation.buttons,
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        if (checkoutDeliveryStateActive) {
          const currentCheckoutState = checkoutDeliveryState as CheckoutDeliveryState;
          const selectedProduct = currentCheckoutState.product;

          setInCatalogView(false);

          if (clean === "4") {
            setCheckoutDeliveryState(null);
            setIsHumanHandoff(true);
            botResponseText = "👤 *Atendimento automático pausado*\n\nUm atendente humano continuará esta conversa.";
            botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
          } else if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
            setCheckoutDeliveryState(null);
            setInCatalogView(false);
            setCurrentParentId(null);
            if (onActiveNodeChange) onActiveNodeChange(null);
            const initial = generateBotInitialMenu();
            botResponseText = initial.text;
            botButtons = initial.buttons;
          } else if (!selectedProduct) {
            setCheckoutDeliveryState(null);
            botResponseText = "⚠️ Não localizei o item selecionado para compra. Tente novamente pelo catálogo.";
            botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
          } else if (currentCheckoutState.phase === "collectAddress") {
            const addressLabel = safeUserText.trim();
            if (!addressLabel) {
              botResponseText = "⚠️ Não recebi seu endereço. Envie o endereço completo para continuar (Rua, Número, Bairro, Cidade).";
              botButtons = [{ label: "🏠 Voltar", value: "0" }];
            } else {
              const checkoutFlow = buildCheckoutFlow(
                selectedProduct,
                currentCheckoutState.paymentMode,
                allNodes.find((n: any) => n.id === currentCheckoutState.sourceNodeId),
                addressLabel
              );

              setCheckoutDeliveryState(null);
              botResponseText = checkoutFlow.text;
              botButtons = checkoutFlow.buttons;
            }
          } else if (clean !== "1" && clean !== "2") {
            if (currentCheckoutState.deliveryType === "both") {
              botResponseText = botMessageTemplates.errors.invalidBothMethodsChoice();
              botButtons = [
                { label: `1 - ${botMessageTemplates.labels.bothDigital(currentCheckoutState.deadline || "imediato")}`, value: "1" },
                { label: `2 - ${botMessageTemplates.labels.bothPhysical()}`, value: "2" },
                { label: "🏠 Voltar", value: "0" },
              ];
            } else {
              botResponseText = botMessageTemplates.errors.invalidDeliveryChoice();
              botButtons = [
                { label: `1 - ${botMessageTemplates.labels.delivery()}`, value: "1" },
                { label: `2 - ${botMessageTemplates.labels.pickup()} / Presencial`, value: "2" },
                { label: "🏠 Voltar", value: "0" },
              ];
            }
          } else {
            const isDigital = clean === "1";
            if (isDigital) {
              if (currentCheckoutState.deliveryType === "both") {
                const addressLabel = botMessageTemplates.labels.bothDigital(currentCheckoutState.deadline || "imediato");
                const checkoutFlow = buildCheckoutFlow(
                  selectedProduct,
                  currentCheckoutState.paymentMode,
                  allNodes.find((n: any) => n.id === currentCheckoutState.sourceNodeId),
                  addressLabel
                );

                setCheckoutDeliveryState(null);
                botResponseText = checkoutFlow.text;
                botButtons = checkoutFlow.buttons;
              } else {
                setCheckoutDeliveryState({
                  ...currentCheckoutState,
                  phase: "collectAddress",
                  addressLabel: botMessageTemplates.labels.delivery(),
                });
                botResponseText = botMessageTemplates.prompts.requestAddress();
                botButtons = [{ label: "🏠 Voltar", value: "0" }];
              }
            } else if (currentCheckoutState.deliveryType === "both") {
              setCheckoutDeliveryState({
                ...currentCheckoutState,
                phase: "collectAddress",
                addressLabel: botMessageTemplates.labels.bothPhysical(),
              });
              botResponseText = botMessageTemplates.prompts.requestAddress();
              botButtons = [{ label: "🏠 Voltar", value: "0" }];
            } else {
              const checkoutFlow = buildCheckoutFlow(
                selectedProduct,
                currentCheckoutState.paymentMode,
                allNodes.find((n: any) => n.id === currentCheckoutState.sourceNodeId),
                botMessageTemplates.labels.pickup()
              );

              setCheckoutDeliveryState(null);
              botResponseText = checkoutFlow.text;
              botButtons = checkoutFlow.buttons;
            }
          }

          const presentation = presentOptionMessage(botResponseText, botButtons);
          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: presentation.text,
            timestamp: currentTime,
            buttons: presentation.buttons,
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        // SE O CLIENTE ESTÁ NAVEGANDO NO CATÁLOGO E ESCOLHEU UM NÚMERO (1, 2, 3, etc)
        if (inCatalogView) {
          if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
            setCurrentParentId(null);
            setInCatalogView(false);
            const initial = generateBotInitialMenu();
            botResponseText = initial.text;
            botButtons = initial.buttons;
          } else {
            const catalogChoice = parseInt(clean, 10);

            if (!isNaN(catalogChoice) && catalogChoice <= 0) {
              setCurrentParentId(null);
              setInCatalogView(false);
              const initial = generateBotInitialMenu();
              botResponseText = initial.text;
              botButtons = initial.buttons;
            } else if (!isNaN(catalogChoice)) {
              const prodIdx = catalogChoice - 1;
              const selectedProd = prods[prodIdx];

              // O catálogo de produção usa a posição visual, não o gatilho do nó.
              const catalogNode = allNodes.find((n: any) => n.actionType === "catalog");
              const catalogProductNodes = catalogNode
                ? allNodes.filter((n: any) => n.parentId === catalogNode.id && n.actionType === "product")
                : [];
              const customSubNode = catalogProductNodes[prodIdx]
                || (catalogNode
                  ? allNodes.find((n: any) => n.parentId === catalogNode.id && n.keyword === String(catalogChoice))
                  : null);

              const productForCheckout = resolveProductFromNode(customSubNode) || selectedProd;
              const paymentMode = customSubNode?.paymentMode || "both";
              const productChildren = customSubNode
                ? allNodes.filter((node: any) => node.parentId === customSubNode.id)
                : [];

              setCheckoutDeliveryState(null);

              if (!productForCheckout) {
                botResponseText = "❌ Produto não encontrado no catálogo.";
                botButtons = [
                  { label: "🏠 Menu Principal", value: "0" },
                  { label: "👤 Atendimento humano", value: "4" },
                ];
              } else if (customSubNode?.actionType === "product" && productChildren.length > 0) {
                setInCatalogView(false);
                setCurrentParentId(customSubNode.id);
                botResponseText = `📦 *${productForCheckout.name}*\n💰 R$ ${formatProductPrice(productForCheckout.price)}`;
                if (productForCheckout.description) botResponseText += `\n\n${productForCheckout.description}`;
                botResponseText += "\n\nEscolha como deseja continuar:";
                botButtons = productChildren
                  .filter((child: any) => child.showInPoll !== false)
                  .map((child: any) => ({ label: child.title, value: child.keyword }));
              } else if (isSchedulableProduct(productForCheckout)) {
                const selectedService = serviceListForScheduling.find(
                  (service) => normalizeLookupValue(service.name) === normalizeLookupValue(productForCheckout.name)
                ) || {
                  id: catalogChoice,
                  name: productForCheckout.name || `Serviço ${catalogChoice}`,
                  price: productForCheckout.price,
                  durationMin: normalizeDurationMinutes(productForCheckout.duration_min || productForCheckout.duration, 60),
                };

                const dates = getNextSchedulingDates(settings).slice(0, 5);
                if (dates.length === 0) {
                  botResponseText = `📅 Não há datas disponíveis para *${selectedService.name}* no momento. Escolha *0* para voltar e tentar novamente depois.`;
                  botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
                } else {
                  const mappedDates = dates.map((dateISO) => formatDateLabel(new Date(`${dateISO}T00:00:00`)));

                  setSchedulingState({
                    phase: "selectDate",
                    services: serviceListForScheduling,
                    selectedService,
                    availableDates: dates,
                  });

                  botResponseText = `📅 Você selecionou *${selectedService.name}*.\n\nEscolha um dos dias disponíveis:`;
                  botResponseText += buildLabeledListText(mappedDates, "");
                  botResponseText += "\n\nDigite o número da data ou *0* para voltar.";
                  botButtons = buildDateButtons(dates);
                  botButtons.push({ label: "🏠 Voltar", value: "0" });
                }
                } else {
                  const deliveryType = getProductDeliveryType(productForCheckout);

                  if (deliveryType === "both" || (deliveryType !== "virtual_instant" && deliveryType !== "virtual_deadline" && deliveryType !== "service")) {
                    setCheckoutDeliveryState({
                      phase: "chooseDeliveryMethod",
                      product: productForCheckout,
                      paymentMode,
                      deliveryType: deliveryType === "both" ? "both" : "delivery",
                      sourceNodeId: customSubNode?.id || null,
                      deadline: productForCheckout.delivery_deadline || "imediato",
                    });

                  setInCatalogView(false);
                  setSchedulingState(null);

                  botResponseText = deliveryType === "both"
                    ? botMessageTemplates.catalog.bothMethods(productForCheckout, { deadline: productForCheckout.delivery_deadline || "imediato" })
                    : botMessageTemplates.catalog.deliveryOrPickup(productForCheckout);
                  botButtons = [
                    {
                      label: `1 - ${
                        deliveryType === "both"
                          ? botMessageTemplates.labels.bothDigital(productForCheckout.delivery_deadline || "imediato")
                          : botMessageTemplates.labels.delivery()
                      }`,
                      value: "1",
                    },
                    {
                      label: `2 - ${
                        deliveryType === "both"
                          ? botMessageTemplates.labels.bothPhysical()
                          : `${botMessageTemplates.labels.pickup()} / Presencial`
                      }`,
                      value: "2",
                    },
                    { label: "👤 Atendimento humano", value: "4" },
                    { label: "⬅️ Voltar ao Catálogo", value: "0" },
                  ];
                } else {
                  const checkoutFlow = buildCheckoutFlow(
                    productForCheckout,
                    paymentMode,
                    customSubNode,
                    deliveryType === "virtual_deadline"
                      ? botMessageTemplates.labels.bothDigital(productForCheckout.delivery_deadline || "imediato")
                      : botMessageTemplates.labels.digitalImmediate()
                  );

                  setInCatalogView(false);
                  setSchedulingState(null);

                  botResponseText = checkoutFlow.text;
                  botButtons = checkoutFlow.buttons;
                }
              }
            } else {
              botResponseText = "Digite um número válido para escolher um item do catálogo.";
              botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
            }
          }

          const presentation = presentOptionMessage(botResponseText, botButtons);
          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: presentation.text,
            timestamp: currentTime,
            buttons: presentation.buttons,
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        // SE CLICOU EM GERAR PIX NO CHAT
        if (clean.startsWith("gen_pix_chat_")) {
          const slug = clean.replace("gen_pix_chat_", "").trim();
          const slugIndex = parseInt(slug, 10);
          const matchedProduct =
            resolveProductFromNode({ productName: slug }) ||
            prods.find((prod: any) => normalizeLookupValue(prod?.name || "") === normalizeLookupValue(slug)) ||
            (!isNaN(slugIndex) && slugIndex > 0 ? prods[slugIndex - 1] : null);

          if (matchedProduct) {
            botResponseText = `⚡ *PIX gerado para simulação*\n\nPedido: *${matchedProduct.name}*\nValor: *R$ ${formatProductPrice(matchedProduct.price)}*\n\n🔑 *PIX Copia e Cola:*\n\`CODIGO-PIX-GERADO-PELO-GATEWAY\`\n\nNo bot real, o gateway confirmará o pagamento automaticamente.`;
            botButtons = [
              { label: "✅ Já realizei o pagamento", value: "confirm_pix" },
              { label: "🏠 Menu Principal", value: "0" },
            ];
          } else {
            botResponseText = "❌ Não foi possível identificar o produto deste pagamento.";
            botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
          }

          const presentation = presentOptionMessage(botResponseText, botButtons);
          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: presentation.text,
            timestamp: currentTime,
            buttons: presentation.buttons,
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        if (clean === "confirm_pix") {
        botResponseText = "⏳ *Pagamento aguardando confirmação*\n\nNo atendimento real, o pedido será atualizado quando o gateway confirmar o PIX.";
        botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
        const presentation = presentOptionMessage(botResponseText, botButtons);
        const botMsg: Message = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: presentation.text,
          timestamp: currentTime,
          buttons: presentation.buttons,
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      // SE CLICOU NO BOTÃO DE ABRIR LINK DE PAGAMENTO
      if (clean.startsWith("open_link_")) {
        const urlToOpen = safeUserText.replace("open_link_", "").trim();
        if (typeof window !== "undefined") {
          try {
            const parsed = new URL(urlToOpen);
            if (parsed.origin === window.location.origin || parsed.protocol === 'https:') {
              window.open(urlToOpen, "_blank", "noopener,noreferrer");
            }
          } catch { /* invalid URL, silently ignore */ }
        }
        botResponseText = `🔗 *Checkout aberto em uma nova janela.*\n\nNo bot real, o pedido será atualizado automaticamente após a confirmação do gateway de pagamento.`;
        botButtons = [{ label: "🏠 Ir para o Menu Principal", value: "0" }];

        const presentation = presentOptionMessage(botResponseText, botButtons);
        const botMsg: Message = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: presentation.text,
          timestamp: currentTime,
          buttons: presentation.buttons,
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Procura nó no nível atual
      const currentLevelNodes = currentParentId
        ? allNodes.filter((n: any) => n.parentId === currentParentId)
        : allNodes.filter((n: any) => !n.parentId);

      const nodeMatcher = (node: any) => {
        const nodeKeyword = normalizeLookupValue(node?.keyword);
        return Boolean(nodeKeyword) && (nodeKeyword === cleanLookup || cleanLookup.includes(nodeKeyword));
      };

      let matchedNode = currentLevelNodes.find((node: any) => normalizeLookupValue(node?.keyword) === cleanLookup)
        || [...currentLevelNodes]
          .sort((left: any, right: any) => normalizeLookupValue(right?.keyword).length - normalizeLookupValue(left?.keyword).length)
          .find((node: any) => nodeMatcher(node));
      if (!matchedNode && !currentParentId) {
        const productIndex = Number.parseInt(clean, 10) - 1;
        const fallbackProduct = Number.isNaN(productIndex) ? null : prods[productIndex];
        if (fallbackProduct) {
          matchedNode = {
            id: `simulator-product-${productIndex}`,
            actionType: "checkout",
            title: fallbackProduct.name || `Produto ${productIndex + 1}`,
            productId: fallbackProduct.id,
            productName: fallbackProduct.name,
            paymentMode: "both",
          };
        }
      }

      if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
        setInCatalogView(false);
        const currentNode = currentParentId ? allNodes.find((node: any) => node.id === currentParentId) : null;
        const parentId = currentNode?.parentId || null;
        setCurrentParentId(parentId);
        if (parentId) {
          const parent = allNodes.find((node: any) => node.id === parentId);
          const siblings = allNodes.filter((node: any) => node.parentId === parentId);
          if (onActiveNodeChange) onActiveNodeChange(parentId);
          botResponseText = `${parent?.actionType !== "text" && parent?.actionType !== "catalog" ? `📂 *${parent?.title}*\n` : ""}Selecione uma opção abaixo:\n\n${siblings.map((node: any) => `*${node.keyword}* - *${node.title}*`).join("\n")}\n\nDigite *0* ou *voltar* para retornar ao menu anterior.`;
          botButtons = siblings.filter((node: any) => node.showInPoll !== false).map((node: any) => ({ label: node.title, value: node.keyword }));
        } else {
          if (onActiveNodeChange) onActiveNodeChange(null);
          const initial = generateBotInitialMenu();
          botResponseText = initial.text;
          botButtons = initial.buttons;
        }
      } else if (matchedNode) {
        if (onActiveNodeChange && allNodes.some((node: any) => node.id === matchedNode.id)) {
          onActiveNodeChange(matchedNode.id);
        }

        const children = allNodes.filter((n: any) => n.parentId === matchedNode.id);

        if (matchedNode.actionType === "catalog") {
          setInCatalogView(true);
          botResponseText = buildCatalogTextFromNode(matchedNode, allNodes, prods);
          const productNodes = allNodes.filter(
            (node: any) => node.parentId === matchedNode.id && node.actionType === "product"
          );
          botButtons = productNodes.length > 0
            ? productNodes.flatMap((node: any, idx: number) => {
                if (node.showInPoll === false) return [];
                const product = resolveProductFromNode(node);
                return [{
                  label: product
                    ? `${product.name} - R$ ${getCatalogDisplayPrice(product)}`
                    : node.title,
                  value: String(idx + 1),
                }];
              })
            : prods.map((product: any, idx: number) => ({
                label: `${product.name || `Produto ${idx + 1}`} - R$ ${getCatalogDisplayPrice(product)}`,
                value: String(idx + 1),
              }));
          botProducts = undefined;
        } else if (matchedNode.actionType === "product") {
          setInCatalogView(false);
          const chosenProduct = resolveProductFromNode(matchedNode);
          if (chosenProduct) {
            botResponseText = matchedNode.textContent?.trim() ? `${matchedNode.textContent.trim()}\n\n` : "";
            botResponseText += `📦 *${chosenProduct.name}* - R$ ${formatProductPrice(chosenProduct.price)}`;
            if (chosenProduct.description) botResponseText += `\n\n${chosenProduct.description}`;
          } else {
            botResponseText = matchedNode.textContent || `📦 *${matchedNode.title}*`;
          }
        } else if (matchedNode.actionType === "checkout") {
          setInCatalogView(false);
          const chosenProduct = resolveProductFromNode(matchedNode);
          if (!chosenProduct) {
            botResponseText = "❌ Produto não encontrado no catálogo.";
          } else if (chosenProduct.stock !== undefined && chosenProduct.stock !== null && chosenProduct.stock <= 0) {
            botResponseText = `❌ *${chosenProduct.name}* está esgotado no momento. Digite *0* para voltar.`;
          } else if (isSchedulableProduct(chosenProduct)) {
            const selectedService = serviceListForScheduling.find(
              (service) => normalizeLookupValue(service.name) === normalizeLookupValue(chosenProduct.name)
            ) || {
              id: 1,
              name: chosenProduct.name,
              price: chosenProduct.price,
              durationMin: normalizeDurationMinutes(chosenProduct.duration_min || chosenProduct.duration, 60),
            };
            const dates = getNextSchedulingDates(settings);
            if (dates.length === 0) {
              botResponseText = `📅 Não há datas disponíveis para *${selectedService.name}* no momento. Digite *0* para voltar.`;
              botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
            } else {
              setSchedulingState({
                phase: "selectDate",
                services: serviceListForScheduling,
                selectedService,
                availableDates: dates,
              });
              botResponseText = `Você selecionou *${selectedService.name}*.\n\n📅 Escolha um dos dias disponíveis abaixo:`;
              botResponseText += buildLabeledListText(dates.map((dateISO) => formatDateLabel(new Date(`${dateISO}T00:00:00`))), "");
              botResponseText += `\n\nDigite o número correspondente (1-${dates.length}) ou *0* para voltar.`;
              botButtons = buildDateButtons(dates);
            }
          } else {
            const deliveryType = getProductDeliveryType(chosenProduct);
            const paymentMode = matchedNode.paymentMode || "both";
            if (deliveryType === "both" || (deliveryType !== "virtual_instant" && deliveryType !== "virtual_deadline" && deliveryType !== "service")) {
              setCheckoutDeliveryState({
                phase: "chooseDeliveryMethod",
                product: chosenProduct,
                paymentMode,
                deliveryType: deliveryType === "both" ? "both" : "delivery",
                sourceNodeId: matchedNode.id,
                deadline: chosenProduct.delivery_deadline || "imediato",
              });
              botResponseText = deliveryType === "both"
                ? botMessageTemplates.catalog.bothMethods(chosenProduct, { deadline: chosenProduct.delivery_deadline || "imediato" })
                : botMessageTemplates.catalog.deliveryOrPickup(chosenProduct);
              botButtons = [
                { label: deliveryType === "both" ? "1 - Envio digital" : "1 - Entrega", value: "1" },
                { label: deliveryType === "both" ? "2 - Entrega física" : "2 - Retirada / Presencial", value: "2" },
                { label: "👤 Atendimento humano", value: "4" },
                { label: "🏠 Menu Principal", value: "0" },
              ];
            } else {
              const addressLabel = deliveryType === "virtual_deadline"
                ? botMessageTemplates.labels.bothDigital(chosenProduct.delivery_deadline || "imediato")
                : botMessageTemplates.labels.digitalImmediate();
              const checkoutFlow = buildCheckoutFlow(chosenProduct, paymentMode, matchedNode, addressLabel);
              botResponseText = checkoutFlow.text;
              botButtons = checkoutFlow.buttons;
            }
          }
        } else if (matchedNode.actionType === "scheduling") {
          setInCatalogView(false);
          const services = parseSchedulingServiceList(prods);

          const serviceIntro = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "📅 *Iniciar Agendamento*\n\nSelecione o número do serviço que deseja agendar:";
          const hasManualMenu = hasExplicitMenuSection(serviceIntro);

          if (services.length === 0) {
            botResponseText = "📋 No momento não temos serviços disponíveis para agendamento.";
            botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
          } else {
            botResponseText = serviceIntro;
            if (!hasManualMenu) {
              services.forEach((service) => {
                const price = service.price ? ` (R$ ${formatProductPrice(service.price)})` : "";
                botResponseText += `\n*${service.id}* - ${service.name}${price}`;
              });
              botResponseText += "\n\nDigite o número do serviço ou *0* para voltar.";
            }
            botButtons = services.map((service) => ({
              label: `${service.id} - ${service.name}`,
              value: String(service.id),
            }));
            botButtons.push({ label: "🏠 Voltar", value: "0" });

            setSchedulingState({
              phase: "selectService",
              services,
            });
          }
        } else if (matchedNode.actionType === "collect_data") {
          setInCatalogView(false);
          setCollectingNodeId(matchedNode.id);
          botResponseText = matchedNode.textContent || "Por favor, envie a informação solicitada:";
        } else if (matchedNode.actionType === "human") {
          setInCatalogView(false);
          setIsHumanHandoff(true);
          botResponseText = matchedNode.textContent || "Atendimento automático pausado. Um atendente humano continuará esta conversa.";
        } else {
          setInCatalogView(false);
          botResponseText = matchedNode.textContent || `Você selecionou a opção *${matchedNode.title}*.`;
        }

        // APENAS PARA NÓS NORMAIS QUE NÃO SÃO CATÁLOGO: APRESENTA OS SUB-NÓS (FILHOS)
        if (children.length > 0 && (matchedNode.actionType === "text" || matchedNode.actionType === "product")) {
          setCurrentParentId(matchedNode.id);
          botResponseText += "\n\nEscolha uma das sub-opções abaixo:\n";
          children.forEach((child: any) => {
            botResponseText += `\n*${child.keyword}* - ${child.title}`;
          });
          botResponseText += "\n\nDigite *0* para voltar ao menu principal.";
          botButtons = children
            .filter((child: any) => child.showInPoll !== false)
            .map((c: any) => ({ label: `${c.keyword} - ${c.title}`, value: c.keyword }));
        }
        } else {
        botResponseText = `Opção inválida. Selecione uma das opções disponíveis neste nível.`;
        botButtons = currentLevelNodes
          .filter((node: any) => node.showInPoll !== false)
          .map((node: any) => ({ label: node.title, value: node.keyword }));
      }

      const presentation = presentOptionMessage(botResponseText, botButtons);
      const finalProducts = normalizeMessagesProducts(botProducts);
      const botMsg: Message = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: presentation.text,
        timestamp: currentTime,
        nodeId: matchedNode?.id || null,
        buttons: presentation.buttons,
        products: finalProducts,
      };

      setMessages((prev) => [...prev, botMsg]);
      } catch (error) {
        console.error("Erro ao processar mensagem do simulador", error);
        setSchedulingState(null);
        setCurrentParentId(null);
        setInCatalogView(false);

        const fallback: Message = {
          id: "bot_err_" + Date.now(),
          sender: "bot",
          text: "⚠ Não consegui processar esta etapa. Tente voltar ao menu principal digitando *0*.",
          timestamp: getFormattedTime(),
          buttons: [{ label: "🏠 Menu Principal", value: "0" }],
        };

        setMessages((prev) => [...prev, fallback]);
      } finally {
        setIsTyping(false);
      }
    }, 400);
  };

  // HELPER PARA RENDERIZAR LINKS CLICÁVEIS QUE ABREM EM NOVA ABA
  const renderTextWithLinks = (text: any) => {
    const safeText = normalizeTextValue(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = safeText.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 font-bold underline hover:text-sky-700 flex items-center gap-1 inline-flex my-1 break-all"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="w-[370px] h-[660px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col relative select-none font-sans shrink-0 overflow-hidden">
      {/* BARRA DE STATUS SUPERIOR */}
      <div className="h-6 px-6 pt-1 flex items-center justify-between text-[11px] font-bold text-white z-20">
        <span>11:55</span>
        <div className="w-16 h-4 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-2 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span>5G</span>
          <div className="w-4 h-2.5 border border-white rounded-sm p-0.5 flex items-center">
            <div className="w-full h-full bg-white rounded-xs"></div>
          </div>
        </div>
      </div>

      {/* CABEÇALHO DO WHATSAPP */}
      <div className="bg-[#075e54] text-white px-3.5 py-2.5 rounded-t-[32px] flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-5 h-5 cursor-pointer opacity-80 hover:opacity-100" />
          <div className="w-8.5 h-8.5 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-400">
            🤖
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight">{settings?.ai_name || "Bot da loja"}</h4>
            <span className="text-[9px] text-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-90">
          <button onClick={handleReset} title="Resetar Conversa" className="p-1 hover:bg-white/10 rounded-full">
            <RotateCcw className="w-4 h-4" />
          </button>
          <MoreVertical className="w-4 h-4" />
        </div>
      </div>

      {/* ÁREA DE CHAT DO WHATSAPP */}
      <div className="relative flex-1 bg-[radial-gradient(circle_at_20%_10%,#d5ddd8_0%,#d5e5dc_40%,#dbeef0_100%)] dark:bg-[#0b141a] p-3.5 overflow-y-auto space-y-3 text-xs">
        <div className="text-center my-1 space-y-1">
          <span className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-xs border border-emerald-200 dark:border-emerald-500/30">
            🔒 Dica: clique no ✏️ para editar o balão.
          </span>
        </div>

        <div className="rounded-xl border border-emerald-100/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/50 p-2 space-y-1.5 shadow-sm">
          <div className="text-[9px] font-bold text-slate-600 dark:text-slate-200 flex items-center justify-between gap-2">
            <span className="text-[8px] uppercase tracking-[0.18em]">Configuração de visual</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              showUserNumbers
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200"
            }`}>
              {showUserNumbers ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{showUserNumbers ? "Número do usuário visível" : "Número oculto"}</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-600 dark:text-slate-300">
            <span className="whitespace-nowrap font-bold">Largura das caixas:</span>
            <input
              type="range"
              min={70}
              max={100}
              value={bubbleMaxWidthPercent}
              onChange={(e) => setBubbleMaxWidthPercent(Number(e.target.value))}
              className="w-full h-1.5 accent-emerald-600"
            />
            <span className="w-11 text-right font-black">{bubbleMaxWidthPercent}%</span>
          </div>
          <label className="flex items-center justify-between gap-2 cursor-pointer text-[9px] text-slate-700 dark:text-slate-200">
            <span className="font-bold">Mostrar número do usuário</span>
            <input
              type="checkbox"
              checked={showUserNumbers}
              onChange={(e) => setShowUserNumbers(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600"
            />
          </label>
          {Object.keys(collectedData).length > 0 && (
            <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
              {Object.keys(collectedData).length} dado(s) coletado(s) nesta simulação
            </div>
          )}
        </div>

        {messages.map((msg) => {
          const userMeta = msg.sender === "user" ? (showUserNumbers ? `Você • ${simulatedUserNumber}` : "Você") : settings?.ai_name || "Bot da loja";
          return (
            <div
              key={msg.id}
              className={`flex flex-col group relative ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2.5 shadow-sm space-y-2 relative transition-all ${
                  msg.sender === "user"
                    ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-none"
                    : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-white rounded-tl-none"
                }`}
                style={{ maxWidth: `${bubbleMaxWidthPercent}%` }}
              >
                <div className={`text-[8px] font-bold uppercase tracking-[0.12em] ${
                  msg.sender === "user" ? "text-emerald-900/75 dark:text-emerald-100/85" : "text-slate-500 dark:text-slate-300"
                }`}>
                  {userMeta}
                </div>

                {/* BOTÃO DE EDIÇÃO DIRETO NO BALÃO */}
                {msg.sender === "bot" && editingMessageId !== msg.id && (
                  <button
                    onClick={() => startEditMessage(msg)}
                    className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 bg-emerald-600 text-white p-1 rounded-full shadow-md hover:scale-110 transition-all z-20"
                    title="Editar este texto diretamente no balão"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}

                {/* MODO EDIÇÃO DO BALÃO */}
                {editingMessageId === msg.id ? (
                  <div className="space-y-1.5 w-full min-w-[200px]">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded-xl p-2 text-[11px] text-slate-900 dark:text-white font-medium focus:outline-none leading-relaxed resize overflow-auto"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingMessageId(null)}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveEditMessage(msg)}
                        className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3 h-3" /> Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-medium">
                    {renderTextWithLinks(msg.text)}
                  </div>
                )}

                {/* LISTA DE PRODUTOS SE FOR AÇÃO DE CATÁLOGO */}
                {msg.products && msg.products.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-white/10">
                    {msg.products.map((prod: any, pIdx: number) => (
                      <div
                        key={pIdx}
                        onClick={() => processUserInput(String(pIdx + 1))}
                        className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-emerald-500 transition-all flex items-center justify-between text-[10px]"
                      >
                        <div className="truncate pr-2 font-bold text-slate-900 dark:text-white">
                          {pIdx + 1}. {prod.name}
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                           R$ {formatProductPrice(prod.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ENQUETE DE ESCOLHA ÚNICA, COMO A ENVIADA AO WHATSAPP */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/30">
                    <div className="px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      Selecione uma opção
                    </div>
                    {msg.buttons.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => !isHumanHandoff && processUserInput(btn.value)}
                        disabled={isHumanHandoff}
                        className="flex w-full items-center gap-2 border-t border-slate-200 dark:border-white/10 px-2.5 py-2 text-left text-[10px] font-bold text-slate-700 dark:text-slate-200 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-emerald-500/10"
                      >
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-emerald-600 bg-white dark:bg-slate-800" />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                  <span>{msg.timestamp}</span>
                  {msg.sender === "user" && <CheckCheck className="w-3 h-3 text-sky-500" />}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start">
            <div className="bg-white dark:bg-[#202c33] px-3 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CAMPO DE ENTRADA DO CHAT */}
      <div className="bg-[#f0f0f0] dark:bg-[#1f2c34] p-2 rounded-b-[32px] flex items-center gap-2 border-t border-slate-200 dark:border-white/10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isHumanHandoff && input.trim() && processUserInput(input)}
          placeholder={isHumanHandoff ? "Atendimento automático pausado" : "Digite uma opção ou mensagem..."}
          disabled={isHumanHandoff}
          className="flex-1 bg-white dark:bg-[#2a3942] border-none rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-medium disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          onClick={() => !isHumanHandoff && input.trim() && processUserInput(input)}
          disabled={isHumanHandoff}
          className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
