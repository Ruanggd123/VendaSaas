"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare,
  Search,
  User,
  Phone,
  Clock,
  Send,
  Paperclip,
  Mic,
  Square,
  Image as ImageIcon,
  FileText,
  Music,
  CheckCheck,
  Zap,
  UserCheck,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  Circle,
  MoreVertical,
  Volume2,
} from "lucide-react";

interface Conversation {
  id: string;
  contact_number: string;
  contact_name?: string;
  profile_picture?: string;
  status: string;
  last_message_at?: string;
  created_at: string;
  ai_paused: boolean;
  assigned_to?: string;
  assignee?: { id: string; name: string };
  messages?: Message[];
  leads?: Lead[];
  _count?: { messages: number };
}

interface Message {
  id: string;
  direction: string;
  content: string;
  ai_generated: boolean;
  metadata?: string;
  created_at: string;
}

interface Lead {
  id: string;
  name?: string;
  status?: string;
  value?: number;
}

interface Instance {
  name: string;
  connectionName: string;
  status: string;
}

interface TeamMember {
  id: string;
  name: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function ConversasPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [activeInstance, setActiveInstance] = useState<string>("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string; role: string; name: string } | null>(null);
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<string>("");
  const attachRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recorderTimerRef = useRef<any>(null);

  // Fecha menu de anexo ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchConversations = useCallback(async (instanceName?: string, assignedTo?: string) => {
    try {
      let url = `/api/conversations?`;
      if (instanceName && instanceName !== "all") url += `instance_name=${encodeURIComponent(instanceName)}&`;
      if (assignedTo && assignedTo !== "all") url += `assigned_to=${encodeURIComponent(assignedTo)}&`;

      const res = await fetch(url);
      const data = await res.json();
      const convsArray = Array.isArray(data) ? data : data.conversations || [];
      const sorted = convsArray.sort((a: any, b: any) => {
        const timeA = new Date(a.last_message_at || a.created_at).getTime();
        const timeB = new Date(b.last_message_at || b.created_at).getTime();
        return timeB - timeA;
      });
      setConversations(sorted);
      if (data.instances && Array.isArray(data.instances)) {
        setInstances(data.instances);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) setSessionUser(d.user);
      });
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        if (d.team) setTeam(d.team);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchConversations(activeInstance, assignedFilter);
    const interval = setInterval(() => {
      fetchConversations(activeInstance, assignedFilter);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations, activeInstance, assignedFilter]);

  useEffect(() => {
    if (!selected) return;
    const loadMsgs = () => {
      fetch(`/api/conversations?id=${selected.id}`)
        .then((r) => r.json())
        .then((d) => {
          setMessages(d.messages || []);
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        });
    };
    loadMsgs();
    const interval = setInterval(loadMsgs, 3000);
    return () => clearInterval(interval);
  }, [selected]);

  // Gravador de Áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recorderTimerRef.current) clearInterval(recorderTimerRef.current);
        setRecordingTime(0);

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", blob, `audio_${Date.now()}.webm`);
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) {
            await sendManual(data.url);
          }
        } catch (err) {
          alert("Erro ao enviar áudio.");
        } finally {
          setUploading(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recorderTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err) {
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const sendManual = async (fileUrl?: string) => {
    if (!newMsg.trim() && !fileUrl) return;
    if (!selected) return;
    setSending(true);

    const isAudio = fileUrl?.toLowerCase().includes(".webm");
    const tempMsg = {
      id: Date.now().toString(),
      direction: "outbound",
      content: newMsg || (isAudio ? "🎤 Mensagem de Voz" : "[Arquivo Enviado]"),
      ai_generated: false,
      created_at: new Date().toISOString(),
      metadata: fileUrl ? JSON.stringify({ type: isAudio ? "audio" : "document", url: fileUrl }) : undefined,
    };

    setMessages((prev) => [...prev, tempMsg as Message]);
    const currentMsg = newMsg;
    setNewMsg("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      await fetch("/api/conversations/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, content: currentMsg, mediaUrl: fileUrl }),
      });
      fetchConversations(activeInstance, assignedFilter);
    } catch (e) {}

    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setShowAttachMenu(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        await sendManual(data.url);
      }
    } catch (err) {
      alert("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFilePicker = (type: string) => {
    fileTypeRef.current = type;
    setShowAttachMenu(false);
    if (fileInputRef.current) {
      if (type === "image") fileInputRef.current.accept = "image/*";
      else if (type === "audio") fileInputRef.current.accept = "audio/*";
      else fileInputRef.current.accept = "*/*";
      fileInputRef.current.click();
    }
  };

  const filtered = conversations.filter((c) => {
    const term = search.toLowerCase();
    const nameMatch = (c.contact_name || "").toLowerCase().includes(term);
    const numMatch = c.contact_number.includes(term);
    return nameMatch || numMatch;
  });

  return (
    <div className="flex h-[calc(100dvh-64px-2rem)] md:h-[calc(100dvh-4rem)] -m-4 md:-m-8 overflow-hidden bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10">
      {/* ─── SIDEBAR ESQUERDA (LISTA DE CONVERSAS) ─── */}
      <div className="w-[32%] min-w-[310px] max-w-[420px] flex flex-col border-r border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 shadow-sm">
        {/* Header da Barra Lateral */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-white dark:bg-[#030712] rounded-[14px] flex items-center justify-center p-1">
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Conversas</h2>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold block">
                {filtered.length} contatos ativos
              </span>
            </div>
          </div>

          {instances.length > 0 && (
            <select
              value={activeInstance}
              onChange={(e) => {
                setActiveInstance(e.target.value);
                setIsLoading(true);
                fetchConversations(e.target.value);
              }}
              className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer max-w-[130px] truncate"
            >
              <option value="">Todas</option>
              {instances.map((inst) => (
                <option key={inst.name} value={inst.name}>
                  {inst.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 border-b border-slate-200/80 dark:border-white/10 space-y-2.5">
          {sessionUser?.role !== "agent" && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 transition-colors w-full cursor-pointer"
            >
              <option value="all">Todos os Atendimentos</option>
              <option value="unassigned">Fila Geral (Sem Atendente)</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              className="w-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Lista de Conversas */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="w-7 h-7 rounded-full border-3 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhuma conversa encontrada</p>
              <p className="text-xs text-slate-400 font-medium">Tente ajustar seus termos de busca.</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selected?.id === conv.id;
              const displayName = conv.contact_name || `+${conv.contact_number}`;
              const initials = displayName.charAt(0).toUpperCase();

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={`flex items-center p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
                      : "hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {conv.profile_picture ? (
                    <img
                      src={conv.profile_picture}
                      alt={displayName}
                      className="h-11 w-11 rounded-2xl object-cover shrink-0 mr-3 ring-2 ring-slate-200 dark:ring-white/10"
                    />
                  ) : (
                    <div
                      className={`h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-black text-white shrink-0 mr-3 shadow-sm ${
                        isSelected
                          ? "bg-gradient-to-tr from-indigo-600 to-purple-600"
                          : "bg-gradient-to-tr from-slate-700 to-slate-800 dark:from-indigo-900 dark:to-purple-900"
                      }`}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{displayName}</h4>
                      <span className={`text-[10px] font-mono font-bold whitespace-nowrap ml-2 ${
                        isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                      }`}>
                        {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                        conv.ai_paused
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conv.ai_paused ? "bg-amber-500" : "bg-emerald-500"}`} />
                        {conv.ai_paused ? "Atendimento Humano" : "Atendimento Automático"}
                      </span>

                      {conv.assignee && (
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                          • {conv.assignee.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── PAINEL CENTRAL DE CHAT ─── */}
      <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-[#030712] relative min-w-0">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xl">
              <MessageSquare className="w-10 h-10" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Selecione uma Conversa
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Acompanhe o atendimento automatizado em tempo real ou assuma a conversa diretamente pelo painel.
              </p>
            </div>

            {instances.length > 0 && (
              <div className="w-full max-w-md pt-4">
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-3">
                  Conexões WhatsApp Ativas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {instances.map((inst) => {
                    const isOnline = inst.status === "open";
                    return (
                      <div
                        key={inst.name}
                        className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-sm text-left"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isOnline ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">{inst.connectionName || inst.name}</p>
                          <span className={`text-[10px] font-bold ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
                            {isOnline ? "Conectado" : "Conectando..."}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Header da Conversa Selecionada */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                {selected.profile_picture ? (
                  <img
                    src={selected.profile_picture}
                    alt="Avatar"
                    className="h-10 w-10 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-white/10 shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-black text-white shrink-0 shadow-md">
                    {(selected.contact_name || selected.contact_number).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                    {selected.contact_name || `+${selected.contact_number}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    {selected.ai_paused ? "Atendimento Humano em andamento" : "Atendimento Automático ativo"}
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Chat */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Botão para Assumir / Transferir */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/conversations", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: selected.id, assigned_to: sessionUser?.id }),
                      });
                      if (res.ok) {
                        selected.assigned_to = sessionUser?.id;
                        selected.assignee = sessionUser || undefined;
                        setConversations([...conversations]);
                      }
                    } catch (e) {}
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                    selected.assigned_to === sessionUser?.id
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{selected.assignee ? selected.assignee.name.split(" ")[0] : "Assumir Conversa"}</span>
                </button>

                {/* Alternador de IA / Atendimento Humano */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/conversations", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: selected.id, ai_paused: !selected.ai_paused }),
                      });
                      if (res.ok) {
                        selected.ai_paused = !selected.ai_paused;
                        setConversations([...conversations]);
                      }
                    } catch (e) {}
                  }}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 ${
                    selected.ai_paused
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{selected.ai_paused ? "Ativar Automação" : "Pausar Automação"}</span>
                </button>
              </div>
            </div>

            {/* Área de Scroll das Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-3 bg-slate-100/50 dark:bg-slate-950/50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 shadow-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Mensagens protegidas com criptografia oficial do WhatsApp.</span>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOutgoing = msg.direction === "outbound" || msg.direction === "outgoing";
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isFirstInGroup = !prevMsg || prevMsg.direction !== msg.direction;

                  let metaObj: any = null;
                  try {
                    if (msg.metadata) metaObj = JSON.parse(msg.metadata);
                  } catch (e) {}

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOutgoing ? "justify-end" : "justify-start"} ${
                        isFirstInGroup ? "mt-4" : ""
                      } animate-fade-in`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] p-4 rounded-3xl shadow-sm text-sm font-medium leading-relaxed ${
                          isOutgoing
                            ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-tr-xs shadow-indigo-600/10"
                            : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 rounded-tl-xs"
                        }`}
                      >
                        <div className="flex flex-col space-y-2">
                          {metaObj?.type === "image" && (
                            <img
                              src={metaObj.url}
                              alt="Mídia"
                              className="rounded-2xl max-w-full object-cover max-h-80 cursor-pointer shadow-sm"
                              loading="lazy"
                            />
                          )}
                          {metaObj?.type === "audio" && (
                            <div className="flex items-center gap-3 p-2 bg-black/10 rounded-2xl">
                              <Volume2 className="w-5 h-5 text-indigo-400 shrink-0" />
                              <audio controls src={metaObj.url} className="max-w-full h-8" />
                            </div>
                          )}
                          {metaObj?.type === "document" && (
                            <a
                              href={metaObj.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-3 rounded-2xl bg-black/10 hover:bg-black/20 transition-colors"
                            >
                              <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                              <span className="text-xs font-bold truncate">Abrir Documento Anexo</span>
                            </a>
                          )}

                          {msg.content && msg.content !== "[Mídia Enviada]" && (
                            <span className="whitespace-pre-wrap word-break">{msg.content}</span>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1.5 pt-1 text-[10px] font-mono ${
                              isOutgoing ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                            }`}
                          >
                            <span>{formatTime(msg.created_at)}</span>
                            {isOutgoing && <CheckCheck className="w-3.5 h-3.5 text-white/90" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Barra de Envio de Mensagem */}
            <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-4 flex items-center gap-3 shrink-0 z-10 shadow-lg">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept={
                  fileTypeRef.current === "image"
                    ? "image/*"
                    : fileTypeRef.current === "audio"
                    ? "audio/*"
                    : "*/*"
                }
              />

              {/* Menu de Anexos */}
              <div className="relative" ref={attachRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={uploading || recording}
                  className="p-3 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  title="Anexar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 w-48 z-50">
                    <button
                      type="button"
                      onClick={() => triggerFilePicker("image")}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-purple-500" />
                      <span>Imagem / Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFilePicker("document")}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>Documento PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFilePicker("audio")}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <Music className="w-4 h-4 text-amber-500" />
                      <span>Áudio</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Gravador de Áudio ou Input de Texto */}
              {recording ? (
                <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatRecordingTime(recordingTime)}
                  </span>
                  <div className="flex-1 h-1.5 bg-rose-200 dark:bg-rose-500/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all"
                      style={{ width: `${(recordingTime % 15) * 6.6}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition-colors text-xs font-bold"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendManual()}
                  placeholder="Digite sua resposta para o cliente..."
                  className="flex-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 font-medium"
                />
              )}

              {/* Botão de Microfone / Enviar */}
              {!recording && !newMsg.trim() && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl transition-all"
                  title="Gravar Mensagem de Voz"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}

              {!recording && newMsg.trim() && (
                <button
                  type="button"
                  onClick={() => sendManual()}
                  disabled={sending || uploading}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
