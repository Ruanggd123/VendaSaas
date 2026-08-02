"use client";

import { useState, useEffect } from "react";
import {
  Rocket,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileText,
} from "lucide-react";

const STAGES = [
  { id: "OPEN", label: "Briefing & Planejamento", desc: "Envio de requisitos, marca e alinhamento do projeto." },
  { id: "IN_PROGRESS", label: "Em Desenvolvimento", desc: "Criação de telas, layout responsivo e programação." },
  { id: "REVIEW", label: "Homologação & Ajustes", desc: "Apresentação da prévia ao cliente para aprovação." },
  { id: "COMPLETED", label: "Publicado & Entregue", desc: "Site no ar com domínio próprio e SSL ativado!" },
];

export default function ClientMyProjectPage() {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [siteTitle, setSiteTitle] = useState("Desenvolvimento de Site Institucional");
  const [clientPhoneInput, setClientPhoneInput] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchMyProject();
  }, []);

  const fetchMyProject = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/my-project");
      const data = await res.json();
      if (data.project) {
        setProject(data.project);
      }
    } catch (e) {
      console.error("Erro ao buscar meu projeto:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/projects/my-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: siteTitle,
          client_phone: clientPhoneInput,
        }),
      });
      const newProj = await res.json();
      if (res.ok) {
        setProject(newProj);
      }
    } catch (e) {
      alert("Erro ao solicitar projeto");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Carregando seu projeto...</p>
      </div>
    );
  }

  // Caso 1: O cliente ainda não tem projeto cadastrado
  if (!project) {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase tracking-widest">
            <Rocket className="w-4 h-4" /> Solicitação de Desenvolvimento
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Solicitar Criação do seu Site
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium max-w-lg mx-auto">
            Gostaria de criar um site exclusivo para o seu negócio? Inicie a solicitação abaixo para liberar o formulário de briefing!
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Título do Projeto ou Nome da Sua Empresa (*):
              </label>
              <input
                type="text"
                required
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                placeholder="Ex: Site Institucional para Marmoraria Silva"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Seu WhatsApp para Alinhamento com o Desenvolvedor:
              </label>
              <input
                type="text"
                value={clientPhoneInput}
                onChange={(e) => setClientPhoneInput(e.target.value)}
                placeholder="Ex: (88) 98188-5499"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-medium outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>🚀 Solicitar Criação de Site Agora</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Caso 2: Projeto existente
  const currentStageIdx = STAGES.findIndex((s) => s.id === project.status);
  const progressPercent = currentStageIdx >= 0 ? Math.round(((currentStageIdx + 1) / STAGES.length) * 100) : 25;

  let savedBriefing: any = null;
  try {
    savedBriefing = typeof project.briefing === "string" ? JSON.parse(project.briefing) : project.briefing;
  } catch {}

  const trackingUrl = typeof window !== "undefined" ? `${window.location.origin}/projeto/${project.id}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Acompanhamento do Seu Projeto
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {project.title}
          </h1>
        </div>

        <button
          onClick={copyLink}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shrink-0 self-start sm:self-auto"
        >
          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copiedLink ? "Link Copiado!" : "Copiar Link de Rastreio Público"}</span>
        </button>
      </div>

      {/* Progresso Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-black uppercase text-slate-400">Progresso do Desenvolvimento</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{progressPercent}%</span>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/10">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {STAGES.map((st, idx) => {
            const isPassed = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={st.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-indigo-50/90 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30 text-slate-900 dark:text-white ring-1 ring-indigo-500/20"
                    : isPassed
                    ? "bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300"
                    : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-white/5 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isPassed
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">{st.label}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{st.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulário / Dados do Briefing */}
      <BriefingFormOrView
        projectId={project.id}
        savedBriefing={savedBriefing}
        onSaved={(newBriefing) => {
          setProject((prev: any) => ({
            ...prev,
            briefing: newBriefing,
            status: prev.status === "OPEN" ? "IN_PROGRESS" : prev.status,
          }));
        }}
      />

      {/* WhatsApp Desenvolvedor */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 text-center space-y-3 shadow-xl">
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Dúvidas sobre o andamento?</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Fale diretamente com nosso desenvolvedor principal pelo WhatsApp.
        </p>
        <a
          href={`https://wa.me/5588981885499?text=${encodeURIComponent(
            `Olá! Gostaria de falar sobre o meu projeto (${project.title}).`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <MessageSquare className="w-4 h-4" /> Falar com o Desenvolvedor Responsável
        </a>
      </div>
    </div>
  );
}

function BriefingFormOrView({
  projectId,
  savedBriefing,
  onSaved,
}: {
  projectId: string;
  savedBriefing: any;
  onSaved: (briefing: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(!savedBriefing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_type: savedBriefing?.project_type || "Site Institucional Completo",
    company_name: savedBriefing?.company_name || "",
    slogan: savedBriefing?.slogan || "",
    preferred_colors: savedBriefing?.preferred_colors || "",
    main_services: savedBriefing?.main_services || "",
    whatsapp_button: savedBriefing?.whatsapp_button || "",
    inspiration_links: savedBriefing?.inspiration_links || "",
    additional_notes: savedBriefing?.additional_notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, briefing: form }),
      });
      if (res.ok) {
        setIsEditing(false);
        onSaved(form);
      }
    } catch (e) {
      alert("Erro ao salvar briefing");
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing && savedBriefing) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Briefing do Seu Site Enviado
          </h3>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl border border-slate-200 dark:border-white/10"
          >
            ✏️ Editar Briefing
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Empresa / Marca:</span>
            <p className="font-extrabold text-slate-900 dark:text-white">{savedBriefing.company_name || "Não informado"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Projeto:</span>
            <p className="font-extrabold text-indigo-600 dark:text-indigo-400">{savedBriefing.project_type || "Site"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Cores Preferidas:</span>
            <p className="font-bold text-purple-600 dark:text-purple-400">{savedBriefing.preferred_colors || "A critério do designer"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp no Botão do Site:</span>
            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{savedBriefing.whatsapp_button || "Não informado"}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Serviços / Produtos a Exibir:</span>
            <p className="font-medium text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{savedBriefing.main_services || "Não informado"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-xl space-y-6">
      <div className="pb-4 border-b border-slate-100 dark:border-white/10">
        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span>Formulário de Briefing — Requisitos do seu Site</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1">Preencha os detalhes para iniciarmos o desenvolvimento do seu site!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">1. Nome da sua Empresa / Marca (*):</label>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Ex: Marmoraria Silva"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">2. Tipo de Projeto:</label>
            <select
              value={form.project_type}
              onChange={(e) => setForm({ ...form, project_type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            >
              <option value="Site Institucional Completo">Site Institucional Completo</option>
              <option value="Landing Page de Alta Conversão">Landing Page de Alta Conversão</option>
              <option value="Loja Virtual E-Commerce">Loja Virtual E-Commerce</option>
              <option value="Plataforma SaaS / Sistema Web">Plataforma SaaS / Sistema Web</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">3. Slogan ou Frase Principal:</label>
            <input
              type="text"
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              placeholder="Ex: Sofisticação e qualidade em mármores"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">4. Cores Preferidas / Estilo Visual:</label>
            <input
              type="text"
              value={form.preferred_colors}
              onChange={(e) => setForm({ ...form, preferred_colors: e.target.value })}
              placeholder="Ex: Dourado e preto, estilo luxuoso clean"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">5. WhatsApp para o botão do site (*):</label>
            <input
              type="text"
              required
              value={form.whatsapp_button}
              onChange={(e) => setForm({ ...form, whatsapp_button: e.target.value })}
              placeholder="Ex: (88) 98188-5499"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">6. Principais Serviços / Produtos a destacar (*):</label>
            <textarea
              required
              rows={3}
              value={form.main_services}
              onChange={(e) => setForm({ ...form, main_services: e.target.value })}
              placeholder="Ex: Bancadas de cozinha, pias de banheiro, soleiras, lavatórios e pisos de granito."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-xl shadow-indigo-600/20 uppercase tracking-wider transition-all disabled:opacity-50"
        >
          {saving ? "Salvando..." : "🚀 Enviar Briefing ao Desenvolvedor"}
        </button>
      </form>
    </div>
  );
}
