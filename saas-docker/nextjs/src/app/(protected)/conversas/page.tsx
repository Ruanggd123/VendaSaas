"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  BarChart3,
  Bot,
  Check,
  Clock3,
  CircleAlert,
  Copy,
  FileText,
  Download,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  MapPin,
  Megaphone,
  Mic,
  Music,
  Paperclip,
  Pencil,
  Phone,
  RefreshCw,
  Reply,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  AtSign,
  UserCheck,
  Video,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { MaskedPhone } from "@/components/MaskedPhone";
import { maskPhone } from "@/lib/phoneUtils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MediaType = "image" | "audio" | "video" | "document";
type MessageKind = MediaType | "text" | "poll" | "poll_vote" | "location" | "contact" | "reaction" | "unknown";
type ClientStatus = "sending" | "sent" | "failed";
type MessageFetchMode = "initial" | "delta" | "before";
type Queue = "geral" | "vendas" | "suporte" | "financeiro" | "pos_venda";
type Priority = "low" | "normal" | "high" | "urgent";
type ServiceStatus = "active" | "pending" | "resolved";
type ControlKind = "assignment" | "ai" | "metadata" | "notes";
type QuickFilter = "all" | "waiting" | "unread" | "mine" | "urgent" | "unassigned";
type ActiveFilterChip = { id: string; label: string; clear: () => void };

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

interface ResponseSlaState {
  label: string;
  minutes: number;
  limit: number;
  priority: Priority;
  urgent: boolean;
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
  fileName?: string;
  mimeType?: string;
  replyToMessageId?: string;
  mentioned?: string[];
}

interface SeenValue {
  id: string;
  time: string;
}

interface ParsedMetadata {
  kind?: MessageKind;
  type?: MediaType;
  url?: string;
  fileName?: string;
  mimeType?: string;
  mediaUnavailable?: boolean;
  rawType?: string;
  poll?: {
    title?: string;
    selectableCount?: number;
    options?: Array<{ id?: string; label?: string; selected?: boolean }>;
  };
  pollVote?: { id?: string; label?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  providerMessageId?: string;
  providerRemoteJid?: string;
  providerFromMe?: boolean;
  editedAt?: string;
  mentioned?: string[];
  quoted?: { messageId?: string; providerMessageId?: string; content?: string; direction?: string; participant?: string };
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
  { value: "active", label: "Atendimento em andamento" },
  { value: "pending", label: "Aguardando retorno" },
  { value: "resolved", label: "Concluído" },
];
const RESPONSE_LIMIT_BY_PRIORITY: Record<Priority, number> = {
  urgent: 10,
  high: 30,
  normal: 120,
  low: 240,
};
const QUICK_FILTERS: { value: QuickFilter; label: string; description: string }[] = [
  { value: "all", label: "Todas", description: "Todas as conversas" },
  { value: "waiting", label: "Humano", description: "Aguardando atendente humano" },
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

function minutesSince(iso?: string | null) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  const diff = Math.max(0, Date.now() - time);
  return Math.floor(diff / 60_000);
}

function responseLimitForPriority(priority: Priority) {
  return RESPONSE_LIMIT_BY_PRIORITY[priority];
}

function formatResponseDelay(minutes: number) {
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function responseSlaState(conversation: Conversation): ResponseSlaState | null {
  const latest = latestMessage(conversation);
  if (!latest || latest.direction === "outbound" || latest.direction === "outgoing") return null;
  const category = parseLeadCategory(conversation.leads?.[0]?.category);
  const minutes = minutesSince(latest.created_at);
  if (minutes === null) return null;
  const limit = responseLimitForPriority(category.priority);
  return {
    label: formatResponseDelay(minutes),
    minutes,
    limit,
    priority: category.priority,
    urgent: minutes > limit,
  };
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

function parseMetadata(message: Message): ParsedMetadata {
  if (!message.metadata) return {};
  try {
    const value: unknown = JSON.parse(message.metadata);
    if (typeof value !== "object" || value === null) return {};
    const record = value as Record<string, unknown>;
    const legacyType =
      record.type === "image" || record.type === "audio" || record.type === "video" || record.type === "document"
        ? record.type
        : undefined;
    const kind = typeof record.kind === "string" ? record.kind as MessageKind : legacyType;
    return {
      kind,
      type:
        legacyType || (kind === "image" || kind === "audio" || kind === "video" || kind === "document" ? kind : undefined),
      url: typeof record.url === "string" ? record.url : undefined,
      fileName: typeof record.fileName === "string" ? record.fileName : undefined,
      mimeType: typeof record.mimeType === "string" ? record.mimeType : undefined,
      mediaUnavailable: record.mediaUnavailable === true,
      rawType: typeof record.rawType === "string" ? record.rawType : undefined,
      poll: typeof record.poll === "object" && record.poll !== null ? record.poll as ParsedMetadata["poll"] : undefined,
      pollVote: typeof record.pollVote === "object" && record.pollVote !== null ? record.pollVote as ParsedMetadata["pollVote"] : undefined,
      location: typeof record.location === "object" && record.location !== null ? record.location as ParsedMetadata["location"] : undefined,
      providerMessageId: typeof record.providerMessageId === "string" ? record.providerMessageId : undefined,
      providerRemoteJid: typeof record.providerRemoteJid === "string" ? record.providerRemoteJid : undefined,
      providerFromMe: record.providerFromMe === true,
      editedAt: typeof record.editedAt === "string" ? record.editedAt : undefined,
      mentioned: Array.isArray(record.mentioned) ? record.mentioned.map(String) : undefined,
      quoted: typeof record.quoted === "object" && record.quoted !== null ? record.quoted as ParsedMetadata["quoted"] : undefined,
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
  if (media.kind === "poll") return `Enquete: ${media.poll?.title || "Escolha uma opção"}`;
  if (media.kind === "poll_vote") return `Selecionou: ${media.pollVote?.label || message.content}`;
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

function isNearTop(element: HTMLDivElement | null) {
  if (!element) return false;
  return element.scrollTop < 150;
}

function mediaTypeForFile(file: File, fallback: MediaType = "document"): MediaType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return fallback;
}

function sortMessages(messages: Message[]) {
  return [...messages].sort((a, b) => {
    const timeDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return timeDifference || a.id.localeCompare(b.id);
  });
}

function dedupeMediaEchoes(messages: Message[]) {
  return messages.reduce<Message[]>((result, message) => {
    const media = parseMetadata(message);
    const isOutgoing = message.direction === "outbound" || message.direction === "outgoing";
    const isSiteRecord = message.content === "[Mídia Enviada]" || message.content === "[Arquivo Enviado]";
    const isProviderEcho = /^\[Mídia:\s*(image|audio|video|document)]$/i.test(message.content);
    if (!isOutgoing || !media.type || (!isSiteRecord && !isProviderEcho)) {
      result.push(message);
      return result;
    }

    const duplicateIndex = result.findLastIndex((candidate) => {
      const candidateMedia = parseMetadata(candidate);
      const candidateIsSiteRecord = candidate.content === "[Mídia Enviada]" || candidate.content === "[Arquivo Enviado]";
      const candidateIsProviderEcho = /^\[Mídia:\s*(image|audio|video|document)]$/i.test(candidate.content);
      const elapsed = Math.abs(new Date(message.created_at).getTime() - new Date(candidate.created_at).getTime());
      return (candidate.direction === "outbound" || candidate.direction === "outgoing")
        && candidateMedia.type === media.type
        && elapsed <= 120_000
        && ((isSiteRecord && candidateIsProviderEcho) || (isProviderEcho && candidateIsSiteRecord));
    });

    if (duplicateIndex === -1) {
      result.push(message);
    } else if (isSiteRecord) {
      result[duplicateIndex] = message;
    }
    return result;
  }, []);
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [activeInstance, setActiveInstance] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "canvas">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string; role: string; name?: string | null } | null>(null);
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
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
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());
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
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

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
  const discardRecordingRef = useRef(false);
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
  const historySearchTerm = historySearch.trim().toLocaleLowerCase("pt-BR");
  const visibleMessages = useMemo(() => {
    const deduped = dedupeMediaEchoes(messages);
    if (!historySearchTerm) return deduped;
    return deduped.filter((message) => (message.content || "").toLocaleLowerCase("pt-BR").includes(historySearchTerm));
  }, [historySearchTerm, messages]);
  const hasHistoryFilter = historySearchTerm.length > 0;
  const selectedResponseSla = useMemo(
    () => (selected ? responseSlaState(selected) : null),
    [selected],
  );
  const selectedUnread = selected ? isConversationUnread(selected, seen) : false;

  const quickCounts = useMemo(() => {
    const userId = sessionUser?.id;
    let unread = 0;
    let urgent = 0;
    let mine = 0;
    let unassigned = 0;
    let waiting = 0;

    for (const conversation of conversations) {
      const metadata = parseLeadCategory(conversation.leads?.[0]?.category);
      const isUnreadConversation = isConversationUnread(conversation, seen);
      if (isUnreadConversation) unread += 1;
      if (metadata.priority === "urgent") urgent += 1;
      if (userId && conversation.assigned_to === userId) mine += 1;
      if (!conversation.assigned_to) unassigned += 1;
      if (conversation.ai_paused) waiting += 1;
    }

    return { all: conversations.length, unread, urgent, mine, unassigned, waiting };
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
  const activeFilterChips = useMemo((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = [];
    const term = search.trim();

    if (term) {
      chips.push({ id: "search", label: `Busca: ${term}`, clear: () => setSearch("") });
    }
    if (quickFilter !== "all" && activeQuickFilter) {
      chips.push({ id: `quick-${quickFilter}`, label: `Rápido: ${activeQuickFilter.label}`, clear: () => setQuickFilter("all") });
    }
    if (activeInstance) {
      const instance = instances.find((item) => item.name === activeInstance);
      chips.push({ id: "instance", label: `Instância: ${instance?.connectionName || activeInstance}`, clear: () => setActiveInstance("") });
    }
    if (queueFilter !== "all") {
      chips.push({ id: `queue-${queueFilter}`, label: `Fila: ${labelFor(QUEUE_OPTIONS, queueFilter as Queue)}`, clear: () => setQueueFilter("all") });
    }
    if (priorityFilter !== "all") {
      chips.push({ id: `priority-${priorityFilter}`, label: `Prioridade: ${labelFor(PRIORITY_OPTIONS, priorityFilter as Priority)}`, clear: () => setPriorityFilter("all") });
    }
    if (serviceStatusFilter !== "all") {
      chips.push({ id: `status-${serviceStatusFilter}`, label: `Etapa: ${labelFor(SERVICE_STATUS_OPTIONS, serviceStatusFilter as ServiceStatus)}`, clear: () => setServiceStatusFilter("all") });
    }
    if (canFilterByAssigned && assignedFilter !== "all") {
      chips.push({
        id: `assigned-${assignedFilter}`,
        label: `Atendente: ${team.find((member) => member.id === assignedFilter)?.name || "não atribuído"}`,
        clear: () => setAssignedFilter("all"),
      });
    }

    return chips;
  }, [activeInstance, canFilterByAssigned, assignedFilter, instances, priorityFilter, queueFilter, search, quickFilter, serviceStatusFilter, team, activeQuickFilter]);

  const hasActiveFilters = activeFilterChips.length > 0;
  const activeFilterLabels = useMemo(() => activeFilterChips.map((chip) => chip.label), [activeFilterChips]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return conversations.filter((conversation) => {
      if (quickFilter === "waiting" && !conversation.ai_paused) return false;
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

  const filteredConversationIds = useMemo(() => filtered.map((conversation) => conversation.id), [filtered]);

  const inboundConversationIds = useMemo(
    () =>
      filtered
        .filter((conversation) => {
          const latest = latestMessage(conversation);
          return latest?.direction === "inbound" || latest?.direction === "incoming";
        })
        .map((conversation) => conversation.id),
    [filtered],
  );

  const selectedBulkConversationIds = useMemo(
    () => filteredConversationIds.filter((id) => selectedConversationIds.has(id)),
    [filteredConversationIds, selectedConversationIds],
  );

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

  const canAssignToMe = Boolean(
    selected && sessionUser &&
    ((sessionUser.role === "agent" && (selected.assigned_to === null || selected.assigned_to === sessionUser.id)) ||
      canTransfer),
  );
  const canUnassign = Boolean(canTransfer);

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
    if (!bulkSelectionMode) return;
    const available = new Set(filteredConversationIds);
    setSelectedConversationIds((current) => {
      if (current.size === 0) return current;
      let changed = false;
      const next = new Set<string>();
      current.forEach((id) => {
        if (available.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [bulkSelectionMode, filteredConversationIds]);

  useEffect(() => {
    if (!selectedId) setHistorySearch("");
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
    setReplyingTo(null);
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
    setHistorySearch("");
    setNotesDirty(false);
    setComposerError("");
  };

  const toggleBulkSelection = (conversationId: string) => {
    setSelectedConversationIds((current) => {
      const next = new Set(current);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  };

  const selectAllVisibleConversations = () => {
    setSelectedConversationIds((current) => {
      const next = new Set(current);
      for (const id of filteredConversationIds) next.add(id);
      return next;
    });
  };

  const clearBulkSelection = () => {
    setSelectedConversationIds(new Set());
  };

  const isConversationSelected = (conversationId: string) => selectedConversationIds.has(conversationId);

  const updateOptimistic = (id: string, update: Partial<Message>) => {
    setMessages((current) => {
      const next = current.map((message) => (message.id === id ? { ...message, ...update } : message));
      messagesRef.current = next;
      return next;
    });
  };

  const deleteMessage = async (message: Message) => {
    if (message.id.startsWith("client-")) {
      setMessages((current) => {
        const next = current.filter((item) => item.id !== message.id);
        messagesRef.current = next;
        return next;
      });
      return;
    }

    const metadata = parseMetadata(message);
    const outgoing = message.direction === "outbound" || message.direction === "outgoing";
    let scope: "site" | "everyone" = "site";
    if (outgoing && metadata.providerMessageId) {
      if (window.confirm("Excluir esta mensagem também do WhatsApp para todos?\n\nOK: excluir para todos\nCancelar: escolher apenas o site")) {
        scope = "everyone";
      } else if (!window.confirm("Excluir somente do histórico deste site? Ela continuará no WhatsApp.")) {
        return;
      }
    } else if (!window.confirm("Excluir esta mensagem do histórico do site? Ela continuará visível no WhatsApp.")) return;
    setDeletingMessageIds((current) => new Set(current).add(message.id));
    setMessagesError("");
    try {
      const response = await fetch("/api/conversations/message", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, scope }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível excluir a mensagem."));
      const deletedIds = new Set(
        Array.isArray(data.deletedIds)
          ? data.deletedIds.filter((id): id is string => typeof id === "string")
          : [message.id],
      );
      setMessages((current) => {
        const next = current.filter((item) => !deletedIds.has(item.id));
        messagesRef.current = next;
        return next;
      });
      void fetchConversations();
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Não foi possível excluir a mensagem.");
    } finally {
      setDeletingMessageIds((current) => {
        const next = new Set(current);
        next.delete(message.id);
        return next;
      });
    }
  };

  const editMessage = async (message: Message) => {
    const content = window.prompt("Edite a mensagem enviada:", message.content)?.trim();
    if (!content || content === message.content) return;
    setEditingMessageId(message.id);
    setMessagesError("");
    try {
      const response = await fetch("/api/conversations/message", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, content }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(data, "Não foi possível editar a mensagem."));
      const updated = data.message as Message;
      setMessages((current) => {
        const next = current.map((item) => item.id === message.id ? updated : item);
        messagesRef.current = next;
        return next;
      });
    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : "Não foi possível editar a mensagem.");
    } finally {
      setEditingMessageId(null);
    }
  };

  const submitMessage = async (
    payload: SendPayload,
    retryId?: string,
    targetConversation = selected,
    clearDraft = true,
  ) => {
    if (!targetConversation || (!payload.content.trim() && !payload.mediaUrl)) return false;
    if (!payload.mediaUrl && replyingTo && !payload.replyToMessageId) {
      payload = { ...payload, replyToMessageId: replyingTo.id };
    }
    if (!payload.mentioned?.length) {
      const mentioned = Array.from(payload.content.matchAll(/@(\d{8,})/g), (match) => match[1]);
      if (mentioned.length > 0) payload = { ...payload, mentioned };
    }
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
        ? JSON.stringify({ schemaVersion: 1, kind: payload.mediaType ?? "document", type: payload.mediaType ?? "document", url: payload.mediaUrl, fileName: payload.fileName, mimeType: payload.mimeType })
        : payload.replyToMessageId
          ? JSON.stringify({ schemaVersion: 1, kind: "text", quoted: { messageId: payload.replyToMessageId, content: replyingTo?.content, direction: replyingTo?.direction } })
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
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          replyToMessageId: payload.replyToMessageId,
          mentioned: payload.mentioned,
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
      if (payload.replyToMessageId && isCurrentConversation()) setReplyingTo(null);
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

  const sendBulkMessages = async (mode: "selected" | "current" | "incoming") => {
    const ids =
      mode === "selected"
        ? selectedBulkConversationIds
        : mode === "incoming"
          ? inboundConversationIds
          : filteredConversationIds;

    if (!ids.length) {
      setBulkError("Nenhuma conversa elegível para este envio em massa.");
      return;
    }

    if (!draft.trim()) {
      setBulkError("Digite uma mensagem para envio em massa.");
      return;
    }

    if (bulkLoading) return;

    setBulkError("");
    setBulkFeedback("");

    try {
      const basePayload = {
        mode,
        conversationIds: ids,
        content: draft,
        confirm: false,
      };

      const previewResponse = await fetch("/api/conversations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });

      const preview = await readJson(previewResponse);
      const total = Number(preview.total || ids.length);

      if (!preview.ok && !preview.pending) {
        throw new Error(errorFrom(preview, "Não foi possível validar o envio em massa."));
      }

      const confirmed = window.confirm(`Confirma o envio para ${total} contato(s)?`);
      if (!confirmed) return;

      setBulkLoading(true);
      const response = await fetch("/api/conversations/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...basePayload, confirm: true }),
      });

      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(errorFrom(data, "Não foi possível enviar em massa."));
      }

      const result = data as {
        success?: number;
        failed?: number;
        total?: number;
        outcomes?: Array<{ conversationId: string; ok: boolean; error?: string }>;
      };

      setBulkFeedback(`Envio concluído. ${result.success || 0} de ${result.total || ids.length} mensagens enviadas.`);
      setDraft("");
      if (result.failed) {
        const failed = result.failed;
        setBulkFeedback((current) => `${current} Falhas: ${failed}.`);
      }

      if (mode === "selected") {
        clearBulkSelection();
      }

      void fetchConversations();
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Não foi possível enviar em massa.");
    } finally {
      setBulkLoading(false);
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
        {
          content: caption,
          mediaUrl: data.url,
          mediaType,
          fileName: typeof data.fileName === "string" ? data.fileName : filename,
          mimeType: typeof data.mimeType === "string" ? data.mimeType : file.type,
        },
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
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          audioChunksRef.current = [];
          return;
        }
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
      discardRecordingRef.current = false;
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

  const cancelRecording = () => {
    discardRecordingRef.current = true;
    stopRecording();
  };

  const patchConversation = async (kind: ControlKind, patch: Record<string, unknown>, targetId?: string) => {
    const convId = targetId || selected?.id;
    if (!convId || controlLoading) return false;
    setControlLoading(kind);
    setMessagesError("");
    setControlError("");
    try {
      const response = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId, ...patch }),
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
      if (kind === "notes" && selected?.id === updated.id) {
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
    const el = scrollRef.current;
    const atBottom = isNearBottom(el);
    if (atBottom) {
      setShowNewMessages(false);
      if (selectedId) {
        const incoming = [...messages]
          .reverse()
          .find((message) => message.direction !== "outbound" && message.direction !== "outgoing");
        saveSeen(selectedId, incoming);
      }
    }
    if (hasMoreMessages && !olderMessagesLoading && isNearTop(el) && selectedId) {
      setOlderMessagesLoading(true);
      fetchMessages(selectedId, "before").finally(() => setOlderMessagesLoading(false));
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
                {(selectedLead?.name || selected.contact_name || maskPhone(selected.contact_number)).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{selectedLead?.name || selected.contact_name || "Contato sem nome"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-slate-500"><Phone className="size-3" /><MaskedPhone phone={selected.contact_number} /></p>
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
    <div className="-m-4 flex flex-col h-[calc(100dvh-64px-2rem)] overflow-hidden border-b border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-[#030712] dark:text-white md:-m-8 md:h-[calc(100dvh-4rem)]">
      {/* HEADER PRINCIPAL */}
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white to-slate-50/50 px-4 dark:border-white/10 dark:from-slate-900 dark:to-slate-900/50 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <MessageSquare className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-black tracking-tight">Conversas</h1>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {filtered.length} na fila <span className="text-indigo-600 dark:text-indigo-400">• {quickCounts.unread} não lida{quickCounts.unread === 1 ? "" : "s"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${viewMode === 'canvas' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Canvas Kanban
            </button>
          </div>

          {instances.length > 0 && (
            <select
              aria-label="Filtrar por instância"
              value={activeInstance}
              onChange={(event) => setActiveInstance(event.target.value)}
              className="max-w-28 rounded-xl border border-slate-200 bg-slate-100 px-2 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-950"
            >
              <option value="">Todas</option>
              {instances.map((instance) => (
                <option key={instance.name} value={instance.name}>{instance.connectionName || instance.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {viewMode === 'canvas' ? (
        <div className="flex-1 overflow-x-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950/60 min-h-0">
          <div className="flex gap-6 min-w-max items-start h-full pb-4">
            {[
              {
                id: 'unassigned',
                title: '📥 Fila Geral (Disponíveis)',
                subtitle: 'Atendimentos livres para a equipe assumir',
                color: 'border-blue-500/40 bg-blue-500/5 text-blue-600 dark:text-blue-400',
                badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
                items: filtered.filter(c => !c.assigned_to && c.status !== 'resolved')
              },
              {
                id: 'mine',
                title: '👤 Meu Atendimento',
                subtitle: 'Conversas atribuídas a você',
                color: 'border-indigo-500/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400',
                badgeBg: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
                items: filtered.filter(c => c.assigned_to === sessionUser?.id && c.status !== 'resolved')
              },
              {
                id: 'team',
                title: '👥 Atendimento pela Equipe',
                subtitle: 'Conversas em andamento por colegas',
                color: 'border-purple-500/40 bg-purple-500/5 text-purple-600 dark:text-purple-400',
                badgeBg: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
                items: filtered.filter(c => c.assigned_to && c.assigned_to !== sessionUser?.id && c.status !== 'resolved')
              },
              {
                id: 'resolved',
                title: '✅ Concluídos / Resolvidos',
                subtitle: 'Atendimentos finalizados com sucesso',
                color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400',
                badgeBg: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
                items: filtered.filter(c => c.status === 'resolved')
              }
            ].map((column) => (
              <div key={column.id} className="w-80 flex-shrink-0 flex flex-col h-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
                <div className={`p-4 border-b border-slate-200 dark:border-white/10 ${column.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-black text-xs tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                      {column.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${column.badgeBg}`}>
                      {column.items.length}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 leading-tight">
                    {column.subtitle}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {column.items.length === 0 ? (
                    <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-zinc-500 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                      Nenhuma conversa nesta coluna
                    </div>
                  ) : (
                    column.items.map((conv) => {
                      const lastMsg = conv.messages?.[conv.messages.length - 1];
                      return (
                        <div key={conv.id} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/10 space-y-3 hover:border-indigo-500/50 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                {conv.contact_name || conv.contact_number}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                                {maskPhone(conv.contact_number)}
                              </p>
                            </div>
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 truncate max-w-[100px]">
                              {conv.assignee?.name || (conv.assigned_to ? "Equipe" : "Fila Geral")}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 bg-white dark:bg-zinc-900/90 p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 font-medium leading-relaxed">
                            {lastMsg?.content || "Sem mensagens recentes..."}
                          </p>

                          <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col gap-1.5">
                            {column.id === 'unassigned' && (
                              <button
                                onClick={() => void patchConversation("assignment", { assigned_to: sessionUser?.id }, conv.id)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300" /> Assumir Conversa
                              </button>
                            )}

                            {column.id === 'mine' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => void patchConversation("metadata", { service_status: "resolved" }, conv.id)}
                                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-lg shadow-sm active:scale-95"
                                >
                                  ✅ Concluir
                                </button>
                                <button
                                  onClick={() => void patchConversation("assignment", { assigned_to: null }, conv.id)}
                                  className="flex-1 py-1.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 font-bold text-[11px] rounded-lg active:scale-95"
                                >
                                  ↩️ Devolver
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setSelectedId(conv.id);
                                setViewMode("list");
                              }}
                              className="w-full py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all"
                            >
                              💬 Abrir Chat Detalhado
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`${selectedId ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col border-r border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/90 md:w-[350px] md:min-w-[320px] xl:w-[390px]`}
          >

        <div className="space-y-2.5 border-b border-slate-200/80 px-3 pb-3 pt-2 dark:border-white/10">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6" aria-label="Filtros rápidos">
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
                    : filter.value === "waiting"
                      ? quickCounts.waiting
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

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[9px] text-slate-600 dark:border-white/10 dark:bg-slate-950">
              <span className="font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Filtros:</span>
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600 dark:border-white/10 dark:bg-slate-900"
                >
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remover filtro ${chip.label}`}
                    onClick={() => chip.clear()}
                    className="rounded-full p-0.5 transition hover:bg-slate-100 dark:hover:bg-white/10"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                aria-label="Limpar todos os filtros"
                onClick={clearAllFilters}
                className="ml-auto rounded-full border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-400/40"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

          <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBulkSelectionMode((current) => {
                    const next = !current;
                    if (!next) clearBulkSelection();
                    return next;
                  });
                }}
                className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-400/40 dark:bg-slate-900 dark:text-indigo-300"
              >
                {bulkSelectionMode ? "Fechar seleção" : "Selecionar contatos"}
              </button>

              {bulkSelectionMode && (
                <>
                  <button
                    type="button"
                    onClick={() => selectAllVisibleConversations()}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900"
                  >
                    Selecionar todos ({filteredConversationIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={clearBulkSelection}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900"
                  >
                    Limpar seleção ({selectedBulkConversationIds.length})
                  </button>
                </>
              )}
            </div>

            {bulkSelectionMode && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={bulkLoading || selectedBulkConversationIds.length === 0}
                  onClick={() => void sendBulkMessages("selected")}
                  className="rounded-xl border border-indigo-200 bg-indigo-600 px-2.5 py-2 text-[10px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar para selecionados
                </button>
                <button
                  type="button"
                  disabled={bulkLoading || filteredConversationIds.length === 0}
                  onClick={() => void sendBulkMessages("current")}
                  className="rounded-xl border border-emerald-200 bg-emerald-600 px-2.5 py-2 text-[10px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar para lista atual
                </button>
                <button
                  type="button"
                  disabled={bulkLoading || inboundConversationIds.length === 0}
                  onClick={() => void sendBulkMessages("incoming")}
                  className="rounded-xl border border-sky-200 bg-sky-600 px-2.5 py-2 text-[10px] font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar para contatos que entraram
                </button>
                {bulkLoading && <Loader2 className="size-4 animate-spin text-indigo-700" />}
              </div>
            )}

            {bulkError ? <p className="text-[10px] font-bold text-rose-600 dark:text-rose-300">{bulkError}</p> : null}
            {bulkFeedback ? <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{bulkFeedback}</p> : null}
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
            const responseSla = responseSlaState(conversation);
            const unread = Boolean(
              latest &&
              latest.direction !== "outbound" &&
              latest.direction !== "outgoing" &&
              latest.id !== lastSeen?.id &&
              (!lastSeen?.time || new Date(latest.created_at).getTime() > new Date(lastSeen.time).getTime()),
            );
            const active = selectedId === conversation.id;
            const name = conversation.contact_name || maskPhone(conversation.contact_number);
            const category = parseLeadCategory(conversation.leads?.[0]?.category);
            const serviceStatus = serviceStatusOf(conversation.status);
            const priorityClass = category.priority === "urgent"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-500/30"
              : category.priority === "high"
                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/30"
                : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400";
            const isBulkSelected = isConversationSelected(conversation.id);

            return (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() => selectConversation(conversation)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectConversation(conversation);
                  }
                }}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active
                    ? "border-indigo-400 bg-gradient-to-r from-indigo-50 to-white shadow-md shadow-indigo-500/10 dark:border-indigo-400 dark:from-indigo-500/20 dark:to-slate-900"
                    : unread
                      ? "border-indigo-100 bg-indigo-50/50 shadow-sm hover:border-indigo-200 hover:shadow-md dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:hover:border-indigo-500/30"
                      : "border-transparent bg-white shadow-sm shadow-slate-200/50 hover:border-slate-200 hover:shadow-md dark:bg-slate-900/80 dark:hover:border-white/20 dark:hover:bg-slate-800/50"
                }`}
              >
                {bulkSelectionMode && (
                  <button
                    type="button"
                    aria-pressed={isBulkSelected}
                    aria-label={isBulkSelected ? `Desmarcar ${name}` : `Selecionar ${name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleBulkSelection(conversation.id);
                    }}
                    className={`relative flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black outline-none transition ${
                      isBulkSelected
                        ? "border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/20 dark:text-indigo-300"
                        : "border-slate-200 bg-white text-slate-400 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-500"
                    }`}
                  >
                    {isBulkSelected ? <Check className="size-4" /> : null}
                  </button>
                )}
                <div className="relative shrink-0">
                  {conversation.profile_picture ? (
                    <Image unoptimized src={conversation.profile_picture} alt="" width={44} height={44} className="size-11 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-white/10" />
                  ) : (
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 text-sm font-black text-white dark:from-indigo-950 dark:to-purple-900">{name.charAt(0).toUpperCase()}</div>
                  )}
                  {unread && <span className="absolute -right-2 -top-2 rounded-full border-2 border-white bg-indigo-600 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white shadow-lg shadow-indigo-500/40 dark:border-slate-900" aria-label="Nova mensagem">Nova</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-xs ${unread ? "font-extrabold text-slate-900 dark:text-white" : "font-bold text-slate-700 dark:text-slate-300"}`}>{name}</span>
                    <span className={`shrink-0 text-[10px] font-bold ${unread ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>{timeAgo(latest?.created_at || conversation.last_message_at || conversation.created_at)}</span>
                  </div>
                  <p className={`mt-1 truncate text-xs leading-relaxed ${unread ? "font-semibold text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>{messagePreview(latest)}</p>
                  <div className="mt-2 flex items-center gap-1.5 overflow-hidden text-[9px] font-black tracking-wide">
                    <span className="shrink-0 rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{labelFor(QUEUE_OPTIONS, category.queue)}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 ${serviceStatus === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : serviceStatus === "pending" ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>{labelFor(SERVICE_STATUS_OPTIONS, serviceStatus)}</span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 ${priorityClass}`}>{labelFor(PRIORITY_OPTIONS, category.priority)}</span>
                </div>
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1 text-[9px] font-bold text-slate-400">
                    <UserCheck className="size-3 shrink-0" />
                    <span className="truncate">{conversation.assignee?.name || "Sem atendente"}</span>
                    {responseSla ? (
                      <span
                        className={`truncate rounded-md px-1.5 py-0.5 ${
                          responseSla.urgent
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                        }`}
                        title={`Sem resposta há ${responseSla.label} (meta ${responseSla.limit} min)`}
                      >
                        {responseSla.urgent ? <Clock3 className="mr-1 inline size-3" /> : null}
                        Sem resposta: {responseSla.label}
                      </span>
                    ) : null}
                    {conversation.ai_paused ? (
                      <span className="ml-auto shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">Humano</span>
                    ) : (
                      <span className="ml-auto shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">IA ativa</span>
                    )}
                    {unread && conversation.ai_paused && (
                      <span className="ml-1 shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">Precisa de humano</span>
                    )}
                  </div>
                </div>
              </div>
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
            <header className="space-y-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900/90 sm:px-5">
              <div className="flex min-h-16 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 md:hidden" aria-label="Voltar para conversas"><ArrowLeft className="size-5" /></button>
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm font-black text-white">{(selected.contact_name || maskPhone(selected.contact_number)).charAt(0).toUpperCase()}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-black">{selected.contact_name || <MaskedPhone phone={selected.contact_number} />}</h2>
                      {selectedUnread && <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">Não lida</span>}
                    </div>
                    <p className={`flex items-center gap-1 truncate text-[10px] font-bold ${selectedInstance?.status === "open" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {selectedInstance?.status === "open" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                      <span className="truncate">{selectedInstance?.connectionName || selectedInstance?.name || selected.instance_name || "WhatsApp"}: {selectedInstance?.status === "open" ? "conectado" : "desconectado"}</span>
                    </p>
                    {selectedResponseSla ? (
                      <p className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${selectedResponseSla.urgent ? "text-rose-600 dark:text-rose-300" : "text-slate-500"}`}>
                        <Clock3 className="size-3" />
                        Sem resposta há {selectedResponseSla.label}
                        <span className="hidden font-medium text-slate-400 sm:inline">(meta {selectedResponseSla.limit} min)</span>
                      </p>
                    ) : null}
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
              </div>

              <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => void patchConversation("metadata", { service_status: "active" })}
                  disabled={controlLoading === "metadata" || selectedServiceStatus === "active"}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                >
                  {controlLoading === "metadata" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Atendimento em andamento
                </button>
                <button
                  type="button"
                  onClick={() => void patchConversation("metadata", { service_status: "pending" })}
                  disabled={controlLoading === "metadata" || selectedServiceStatus === "pending"}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-black text-sky-700 transition hover:bg-sky-50 disabled:opacity-50 dark:border-sky-500/30 dark:bg-slate-900 dark:text-sky-300 dark:hover:bg-sky-500/10"
                >
                  {controlLoading === "metadata" ? <Loader2 className="size-3 animate-spin" /> : <Clock3 className="size-3" />}
                  Aguardando retorno
                </button>
                <button
                  type="button"
                  onClick={() => void patchConversation("metadata", { service_status: "resolved", ai_paused: false })}
                  disabled={controlLoading === "metadata" || (selectedServiceStatus === "resolved" && !selected.ai_paused)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-2.5 py-1 text-[10px] font-black text-purple-700 transition hover:bg-purple-50 disabled:opacity-50 dark:border-purple-500/30 dark:bg-slate-900 dark:text-purple-300 dark:hover:bg-purple-500/10"
                >
                  {controlLoading === "metadata" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Concluído + IA
                </button>
                {sessionUser && canAssignToMe && selected?.assigned_to !== sessionUser.id ? (
                  <button
                    type="button"
                    onClick={() => void patchConversation("assignment", { assigned_to: sessionUser.id })}
                    disabled={Boolean(controlLoading)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[10px] font-black text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    {controlLoading === "assignment" ? <Loader2 className="size-3 animate-spin" /> : <UserCheck className="size-3" />}
                    Assumir
                  </button>
                ) : null}
                {canUnassign ? (
                  <button
                    type="button"
                    onClick={() => void patchConversation("assignment", { assigned_to: null })}
                    disabled={Boolean(controlLoading) || !selected?.assigned_to}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    {controlLoading === "assignment" ? <Loader2 className="size-3 animate-spin" /> : <UserCheck className="size-3" />}
                    Liberar para fila
                  </button>
                ) : null}
              </div>
            </header>

            <div className="hidden min-h-10 shrink-0 items-center gap-5 overflow-x-auto border-b border-slate-200 bg-white/80 px-5 text-[10px] dark:border-white/10 dark:bg-slate-900/60 lg:flex 2xl:hidden">
              <span className="flex shrink-0 items-center gap-1.5 font-bold text-slate-500"><Phone className="size-3" /><strong className="text-slate-800 dark:text-slate-200"><MaskedPhone phone={selected.contact_number} /></strong></span>
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
                 <div className="shrink-0 px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                   <label className="relative inline-flex w-full max-w-[420px] items-center">
                     <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                     <input
                       value={historySearch}
                       onChange={(event) => setHistorySearch(event.target.value)}
                       placeholder="Buscar no histórico"
                       className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 pl-9 text-[10px] font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-slate-950"
                     />
                     {hasHistoryFilter ? (
                       <button
                         type="button"
                         onClick={() => setHistorySearch("")}
                         aria-label="Limpar busca no histórico"
                         className="absolute right-2 rounded-full p-1 text-slate-500 transition hover:bg-slate-200/70 dark:hover:bg-white/5"
                       >
                         <X className="size-3.5" />
                       </button>
                     ) : null}
                   </label>
                   {hasHistoryFilter ? (
                      <p className="mt-1 text-[9px] font-bold text-slate-400">
                        {visibleMessages.length} de {messages.length} mensagem{messages.length === 1 ? "" : "s"} correspondem.
                      </p>
                   ) : null}
                 </div>
                 <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_34%)] bg-slate-100/60 px-3 py-5 dark:bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_34%)] dark:bg-slate-950/70 sm:px-7">
                   {messagesLoading && visibleMessages.length === 0 ? (
                     <div className="flex h-full items-center justify-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="size-5 animate-spin" /> Carregando histórico</div>
                   ) : visibleMessages.length === 0 ? (
                     <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                       <MessageSquare className="mb-3 size-8 text-slate-300 dark:text-slate-700" />
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                         {hasHistoryFilter ? "Nenhuma mensagem encontrada" : "Nenhuma mensagem ainda"}
                       </p>
                       <p className="mt-1 text-xs">
                         {hasHistoryFilter ? "Ajuste a busca do histórico ou carregue mensagens anteriores." : "Envie uma mensagem para iniciar o atendimento."}
                       </p>
                     </div>
                   ) : (
                         <div className="space-y-2">
                        {hasMoreMessages && (
                          <div className="flex justify-center pb-2">
                            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {olderMessagesLoading ? (
                                <><Loader2 className="size-3 animate-spin" /> Carregando...</>
                              ) : (
                                "Role para cima para carregar mais"
                              )}
                            </div>
                          </div>
                        )}
                         {visibleMessages.map((message, index) => {
                           const outgoing = message.direction === "outbound" || message.direction === "outgoing";
                           const previous = visibleMessages[index - 1];
                           const firstInGroup = !previous || previous.direction !== message.direction;
                          const showDateDivider = !previous || !isSameDay(message.created_at, previous.created_at);
                          const media = parseMetadata(message);
                          return (
                            <div key={message.id} id={`message-${message.id}`}>
                              {showDateDivider && (
                                <div className="my-4 flex items-center gap-3">
                                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10" />
                                  <span className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[10px] font-black tracking-wide text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-400">
                                    {formatDayDivider(message.created_at)}
                                  </span>
                                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/10" />
                                </div>
                              )}
                              <div className={`flex ${outgoing ? "justify-end" : "justify-start"} ${firstInGroup ? "pt-3" : "pt-0.5"}`}>
                                 <div className={`group/message relative max-w-[88%] rounded-3xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm sm:max-w-[72%] ${
                                  outgoing
                                    ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/20"
                                    : "rounded-bl-md border border-slate-200/80 bg-white text-slate-900 shadow-slate-200/50 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:shadow-slate-900/50"
                                 }`}>
                                    <div className={`absolute top-1 z-10 flex items-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-500 opacity-70 shadow-md transition sm:opacity-0 sm:group-hover/message:opacity-100 dark:border-white/10 dark:bg-slate-800 ${outgoing ? "-left-28" : "-right-24"}`}>
                                      {media.providerMessageId && (
                                        <button type="button" onClick={() => setReplyingTo(message)} title="Responder citando" className="p-1.5 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"><Reply className="size-3.5" /></button>
                                      )}
                                      <button type="button" onClick={() => void navigator.clipboard.writeText(message.content)} title="Copiar mensagem" className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5"><Copy className="size-3.5" /></button>
                                      {outgoing && media.providerMessageId && !media.url && (
                                        <button type="button" onClick={() => void editMessage(message)} disabled={editingMessageId === message.id} title="Editar no WhatsApp" className="p-1.5 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-wait dark:hover:bg-amber-500/10">{editingMessageId === message.id ? <Loader2 className="size-3.5 animate-spin" /> : <Pencil className="size-3.5" />}</button>
                                      )}
                                      <button type="button" onClick={() => void deleteMessage(message)} disabled={deletingMessageIds.has(message.id)} title="Excluir mensagem" className="p-1.5 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait dark:hover:bg-rose-500/10">{deletingMessageIds.has(message.id) ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button>
                                    </div>
                                   {media.quoted?.content && (
                                     <button type="button" onClick={() => media.quoted?.messageId && document.getElementById(`message-${media.quoted.messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className={`mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left text-[11px] ${outgoing ? "border-white/60 bg-white/10 text-white/85" : "border-indigo-500 bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300"}`}>
                                       <span className="mb-0.5 block text-[9px] font-black uppercase tracking-wide opacity-70">Mensagem respondida</span>
                                       <span className="line-clamp-2">{media.quoted.content}</span>
                                     </button>
                                   )}
                                  {media.url && media.type === "image" && <a href={media.url} target="_blank" rel="noreferrer"><Image unoptimized src={media.url} alt="Imagem anexada" width={560} height={420} className="mb-2 max-h-80 w-auto rounded-2xl object-contain" /></a>}
                                   {media.url && media.type === "audio" && <audio controls preload="metadata" src={media.url} className="mb-2 h-10 max-w-full" />}
                                   {media.url && media.type === "video" && <video controls preload="metadata" src={media.url} className="mb-2 max-h-80 max-w-full rounded-2xl" />}
                                   {media.url && media.type === "document" && <a href={media.url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-3 rounded-2xl bg-black/10 p-3 font-bold hover:bg-black/15"><span className="flex size-9 items-center justify-center rounded-xl bg-white/15"><FileText className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate">{media.fileName || "Documento"}</span><span className="block truncate text-[10px] font-medium opacity-70">{media.mimeType || "Clique para abrir"}</span></span><Download className="size-4 shrink-0" /></a>}
                                   {media.mediaUnavailable && (
                                     <div className="mb-2 flex items-start gap-2 rounded-2xl border border-amber-300/40 bg-amber-100/20 p-3 text-xs">
                                       <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                       <span><strong>Mídia indisponível.</strong><br />O WhatsApp informou um arquivo, mas não permitiu recuperá-lo. Peça ao contato para reenviar.</span>
                                     </div>
                                   )}
                                   {media.kind === "poll" && media.poll && (
                                     <div className="mb-2 min-w-[240px] overflow-hidden rounded-2xl border border-current/15 bg-black/5 dark:bg-white/5">
                                       <div className="flex items-center gap-2 border-b border-current/10 px-3 py-2.5">
                                         <BarChart3 className="size-4 shrink-0" />
                                         <span className="font-black">{media.poll.title || "Enquete"}</span>
                                       </div>
                                       <div className="space-y-1.5 p-2">
                                         {(media.poll.options || []).map((option, optionIndex) => (
                                           <div key={`${option.id || optionIndex}`} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${option.selected ? "bg-emerald-500/20" : "bg-white/40 dark:bg-black/10"}`}>
                                             <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-current/30">{option.selected ? <Check className="size-3" /> : null}</span>
                                             <span>{option.label || `Opção ${optionIndex + 1}`}</span>
                                           </div>
                                         ))}
                                       </div>
                                       <p className="px-3 pb-2 text-[10px] opacity-65">Enquete de escolha única enviada no WhatsApp</p>
                                     </div>
                                   )}
                                   {media.kind === "poll_vote" && (
                                     <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold">
                                       <Check className="size-4 text-emerald-500" />Selecionou: {media.pollVote?.label || message.content}
                                     </div>
                                   )}
                                   {media.kind === "location" && media.location && (
                                     <a
                                       href={`https://www.google.com/maps?q=${media.location.latitude},${media.location.longitude}`}
                                       target="_blank"
                                       rel="noreferrer"
                                       className="mb-2 flex items-center gap-3 rounded-2xl border border-current/15 bg-black/5 p-3 font-bold dark:bg-white/5"
                                     >
                                       <MapPin className="size-5 shrink-0 text-rose-500" />
                                       <span className="min-w-0"><span className="block truncate">{media.location.name || "Localização compartilhada"}</span><span className="block truncate text-[10px] font-medium opacity-70">Abrir no mapa</span></span>
                                     </a>
                                   )}
                                   {message.content && media.kind !== "poll_vote" && media.kind !== "location" && !message.content.startsWith("[Mídia") && message.content !== "[Arquivo Enviado]" && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                                   <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${outgoing ? "text-white/75" : "text-slate-400"}`}>
                                     {media.editedAt && <span>editada •</span>}
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
                   {replyingTo && (
                     <div className="mb-2 flex items-center gap-3 rounded-xl border-l-4 border-indigo-500 bg-indigo-50 px-3 py-2 text-xs dark:bg-indigo-500/10">
                       <Reply className="size-4 shrink-0 text-indigo-600" />
                       <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wide text-indigo-600">Respondendo à mensagem</p><p className="truncate text-slate-600 dark:text-slate-300">{replyingTo.content}</p></div>
                       <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20" aria-label="Cancelar resposta"><X className="size-4" /></button>
                     </div>
                   )}
                  <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
                    {QUICK_REPLIES.map((reply) => <button type="button" key={reply} onClick={() => setDraft(reply)} className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><Sparkles className="mr-1 inline size-3" />{reply}</button>)}
                  </div>
                  {uploading && <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400"><Loader2 className="size-3.5 shrink-0 animate-spin" /><span className="truncate">Enviando {uploadName}</span></div>}
                  {composerError && <div className="mb-2 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-400"><CircleAlert className="size-3.5 shrink-0" />{composerError}</div>}
                  {bulkSelectionMode && (
                    <div className="mb-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-2.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                      <div className="mb-2 flex items-center gap-2">
                        <Megaphone className="size-4 text-indigo-600 dark:text-indigo-300" />
                        <div className="min-w-0 flex-1"><p className="text-[10px] font-black text-indigo-800 dark:text-indigo-200">Disparo em massa</p><p className="truncate text-[9px] text-indigo-600 dark:text-indigo-300">Será enviado o texto digitado abaixo.</p></div>
                        <button type="button" onClick={() => { setBulkSelectionMode(false); clearBulkSelection(); }} className="rounded-lg p-1 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20" aria-label="Fechar disparo em massa"><X className="size-4" /></button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[9px] font-black text-indigo-700 dark:border-indigo-400/30 dark:bg-slate-900 dark:text-indigo-300">Escolher contatos ({selectedBulkConversationIds.length})</button>
                        <button type="button" disabled={bulkLoading || selectedBulkConversationIds.length === 0 || !draft.trim()} onClick={() => void sendBulkMessages("selected")} className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[9px] font-black text-white disabled:opacity-40">Enviar selecionados</button>
                        <button type="button" disabled={bulkLoading || filteredConversationIds.length === 0 || !draft.trim()} onClick={() => void sendBulkMessages("current")} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[9px] font-black text-white disabled:opacity-40">Lista atual ({filteredConversationIds.length})</button>
                        <button type="button" disabled={bulkLoading || inboundConversationIds.length === 0 || !draft.trim()} onClick={() => void sendBulkMessages("incoming")} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[9px] font-black text-white disabled:opacity-40">Contatos que entraram ({inboundConversationIds.length})</button>
                        {bulkLoading && <Loader2 className="size-4 animate-spin text-indigo-600" />}
                      </div>
                      {bulkError ? <p className="mt-2 text-[9px] font-bold text-rose-600 dark:text-rose-300">{bulkError}</p> : null}
                      {bulkFeedback ? <p className="mt-2 text-[9px] font-bold text-indigo-700 dark:text-indigo-200">{bulkFeedback}</p> : null}
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                  <div className="flex items-end gap-2">
                     <div className="relative" ref={attachRef}>
                       <button type="button" disabled={uploading || recording} onClick={() => setShowAttachMenu((value) => !value)} aria-expanded={showAttachMenu} aria-label="Anexar arquivo" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-indigo-500/10">{uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}<span className="hidden text-[10px] font-black sm:inline">Anexar</span></button>
                      {showAttachMenu && (
                        <div className="absolute bottom-full left-0 z-30 mb-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                           {([{ type: "image", label: "Imagem", icon: ImageIcon }, { type: "video", label: "Vídeo", icon: Video }, { type: "audio", label: "Áudio", icon: Music }, { type: "document", label: "Documento", icon: FileText }] as const).map(({ type, label, icon: Icon }) => <button type="button" key={type} onClick={() => triggerFilePicker(type)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5"><Icon className="size-4 text-indigo-500" />{label}</button>)}
                         </div>
                       )}
                     </div>
                     {!recording && selected && (
                        <button type="button" onClick={() => setDraft((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@${selected.contact_number.replace(/\D/g, "")} `)} title="Mencionar contato" className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-indigo-500/10"><AtSign className="size-5" /></button>
                      )}
                      {!recording && (
                        <button type="button" onClick={() => { setBulkSelectionMode((current) => { if (current) clearBulkSelection(); return !current; }); setBulkError(""); setBulkFeedback(""); }} title="Disparo em massa" aria-pressed={bulkSelectionMode} className={`rounded-xl border p-2.5 transition ${bulkSelectionMode ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-white/10 dark:bg-white/5 dark:hover:bg-indigo-500/10"}`}><Megaphone className="size-5" /></button>
                      )}
                     {recording ? (
                       <div className="flex min-h-11 flex-1 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="size-2.5 animate-pulse rounded-full bg-rose-500" /><span className="font-mono text-xs font-bold">{formatRecordingTime(recordingTime)}</span><span className="flex-1 text-xs font-bold">Gravando áudio</span><button type="button" onClick={cancelRecording} className="rounded-lg p-2 hover:bg-rose-100 dark:hover:bg-rose-500/10" aria-label="Cancelar gravação"><X className="size-4" /></button><button type="button" onClick={stopRecording} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white" aria-label="Parar e enviar gravação"><Square className="size-3.5" />Enviar</button></div>
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
                   <p className="mt-1 pl-12 text-[9px] text-slate-400">Enter envia • Shift+Enter quebra a linha • Cole ou arraste imagens e arquivos • Limite 16 MB</p>
                </div>
              </section>

              <aside aria-labelledby="sidebar-contact-title" className="hidden w-80 shrink-0 border-l border-slate-200 dark:border-white/10 2xl:block">
                {renderContactPanel("sidebar", false)}
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )}
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
