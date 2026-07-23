"use client";

import { useEffect, useState } from "react";
import {
  Rocket,
  CheckCircle2,
  Clock,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Code,
  Search,
  AlertCircle,
  Phone,
} from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";

const STAGES = [
  { id: "OPEN", label: "Pedido Recebido", desc: "Seu pedido foi registrado e está na fila do desenvolvedor." },
  { id: "IN_PROGRESS", label: "Desenvolvimento de Código", desc: "O código, design e fluxo estão sendo construídos." },
  { id: "REVIEW", label: "Em Análise & Testes", desc: "Revisando detalhes, testes de velocidade e homologação." },
  { id: "COMPLETED", label: "Concluído & Entregue 🎉", desc: "Seu projeto está no ar e 100% pronto para uso!" },
];

export default function ProjectStatusPage({ params }: { params: { leadId: string } }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Primeiro tenta buscar na API de projetos por ID
    fetch(`/api/projects?id=${params.leadId}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setProject(data);
          setLoading(false);
        } else {
          // Se não encontrar por project ID, tenta buscar na API de projeto/[leadId]
          fetch(`/api/projeto/${params.leadId}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.error) setError(d.error);
              else {
                setProject({
                  id: d.id,
                  client_name: d.clientName,
                  client_phone: d.clientPhone,
                  title: d.product || "Projeto Web / Atendimento",
                  price: d.value || 0,
                  status:
                    d.projectStatus === "entregue"
                      ? "COMPLETED"
                      : d.projectStatus === "em_desenvolvimento"
                      ? "IN_PROGRESS"
                      : d.projectStatus === "homologacao"
                      ? "REVIEW"
                      : "OPEN",
                  timelines: d.timeline
                    ? d.timeline.map((t: any) => ({
                        id: Math.random().toString(),
                        message: `Etapa: ${t.status}`,
                        created_at: t.date,
                      }))
                    : [],
                  partner: { name: d.devName, whatsappNumber: d.devWhatsapp },
                });
              }
            })
            .catch(() => setError("Projeto não encontrado"))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => setLoading(false));
  }, [params.leadId]);

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "OPEN":
        return 25;
      case "IN_PROGRESS":
        return 55;
      case "REVIEW":
        return 85;
      case "COMPLETED":
        return 100;
      default:
        return 15;
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case "OPEN":
        return 0;
      case "IN_PROGRESS":
        return 1;
      case "REVIEW":
        return 2;
      case "COMPLETED":
        return 3;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            Carregando acompanhamento do projeto...
          </span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="max-w-md w-full text-center space-y-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto text-2xl">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black">Projeto Não Encontrado</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            O código de acompanhamento informado não foi localizado em nossa base de dados.
          </p>
        </div>
      </div>
    );
  }

  const currentStageIdx = getStageIndex(project.status);
  const progressPercent = getProgressPercentage(project.status);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-300 relative py-12 px-4 font-sans">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20 dark:opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/10 dark:from-indigo-600/15 via-purple-600/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Theme Toggle Top Bar */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Acompanhamento de Projeto em Tempo Real
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Status do seu Projeto
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
            Cliente: <strong className="text-slate-900 dark:text-white">{project.client_name || "Cliente Nexus"}</strong>
          </p>
        </div>

        {/* Card Principal de Progresso */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 sm:p-8 shadow-xl dark:shadow-2xl space-y-8">
          {/* Item Contratado & Porcentagem */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/10">
            <div>
              <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">
                Projeto Contratado
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{project.title}</h2>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
                {progressPercent}%
              </span>
              <span className="text-[10px] block font-bold text-slate-500 font-mono">CONCLUÍDO</span>
            </div>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/10">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 rounded-full transition-all duration-700 shadow-md"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Stepper Timeline das Etapas */}
          <div className="space-y-6 pt-2">
            <h3 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400">
              Etapas do Desenvolvimento:
            </h3>

            <div className="space-y-4">
              {STAGES.map((st, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div
                    key={st.id}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? "bg-indigo-50/90 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30 text-slate-900 dark:text-white shadow-md ring-1 ring-indigo-500/20"
                        : isPassed
                        ? "bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300"
                        : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-white/5 opacity-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPassed
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{st.label}</h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-[9px] font-mono font-black bg-indigo-600 text-white rounded-md uppercase">
                            Em Andamento
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                        {st.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico Gravado na Timeline do Banco */}
          {project.timelines && project.timelines.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400">
                Últimas Atualizações da Equipe:
              </h4>
              <div className="space-y-2">
                {project.timelines.map((tl: any) => (
                  <div
                    key={tl.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-white/5 text-xs flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200">{tl.message}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {new Date(tl.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Falar com o Desenvolvedor Responsável */}
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 text-center space-y-3 shadow-xl">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Precisa de informações sobre seu projeto?</h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto">
            Nosso desenvolvedor principal está disponível no WhatsApp para responder qualquer dúvida sobre o andamento.
          </p>
          <a
            href={`https://wa.me/5588981885499?text=${encodeURIComponent(
              `Olá! Gostaria de tirar uma dúvida sobre o andamento do meu projeto (${project.title}).`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/25 active:scale-95"
          >
            <MessageSquare className="w-4 h-4" /> Falar com o Desenvolvedor Principal
          </a>
        </div>
      </div>
    </div>
  );
}
