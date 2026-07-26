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
} from "lucide-react";

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [inCatalogView, setInCatalogView] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getFormattedTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  };

  const normalizeLookupValue = (value: any): string => {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
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

  const buildCheckoutFlow = (product: any, paymentMode: string, originNode: any, botPrefix = "") => {
    if (!product) {
      return {
        text: "❌ Produto não encontrado no catálogo.",
        buttons: [{ label: "🏠 Voltar ao Catálogo", value: "1" }, { label: "👤 Falar com Consultor", value: "4" }],
      };
    }

    const nodePrefix = botPrefix || (originNode?.textContent && originNode.textContent.trim().length > 0
      ? originNode.textContent
      : `📦 *${product.name}*\n💰 *Valor:* R$ ${product.price || ""}`);
    const originUrl = typeof window !== "undefined" ? window.location.origin : "https://nexus-six-olive.vercel.app";
    const checkoutLink = `${originUrl}/checkout/${tenantId || "default"}?product=${encodeURIComponent(product.name)}`;
    const desc = product.description ? `\n${product.description}` : "";
    const prefix = `${nodePrefix}${desc}`;

    if (paymentMode === "pix") {
      return {
        text: `${prefix}\n\n👇 *Pagamento via Pix:* Clique abaixo para gerar o código Pix Copia e Cola instantâneo!`,
        buttons: [
          { label: "⚡ Gerar Pix no Chat", value: `gen_pix_chat_${product.name}` },
          { label: "👤 Falar com Consultor", value: "4" },
          { label: "⬅️ Voltar ao Catálogo", value: "1" },
        ],
      };
    }

    if (paymentMode === "link") {
      return {
        text: `${prefix}\n\n🔗 *Link do Site para Pagamento (Cartão / Boleto / Pix):*\n${checkoutLink}`,
        buttons: [
          { label: "💳 Acessar Site de Checkout", value: `open_link_${checkoutLink}` },
          { label: "👤 Falar com Consultor", value: "4" },
          { label: "⬅️ Voltar ao Catálogo", value: "1" },
        ],
      };
    }

    return {
      text: `${prefix}\n\n👇 *Escolha a forma de pagamento:*`,
      buttons: [
        { label: "⚡ Gerar Pix no Chat", value: `gen_pix_chat_${product.name}` },
        { label: "💳 Site (Cartão / Boleto / Pix)", value: `open_link_${checkoutLink}` },
        { label: "👤 Falar com Consultor", value: "4" },
        { label: "⬅️ Voltar ao Catálogo", value: "1" },
      ],
    };
  };

  const generateBotInitialMenu = (): Message => {
    const welcome = sanitizeWelcomeMessage(settings?.welcome_message || DEFAULT_SIMULATOR_WELCOME);
    const shouldAutoAppendMenu = settings?.welcome_menu_auto_append !== false;

    const allNodes = settings?.custom_rules_nodes || [];
    // FILTRA APENAS NÓS PAI (sem parentId) PARA NÃO VAZAR SUB-NÓS NO MENU INICIAL
    const rootNodes = allNodes.filter((n: any) => !n.parentId);

    let menuText = welcome;

    if (!shouldAutoAppendMenu || hasExplicitMenuSection(welcome)) {
      return {
        id: "init_menu",
        sender: "bot",
        text: menuText,
        timestamp: getFormattedTime(),
        isWelcome: true,
      };
    }

    if (rootNodes.length > 0) {
      menuText += "\n\nEscolha uma das opções abaixo:\n";
      rootNodes.forEach((node: any) => {
        const icon = node.keyword === "1" ? "🛍️" : node.keyword === "2" ? "🕒" : node.keyword === "3" ? "📅" : "👤";
        menuText += `\n*${node.keyword}* - ${icon} ${node.title}`;
      });
    } else {
      menuText += "\n\n*1* - 🛍️ Catálogo de Produtos & Serviços\n*2* - 🕒 Horários de Atendimento\n*3* - 📅 Agendar Horário\n*4* - 👤 Falar com Atendente Humano";
    }

    const defaultButtons = rootNodes.length > 0
      ? rootNodes.slice(0, 4).map((n: any) => ({ label: `${n.keyword} - ${n.title}`, value: n.keyword }))
      : [
          { label: "1 - Catálogo", value: "1" },
          { label: "2 - Horários", value: "2" },
          { label: "3 - Agendar", value: "3" },
          { label: "4 - Humano", value: "4" },
        ];

    return {
      id: "init_menu",
      sender: "bot",
      text: menuText,
      timestamp: getFormattedTime(),
      isWelcome: true,
      buttons: defaultButtons,
    };
  };

  useEffect(() => {
    setMessages([generateBotInitialMenu()]);
    setCurrentParentId(null);
    setInCatalogView(false);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleReset = () => {
    setMessages([generateBotInitialMenu()]);
    setInput("");
    setCurrentParentId(null);
    setSchedulingState(null);
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

        if (schedulingStateActive) {
          const currentState = schedulingState as SchedulingState;

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

              const price = currentState.selectedService?.price ? `R$ ${currentState.selectedService.price}` : null;
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
          const finalButtons = normalizeButtons(botButtons);

          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: normalizeTextValue(botResponseText),
            timestamp: currentTime,
            buttons: finalButtons,
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        // SE O CLIENTE ESTÁ NAVEGANDO NO CATÁLOGO E ESCOLHEU UM NÚMERO (1, 2, 3, etc)
        if (inCatalogView && !isNaN(parseInt(clean, 10))) {
          const prodIdx = parseInt(clean, 10) - 1;
          const selectedProd = prods[prodIdx];

          // Procura se o usuário configurou um sub-nó específico para este produto
          const catalogNode = allNodes.find((n: any) => n.actionType === "catalog");
          const customSubNode = catalogNode
            ? allNodes.find((n: any) => n.parentId === catalogNode.id && n.keyword === String(clean))
            : null;

          const productForCheckout = resolveProductFromNode(customSubNode) || selectedProd;

          if (productForCheckout) {
            const pMode = customSubNode?.paymentMode || "both";
            const checkoutFlow = buildCheckoutFlow(
              productForCheckout,
              pMode,
              customSubNode,
              customSubNode?.textContent || `📦 *${productForCheckout.name}*\n💰 *Valor:* R$ ${productForCheckout.price}`
            );

            botResponseText = checkoutFlow.text;
            botButtons = checkoutFlow.buttons;
          } else {
            botResponseText = "❌ Produto não encontrado no catálogo.";
            botButtons = [
              { label: "🏠 Menu Principal", value: "0" },
              { label: "👤 Falar com Consultor", value: "4" },
            ];
          }

            const botMsg: Message = {
              id: "bot_" + Date.now(),
              sender: "bot",
              text: normalizeTextValue(botResponseText),
              timestamp: currentTime,
              buttons: normalizeButtons(botButtons),
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
            (!isNaN(slugIndex) && slugIndex > 0 ? prods[slugIndex - 1] : null) ||
            { name: "Produto", price: "147.00" };

          botResponseText = `⚡ *Chave Pix para Pagamento Instantâneo*\n\nPedido: *${matchedProduct.name}*\nValor: *R$ ${matchedProduct.price}*\n\n🔑 *Chave Pix Copia e Cola:*\n\`00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-4266141740005204000053039865405147.005802BR5910NexusSaaS6009SaoPaulo62070503***6304E2CA\`\n\nAssim que efetuar a transferência Pix, o seu acesso é liberado instantaneamente! ✅`;
          botButtons = [
            { label: "✅ Já Realizei o Pagamento", value: "confirm_pix" },
            { label: "🏠 Menu Principal", value: "0" },
          ];

          const botMsg: Message = {
            id: "bot_" + Date.now(),
            sender: "bot",
            text: normalizeTextValue(botResponseText),
            timestamp: currentTime,
            buttons: normalizeButtons(botButtons),
          };
          setMessages((prev) => [...prev, botMsg]);
          return;
        }

        if (clean === "confirm_pix") {
        botResponseText = "🎉 *Pagamento em Processamento!*\n\nIdentificamos a solicitação de baixa! Nosso sistema liberará sua credencial em instantes no WhatsApp! 🚀";
        botButtons = [{ label: "🏠 Menu Principal", value: "0" }];
        const botMsg: Message = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: normalizeTextValue(botResponseText),
          timestamp: currentTime,
          buttons: normalizeButtons(botButtons),
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
        botResponseText = `🚀 Redirecionando para a aba de checkout seguro em nova janela!\n\nApós efetuar o pagamento via Pix, Cartão ou Boleto, sua conta será ativada automaticamente! ✅`;
        botButtons = [{ label: "🏠 Ir para o Menu Principal", value: "0" }];

        const botMsg: Message = {
          id: "bot_" + Date.now(),
          sender: "bot",
          text: normalizeTextValue(botResponseText),
          timestamp: currentTime,
          buttons: normalizeButtons(botButtons),
        };
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      // Procura nó no nível atual
      const currentLevelNodes = currentParentId
        ? allNodes.filter((n: any) => n.parentId === currentParentId)
        : allNodes.filter((n: any) => !n.parentId);

      let matchedNode = currentLevelNodes.find(
        (n: any) => n.keyword?.trim().toLowerCase() === clean || n.title?.toLowerCase().includes(clean)
      );

      if (!matchedNode) {
        matchedNode = allNodes.find(
          (n: any) => n.keyword?.trim().toLowerCase() === clean || n.title?.toLowerCase().includes(clean)
        );
      }

      if (clean === "0" || clean === "voltar" || clean === "menu" || clean === "inicio") {
        setCurrentParentId(null);
        setInCatalogView(false);
        if (onActiveNodeChange) onActiveNodeChange(null);
        const initial = generateBotInitialMenu();
        botResponseText = initial.text;
        botButtons = initial.buttons;
      } else if (matchedNode) {
        if (onActiveNodeChange) onActiveNodeChange(matchedNode.id);

        const children = allNodes.filter((n: any) => n.parentId === matchedNode.id);

        if (matchedNode.actionType === "catalog") {
          setInCatalogView(true);
          botResponseText = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "🛍️ *Nosso Catálogo de Produtos & Serviços*\n\nConfira os itens disponíveis abaixo. Digite o número do produto para abrir o link de pagamento seguro em outra aba!";
          botProducts = normalizeMessagesProducts(prods);
        } else if (matchedNode.actionType === "product" || matchedNode.actionType === "checkout") {
          setInCatalogView(false);
          const chosenProduct = resolveProductFromNode(matchedNode);

          if (children.length > 0) {
            if (chosenProduct) {
              const intro = matchedNode.textContent && matchedNode.textContent.trim().length > 0
                ? matchedNode.textContent
                : `📦 *${chosenProduct.name}*\n💰 *Valor:* R$ ${chosenProduct.price || ""}`;
              botResponseText = `${intro}\n\n${chosenProduct.description ? chosenProduct.description : ""}`;
            } else {
              botResponseText = matchedNode.textContent || `Você selecionou a opção *${matchedNode.title}*.`;
            }
          } else {
            const checkoutFlow = buildCheckoutFlow(
              chosenProduct,
              matchedNode.paymentMode || "both",
              matchedNode,
              chosenProduct
                ? `📦 *${chosenProduct.name}*\n💰 *Valor:* R$ ${chosenProduct.price || ""}`
                : matchedNode.textContent || `📦 *${matchedNode.title}*`
            );

            botResponseText = checkoutFlow.text;
            botButtons = checkoutFlow.buttons;
          }
        } else if (matchedNode.actionType === "scheduling") {
          setInCatalogView(false);
          const services = parseSchedulingServiceList(prods).slice(0, 5);

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
                const price = service.price ? ` (R$ ${service.price})` : "";
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
        } else if (matchedNode.actionType === "human") {
          setInCatalogView(false);
          botResponseText = matchedNode.textContent && matchedNode.textContent.trim().length > 0
            ? matchedNode.textContent
            : "👤 *Transferindo para Atendente Humano*\n\nAguarde um instante! Um dos nossos consultores irá assumir a conversa para te atender pessoalmente. ⏳";
        } else {
          setInCatalogView(false);
          botResponseText = matchedNode.textContent || `Você selecionou a opção *${matchedNode.title}*.`;
        }

        // APENAS PARA NÓS NORMAIS QUE NÃO SÃO CATÁLOGO: APRESENTA OS SUB-NÓS (FILHOS)
        if (children.length > 0 && matchedNode.actionType !== "catalog") {
          setCurrentParentId(matchedNode.id);
          botResponseText += "\n\nEscolha uma das sub-opções abaixo:\n";
          children.forEach((child: any) => {
            botResponseText += `\n*${child.keyword}* - ${child.title}`;
          });
          botResponseText += "\n\nDigite *0* para voltar ao menu principal.";
          botButtons = children.map((c: any) => ({ label: `${c.keyword} - ${c.title}`, value: c.keyword }));
        }
        } else if (clean === "09:00" || clean === "10:30" || clean === "14:00" || clean === "16:30") {
          botResponseText = `✅ *Horário aceito no simulador:* ${clean}.\n\nEsse fluxo simplifica para validação e não dispara agenda real no simulador.`;
        } else {
        botResponseText = `Entendi sua mensagem: _"${safeUserText}"_.\n\nPara navegar, escolha uma das opções ativas:\n\n` + generateBotInitialMenu().text;
        botButtons = generateBotInitialMenu().buttons;
      }

      const finalButtons = normalizeButtons(botButtons);
      const finalProducts = normalizeMessagesProducts(botProducts);
      const botMsg: Message = {
        id: "bot_" + Date.now(),
        sender: "bot",
        text: normalizeTextValue(botResponseText),
        timestamp: currentTime,
        nodeId: matchedNode?.id || null,
        buttons: finalButtons,
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
    <div className="w-[370px] h-[660px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col relative select-none font-sans shrink-0">
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
            <h4 className="text-xs font-bold leading-tight">{settings?.ai_name || "Nexus Bot"}</h4>
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
      <div className="flex-1 bg-[#e5ddd5] dark:bg-[#0b141a] p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
        <div className="text-center my-1">
          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[9px] font-bold px-2.5 py-1 rounded-md shadow-xs">
            🔒 Clique no ✏️ para editar qualquer mensagem no balão!
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col group relative ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm space-y-2 relative transition-all ${
                msg.sender === "user"
                  ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-none"
                  : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-white rounded-tl-none"
              }`}
            >
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
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded-xl p-2 text-[11px] text-slate-900 dark:text-white font-medium focus:outline-none leading-relaxed"
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
                        R$ {prod.price}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* BOTOES PÍLULAS DE OPÇÃO RÁPIDA */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-200/60 dark:border-white/10">
                  {msg.buttons.map((btn, bIdx) => (
                    <button
                      key={bIdx}
                      onClick={() => processUserInput(btn.value)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-bold transition-all border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1"
                    >
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
        ))}

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
          onKeyDown={(e) => e.key === "Enter" && input.trim() && processUserInput(input)}
          placeholder="Digite uma opção ou mensagem..."
          className="flex-1 bg-white dark:bg-[#2a3942] border-none rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-medium"
        />
        <button
          onClick={() => input.trim() && processUserInput(input)}
          className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
