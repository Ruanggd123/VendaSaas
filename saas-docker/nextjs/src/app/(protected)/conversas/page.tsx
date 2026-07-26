"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  Bot,
  Check,
  CircleAlert,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Mic,
  Music,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  UserCheck,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MediaType = "image" | "audio" | "video" | "document";
type ClientStatus = "sending" | "sent" | "failed";
type MessageFetchMode = "initial" | "delta" | "before";
type Queue = "geral" | "vendas" | "suporte" | "financeiro" | "pos_venda";
type Priority = "low" | "normal" | "high" | "urgent";
type ServiceStatus = "active" | "pending" | "resolved";
type ControlKind = "assignment" | "ai" | "metadata" | "notes";
type QuickFilter = "all" | "unread" | "mine" | "urgent" | "unassigned";

interface Message {
  id: string;
  direction: string;
  content: string;
  ai_generated: boolean;
  metadata?: string | null;
  created_at: string;
  clientStatus?: ClientStatus;
  clientPayload?: SendPayload;
  error?: string;
}

interface Lead {
  id: string;
  name?: string | null;
  status?: string | null;
  value?: number | null;
  category?: string | null;
  notes?: string | null;
}

interface Conversation {
  id: string;
  contact_number: string;
  contact_name?: string | null;
  profile_picture?: string | null;
  status: string;
  instance_name?: string | null;
  last_message_at?: string | null;
  created_at: string;
  ai_paused: boolean;
  assigned_to?: string | null;
  assignee?: { id: string; name?: string | null } | null;
  messages?: Message[];
  leads?: Lead[];
  _count?: { messages: number };
}

interface Instance {
  name: string;
  connectionName: string;
  status: string;
}

interface TeamMember {
  id: string;
  name?: string | null;
}

interface SendPayload {
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

interface SeenValue {
  id: string;
  time: string;
}

const QUICK_REPLIES = [
  "Olá! Como posso ajudar?",
  "Vou verificar para você.",
  "Obrigado pelo contato!",
];
const QUEUE_OPTIONS: { value: Queue; label: string }[] = [
  { value: "geral", label: "Geral" },
  { value: "vendas", label: "Vendas" },
  { value: "suporte", label: "Suporte" },
  { value: "financeiro", label: "Financeiro" },
  { value: "pos_venda", label: "Pós-venda" },
];
const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];
const SERVICE_STATUS_OPTIONS: { value: ServiceStatus; label: string }[] = [
  { value: "active", label: "Em atendimento" },
  { value: "pending", label: "Aguardando cliente" },
  { value: "resolved", label: "Resolvido" },
];
const QUICK_FILTERS: { value: QuickFilter; label: string; description: string }[] = [
  { value: "all", label: "Todas", description: "Todas as conversas" },
  { value: "unread", label: "Não lidas", description: "Apenas novas mensagens recebidas" },
  { value: "mine", label: "Minhas", description: "Conversas atribuídas a você" },
  { value: "urgent", label: "Urgentes", description: "Prioridade urgente" },
  { value: "unassigned", label: "Sem dono", description: "Aguardando atribuição" },
];
const QUICK_NOTES = ["Preço", "Prazo", "Dúvida técnica", "Cancelamento", "Urgente"];
const SEEN_STORAGE_KEY = "conversations:last-seen:v1";

function parseLeadCategory(category?: string | null): { queue: Queue; priority: Priority } {
  const [rawQueue, rawPriority] = (category || "")
    .toLocaleLowerCase("pt-BR")
    .split("|")
    .map((value) => value.trim());
  const validQueue = QUEUE_OPTIONS.some((option) => option.value === rawQueue);
  const validPriority = PRIORITY_OPTIONS.some((option) => option.value === rawPriority);
  return validQueue && validPriority
    ? { queue: rawQueue as Queue, priority: rawPriority as Priority }
    : { queue: "geral", priority: "normal" };
}

function serviceStatusOf(status?: string | null): ServiceStatus {
  return SERVICE_STATUS_OPTIONS.some((option) => option.value === status)
    ? (status as ServiceStatus)
    : "active";
}

function labelFor<T extends string>(options: { value: T; label: string }[], value: T) {
  return options.find((option) => option.value === value)?.label || value;
}

function timeAgo(iso?: string | null) {
  if (!iso) return "sem mensagens";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(firstIso?: string | null, secondIso?: string | null) {
  if (!firstIso || !secondIso) return false;
  const first = new Date(firstIso);
  const second = new Date(secondIso);
  if (Number.isNaN(first.getTime()) || Number.isNaN(second.getTime())) return false;
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatDayDivider(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(iso, today.toISOString())) return "Hoje";
  if (isSameDay(iso, yesterday.toISOString())) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function isConversationUnread(conversation: Conversation, seen: Record<string, SeenValue>) {
  const latest = latestMessage(conversation);
  const lastSeen = seen[conversation.id];
  return Boolean(
    latest &&
      latest.direction !== "outbound" &&
      latest.direction !== "outgoing" &&
      latest.id !== lastSeen?.id &&
      (!lastSeen?.time || new Date(latest.created_at).getTime() > new Date(lastSeen.time).getTime()),
  );
}

function parseMetadata(message: Message): { type?: MediaType; url?: string } {
  if (!message.metadata) return {};
  try {
    const value: unknown = JSON.parse(message.metadata);
    if (typeof value !== "object" || value === null) return {};
    const record = value as Record<string, unknown>;
    return {
      type:
        record.type === "image" ||
        record.type === "audio" ||
        record.type === "video" ||
        record.type === "document"
          ? record.type
          : undefined,
      url: typeof record.url === "string" ? record.url : undefined,
    };
  } catch {
    return {};
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function errorFrom(data: Record<string, unknown>, fallback: string) {
  return typeof data.error === "string"
    ? data.error
    : typeof data.message === "string"
      ? data.message
      : fallback;
}

function latestMessage(conversation: Conversation) {
  return conversation.messages?.[0];
}

function messagePreview(message?: Message) {
  if (!message) return "Conversa ainda sem mensagens";
  const media = parseMetadata(message);
  if (message.content && !message.content.startsWith("[Mídia")) return message.content;
  if (media.type === "image") return "Imagem";
  if (media.type === "audio") return "Áudio";
  if (media.type === "video") return "Vídeo";
  if (media.type === "document") return "Documento";
  return message.content || "Mídia";
}

function isNearBottom(element: HTMLDivElement | null) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

function mediaTypeForFile(file: File, fallback: MediaType = "document"): MediaType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return fallback;
}

function sortMessages(messages: Message[]) {
  return messages.sort((a, b) => {
    const timeDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return timeDifference || a.id.localeCompare(b.id);
  });
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [activeInstance, setActiveInstance] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string; role: string; name?: string | null } | null>(null);
  const [search, setSearch] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [queueFilter, setQueueFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [liveOpenInstanceName, setLiveOpenInstanceName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [messagesError, setMessagesError] = useState("");
  const [composerError, setComposerError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [olderMessagesLoading, setOlderMessagesLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [seen, setSeen] = useState<Record<string, SeenValue>>({});
  const [controlLoading, setControlLoading] = useState<ControlKind | null>(null);
  const [controlError, setControlError] = useState("");
  const [managementOpen, setManagementOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const listRequestRef = useRef(false);
  const messageRequestRef = useRef<{ conversationId: string; version: number } | null>(null);
  const messageRequestVersionRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const initialScrollRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<MediaType>("document");
  const attachRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragDepthRef = useRef(0);
  const lastListFiltersRef = useRef("");

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId],
  );
  const selectedLead = selected?.leads?.[0];
  const selectedCategory = parseLeadCategory(selectedLead?.category);
  const selectedServiceStatus = serviceStatusOf(selected?.status);
  const selectedLeadNotes = selectedLead?.notes || "";

  const quickCounts = useMemo(() => {
    const userId = sessionUser?.id;
    let unread = 0;
    let urgent = 0;
    let mine = 0;
    let unassigned = 0;

    for (const conversation of conversations) {
      const metadata = parseLeadCategory(conversation.leads?.[0]?.category);
      const isUnreadConversation = isConversationUnread(conversation, seen);
      if (isUnreadConversation) unread += 1;
      if (metadata.priority === "urgent") urgent += 1;
      if (userId && conversation.assigned_to === userId) mine += 1;
      if (!conversation.assigned_to) unassigned += 1;
    }

    return { all: conversations.length, unread, urgent, mine, unassigned };
  }, [conversations, seen, sessionUser?.id]);

  const clearAllFilters = useCallback(() => {
    setSearch("");
    setQuickFilter("all");
    setActiveInstance("");
    setAssignedFilter("all");
    setQueueFilter("all");
    setPriorityFilter("all");
    setServiceStatusFilter("all");
  }, []);

  const canFilterByAssigned = useMemo(
    () => Boolean(sessionUser && !["agent", "partner"].includes(sessionUser.role)),
    [sessionUser],
  );

  const conversationFilterSignature = useMemo(
    () => `${activeInstance}|${assignedFilter}|${queueFilter}|${priorityFilter}|${serviceStatusFilter}`,
    [activeInstance, assignedFilter, priorityFilter, queueFilter, serviceStatusFilter],
  );

  const activeQuickFilter = useMemo(() => QUICK_FILTERS.find((item) => item.value === quickFilter), [quickFilter]);
  const hasActiveFilters = useMemo(() => {
    const term = search.trim();
    const assigneeFilterLabel = assignedFilter !== "all" && team.length > 0
      ? team.find((member) => member.id === assignedFilter)?.name || "atendente"
      : null;
    return Boolean(
      term ||
        quickFilter !== "all" ||
        activeInstance ||
        queueFilter !== "all" ||
        priorityFilter !== "all" ||
        serviceStatusFilter !== "all" ||
        (canFilterByAssigned && Boolean(assigneeFilterLabel)),
    );
  }, [activeInstance, assignedFilter, canFilterByAssigned, priorityFilter, queueFilter, quickFilter, search, serviceStatusFilter, team]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    const term = search.trim();
    if (term) labels.push(`busca "${term}"`);
    if (quickFilter !== "all" && activeQuickFilter) labels.push(activeQuickFilter.label);
    if (activeInstance) {
      const instance = instances.find((item) => item.name === activeInstance);
      labels.push(`instância ${instance?.connectionName || activeInstance}`);
    }
    if (queueFilter !== "all") labels.push(`fila ${labelFor(QUEUE_OPTIONS, queueFilter as Queue)}`);
    if (priorityFilter !== "all") labels.push(`prioridade ${labelFor(PRIORITY_OPTIONS, priorityFilter as Priority)}`);
    if (serviceStatusFilter !== "all") labels.push(`status ${labelFor(SERVICE_STATUS_OPTIONS, serviceStatusFilter as ServiceStatus)}`);
    if (canFilterByAssigned && assignedFilter !== "all") {
      labels.push(`atendente ${team.find((member) => member.id === assignedFilter)?.name || "não atribuído"}`);
    }
    return labels;
  }, [activeInstance, canFilterByAssigned, assignedFilter, instances, priorityFilter, queueFilter, search, quickFilter, serviceStatusFilter, team, activeQuickFilter]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return conversations.filter((conversation) => {
      if (quickFilter === "unread" && !isConversationUnread(conversation, seen)) return false;
      if (quickFilter === "urgent" && parseLeadCategory(conversation.leads?.[0]?.category).priority !== "urgent") return false;
      if (quickFilter === "mine") {
        if (!sessionUser?.id) return false;
        if (conversation.assigned_to !== sessionUser.id) return false;
      }
      if (quickFilter === "unassigned" && conversation.assigned_to) return false;

      if (!term) return true;
      return (
        (conversation.contact_name ?? "").toLocaleLowerCase("pt-BR").includes(term) ||
        conversation.contact_number.includes(term)
      );
    });
  }, [conversations, quickFilter, search, seen, sessionUser?.id]);

  const selectedInstance = useMemo(() => {
    if (!selected) return null;
    const exact = selected.instance_name
      ? instances.find(
        (instance) =>
          instance.name === selected.instance_name || instance.connectionName === selected.instance_name,
      )
      : null;
    const live = liveOpenInstanceName
      ? instances.find((instance) => instance.name === liveOpenInstanceName)
      : null;
    if (exact?.status === "open") return exact;
    if (live) return { ...live, status: "open" };
    return exact ?? instances.find((instance) => instance.status === "open") ?? null;
  }, [instances, liveOpenInstanceName, selected]);

  const canTransfer = Boolean(
    sessionUser && ["manager", "admin", "superadmin"].includes(sessionUser.role),
  );

  const saveSeen = useCallback((conversationId: string, message?: Message) => {
    if (!message || message.direction === "outbound" || message.direction === "outgoing") return;
    setSeen((current) => {
      if (current[conversationId]?.id === message.id) return current;
      const next = {
        ...current,
        [conversationId]: { id: message.id, time: message.created_at },
      };
      try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Local unread state remains available for this tab when storage is unavailable.
      }
      return next;
    });
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    setShowNewMessages(false);
  }, []);

  const fetchConversations = useCallback(async () => {
    const shouldShowLoading = lastListFiltersRef.current !== conversationFilterSignature;
    if (listRequestRef.current || document.hidden) return;
    if (shouldShowLoading) setIsFilterLoading(true);
    listRequestRef.current = true;
    try {
      const params = new URLSearchParams();
      if (activeInstance && activeInstance !== "all") params.set("instance_name", activeInstance);
      if (assignedFilter !== "all") params.set("assigned_to", assignedFilter);
      if (queueFilter !== "all") params.set("queue", queueFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (serviceStatusFilter !== "all") params.set("service_status", serviceStatusFilter);
      const response = await fetch(`/api/conversations?${params.toString()}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível carregar as conversas."));
      const raw = Array.isArray(data) ? data : data.conversations;
      const next = (Array.isArray(raw) ? raw : []) as Conversation[];
      next.sort(
        (a, b) =>
          new Date(b.last_message_at || b.created_at).getTime() -
          new Date(a.last_message_at || a.created_at).getTime(),
      );
      setConversations(next);
      if (Array.isArray(data.instances)) setInstances(data.instances as unknown as Instance[]);
      setListError("");
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Não foi possível carregar as conversas.");
    } finally {
      if (shouldShowLoading) setIsFilterLoading(false);
      if (shouldShowLoading) lastListFiltersRef.current = conversationFilterSignature;
      setIsLoading(false);
      listRequestRef.current = false;
    }
  }, [activeInstance, assignedFilter, conversationFilterSignature, priorityFilter, queueFilter, serviceStatusFilter]);

  const fetchMessages = useCallback(async (conversationId: string, mode: MessageFetchMode = "delta") => {
    if (messageRequestRef.current?.conversationId === conversationId || (mode === "delta" && document.hidden)) return;

    let effectiveMode = mode;
    const params = new URLSearchParams({ id: conversationId });
    const serverMessages = messagesRef.current.filter((message) => !message.id.startsWith("client-"));
    if (mode === "delta") {
      const latest = serverMessages[serverMessages.length - 1];
      if (latest) {
        params.set("after", latest.created_at);
      }
      else effectiveMode = "initial";
    } else if (mode === "before") {
      const earliest = serverMessages[0];
      if (!earliest) {
        setHasMoreMessages(false);
        return;
      }
      params.set("before", earliest.created_at);
      params.set("before_id", earliest.id);
    }

    const requestVersion = ++messageRequestVersionRef.current;
    messageRequestRef.current = { conversationId, version: requestVersion };
    const shouldFollow = isNearBottom(scrollRef.current);
    const previousScrollHeight = scrollRef.current?.scrollHeight ?? 0;
    const previousScrollTop = scrollRef.current?.scrollTop ?? 0;
    const previousServerIds = new Set(
      serverMessages.map((message) => message.id),
    );
    if (effectiveMode === "before") setOlderMessagesLoading(true);
    try {
      const response = await fetch(`/api/conversations?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível carregar as mensagens."));
      if (selectedIdRef.current !== conversationId || messageRequestVersionRef.current !== requestVersion) return;
      const incoming = (Array.isArray(data.messages) ? data.messages : []) as Message[];
      const retained = effectiveMode === "initial"
        ? messagesRef.current.filter(
            (message) => message.clientStatus === "sending" || message.clientStatus === "failed",
          )
        : messagesRef.current;
      const byId = new Map(retained.map((message) => [message.id, message]));
      incoming.forEach((message) => byId.set(message.id, message));
      const next = sortMessages(Array.from(byId.values()));
      const hasNewServerMessage = incoming.some((message) => !previousServerIds.has(message.id));
      setMessages(next);
      messagesRef.current = next;
      setMessagesError("");
      if (effectiveMode === "initial" || effectiveMode === "before") {
        setHasMoreMessages(data.hasMore === true);
      }
      if (Array.isArray(data.team)) setTeam(data.team as unknown as TeamMember[]);

      const detail = data.conversation as Conversation | undefined;
      if (detail?.id) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === detail.id
              ? { ...conversation, ...detail, messages: conversation.messages }
              : conversation,
          ),
        );
      }

      requestAnimationFrame(() => {
        if (effectiveMode === "before") {
          const element = scrollRef.current;
          if (element) element.scrollTop = previousScrollTop + element.scrollHeight - previousScrollHeight;
        } else if (initialScrollRef.current !== conversationId) {
          initialScrollRef.current = conversationId;
          scrollToBottom("auto");
        } else if (shouldFollow) {
          scrollToBottom("smooth");
        } else if (hasNewServerMessage) {
          setShowNewMessages(true);
        }
      });
    } catch (error) {
      if (selectedIdRef.current === conversationId) {
        setMessagesError(error instanceof Error ? error.message : "Não foi possível carregar as mensagens.");
      }
    } finally {
      const isCurrentRequest = messageRequestVersionRef.current === requestVersion;
      if (isCurrentRequest && effectiveMode === "initial") setMessagesLoading(false);
      if (isCurrentRequest && effectiveMode === "before") setOlderMessagesLoading(false);
      if (messageRequestRef.current?.version === requestVersion) messageRequestRef.current = null;
    }
  }, [scrollToBottom]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!notesDirty) setNotesDraft(selectedLeadNotes);
  }, [notesDirty, selectedLeadNotes]);

  useEffect(() => {
    setManagementOpen(false);
    setControlError("");
  }, [selectedId]);

  useEffect(() => {
    if (!managementOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setManagementOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [managementOpen]);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) || "{}");
      if (typeof stored === "object" && stored !== null) setSeen(stored as Record<string, SeenValue>);
    } catch {
      setSeen({});
    }
  }, []);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(event.target as Node)) setShowAttachMenu(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(readJson)
      .then((data) => {
        if (data.authenticated && data.user) {
          setSessionUser(data.user as { id: string; role: string; name?: string | null });
        }
      })
      .catch(() => undefined);
    fetch("/api/team")
      .then(readJson)
      .then((data) => {
        if (Array.isArray(data.team)) setTeam(data.team as unknown as TeamMember[]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const refreshStatus = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/whatsapp/status", { cache: "no-store" });
        const data = await readJson(response);
        if (!active || !response.ok) return;
        setLiveOpenInstanceName(
          data.status === "open" && typeof data.instanceName === "string" ? data.instanceName : null,
        );
      } catch {
        // Keep the last known status during temporary network failures.
      }
    };
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 30_000);
    const onVisibilityChange = () => {
      if (!document.hidden) void refreshStatus();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    void fetchConversations();
    const interval = window.setInterval(() => void fetchConversations(), 5_000);
    const refresh = () => {
      if (!document.hidden) void fetchConversations();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      messagesRef.current = [];
      setHasMoreMessages(false);
      setOlderMessagesLoading(false);
      return;
    }
    initialScrollRef.current = null;
    setMessages([]);
    messagesRef.current = [];
    setHasMoreMessages(false);
    setOlderMessagesLoading(false);
    setMessagesLoading(true);
    setMessagesError("");
    void fetchMessages(selectedId, "initial");
    const interval = window.setInterval(() => void fetchMessages(selectedId), 1_500);
    const refresh = () => {
      if (!document.hidden) void fetchMessages(selectedId, "delta");
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [fetchMessages, selectedId]);

  useEffect(() => {
    if (!selectedId || !isNearBottom(scrollRef.current)) return;
    const incoming = [...messages]
      .reverse()
      .find((message) => message.direction !== "outbound" && message.direction !== "outgoing");
    saveSeen(selectedId, incoming);
  }, [messages, saveSeen, selectedId]);

  useEffect(() => () => {
    if (recorderTimerRef.current) clearInterval(recorderTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setNotesDraft(conversation.leads?.[0]?.notes || "");
    setNotesDirty(false);
    setComposerError("");
    saveSeen(conversation.id, latestMessage(conversation));
  };

  const updateOptimistic = (id: string, update: Partial<Message>) => {
    setMessages((current) => {
      const next = current.map((message) => (message.id === id ? { ...message, ...update } : message));
      messagesRef.current = next;
      return next;
    });
  };

  const submitMessage = async (
    payload: SendPayload,
    retryId?: string,
    targetConversation = selected,
    clearDraft = true,
  ) => {
    if (!targetConversation || (!payload.content.trim() && !payload.mediaUrl)) return false;
    const conversationId = targetConversation.id;
    const isCurrentConversation = () => selectedIdRef.current === conversationId;
    const tempId = retryId ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: Message = {
      id: tempId,
      direction: "outbound",
      content: payload.content.trim() || `[Mídia: ${payload.mediaType ?? "document"}]`,
      ai_generated: false,
      created_at: new Date().toISOString(),
      metadata: payload.mediaUrl
        ? JSON.stringify({ type: payload.mediaType ?? "document", url: payload.mediaUrl })
        : null,
      clientStatus: "sending",
      clientPayload: payload,
    };

    if (retryId && isCurrentConversation()) updateOptimistic(retryId, { clientStatus: "sending", error: undefined });
    else if (isCurrentConversation()) {
      setMessages((current) => {
        const next = [...current, optimistic];
        messagesRef.current = next;
        return next;
      });
      if (clearDraft) setDraft("");
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
    if (isCurrentConversation()) setComposerError("");

    try {
      const response = await fetch("/api/conversations/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: payload.content.trim(),
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
        }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível enviar a mensagem."));
      const serverMessage = data.message as Message | undefined;
      if (isCurrentConversation()) {
        setMessages((current) => {
          const next: Message[] = current.map((message) =>
            message.id === tempId
              ? serverMessage
                ? { ...serverMessage, clientStatus: "sent" as const }
                : { ...message, clientStatus: "sent" as const, error: undefined }
              : message,
          );
          messagesRef.current = next;
          return next;
        });
      }
      if (data.conversation) {
        const updated = data.conversation as Conversation;
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === updated.id ? { ...conversation, ...updated } : conversation,
          ),
        );
      }
      void fetchConversations();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar a mensagem.";
      if (isCurrentConversation()) {
        updateOptimistic(tempId, { clientStatus: "failed", error: message });
        if (payload.content) setDraft((current) => current.trim() ? current : payload.content);
        setComposerError(message);
      }
      return false;
    }
  };

  const uploadAndSend = async (
    file: File | Blob,
    mediaType: MediaType,
    filename?: string,
    caption = draft,
    targetConversation = selected,
  ) => {
    setUploading(true);
    setUploadName(filename || "arquivo");
    setComposerError("");
    const formData = new FormData();
    formData.append("file", file, filename);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await readJson(response);
      if (!response.ok || typeof data.url !== "string") {
        throw new Error(errorFrom(data, "O arquivo não pôde ser enviado."));
      }
      return await submitMessage(
        { content: caption, mediaUrl: data.url, mediaType },
        undefined,
        targetConversation,
        false,
      );
    } catch (error) {
      if (selectedIdRef.current === targetConversation?.id) {
        setComposerError(error instanceof Error ? error.message : "O arquivo não pôde ser enviado.");
      }
      return false;
    } finally {
      setUploading(false);
      setUploadName("");
    }
  };

  const uploadFiles = async (files: File[], fallback: MediaType = "document") => {
    const targetConversation = selected;
    if (!files.length || uploading || recording || !targetConversation) return;
    const caption = draft;
    let captionPending = caption;
    if (caption && selectedIdRef.current === targetConversation.id) setDraft("");
    for (const file of files) {
      const uploaded = await uploadAndSend(
        file,
        mediaTypeForFile(file, fallback),
        file.name,
        captionPending,
        targetConversation,
      );
      if (!uploaded) break;
      captionPending = "";
    }
    if (captionPending && selectedIdRef.current === targetConversation.id) {
      setDraft((current) => current.trim() ? current : captionPending);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    await uploadFiles(files, fileTypeRef.current);
    event.target.value = "";
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (!files.length) return;
    event.preventDefault();
    void uploadFiles(files);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const triggerFilePicker = (type: MediaType) => {
    fileTypeRef.current = type;
    setShowAttachMenu(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept =
      type === "image" ? "image/*" : type === "audio" ? "audio/*" : type === "video" ? "video/*" : "*/*";
    input.click();
  };

  const startRecording = async () => {
    setComposerError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Gravação de áudio não é suportada neste navegador.");
      }
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        if (recorderTimerRef.current) clearInterval(recorderTimerRef.current);
        recorderTimerRef.current = null;
        setRecordingTime(0);
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        if (blob.size < 100) {
          setComposerError("A gravação ficou vazia. Tente novamente.");
          return;
        }
        const extension = blobType.includes("ogg") ? "ogg" : blobType.includes("mp4") ? "m4a" : "webm";
        void uploadAndSend(blob, "audio", `audio-${Date.now()}.${extension}`);
      };
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      recorderTimerRef.current = setInterval(() => setRecordingTime((value) => value + 1), 1_000);
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      setComposerError(
        error instanceof Error ? error.message : "Não foi possível acessar o microfone. Verifique a permissão.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const patchConversation = async (kind: ControlKind, patch: Record<string, unknown>) => {
    if (!selected || controlLoading) return false;
    setControlLoading(kind);
    setMessagesError("");
    setControlError("");
    try {
      const response = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...patch }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível atualizar a conversa."));
      const updated = data.conversation as Conversation | undefined;
      if (!updated) throw new Error("A resposta não trouxe a conversa atualizada.");
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === updated.id
            ? { ...conversation, ...updated, messages: conversation.messages ?? updated.messages }
            : conversation,
        ),
      );
      if (kind === "notes") {
        setNotesDraft(updated.leads?.[0]?.notes || "");
        setNotesDirty(false);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a conversa.";
      setMessagesError(message);
      setControlError(message);
      return false;
    } finally {
      setControlLoading(null);
    }
  };

  const handleScroll = () => {
    const atBottom = isNearBottom(scrollRef.current);
    if (atBottom) {
      setShowNewMessages(false);
      if (selectedId) {
        const incoming = [...messages]
          .reverse()
          .find((message) => message.direction !== "outbound" && message.direction !== "outgoing");
        saveSeen(selectedId, incoming);
      }
    }
  };

  const formatRecordingTime = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  const appendQuickNote = (note: string) => {
    setNotesDraft((current) => {
      const content = current.trimEnd();
      return `${content}${content ? "\n" : ""}- ${note}: `;
    });
    setNotesDirty(true);
  };

  const renderContactPanel = (idPrefix: string, closeButton: boolean) => {
    if (!selected) return null;
    const titleId = `${idPrefix}-contact-title`;
    const notesId = `${idPrefix}-contact-notes`;
    const connectionName =
      selectedInstance?.connectionName || selectedInstance?.name || selected.instance_name || "Não informada";

    return (
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 dark:border-white/10">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-500">Atendimento humano</p>
            <h3 id={titleId} className="mt-0.5 text-sm font-black">Contexto do contato</h3>
          </div>
          {closeButton && (
            <button
              type="button"
              autoFocus
              onClick={() => setManagementOpen(false)}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/5"
              aria-label="Fechar contexto do contato"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm font-black text-white">
                {(selectedLead?.name || selected.contact_name || selected.contact_number).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{selectedLead?.name || selected.contact_name || "Contato sem nome"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Phone className="size-3" />+{selected.contact_number}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-[10px] dark:border-white/10">
              <div><span className="block font-bold text-slate-400">Status do lead</span><strong className="mt-0.5 block truncate text-slate-700 dark:text-slate-200">{selectedLead?.status || "Não informado"}</strong></div>
              <div><span className="block font-bold text-slate-400">Valor</span><strong className="mt-0.5 block truncate text-slate-700 dark:text-slate-200">{selectedLead?.value == null ? "Não informado" : selectedLead.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></div>
              <div><span className="block font-bold text-slate-400">Última atividade</span><strong className="mt-0.5 block text-slate-700 dark:text-slate-200">{timeAgo(selected.last_message_at || selected.created_at)}</strong></div>
              <div><span className="block font-bold text-slate-400">Conexão</span><strong className={`mt-0.5 block truncate ${selectedInstance?.status === "open" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{connectionName}</strong></div>
            </div>
          </div>

          <section className="mt-6" aria-labelledby={`${idPrefix}-service-title`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 id={`${idPrefix}-service-title`} className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Organização da fila</h4>
              {controlLoading === "metadata" && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500"><Loader2 className="size-3 animate-spin" />Atualizando</span>}
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-500">
                Fila
                <select
                  value={selectedCategory.queue}
                  disabled={Boolean(controlLoading)}
                  onChange={(event) => void patchConversation("metadata", { queue: event.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  {QUEUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[10px] font-bold text-slate-500">
                  Prioridade
                  <select
                    value={selectedCategory.priority}
                    disabled={Boolean(controlLoading)}
                    onChange={(event) => void patchConversation("metadata", { priority: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-[10px] font-bold text-slate-500">
                  Etapa
                  <select
                    value={selectedServiceStatus}
                    disabled={Boolean(controlLoading)}
                    onChange={(event) => void patchConversation("metadata", { service_status: event.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {SERVICE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </section>

          <section className="mt-6" aria-labelledby={`${idPrefix}-assignment-title`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 id={`${idPrefix}-assignment-title`} className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Responsável</h4>
              {controlLoading === "assignment" && <Loader2 className="size-3.5 animate-spin text-indigo-500" />}
            </div>
            {sessionUser?.role === "agent" ? (
              <button
                type="button"
                disabled={Boolean(controlLoading) || selected.assigned_to === sessionUser.id}
                onClick={() => void patchConversation("assignment", { assigned_to: sessionUser.id })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-default disabled:opacity-60 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
              >
                <UserCheck className="size-4" />
                {selected.assigned_to === sessionUser.id ? "Atendimento com você" : "Assumir atendimento"}
              </button>
            ) : canTransfer && sessionUser ? (
              <label className="block text-[10px] font-bold text-slate-500">
                Atendente atual
                <select
                  value={selected.assigned_to || ""}
                  disabled={Boolean(controlLoading)}
                  onChange={(event) => void patchConversation("assignment", { assigned_to: event.target.value || null })}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Liberar para fila</option>
                  {!team.some((member) => member.id === sessionUser.id) && <option value={sessionUser.id}>{sessionUser.name || "Minha conta"} (eu)</option>}
                  {team.map((member) => <option key={member.id} value={member.id}>{member.name || "Sem nome"}</option>)}
                  {selected.assigned_to && selected.assigned_to !== sessionUser.id && !team.some((member) => member.id === selected.assigned_to) && <option value={selected.assigned_to}>{selected.assignee?.name || "Responsável atual"}</option>}
                </select>
              </label>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold dark:border-white/10 dark:bg-slate-950">
                <UserCheck className="size-4 text-slate-400" />
                {selected.assignee?.name || "Não atribuído"}
              </div>
            )}
          </section>

          <section className="mt-6" aria-labelledby={`${idPrefix}-notes-title`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h4 id={`${idPrefix}-notes-title`} className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Contexto do cliente</h4>
              {controlLoading === "notes" && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-500"><Loader2 className="size-3 animate-spin" />Salvando</span>}
            </div>
            <label htmlFor={notesId} className="text-[10px] font-bold text-slate-500">Dores, contexto e objeções</label>
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Atalhos para notas">
              {QUICK_NOTES.map((note) => (
                <button
                  type="button"
                  key={note}
                  disabled={Boolean(controlLoading)}
                  onClick={() => appendQuickNote(note)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  + {note}
                </button>
              ))}
            </div>
            <textarea
              id={notesId}
              rows={6}
              value={notesDraft}
              disabled={controlLoading === "notes"}
              onChange={(event) => {
                setNotesDraft(event.target.value);
                setNotesDirty(true);
              }}
              placeholder="Registre necessidades, objeções e combinados importantes..."
              className="mt-2.5 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs leading-relaxed outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-slate-950"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-medium text-slate-400">Salvas somente ao confirmar</span>
              <button
                type="button"
                disabled={!notesDirty || Boolean(controlLoading)}
                onClick={() => void patchConversation("notes", { notes: notesDraft.trim() })}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black text-white transition hover:bg-indigo-600 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-indigo-400"
              >
                {controlLoading === "notes" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                Salvar notas
              </button>
            </div>
          </section>

          <div aria-live="polite" className="mt-4 min-h-5">
            {controlError && <p className="flex items-start gap-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400"><CircleAlert className="mt-0.5 size-3 shrink-0" />{controlError}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="-m-4 flex h-[calc(100dvh-64px-2rem)] overflow-hidden border-b border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-[#030712] dark:text-white md:-m-8 md:h-[calc(100dvh-4rem)]">
      <aside
        className={`${selectedId ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/90 md:w-[350px] md:min-w-[320px] xl:w-[390px]`}
      >
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200/80 px-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <MessageSquare className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black tracking-tight">Conversas</h1>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{filtered.length} na fila atual</p>
            </div>
          </div>
          {instances.length > 0 && (
            <select
              aria-label="Filtrar por instância"
              value={activeInstance}
              onChange={(event) => setActiveInstance(event.target.value)}
              className="max-w-32 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="">Todas</option>
              {instances.map((instance) => (
                <option key={instance.name} value={instance.name}>{instance.connectionName || instance.name}</option>
              ))}
            </select>
          )}
      </div>

        <div className="space-y-2.5 border-b border-slate-200/80 px-3 pb-3 pt-2 dark:border-white/10">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5" aria-label="Filtros rápidos">
            {QUICK_FILTERS.map((filter) => (
              <button
                type="button"
                key={filter.value}
                onClick={() => setQuickFilter(filter.value)}
                aria-pressed={quickFilter === filter.value}
                aria-label={`Filtrar por ${filter.label}. ${filter.description}`}
                className={`relative rounded-xl border px-2 py-2 text-left text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  quickFilter === filter.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-slate-950 dark:text-slate-300"
                }`}
                title={filter.description}
              >
                <span className="block">{filter.label}</span>
                <span className="mt-0.5 block text-[9px] font-normal text-slate-500 dark:text-slate-400">
                  {filter.value === "all"
                    ? quickCounts.all
                    : filter.value === "unread"
                      ? quickCounts.unread
                      : filter.value === "mine"
                        ? quickCounts.mine
                        : filter.value === "urgent"
                          ? quickCounts.urgent
                          : quickCounts.unassigned}
                </span>
              </button>
            ))}
          </div>

          <label className="relative block">
            <span className="sr-only">Buscar conversa</span>
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar nome ou número"
              className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-3 text-xs font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-slate-950"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Filtrar por fila"
              value={queueFilter}
              onChange={(event) => setQueueFilter(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="all">Todas as filas</option>
              {QUEUE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              aria-label="Filtrar por prioridade"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="min-w-0 rounded-xl border border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="all">Prioridades</option>
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select
              aria-label="Filtrar por etapa do atendimento"
              value={serviceStatusFilter}
              onChange={(event) => setServiceStatusFilter(event.target.value)}
              className="col-span-2 min-w-0 rounded-xl border border-slate-200 bg-slate-100 px-2 py-2 text-[10px] font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="all">Todas as etapas</option>
              {SERVICE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          {sessionUser?.role !== "agent" && sessionUser?.role !== "partner" && (
            <select
              aria-label="Filtrar por atendente"
              value={assignedFilter}
              onChange={(event) => setAssignedFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="all">Todos os atendimentos</option>
              <option value="unassigned">Fila geral</option>
              {team.map((member) => <option key={member.id} value={member.id}>{member.name || "Sem nome"}</option>)}
            </select>
          )}
        </div>

        {listError && (
          <div className="m-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{listError}</span>
            <button type="button" onClick={() => void fetchConversations()} aria-label="Tentar novamente"><RefreshCw className="size-4" /></button>
          </div>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {isLoading || isFilterLoading ? (
            <div className="space-y-2" aria-live="polite">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex w-full gap-3 rounded-2xl border border-transparent p-3">
                  <div className="size-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <MessageSquare className="mb-3 size-8 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-bold">Nenhuma conversa encontrada</p>
              {hasActiveFilters ? (
                <>
                  <p className="text-xs text-slate-500">
                    Nenhuma conversa encontrada para {activeFilterLabels.length ? activeFilterLabels.join(", ") : "os filtros aplicados"}.
                  </p>
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-white/20 dark:bg-slate-900 dark:text-slate-300"
                  >
                    Limpar filtros
                  </button>
                </>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Tente ajustar a busca ou os filtros.</p>
              )}
            </div>
          ) : filtered.map((conversation) => {
            const latest = latestMessage(conversation);
            const lastSeen = seen[conversation.id];
            const unread = Boolean(
              latest &&
              latest.direction !== "outbound" &&
              latest.direction !== "outgoing" &&
              latest.id !== lastSeen?.id &&
              (!lastSeen?.time || new Date(latest.created_at).getTime() > new Date(lastSeen.time).getTime()),
            );
            const active = selectedId === conversation.id;
            const name = conversation.contact_name || `+${conversation.contact_number}`;
            const category = parseLeadCategory(conversation.leads?.[0]?.category);
            const serviceStatus = serviceStatusOf(conversation.status);
            const priorityClass = category.priority === "urgent"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30"
              : category.priority === "high"
                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/30"
                : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";
            return (
              <button
                type="button"
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? "border-indigo-200 bg-indigo-50 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/15" : "border-transparent hover:bg-slate-100 dark:hover:bg-white/5"}`}
              >
                <div className="relative shrink-0">
                  {conversation.profile_picture ? (
                    <Image unoptimized src={conversation.profile_picture} alt="" width={44} height={44} className="size-11 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-white/10" />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-black text-white dark:from-indigo-950 dark:to-purple-900">{name.charAt(0).toUpperCase()}</div>
                  )}
                  {unread && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" aria-label="Nova mensagem" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-xs ${unread ? "font-black" : "font-bold"}`}>{name}</span>
                    <span className={`shrink-0 text-[10px] font-bold ${unread ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>{timeAgo(latest?.created_at || conversation.last_message_at || conversation.created_at)}</span>
                  </div>
                  <p className={`mt-1 truncate text-xs ${unread ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{messagePreview(latest)}</p>
                  <div className="mt-2 flex items-center gap-1.5 overflow-hidden text-[9px] font-black tracking-wide">
                    <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{labelFor(QUEUE_OPTIONS, category.queue)}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 ${serviceStatus === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : serviceStatus === "pending" ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>{labelFor(SERVICE_STATUS_OPTIONS, serviceStatus)}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 ${priorityClass}`}>{labelFor(PRIORITY_OPTIONS, category.priority)}</span>
                  </div>
                  <div className="mt-1.5 flex min-w-0 items-center gap-1 text-[9px] font-bold text-slate-400">
                    <UserCheck className="size-3 shrink-0" />
                    <span className="truncate">{conversation.assignee?.name || "Sem atendente"}</span>
                    <span className="ml-auto shrink-0">{conversation.ai_paused ? "Humano" : "IA ativa"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-slate-50/60 dark:bg-[#030712]`}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-5 flex size-20 items-center justify-center rounded-[28px] border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-500/10 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400"><MessageSquare className="size-9" /></div>
            <h2 className="text-xl font-black tracking-tight">Sua central de atendimento</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">Selecione uma conversa para acompanhar o histórico e responder ao contato.</p>
            {instances.length > 0 && (
              <div className="mt-7 flex flex-wrap justify-center gap-2">
                {instances.map((instance) => {
                  const online = instance.status === "open";
                  return <span key={instance.name} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold dark:border-white/10 dark:bg-slate-900">{online ? <Wifi className="size-3 text-emerald-500" /> : <WifiOff className="size-3 text-rose-500" />}{instance.connectionName || instance.name}: {online ? "conectado" : "desconectado"}</span>;
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            <header className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 shadow-sm dark:border-white/10 dark:bg-slate-900/90 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 md:hidden" aria-label="Voltar para conversas"><ArrowLeft className="size-5" /></button>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm font-black text-white">{(selected.contact_name || selected.contact_number).charAt(0).toUpperCase()}</div>
                <div className="min-w-0">
                   <h2 className="truncate text-sm font-black">{selected.contact_name || `+${selected.contact_number}`}</h2>
                   <p className={`flex items-center gap-1 truncate text-[10px] font-bold ${selectedInstance?.status === "open" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                     {selectedInstance?.status === "open" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                     <span className="truncate">{selectedInstance?.connectionName || selectedInstance?.name || selected.instance_name || "WhatsApp"}: {selectedInstance?.status === "open" ? "conectado" : "desconectado"}</span>
                   </p>
                 </div>
               </div>
               <div className="flex shrink-0 items-center gap-1.5">
                 {sessionUser?.role === "agent" ? (
                  <button
                    type="button"
                    disabled={Boolean(controlLoading)}
                    onClick={() => void patchConversation("assignment", { assigned_to: sessionUser.id })}
                    className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-bold transition hover:bg-slate-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 xl:inline-flex 2xl:hidden"
                  >
                    {controlLoading === "assignment" ? <Loader2 className="size-3.5 animate-spin" /> : <UserCheck className="size-3.5" />}
                    <span className="hidden sm:inline">{selected.assignee?.name?.split(" ")[0] || "Assumir"}</span>
                  </button>
                ) : canTransfer && sessionUser ? (
                  <label className="hidden max-w-44 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-bold dark:border-white/10 dark:bg-white/5 xl:flex 2xl:hidden">
                    <span className="sr-only">Atribuir conversa</span>
                    {controlLoading === "assignment" ? <Loader2 className="size-3.5 shrink-0 animate-spin" /> : <UserCheck className="size-3.5 shrink-0" />}
                    <select
                      value={selected.assigned_to || ""}
                      disabled={Boolean(controlLoading)}
                      onChange={(event) => void patchConversation("assignment", { assigned_to: event.target.value || null })}
                      className="min-w-0 flex-1 bg-transparent py-2 outline-none disabled:opacity-50"
                    >
                      <option value="">Liberar para fila</option>
                      {!team.some((member) => member.id === sessionUser.id) && (
                        <option value={sessionUser.id}>{sessionUser.name || "Minha conta"} (eu)</option>
                      )}
                      {team.map((member) => <option key={member.id} value={member.id}>{member.name || "Sem nome"}</option>)}
                      {selected.assigned_to &&
                        selected.assigned_to !== sessionUser.id &&
                        !team.some((member) => member.id === selected.assigned_to) && (
                          <option value={selected.assigned_to}>{selected.assignee?.name || "Responsável atual"}</option>
                        )}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => setManagementOpen(true)}
                  aria-expanded={managementOpen}
                  aria-controls="contact-management-drawer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 sm:text-xs 2xl:hidden"
                >
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">Contexto</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(controlLoading)}
                  onClick={() => void patchConversation("ai", { ai_paused: !selected.ai_paused })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-black transition disabled:opacity-50 sm:text-xs ${selected.ai_paused ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"}`}
                >
                  {controlLoading === "ai" ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
                  <span className="hidden sm:inline">{selected.ai_paused ? "Ativar IA" : "Pausar IA"}</span>
                </button>
              </div>
            </header>

            <div className="hidden min-h-10 shrink-0 items-center gap-5 overflow-x-auto border-b border-slate-200 bg-white/80 px-5 text-[10px] dark:border-white/10 dark:bg-slate-900/60 lg:flex 2xl:hidden">
              <span className="flex shrink-0 items-center gap-1.5 font-bold text-slate-500"><Phone className="size-3" /><strong className="text-slate-800 dark:text-slate-200">+{selected.contact_number}</strong></span>
              <span className="shrink-0 font-bold text-slate-500">Fila: <strong className="text-slate-800 dark:text-slate-200">{labelFor(QUEUE_OPTIONS, selectedCategory.queue)}</strong></span>
              <span className="shrink-0 font-bold text-slate-500">Etapa: <strong className="text-slate-800 dark:text-slate-200">{labelFor(SERVICE_STATUS_OPTIONS, selectedServiceStatus)}</strong></span>
              <span className={`shrink-0 rounded-full px-2 py-1 font-black ${selectedCategory.priority === "urgent" ? "bg-rose-600 text-white" : selectedCategory.priority === "high" ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300"}`}>{labelFor(PRIORITY_OPTIONS, selectedCategory.priority)}</span>
              <span className="shrink-0 font-bold text-slate-500">Atendente: <strong className="text-slate-800 dark:text-slate-200">{selected.assignee?.name || "não atribuído"}</strong></span>
              <span className="shrink-0 font-bold text-slate-500">Instância: <strong className="text-slate-800 dark:text-slate-200">{selectedInstance?.connectionName || selectedInstance?.name || selected.instance_name || "não informada"}</strong></span>
            </div>

            <div className="flex min-h-0 flex-1">
              <section
                className="relative flex min-w-0 flex-1 flex-col"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDraggingFile && (
                  <div className="pointer-events-none absolute inset-2 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed border-indigo-500 bg-indigo-50/95 text-sm font-black text-indigo-700 shadow-xl dark:bg-indigo-950/95 dark:text-indigo-300">
                    <span className="inline-flex items-center gap-2"><Paperclip className="size-5" />Solte para enviar</span>
                  </div>
                )}
                {messagesError && (
                  <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><CircleAlert className="size-4 shrink-0" /><span className="flex-1">{messagesError}</span><button type="button" onClick={() => void fetchMessages(selected.id, messages.length ? "delta" : "initial")} className="font-bold">Tentar novamente</button></div>
                )}
                <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-slate-100/50 px-3 py-5 dark:bg-slate-950/50 sm:px-7">
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="size-5 animate-spin" /> Carregando histórico</div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-slate-500"><MessageSquare className="mb-3 size-8 text-slate-300 dark:text-slate-700" /><p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma mensagem ainda</p><p className="mt-1 text-xs">Envie uma mensagem para iniciar o atendimento.</p></div>
                  ) : (
                      <div className="space-y-2">
                        {hasMoreMessages && (
                          <div className="flex justify-center pb-2">
                          <button
                            type="button"
                            disabled={olderMessagesLoading}
                            onClick={() => void fetchMessages(selected.id, "before")}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                          >
                            {olderMessagesLoading && <Loader2 className="size-3 animate-spin" />}
                            Carregar anteriores
                          </button>
                        </div>
                        )}
                        {messages.map((message, index) => {
                          const outgoing = message.direction === "outbound" || message.direction === "outgoing";
                          const previous = messages[index - 1];
                          const firstInGroup = !previous || previous.direction !== message.direction;
                          const showDateDivider = !previous || !isSameDay(message.created_at, previous.created_at);
                          const media = parseMetadata(message);
                          return (
                            <div key={message.id}>
                              {showDateDivider && (
                                <div className="my-3 flex items-center gap-3">
                                  <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
                                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                                    {formatDayDivider(message.created_at)}
                                  </span>
                                  <span className="h-px flex-1 bg-slate-300/70 dark:bg-white/10" />
                                </div>
                              )}
                              <div className={`flex ${outgoing ? "justify-end" : "justify-start"} ${firstInGroup ? "pt-3" : ""}`}>
                                <div className={`max-w-[88%] rounded-3xl px-3.5 py-3 text-sm font-medium leading-relaxed shadow-sm sm:max-w-[72%] ${
                                  outgoing
                                    ? "rounded-tr-md bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
                                    : "rounded-tl-md border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                                }`}>
                                  {media.url && media.type === "image" && <a href={media.url} target="_blank" rel="noreferrer"><Image unoptimized src={media.url} alt="Imagem anexada" width={560} height={420} className="mb-2 max-h-80 w-auto rounded-2xl object-contain" /></a>}
                                  {media.url && media.type === "audio" && <audio controls preload="metadata" src={media.url} className="mb-2 h-10 max-w-full" />}
                                  {media.url && media.type === "video" && <video controls preload="metadata" src={media.url} className="mb-2 max-h-80 max-w-full rounded-2xl" />}
                                  {media.url && media.type === "document" && <a href={media.url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-2xl bg-black/10 p-3 font-bold hover:bg-black/15"><FileText className="size-5 shrink-0" /><span className="truncate">Abrir documento</span></a>}
                                  {message.content && !message.content.startsWith("[Mídia") && message.content !== "[Arquivo Enviado]" && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                                  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${outgoing ? "text-white/75" : "text-slate-400"}`}>
                                    <span>{formatTime(message.created_at)}</span>
                                    {outgoing && message.clientStatus === "sending" && <><Loader2 className="size-3 animate-spin" /><span>enviando</span></>}
                                    {outgoing && message.clientStatus === "sent" && <><Check className="size-3" /><span>enviada</span></>}
                                    {outgoing && message.clientStatus === "failed" && <><CircleAlert className="size-3" /><span>falhou</span></>}
                                  </div>
                                  {message.clientStatus === "failed" && (
                                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/20 pt-2 text-[10px] font-black">
                                      <span className="mr-auto max-w-40 truncate text-white/80" title={message.error}>{message.error}</span>
                                      <button type="button" onClick={() => message.clientPayload && void submitMessage(message.clientPayload, message.id)} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 hover:bg-white/25"><RefreshCw className="size-3" />Reenviar</button>
                                      <button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 hover:bg-white/25"><X className="size-3" />Remover</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                {showNewMessages && (
                  <button type="button" onClick={() => scrollToBottom()} className="absolute bottom-40 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-slate-900"><ArrowDown className="size-4" />Novas mensagens</button>
                )}

                <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-slate-900 sm:px-4">
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                    {QUICK_REPLIES.map((reply) => <button type="button" key={reply} onClick={() => setDraft(reply)} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><Sparkles className="mr-1 inline size-3" />{reply}</button>)}
                  </div>
                  {uploading && <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400"><Loader2 className="size-3.5 shrink-0 animate-spin" /><span className="truncate">Enviando {uploadName}</span></div>}
                  {composerError && <div className="mb-2 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400"><CircleAlert className="size-3.5 shrink-0" />{composerError}</div>}
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                  <div className="flex items-end gap-2">
                    <div className="relative" ref={attachRef}>
                      <button type="button" disabled={uploading || recording} onClick={() => setShowAttachMenu((value) => !value)} aria-expanded={showAttachMenu} aria-label="Anexar arquivo" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-white/5">{uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}</button>
                      {showAttachMenu && (
                        <div className="absolute bottom-full left-0 z-30 mb-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                          {([{ type: "image", label: "Imagem", icon: ImageIcon }, { type: "video", label: "Vídeo", icon: Video }, { type: "audio", label: "Áudio", icon: Music }, { type: "document", label: "Documento", icon: FileText }] as const).map(({ type, label, icon: Icon }) => <button type="button" key={type} onClick={() => triggerFilePicker(type)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5"><Icon className="size-4 text-indigo-500" />{label}</button>)}
                        </div>
                      )}
                    </div>
                    {recording ? (
                      <div className="flex min-h-11 flex-1 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="size-2.5 animate-pulse rounded-full bg-rose-500" /><span className="font-mono text-xs font-bold">{formatRecordingTime(recordingTime)}</span><span className="flex-1 text-xs font-bold">Gravando áudio</span><button type="button" onClick={stopRecording} className="rounded-lg bg-rose-600 p-2 text-white" aria-label="Parar e enviar gravação"><Square className="size-4" /></button></div>
                    ) : (
                      <textarea
                        rows={1}
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void submitMessage({ content: draft });
                          }
                        }}
                        placeholder="Digite uma resposta..."
                        className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-slate-950"
                      />
                    )}
                    {!recording && !draft.trim() ? <button type="button" onClick={() => void startRecording()} disabled={uploading} className="rounded-xl p-2.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10" aria-label="Gravar áudio"><Mic className="size-5" /></button> : !recording && <button type="button" onClick={() => void submitMessage({ content: draft })} disabled={!draft.trim() || uploading} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-2.5 text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:opacity-50" aria-label="Enviar mensagem"><Send className="size-5" /></button>}
                  </div>
                  <p className="mt-1 pl-12 text-[9px] text-slate-400">Enter envia, Shift+Enter quebra a linha. Cole ou arraste arquivos.</p>
                </div>
              </section>

              <aside aria-labelledby="sidebar-contact-title" className="hidden w-80 shrink-0 border-l border-slate-200 dark:border-white/10 2xl:block">
                {renderContactPanel("sidebar", false)}
              </aside>
            </div>
          </>
        )}
      </main>
      {selected && managementOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] 2xl:hidden"
            onClick={() => setManagementOpen(false)}
            aria-label="Fechar contexto do contato"
          />
          <aside
            id="contact-management-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-contact-title"
            className="fixed inset-y-0 right-0 z-50 w-[min(92vw,360px)] border-l border-slate-200 shadow-2xl dark:border-white/10 2xl:hidden"
          >
            {renderContactPanel("drawer", true)}
          </aside>
        </>
      )}
    </div>
  );
}
