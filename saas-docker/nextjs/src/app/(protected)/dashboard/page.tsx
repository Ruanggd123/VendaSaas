"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  Calendar,
  Rocket,
  Smartphone,
  ArrowUpRight,
  BarChart3,
  Target,
  RefreshCw,
  Loader2,
  Phone,
  UserCheck,
  Timer,
  ShoppingCart,
  Settings,
  CalendarCheck,
  CircleDot,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  status: string | null;
  interested_product: string | null;
  value: number | null;
  created_at: string;
}

const FUNNEL_STAGES = [
  { id: "novo", label: "Novos Leads", color: "bg-blue-500", textColor: "text-blue-500", borderColor: "border-blue-500/20", bgColor: "bg-blue-500/10" },
  { id: "atendimento", label: "Em Atendimento", color: "bg-amber-500", textColor: "text-amber-500", borderColor: "border-amber-500/20", bgColor: "bg-amber-500/10" },
  { id: "agendado", label: "Agendado", color: "bg-purple-500", textColor: "text-purple-500", borderColor: "border-purple-500/20", bgColor: "bg-purple-500/10" },
  { id: "concluido", label: "Concluído", color: "bg-emerald-500", textColor: "text-emerald-500", borderColor: "border-emerald-500/20", bgColor: "bg-emerald-500/10" },
  { id: "perdido", label: "Perdido", color: "bg-rose-500", textColor: "text-rose-500", borderColor: "border-rose-500/20", bgColor: "bg-rose-500/10" },
];

interface GuardianBlock {
  intent: string;
  reason: string;
  timestamp: string;
}

interface GuardianStats {
  approved: number;
  blocked: number;
  jailbreak_attempts: number;
  recent_blocks: GuardianBlock[];
}

interface Conversation {
  id: string;
  contact_name: string;
  contact_number: string;
  last_message_at: string | null;
  _count?: { messages: number };
  leads?: { id: string; name: string | null; status: string | null }[];
}

interface Appointment {
  id: string;
  service_name: string;
  scheduled_at: string;
  status: string;
  lead?: { name: string; phone: string };
}

interface WhatsAppStatus {
  status: string;
}

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-24" />
        <div className="h-8 bg-slate-200 dark:bg-white/10 rounded w-16" />
        <div className="h-2 bg-slate-200 dark:bg-white/10 rounded w-40" />
      </div>
    </div>
  );
}

function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-72 flex-shrink-0 bg-slate-100 dark:bg-black/20 border border-slate-200/50 dark:border-white/5 rounded-2xl p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/20" />
              <div className="h-3 bg-slate-300 dark:bg-white/20 rounded w-20" />
            </div>
            {[1, 2].map((j) => (
              <div key={j} className="h-24 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [guardianStats, setGuardianStats] = useState<GuardianStats | null>(null);
  const [guardianLoading, setGuardianLoading] = useState(true);
  const [isGuardianVisible, setIsGuardianVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState("Cliente");
  const [whatsappStatus, setWhatsappStatus] = useState<string>("unknown");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [salesStats, setSalesStats] = useState<{ total: number; paid: number; pending: number; overdue: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardianStats = async () => {
    try {
      const res = await fetch("/api/guardian/stats");
      if (res.ok) {
        const data = await res.json();
        setGuardianStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGuardianLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserName(data.user.name || "Cliente");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWhatsappStatus(data.status || "unknown");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations((data.conversations || []).slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/appointments?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        const upcoming = (data.appointments || [])
          .filter((a: Appointment) => new Date(a.scheduled_at) >= new Date() && a.status !== "cancelled")
          .slice(0, 5);
        setAppointments(upcoming);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/sales");
      if (res.ok) {
        const data = await res.json();
        setSalesStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchLeads(),
      fetchGuardianStats(),
      fetchSession(),
      fetchWhatsAppStatus(),
      fetchConversations(),
      fetchAppointments(),
      fetchSales(),
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchLeads();
    fetchGuardianStats();
    fetchSession();
    fetchWhatsAppStatus();
    fetchConversations();
    fetchAppointments();
    fetchSales();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!mounted) return "";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!mounted) return "";
    try {
      return new Date(dateStr).toLocaleString("pt-BR");
    } catch {
      return "-";
    }
  };

  const formatTime = (dateStr: string) => {
    if (!mounted) return "";
    try {
      return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  const formatRelative = (dateStr: string) => {
    if (!mounted) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "agora";
      if (mins < 60) return `${mins}min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      return `${days}d`;
    } catch {
      return "-";
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };

  const groupedLeads = FUNNEL_STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter((l) => (l.status || "novo") === stage.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  const totalLeads = leads.length;
  const vendasConcluidas = leads.filter((l) => l.status === "concluido");
  const totalFaturamento = vendasConcluidas.reduce((sum, l) => sum + (l.value || 0), 0);
  const taxaConversao = totalLeads > 0 ? ((vendasConcluidas.length / totalLeads) * 100).toFixed(1) : "0";
  const ticketMedio = vendasConcluidas.length > 0 ? totalFaturamento / vendasConcluidas.length : 0;
  const leadsHoje = leads.filter((l) => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const leadsOntem = leads.filter((l) => {
    const d = new Date(l.created_at);
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    return d.toDateString() === ontem.toDateString();
  }).length;
  const leadsDiff = leadsHoje - leadsOntem;
  const emAtendimento = leads.filter((l) => l.status === "atendimento").length;
  const agendados = leads.filter((l) => l.status === "agendado").length;

  // Weekly evolution
  const getWeekId = (dateStr: string) => {
    const d = new Date(dateStr);
    const start = new Date(d.getFullYear(), 0, 1);
    const diff = d.getTime() - start.getTime();
    const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
  };
  const getWeekLabel = (weekId: string) => {
    const [y, w] = weekId.split("-W");
    const jan1 = new Date(Number(y), 0, 1);
    const days = (Number(w) - 1) * 7;
    const d = new Date(jan1.setDate(jan1.getDate() + days));
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };
  const weekMap: Record<string, number> = {};
  leads.forEach((l) => {
    const w = getWeekId(l.created_at);
    weekMap[w] = (weekMap[w] || 0) + 1;
  });
  const weekKeys = Object.keys(weekMap).sort().slice(-6);
  const weeklyData = weekKeys.map((k) => ({ label: getWeekLabel(k), count: weekMap[k] }));
  const maxWeekCount = Math.max(1, ...weeklyData.map((w) => w.count));

  // Top products
  const productCount: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.interested_product) {
      const p = l.interested_product.trim();
      productCount[p] = (productCount[p] || 0) + 1;
    }
  });
  const topProducts = Object.entries(productCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Meta do mês
  const metaMensal = 20000;
  const progressoMeta = Math.min(100, Math.round((totalFaturamento / metaMensal) * 100));

  // Precisa de atenção
  const leadsParados = leads.filter((l) => {
    if (l.status === "concluido" || l.status === "perdido") return false;
    const dias = (Date.now() - new Date(l.created_at).getTime()) / 86400000;
    return dias > 7;
  });
  const cobrancasVencidas = salesStats?.overdue || 0;

  // Atividade recente
  const recentLeads = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const handleExport = () => {
    const headers = ["ID", "Nome", "Telefone", "Status", "Interesse", "Valor", "Data"];
    const csvRows = leads.map(
      (l) => `${l.id};"${l.name || ""}";${l.phone};${l.status};"${l.interested_product || ""}";${l.value || 0};"${new Date(l.created_at).toLocaleString("pt-BR")}"`
    );
    const csvContent = headers.join(";") + "\n" + csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
    } catch (e) {
      console.error(e);
      fetchLeads();
    }
  };

  const waConnected = whatsappStatus === "open";

  return (
    <div className="min-h-[calc(100vh-4rem)] text-slate-900 dark:text-white relative">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ─── Greeting Header ─── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {getGreeting()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">{userName.split(" ")[0]}</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              Aqui está o resumo do seu negócio hoje.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* WhatsApp Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${waConnected ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-500"}`}>
              {waConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{waConnected ? "WhatsApp Online" : "WhatsApp Offline"}</span>
              <span className={`w-2 h-2 rounded-full ${waConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            </div>
            <button
              onClick={refreshAll}
              disabled={refreshing}
              className="p-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 rounded-xl transition-all shadow-sm disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsGuardianVisible(!isGuardianVisible)}
              className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{isGuardianVisible ? "Ocultar IA" : "Guardião"}</span>
            </button>
            <button
              onClick={() => setShowCsvPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </header>

        {/* ─── Primary Metrics ─── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              {/* Total Leads */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Leads</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white">{totalLeads}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {leadsDiff > 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] text-green-500 font-semibold">+{leadsDiff} hoje</span>
                    </>
                  ) : leadsDiff < 0 ? (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] text-red-500 font-semibold">{leadsDiff} hoje</span>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">= ontem</span>
                  )}
                </div>
              </div>

              {/* Vendas Concluídas */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Vendas</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{vendasConcluidas.length}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">Conversão: {taxaConversao}%</p>
              </div>

              {/* Faturamento */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Faturamento</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white">
                      R$ {totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">
                  Ticket médio: R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </p>
              </div>

              {/* Ticket Médio */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Em Atendimento</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-amber-600 dark:text-amber-400">{emAtendimento}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <Timer className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">Aguardando resposta</p>
              </div>

              {/* Agendados */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Agendados</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">{agendados}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">Compromissos marcados</p>
              </div>

              {/* Conversas Ativas */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-r" />
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Conversas</p>
                    <p className="text-2xl lg:text-3xl font-extrabold text-rose-600 dark:text-rose-400">{conversations.length > 0 ? conversations.length : "—"}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">Ativas recentemente</p>
              </div>
            </>
          )}
        </section>

        {/* ─── Meta do Mês + Evolução ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meta do Mês */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <Target className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Meta do Mês</span>
              <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-500 font-mono">R$ {totalFaturamento.toLocaleString("pt-BR")} / R$ {metaMensal.toLocaleString("pt-BR")}</span>
            </div>
            <div className="relative h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                style={{ width: `${progressoMeta}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white drop-shadow-sm">{progressoMeta}%</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2">
              {progressoMeta >= 100 ? "🎉 Meta atingida!" : `Faltam R$ ${(metaMensal - totalFaturamento).toLocaleString("pt-BR")} para atingir a meta`}
            </p>
          </div>

          {/* Evolução Semanal */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Evolução Semanal</span>
              <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Leads por semana</span>
            </div>
            {weeklyData.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-xs text-slate-400 dark:text-zinc-500">Sem dados esta semana</div>
            ) : (
              <div className="flex items-end gap-2 h-20">
                {weeklyData.map((w) => (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">{w.count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500/60 to-emerald-400/60 dark:from-emerald-600/60 dark:to-emerald-500/60 rounded-t-md transition-all duration-500"
                      style={{ height: `${(w.count / maxWeekCount) * 100}%` }}
                    />
                    <span className="text-[8px] text-slate-400 dark:text-zinc-500 text-center leading-tight">{w.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── Quick Actions ─── */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { href: "/conversas", label: "Conversas", desc: "Ver inbox", icon: MessageSquare, color: "indigo" },
            { href: "/agenda", label: "Agenda", desc: "Ver compromissos", icon: Calendar, color: "purple" },
            { href: "/vendas", label: "Vendas", desc: "Cobranças e receitas", icon: ShoppingCart, color: "emerald" },
            { href: "/autovendas", label: "AutoVendas", desc: "Pipeline automático", icon: Rocket, color: "amber" },
            { href: "/settings", label: "Configurações", desc: "IA, blacklist e mais", icon: Settings, color: "sky" },
          ].map((action) => {
            const Icon = action.icon;
            const cMap: Record<string, string> = {
              indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500/20",
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-500 group-hover:bg-purple-500/20",
              emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500/20",
              amber: "bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:bg-amber-500/20",
              sky: "bg-sky-500/10 border-sky-500/20 text-sky-500 group-hover:bg-sky-500/20",
            };
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 p-3 md:p-4 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl hover:shadow-md transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${cMap[action.color]} border flex items-center justify-center shrink-0 transition-colors`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{action.label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{action.desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400 ml-auto shrink-0 transition-colors" />
              </Link>
            );
          })}
        </section>

        {/* ─── Precisa de Atenção ─── */}
        {(leadsParados.length > 0 || cobrancasVencidas > 0 || !waConnected) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Precisa de Atenção</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {leadsParados.length > 0 && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{leadsParados.length} lead{leadsParados.length > 1 ? "s" : ""} parado{leadsParados.length > 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-300/80">Há mais de 7 dias sem avançar no funil</p>
                  <Link href="/conversas" className="mt-2 inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline">Ver leads →</Link>
                </div>
              )}
              {cobrancasVencidas > 0 && (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">{cobrancasVencidas} cobrança{cobrancasVencidas > 1 ? "s" : ""} vencida{cobrancasVencidas > 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-[10px] text-red-600 dark:text-red-300/80">Pagamento{Math.abs(cobrancasVencidas) > 1 ? "s" : ""} em atraso</p>
                  <Link href="/vendas" className="mt-2 inline-block text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline">Ver cobranças →</Link>
                </div>
              )}
              {!waConnected && (
                <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400">WhatsApp desconectado</span>
                  </div>
                  <p className="text-[10px] text-red-600 dark:text-red-300/80">Conecte novamente para voltar a atender</p>
                  <Link href="/whatsapp" className="mt-2 inline-block text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline">Conectar →</Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── Main Content: Kanban + Sidebar ─── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

          {/* Kanban Board */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pipeline de Vendas</h2>
              </div>
              <span className="text-xs text-slate-400 dark:text-zinc-500 font-mono">{totalLeads} leads</span>
            </div>

            {loading ? (
              <SkeletonKanban />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4 select-none">
                {FUNNEL_STAGES.map((stage) => {
                  const stageLeads = groupedLeads[stage.id] || [];
                  return (
                    <div key={stage.id} className="w-72 md:w-80 flex-shrink-0 bg-slate-100/80 dark:bg-black/20 border border-slate-200/80 dark:border-white/5 rounded-2xl p-3.5 flex flex-col max-h-[520px]">
                      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                          <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">{stage.label}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold font-mono ${stage.bgColor} ${stage.textColor} border ${stage.borderColor}`}>
                          {stageLeads.length}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {stageLeads.length === 0 ? (
                          <div className="h-24 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-white/5 rounded-xl text-center p-4">
                            <span className="text-lg mb-1 opacity-30">—</span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-500">Nenhum lead</span>
                          </div>
                        ) : (
                          stageLeads.map((lead) => (
                            <div
                              key={lead.id}
                              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-2"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <h5 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{lead.name || "Sem Nome"}</h5>
                                {lead.value ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-lg whitespace-nowrap">
                                    R$ {lead.value}
                                  </span>
                                ) : null}
                              </div>

                              <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
                                <p className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  {lead.phone || "Sem telefone"}
                                </p>
                                {lead.interested_product && (
                                  <p className="text-[10px] bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/5 p-1.5 rounded-lg truncate text-slate-600 dark:text-zinc-300">
                                    {lead.interested_product}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2.5 mt-0.5">
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">{formatDate(lead.created_at)}</span>
                                <select
                                  value={lead.status || "novo"}
                                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                  className="text-[10px] font-semibold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer transition-colors"
                                >
                                  {FUNNEL_STAGES.map((st) => (
                                    <option key={st.id} value={st.id}>{st.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ─── Sidebar Panel ─── */}
          <aside className="space-y-4">

            {/* WhatsApp Status Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">WhatsApp</span>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-bold ${waConnected ? "text-green-500" : "text-red-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${waConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                  {waConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              <Link
                href="/whatsapp"
                className="block w-full text-center py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 transition-all"
              >
                Gerenciar Conexão
              </Link>
            </div>

            {/* Sales Summary */}
            {salesStats && (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Financeiro</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">Receita total</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">R$ {salesStats.total.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">Recebido</span>
                    <span className="text-sm font-bold text-emerald-500">R$ {salesStats.paid.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">Pendente</span>
                    <span className="text-sm font-bold text-amber-500">R$ {salesStats.pending.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">Em atraso</span>
                    <span className="text-sm font-bold text-red-500">{salesStats.overdue} {salesStats.overdue === 1 ? "venda" : "vendas"}</span>
                  </div>
                </div>
                <Link
                  href="/vendas"
                  className="block w-full text-center py-2.5 mt-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 transition-all"
                >
                  Ver Todas as Vendas
                </Link>
              </div>
            )}

            {/* Upcoming Appointments */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Agenda</span>
                </div>
                <Link href="/agenda" className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold">Ver tudo</Link>
              </div>
              {appointments.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Nenhum agendamento próximo</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shrink-0">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{apt.service_name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {apt.lead?.name || "Cliente"} · {formatDate(apt.scheduled_at)} {formatTime(apt.scheduled_at)}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                        apt.status === "confirmed" ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                        apt.status === "scheduled" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                        "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-white/5"
                      }`}>
                        {apt.status === "confirmed" ? "Confirmado" : apt.status === "scheduled" ? "Agendado" : apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Conversas Recentes</span>
                </div>
                <Link href="/conversas" className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold">Ver todas</Link>
              </div>
              {conversations.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Nenhuma conversa recente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Link
                      key={conv.id}
                      href={`/conversas?id=${conv.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {(conv.contact_name || conv.contact_number || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{conv.contact_name || conv.contact_number}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {conv._count?.messages || 0} mensagens
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                        {conv.last_message_at ? formatRelative(conv.last_message_at) : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top Produtos */}
            {topProducts.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <Target className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Top Serviços</span>
                </div>
                <div className="space-y-2.5">
                  {topProducts.map(([product, count], i) => {
                    const maxCount = topProducts[0][1];
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={product}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-700 dark:text-zinc-300 truncate">{product}</span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 ml-2">{count}x</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Atividade Recente */}
            {recentLeads.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Atividade Recente</span>
                </div>
                <div className="space-y-2">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {(lead.name || "?").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{lead.name || "Lead sem nome"}</p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                          {lead.interested_product ? `${lead.interested_product} · ` : ""}{formatRelative(lead.created_at)}
                        </p>
                      </div>
                      {lead.value ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">R$ {lead.value}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ─── Guardian Section ─── */}
        {isGuardianVisible && (
          <section className="space-y-5 animate-slide-up">
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  AI Guardian
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Proteção da IA em tempo real.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {guardianLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-500">Aprovadas</span>
                        <h4 className="text-2xl font-extrabold mt-1 text-emerald-600 dark:text-emerald-400">{guardianStats?.approved ?? 0}</h4>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" /> Ferramentas executadas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-500">Barradas</span>
                        <h4 className="text-2xl font-extrabold mt-1 text-red-500">{guardianStats?.blocked ?? 0}</h4>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" /> Ações rejeitadas
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-zinc-500">Jailbreak</span>
                        <h4 className="text-2xl font-extrabold mt-1 text-amber-500">{guardianStats?.jailbreak_attempts ?? 0}</h4>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" /> Mensagens bloqueadas
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Logs de Segurança</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Últimas violações</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="px-5 py-3 text-left">Intenção</th>
                      <th className="px-5 py-3 text-left">Motivo</th>
                      <th className="px-5 py-3 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {guardianLoading ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-slate-400 dark:text-zinc-500">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Carregando...
                          </div>
                        </td>
                      </tr>
                    ) : !guardianStats?.recent_blocks?.length ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-zinc-500">
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                            <span className="text-xs">Nenhuma violação detectada. Sistema seguro.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      guardianStats.recent_blocks.map((block, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-indigo-600 dark:text-indigo-400 font-semibold">
                              {block.intent}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-zinc-300 max-w-sm truncate">{block.reason}</td>
                          <td className="px-5 py-3 text-right text-slate-400 dark:text-zinc-500 font-mono">{formatDateTime(block.timestamp)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ─── CSV Modal ─── */}
      {showCsvPreview && (
        <div className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCsvPreview(false)}>
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Exportar CSV</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Preview dos dados que serão baixados.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCsvPreview(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <div className="border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] uppercase tracking-wider text-slate-500 dark:text-zinc-500 font-bold">
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Telefone</th>
                      <th className="px-4 py-3 text-left">Etapa</th>
                      <th className="px-4 py-3 text-left">Produto</th>
                      <th className="px-4 py-3 text-left">Valor</th>
                      <th className="px-4 py-3 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {leads.slice(0, 10).map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{l.name || "-"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{l.phone}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 uppercase text-[10px] font-semibold text-slate-600 dark:text-zinc-300">
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 truncate max-w-[120px] text-slate-600 dark:text-zinc-300">{l.interested_product || "-"}</td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">R$ {l.value || 0}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">{formatDate(l.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {leads.length > 10 && (
                <p className="text-center text-[11px] text-slate-400 dark:text-zinc-500 mt-3">
                  Mostrando 10 de {leads.length} leads. O download incluirá todos.
                </p>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setShowCsvPreview(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowCsvPreview(false);
                  handleExport();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Baixar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
