"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

  // Close attach menu on outside click
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
      const convsArray = Array.isArray(data) ? data : (data.conversations || []);
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
    fetch('/api/auth/session').then(r => r.json()).then(d => {
      if (d.authenticated && d.user) setSessionUser(d.user);
    });
    fetch('/api/team').then(r => r.json()).then(d => {
      if (d.team) setTeam(d.team);
    }).catch(() => {});
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

  // Audio Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recorderTimerRef.current) clearInterval(recorderTimerRef.current);
        setRecordingTime(0);

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (blob.size < 100) return;

        // Upload audio as file
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
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sendManual = async (fileUrl?: string) => {
    if (!newMsg.trim() && !fileUrl) return;
    if (!selected) return;
    setSending(true);

    const isAudio = fileUrl?.toLowerCase().includes('.webm');
    const tempMsg = {
      id: Date.now().toString(), direction: "outbound", content: newMsg || (isAudio ? "🎤 Áudio" : "[Mídia Enviada]"),
      ai_generated: false, created_at: new Date().toISOString(),
      metadata: fileUrl ? JSON.stringify({ type: isAudio ? "audio" : "document", url: fileUrl }) : undefined
    };

    setMessages((prev) => [...prev, tempMsg as Message]);
    const currentMsg = newMsg;
    setNewMsg("");
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      await fetch("/api/conversations/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, content: currentMsg, mediaUrl: fileUrl })
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

  const filtered = conversations.filter(c => {
    const term = search.toLowerCase();
    const nameMatch = (c.contact_name || "").toLowerCase().includes(term);
    const numMatch = c.contact_number.includes(term);
    return nameMatch || numMatch;
  });

  return (
    <div className="flex h-[calc(100dvh-64px-2rem)] md:h-[calc(100dvh-4rem)] -m-4 md:-m-8 overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/[0.06]">

      {/* ─── SIDEBAR ─── */}
      <div className="w-[30%] min-w-[300px] max-w-[420px] flex flex-col border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-black/20">
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-white/[0.06] shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <svg viewBox="0 0 24 24" height="16" width="16" className="text-white">
                <path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12c0 2.01.597 3.882 1.625 5.438L2 22l4.636-1.579A9.957 9.957 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2z"/>
              </svg>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Conversas</h2>
          </div>
          {instances.length > 0 && (
            <select
              value={activeInstance}
              onChange={(e) => {
                setActiveInstance(e.target.value);
                setIsLoading(true);
                fetchConversations(e.target.value);
              }}
              className="bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 transition-colors cursor-pointer max-w-[140px] truncate"
            >
              <option value="">Todas</option>
              {instances.map((inst) => (
                <option key={inst.name} value={inst.name}>{inst.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="p-3 border-b border-slate-200 dark:border-white/[0.06] flex flex-col gap-2">
          {sessionUser?.role !== "agent" && (
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500 transition-colors w-full"
            >
              <option value="all">Todos os Atendimentos</option>
              <option value="unassigned">Fila Geral (Sem Dono)</option>
              {team.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          )}
          <div className="relative">
            <svg viewBox="0 0 24 24" height="16" width="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
              <path fill="currentColor" d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.19-1.191-3.993-4.007zm-4.588 0a3.688 3.688 0 1 1 3.689-3.688 3.692 3.692 0 0 1-3.689 3.688z"/>
            </svg>
            <input
              type="text"
              placeholder="Pesquisar conversa..."
              className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-slate-400 dark:placeholder-zinc-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-3">
                <svg viewBox="0 0 24 24" height="24" width="24"><path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12c0 2.01.597 3.882 1.625 5.438L2 22l4.636-1.579A9.957 9.957 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2z"/></svg>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Nenhuma conversa encontrada</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Tente alterar os filtros de busca</p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv) => {
                const isSelected = selected?.id === conv.id;
                const hasName = Boolean(conv.contact_name);
                const displayName = conv.contact_name || `+${conv.contact_number}`;
                const initials = displayName.charAt(0).toUpperCase();

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelected(conv)}
                    className={`flex items-center px-3 py-3 cursor-pointer transition-all duration-200 mx-1.5 rounded-xl ${
                      isSelected
                        ? "bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                        : "hover:bg-slate-100 dark:hover:bg-white/[0.03] border border-transparent"
                    }`}
                  >
                    {conv.profile_picture ? (
                      <img src={conv.profile_picture} alt={displayName} className="h-11 w-11 rounded-full object-cover shrink-0 mr-3 ring-2 ring-slate-200 dark:ring-white/10" />
                    ) : (
                      <div className={`h-11 w-11 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 mr-3 ring-2 ring-slate-200 dark:ring-white/10 ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-600 to-purple-600"
                          : "bg-gradient-to-br from-indigo-500/80 to-purple-500/80"
                      }`}>
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{displayName}</span>
                        <span className={`text-[10px] font-medium whitespace-nowrap ml-2 ${
                          isSelected ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500"
                        }`}>
                          {conv.last_message_at ? timeAgo(conv.last_message_at) : timeAgo(conv.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                          conv.ai_paused ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${conv.ai_paused ? "bg-amber-500" : "bg-emerald-500"}`} />
                          {conv.ai_paused ? "IA Pausada" : "IA Ativa"}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">·</span>
                        {conv.assignee ? (
                          <span className="text-[10px] text-indigo-500 font-semibold truncate">
                            {conv.assignee.name.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                            Fila Geral
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN CHAT ─── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-black/10 relative">

        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md mb-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/10 flex items-center justify-center mx-auto mb-6">
                <svg viewBox="0 0 24 24" height="48" width="48" className="text-indigo-500">
                  <path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12c0 2.01.597 3.882 1.625 5.438L2 22l4.636-1.579A9.957 9.957 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2zm0 18c-1.748 0-3.385-.45-4.808-1.233l-.344-.19-3.238 1.103 1.127-3.11-.212-.353A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                Nexus <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">SaaS</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 leading-relaxed">
                Envie e receba mensagens sem precisar manter seu celular conectado.<br />
                A Inteligência Artificial atende seus clientes automaticamente.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-400 dark:text-zinc-500">
                <svg viewBox="0 0 24 24" height="14" width="14"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                <span>Protegido com criptografia de ponta a ponta</span>
              </div>
            </div>

            {instances.length > 0 && (
              <div className="w-full max-w-lg">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <svg viewBox="0 0 24 24" height="16" width="16" className="text-indigo-500"><path fill="currentColor" d="M12 2C6.486 2 2 6.486 2 12c0 2.01.597 3.882 1.625 5.438L2 22l4.636-1.579A9.957 9.957 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2z"/></svg>
                  <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Instâncias Conectadas</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {instances.map((inst) => {
                    const isOnline = inst.status === "open";
                    const statusColor = isOnline ? "emerald" : "amber";
                    const statusLabel = isOnline ? "Conectado" : inst.status === "connecting" ? "Conectando..." : "Offline";
                    return (
                      <div key={inst.name} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isOnline
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          <svg viewBox="0 0 24 24" height="18" width="18" fill="currentColor">
                            <path d="M12 2C6.486 2 2 6.486 2 12c0 2.01.597 3.882 1.625 5.438L2 22l4.636-1.579A9.957 9.957 0 0012 22c5.514 0 10-4.486 10-10S17.514 2 12 2z"/>
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{inst.connectionName || inst.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span className={`text-[10px] font-medium ${isOnline ? "text-emerald-500" : "text-amber-500"}`}>{statusLabel}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            {/* Chat Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {selected.profile_picture ? (
                  <img src={selected.profile_picture} alt="Avatar" className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/10 shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-base font-bold text-white ring-2 ring-slate-200 dark:ring-white/10 shrink-0">
                    {(selected.contact_name || selected.contact_number).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-5 truncate">{selected.contact_name || `+${selected.contact_number}`}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selected.ai_paused ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      {selected.ai_paused ? "IA desligada" : "IA está cuidando dessa conversa"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Transfer Button */}
                <div className="relative group">
                  <button
                    onClick={async () => {
                      if (!selected.assigned_to || selected.assigned_to === sessionUser?.id) {
                        // Auto-assume
                        try {
                          const res = await fetch("/api/conversations", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: selected.id, assigned_to: sessionUser?.id })
                          });
                          if (res.ok) {
                            selected.assigned_to = sessionUser?.id;
                            selected.assignee = sessionUser || undefined;
                            setConversations([...conversations]);
                          }
                        } catch (e) {}
                      }
                    }}
                    className={`text-[11px] font-bold rounded-lg px-2.5 py-1.5 transition-all flex items-center gap-1.5 border ${
                      selected.assigned_to === sessionUser?.id
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : selected.assigned_to
                        ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                        : "bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                    title="Assumir atendimento"
                  >
                    <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    {selected.assignee ? selected.assignee.name.split(' ')[0] : "Assumir"}
                  </button>
                  {/* Transfer dropdown */}
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 min-w-[180px] hidden group-hover:block z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Transferir para</div>
                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/conversations", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: selected.id, assigned_to: null })
                          });
                          selected.assigned_to = undefined;
                          selected.assignee = undefined;
                          setConversations([...conversations]);
                        } catch (e) {}
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 ${!selected.assigned_to ? "text-indigo-500 font-semibold" : "text-slate-600 dark:text-zinc-300"}`}
                    >
                      <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      Fila Geral
                      {!selected.assigned_to && <span className="ml-auto text-[9px]">✓</span>}
                    </button>
                    {team.filter(m => m.id !== sessionUser?.id).map(member => (
                      <button
                        key={member.id}
                        onClick={async () => {
                          try {
                            await fetch("/api/conversations", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: selected.id, assigned_to: member.id })
                            });
                            selected.assigned_to = member.id;
                            selected.assignee = member;
                            setConversations([...conversations]);
                          } catch (e) {}
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 ${selected.assigned_to === member.id ? "text-indigo-500 font-semibold" : "text-slate-600 dark:text-zinc-300"}`}
                      >
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[9px] font-bold text-indigo-500">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        {member.name}
                        {selected.assigned_to === member.id && <span className="ml-auto text-[9px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Toggle */}
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/conversations", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: selected.id, ai_paused: !selected.ai_paused })
                      });
                      if (res.ok) {
                        selected.ai_paused = !selected.ai_paused;
                        setConversations([...conversations]);
                      }
                    } catch (e) {}
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2 ${
                    selected.ai_paused
                      ? "bg-slate-100 dark:bg-white/[0.03] text-indigo-500 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95"
                  }`}
                >
                  {selected.ai_paused ? (
                    <>
                      <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      IA Off
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                      IA On
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-2 bg-slate-50/50 dark:bg-black/20">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-400 dark:text-zinc-500 shadow-sm">
                    <svg viewBox="0 0 24 24" height="14" width="14"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                    <span>As mensagens são protegidas com criptografia de ponta a ponta.</span>
                  </div>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOutgoing = msg.direction === "outbound" || msg.direction === "outgoing";
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const isFirstInGroup = !prevMsg || prevMsg.direction !== msg.direction;

                  let metaObj: any = null;
                  try { if (msg.metadata) metaObj = JSON.parse(msg.metadata); } catch(e){}

                  return (
                    <div key={msg.id} className={`flex ${isOutgoing ? "justify-end" : "justify-start"} ${isFirstInGroup ? "mt-3" : ""} animate-fade-in`}>
                      <div className={`relative max-w-[85%] md:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-sm ${
                        isOutgoing
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                          : "bg-white dark:bg-white/[0.03] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                      } ${isFirstInGroup && isOutgoing ? "rounded-tr-md" : ""} ${
                        isFirstInGroup && !isOutgoing ? "rounded-tl-md" : ""
                      }`}>
                        <div className="flex flex-col">
                          {metaObj?.type === "image" && (
                             <img src={metaObj.url} alt="Media" className="rounded-lg mb-2 max-w-full object-cover max-h-80 cursor-pointer" loading="lazy" />
                          )}
                          {metaObj?.type === "audio" && (
                             <div className="flex items-center gap-2 mb-1">
                               <audio controls src={metaObj.url} className="max-w-full h-8" />
                             </div>
                          )}
                          {metaObj?.type === "video" && (
                             <video controls src={metaObj.url} className="rounded-lg mb-2 max-w-full max-h-60" />
                          )}
                          {metaObj?.type === "document" && (
                             <a href={metaObj.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10">
                               <svg viewBox="0 0 24 24" height="18" width="18" className="text-indigo-500 shrink-0" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3.06 16L7.4 14.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L10.94 18zM13 9V3.5L18.5 9H13z"/></svg>
                               <span className="text-[11px] font-medium truncate">Documento</span>
                             </a>
                          )}

                          {msg.content && msg.content !== "[Mídia Enviada]" && !msg.content.match(/^\*\[.*\]:\s*$/) && (
                            <span className="text-sm leading-6 whitespace-pre-wrap word-break">{msg.content}</span>
                          )}
                          <div className={`flex items-center justify-end gap-1.5 mt-1.5 -mb-0.5 ${
                            isOutgoing ? "text-white/70" : "text-slate-400 dark:text-zinc-500"
                          }`}>
                            {msg.ai_generated && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                isOutgoing
                                  ? "bg-white/20 text-white"
                                  : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                              }`}>
                                Bot
                              </span>
                            )}
                            <span className="text-[10px] leading-none">{formatTime(msg.created_at)}</span>
                            {isOutgoing && (
                              <svg viewBox="0 0 16 11" height="11" width="16" className="opacity-70">
                                <path fill="currentColor" d="M11.832 2.872a.5.5 0 0 0-.707 0L4.542 9.456 2.112 7.025a.5.5 0 0 0-.707.707l2.783 2.784a.5.5 0 0 0 .707 0l6.937-6.938a.5.5 0 0 0 0-.706zM15.112 2.872a.5.5 0 0 0-.707 0l-5.612 5.613-.243-.243a.5.5 0 1 0-.707.707l.596.597a.5.5 0 0 0 .707 0l5.966-5.967a.5.5 0 0 0 0-.707z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-black/20 flex items-center px-4 py-3 gap-2 shrink-0">
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept={fileTypeRef.current === "image" ? "image/*" : fileTypeRef.current === "audio" ? "audio/*" : "*/*"} />

              {/* Attachment Menu */}
              <div className="relative" ref={attachRef}>
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={uploading || recording}
                  className={`text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 ${uploading ? "animate-pulse" : ""}`}
                >
                  <svg viewBox="0 0 24 24" height="20" width="20"><path fill="currentColor" d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.959.958 2.423 1.053 3.263.215l5.511-5.512c.28-.28.267-.722.053-.936l-.244-.244c-.191-.191-.567-.349-.957.04l-5.506 5.506c-.18.18-.635.127-.976-.214-.098-.097-.576-.613-.213-.973l7.915-7.917c.818-.817 2.267-.699 3.23.262.5.501.802 1.1.849 1.685.051.573-.156 1.111-.589 1.543l-9.547 9.549a3.97 3.97 0 0 1-2.829 1.171 3.975 3.975 0 0 1-2.83-1.173 3.973 3.973 0 0 1-1.172-2.828c0-1.071.415-2.076 1.172-2.83l7.209-7.211c.157-.157.264-.579.028-.814L11.5 4.36a.572.572 0 0 0-.834.018l-7.205 7.207a5.577 5.577 0 0 0-1.645 3.971z"/></svg>
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-2 w-48 z-50">
                    <button
                      onClick={() => triggerFilePicker("image")}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" height="16" width="16" className="text-purple-500" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                      </div>
                      <div>
                        <div>Imagem</div>
                        <div className="text-[9px] text-slate-400 font-normal">JPG, PNG, GIF</div>
                      </div>
                    </button>
                    <button
                      onClick={() => triggerFilePicker("document")}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" height="16" width="16" className="text-blue-500" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-3.06 16L7.4 14.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L10.94 18zM13 9V3.5L18.5 9H13z"/></svg>
                      </div>
                      <div>
                        <div>Documento</div>
                        <div className="text-[9px] text-slate-400 font-normal">PDF, Word, etc</div>
                      </div>
                    </button>
                    <button
                      onClick={() => triggerFilePicker("audio")}
                      className="w-full text-left px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" height="16" width="16" className="text-amber-500" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                      </div>
                      <div>
                        <div>Arquivo de Áudio</div>
                        <div className="text-[9px] text-slate-400 font-normal">MP3, WAV, etc</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Recording indicator */}
              {recording ? (
                <div className="flex-1 flex items-center gap-3 px-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-red-500">{formatRecordingTime(recordingTime)}</span>
                  <div className="flex-1 h-1 bg-red-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${(recordingTime % 10) * 10}%` }} />
                  </div>
                  <button
                    onClick={stopRecording}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" height="18" width="18" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                  </button>
                </div>
              ) : (
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendManual()}
                    placeholder="Digite sua mensagem..."
                    className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-xl pl-4 pr-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-slate-400 dark:placeholder-zinc-500"
                  />
                </div>
              )}

              {/* Mic button (only when not recording) */}
              {!recording && !newMsg.trim() && (
                <button
                  onClick={startRecording}
                  disabled={uploading}
                  className="p-2.5 rounded-xl text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Gravar áudio"
                >
                  <svg viewBox="0 0 24 24" height="18" width="18" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                </button>
              )}

              {/* Send button */}
              {!recording && newMsg.trim() && (
                <button
                  onClick={() => sendManual()}
                  disabled={sending || uploading}
                  className={`p-2.5 rounded-xl transition-all duration-200 ${
                    newMsg.trim()
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95"
                      : "bg-slate-100 dark:bg-white/[0.03] text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-white/10"
                  }`}
                >
                  <svg viewBox="0 0 24 24" height="18" width="18">
                    <path fill="currentColor" d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .word-break {
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
