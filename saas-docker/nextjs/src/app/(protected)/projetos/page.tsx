"use client";

import { useState, useEffect } from "react";
import {
  Rocket,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Eye,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  X,
  FileText,
  User,
  Phone,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

type ProjectTimeline = {
  id: string;
  project_id: string;
  status_change: string | null;
  message: string | null;
  author: string;
  created_at: string;
};

type Project = {
  id: string;
  client_name: string;
  client_phone: string;
  title: string;
  description: string;
  briefing: string | null;
  price: number;
  status: string;
  created_at: string;
  partner_id: string | null;
  timelines?: ProjectTimeline[];
};

const STAGES = [
  { id: "OPEN", label: "Aguardando Dev", desc: "Na fila para desenvolvimento", color: "amber" },
  { id: "IN_PROGRESS", label: "Em Desenvolvimento", desc: "Código e estrutura sendo criados", color: "indigo" },
  { id: "REVIEW", label: "Em Análise / Testes", desc: "Em homologação e validação", color: "purple" },
  { id: "COMPLETED", label: "Concluído & Entregue", desc: "Projeto no ar e liberado", color: "emerald" },
];

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [customMsg, setCustomMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProjects = () => {
    setLoading(true);
    fetch("/api/projects?type=all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openWhatsApp = (phone: string, title: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá! Sou o desenvolvedor responsável pelo seu projeto (${title}) na Nexus. Estou entrando em contato para conversarmos sobre o andamento!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const copyTrackingLink = (projectId: string) => {
    const link = `${window.location.origin}/projeto/${projectId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUpdateStatus = async () => {
    if (!selectedProject || !newStatus) return;
    setUpdating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProject.id,
          status: newStatus,
          message: customMsg.trim() || undefined,
        }),
      });

      if (res.ok) {
        setCustomMsg("");
        setSelectedProject(null);
        fetchProjects();
      } else {
        alert("Erro ao atualizar o projeto.");
      }
    } catch (e) {
      alert("Erro de conexão com o servidor.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" /> Aguardando Dev
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Em Desenvolvimento
          </span>
        );
      case "REVIEW":
        return (
          <span className="px-3 py-1 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Search className="w-3.5 h-3.5" /> Em Homologação
          </span>
        );
      case "COMPLETED":
        return (
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Concluído &amp; Entregue
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 dark:text-white">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Painel do Desenvolvedor
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            Gestão &amp; Tracking de Projetos
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Gerencie prazos, altere status em tempo real e compartilhe o link de acompanhamento com seus clientes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            Total: {projects.length} projetos
          </div>
        </div>
      </div>

      {/* ── Grid de Projetos ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
          <Rocket className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Nenhum projeto registrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            Quando um cliente contratar um site ou robô de atendimento, ele aparecerá aqui para você gerenciar o progresso.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            let briefingObj: any = null;
            if (p.briefing) {
              try {
                briefingObj = JSON.parse(p.briefing);
              } catch (e) {}
            }

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 shadow-xl dark:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  {/* Card Top: Client & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="min-w-0">
                      <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                        {p.client_name || "Cliente sem Nome"}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 font-semibold mt-0.5">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  {/* Contratado */}
                  <div className="space-y-3 mb-6">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono block">
                        Item Contratado
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">{p.title}</h4>
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                        R$ {p.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (Taxa de Setup)
                      </div>
                    </div>

                    {/* Briefing Summary */}
                    {briefingObj && (
                      <div className="p-4 bg-indigo-50/70 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200/60 dark:border-indigo-500/20 text-xs space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 font-mono block">
                          Briefing do Cliente
                        </span>
                        {briefingObj.cores && (
                          <p className="text-slate-700 dark:text-slate-300">
                            <strong>Cores:</strong> {briefingObj.cores}
                          </p>
                        )}
                        {briefingObj.objetivo && (
                          <p className="text-slate-700 dark:text-slate-300">
                            <strong>Objetivo:</strong> {briefingObj.objetivo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openWhatsApp(p.client_phone, p.title)}
                      className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProject(p);
                        setNewStatus(p.status);
                      }}
                      className="py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5" /> Gerenciar
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/projeto/${p.id}`}
                      target="_blank"
                      className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver Visão do Cliente
                    </Link>
                    <button
                      onClick={() => copyTrackingLink(p.id)}
                      className="px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      title="Copiar Link de Tracking do Cliente"
                    >
                      {copiedId === p.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL GERENCIADOR DE TRACKING DO DEV ── */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-7 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Gerenciar Etapas &amp; Timeline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Cliente: {selectedProject.client_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Link de Tracking Rápidamente Copiável */}
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" /> Link de Acompanhamento do Cliente:
                </span>
                <button
                  onClick={() => copyTrackingLink(selectedProject.id)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                >
                  {copiedId === selectedProject.id ? (
                    <>
                      <Check className="w-3 h-3" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiar Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] font-mono text-indigo-900 dark:text-indigo-300 truncate">
                {typeof window !== "undefined" && `${window.location.origin}/projeto/${selectedProject.id}`}
              </p>
            </div>

            {/* Seletor de Etapas (Stepper) */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Selecione a Etapa Atual do Projeto:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STAGES.map((st) => {
                  const isSelected = newStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setNewStatus(st.id)}
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center justify-between">
                        <span>{st.label}</span>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <p className={`text-[10px] mt-1 font-medium ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                        {st.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mensagem Personalizada do Desenvolvedor */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mensagem / Atualização para a Timeline do Cliente:
              </label>
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder="Ex: Layout e protótipo concluídos. Iniciando código em Next.js!"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 outline-none font-medium resize-none"
              />
            </div>

            {/* Timeline Histórica no Banco */}
            {selectedProject.timelines && selectedProject.timelines.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Histórico Gravado no Banco de Dados:
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedProject.timelines.map((tl) => (
                    <div
                      key={tl.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-white/5 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{tl.message}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Autor: {tl.author}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {new Date(tl.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salvar Alterações */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={updating}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
              >
                {updating ? "Salvando Etapa..." : "Salvar & Atualizar Cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
