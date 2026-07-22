"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeBaseTab } from "@/components/settings/KnowledgeBaseTab";
import { ModulesTab } from "@/components/settings/ModulesTab";
import { BlacklistPanel } from "@/components/settings/BlacklistPanel";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface AISettings {
  bot_type?: string;
  ai_name: string;
  ai_personality: string;
  ai_prompt: string;
  // Horário global (fallback)
  business_hours_start: string;
  business_hours_end: string;
  business_days: string[];
  // Horário por dia (sobrescreve o global)
  schedule_per_day: Record<string, { enabled: boolean; start: string; end: string; max_appointments: number }>;
  // Intervalo entre agendamentos (minutos)
  appointment_gap_min: number;
  off_hours_message: string;
  products: Product[];
  // Feriados e Modo Gerente
  manager_phone: string;
  blocked_dates: string[];
  openai_api_key?: string;
  ia_model?: string;
}

interface Product {
  name: string;
  price: string;
  description: string;
  duration_min: number;   // Duração do serviço em minutos
  requires_payment: boolean; // Se exige pagamento antes de agendar
  image_url?: string;
  delivery_type?: "physical" | "virtual_instant" | "virtual_deadline" | "both" | "service";
  digital_content?: string; // Conteúdo/link de entrega digital
  is_unique_keys?: boolean; // Se ativado, digital_content é um banco de chaves (uma por linha)
}

interface ModuleSettings {
  module_scheduling: boolean;
  module_payments: boolean;
  module_debt_collection: boolean;
  module_reminders: boolean;
  module_hybrid_mode: boolean;
  module_google_calendar: boolean;
}

interface PaymentSettings {
  payment_provider: string;
  asaas_api_key: string;
  asaas_test_api_key: string;
  asaas_webhook_secret: string;
  asaas_mode: string;
  mercadopago_access_token: string;
  mercadopago_test_access_token: string;
  mercadopago_mode: string;
  plan_solo_price: string;
  plan_pro_price: string;
  plan_business_price: string;
  auto_charge_enabled: string;
  auto_charge_days: string;
  late_fee_percent: string;
}

const WEEK_DAYS = [
  { id: "mon", label: "Seg" },
  { id: "tue", label: "Ter" },
  { id: "wed", label: "Qua" },
  { id: "thu", label: "Qui" },
  { id: "fri", label: "Sex" },
  { id: "sat", label: "Sáb" },
  { id: "sun", label: "Dom" },
];

const DEFAULT_SCHEDULE_PER_DAY: Record<string, { enabled: boolean; start: string; end: string; max_appointments: number }> = {
  mon: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  tue: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  wed: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  thu: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  fri: { enabled: true,  start: "08:00", end: "18:00", max_appointments: 8 },
  sat: { enabled: false, start: "09:00", end: "14:00", max_appointments: 4 },
  sun: { enabled: false, start: "09:00", end: "12:00", max_appointments: 2 },
};

const DEFAULT_AI: AISettings = {
  bot_type: "ia",
  ai_name: "",
  ai_personality: "profissional",
  ai_prompt: "",
  business_hours_start: "08:00",
  business_hours_end: "18:00",
  business_days: ["mon", "tue", "wed", "thu", "fri"],
  schedule_per_day: DEFAULT_SCHEDULE_PER_DAY,
  appointment_gap_min: 15,
  off_hours_message: "Olá! Estamos fora do horário de atendimento. Retornaremos em breve! 🌙",
  products: [],
  manager_phone: "",
  blocked_dates: [],
  openai_api_key: "",
  ia_model: "gpt-4o-mini",
};

const DEFAULT_MODULES: ModuleSettings = {
  module_scheduling: true,
  module_payments: false,
  module_debt_collection: false,
  module_reminders: true,
  module_hybrid_mode: false,
  module_google_calendar: false,
};

// ─────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-purple-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function InputField({
  label, value, onChange, placeholder, type = "text", hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-zinc-500 mb-2">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
      />
    </div>
  );
}

function SaveButton({ saving, onClick, label = "Salvar Configurações" }: {
  saving: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-500/20"
    >
      {saving ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Salvando...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function Alert({ type, message, onClose }: {
  type: "success" | "error"; message: string; onClose: () => void;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
      type === "success"
        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
        : "bg-red-500/10 border border-red-500/20 text-red-300"
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// ABAS
// ─────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas não conferem");
      return;
    }
    
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Erro ao alterar senha");
      
      setStatus("success");
      setMessage("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-medium text-white mb-1">Segurança e Login</h2>
        <p className="text-sm text-zinc-400 mb-6">Altere sua senha de acesso ao painel.</p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm border ${
            status === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Senha Atual</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nova Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            />
          </div>
          
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            {status === "loading" ? "Alterando..." : "Alterar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AITab() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showAiKey, setShowAiKey] = useState(false);
  const [userRole, setUserRole] = useState<string>("manager");

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(d => { if (d?.user?.role) setUserRole(d.user.role); })
      .catch(() => {});

    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings({ ...DEFAULT_AI, ...data.settings });
      });
  }, []);

  const update = (key: keyof AISettings, value: unknown) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const toggleDay = (day: string) => {
    const days = settings.business_days.includes(day)
      ? settings.business_days.filter((d) => d !== day)
      : [...settings.business_days, day];
    update("business_days", days);
  };

  const [productUploadState, setProductUploadState] = useState<Record<number, { uploading: boolean; error: string | null }>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [digitalUploadState, setDigitalUploadState] = useState<Record<number, { uploading: boolean; error: string | null }>>({});
  const digitalFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const addProduct = () =>
    update("products", [...settings.products, { name: "", price: "", description: "", duration_min: 60, requires_payment: false, image_url: "" }]);

  const updateProduct = (i: number, field: keyof Product, value: any) => {
    const products = [...settings.products];
    products[i] = { ...products[i], [field]: value };
    update("products", products);
  };

  const removeProduct = (i: number) =>
    update("products", settings.products.filter((_, idx) => idx !== i));

  const handleImageUpload = async (i: number, file: File) => {
    setProductUploadState((s) => ({ ...s, [i]: { uploading: true, error: null } }));
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "URL não retornada");
      updateProduct(i, "image_url", data.url);
      setProductUploadState((s) => ({ ...s, [i]: { uploading: false, error: null } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar imagem";
      setProductUploadState((s) => ({ ...s, [i]: { uploading: false, error: msg } }));
    }
  };

  const handleDigitalUpload = async (i: number, file: File) => {
    setDigitalUploadState((s) => ({ ...s, [i]: { uploading: true, error: null } }));
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Falha no upload");
      const data = await res.json();
      if (!data.url) throw new Error(data.error || "URL não retornada");
      updateProduct(i, "digital_content", data.url);
      setDigitalUploadState((s) => ({ ...s, [i]: { uploading: false, error: null } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar arquivo";
      setDigitalUploadState((s) => ({ ...s, [i]: { uploading: false, error: msg } }));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Erro ao salvar");
      setAlert({ type: "success", msg: "Configurações da IA salvas com sucesso! ✅" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Identidade da IA */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-semibold text-white">Identidade da IA & Atendimento</h3>
            <p className="text-xs text-zinc-500">Como a automação do WhatsApp se comporta com seus clientes</p>
          </div>
        </div>

        {/* Tipo de Bot Selector */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
          <label className="block text-sm font-semibold text-zinc-300">Tipo de Atendente Automático</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => update("bot_type", "ia")}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.bot_type !== "regras"
                  ? "bg-purple-600/10 border-purple-500 shadow-inner"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">🤖</span>
                <span className="font-bold text-white text-sm">Atendente Inteligência Artificial (IA)</span>
              </div>
              <p className="text-xs text-zinc-400">Conversa livre, natural, tira dúvidas do catálogo, qualifica leads e agenda horários.</p>
            </button>

            <button
              type="button"
              onClick={() => update("bot_type", "regras")}
              className={`p-4 rounded-xl border text-left transition-all ${
                settings.bot_type === "regras"
                  ? "bg-purple-600/10 border-purple-500 shadow-inner"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">📋</span>
                <span className="font-bold text-white text-sm">Atendente de Regras / Menu (Sem IA)</span>
              </div>
              <p className="text-xs text-zinc-400">Menu passo-a-passo numérico (oi, voltar, 1, 2, 3). Respostas rápidas e agendamento guiado.</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField
            label="Nome da IA"
            value={settings.ai_name}
            onChange={(v) => {
              update("ai_name", v);
              if (settings.ai_personality !== "personalizada") {
                update("ai_prompt", getPresetPrompt(settings.ai_personality, v));
              }
            }}
            placeholder="Ex: Sofia, Carlos, Assistente..."
          />
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Personalidade</label>
            <select
              value={settings.ai_personality}
              onChange={(e) => {
                const val = e.target.value;
                update("ai_personality", val);
                if (val !== "personalizada") {
                  update("ai_prompt", getPresetPrompt(val, settings.ai_name));
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
            >
              <option value="profissional" className="bg-zinc-900">Profissional e Direto</option>
              <option value="descontraido" className="bg-zinc-900">Descontraído e Amigável</option>
              <option value="vendedor" className="bg-zinc-900">Focado em Vendas (Persuasivo)</option>
              <option value="clinico" className="bg-zinc-900">Clínico (Cuidadoso e Empático)</option>
              <option value="tecnico" className="bg-zinc-900">Técnico (Preciso e Informativo)</option>
              <option value="personalizada" className="bg-zinc-900">Personalizada ✍️ (Manual)</option>
            </select>
          </div>
        </div>

        {userRole === 'superadmin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Modelo da IA</label>
              <select
                value={settings.ia_model || "llama-3.3-70b-versatile"}
                onChange={(e) => update("ia_model", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
              >
                <option value="llama-3.3-70b-versatile" className="bg-zinc-900">Llama 3.3 70B (Nuvem - Groq)</option>
                <option value="gemini-1.5-flash" className="bg-zinc-900">Gemini 1.5 Flash (Google)</option>
                <option value="llama3.1" className="bg-zinc-900">Llama 3.1 (Servidor Local - Ollama)</option>
              </select>
            </div>
          </div>
        )}

        {settings.ai_personality === "personalizada" && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-purple-300 mb-1.5">Prompt do Sistema Personalizado</label>
            <p className="text-xs text-zinc-500 mb-2">
              Instruções completas de como a IA deve se comportar. Seja específico: mencione produtos, regras e tom de voz.
            </p>
            <textarea
              value={settings.ai_prompt}
              onChange={(e) => update("ai_prompt", e.target.value)}
              placeholder="Ex: Você é a Sofia, assistente virtual. Sua missão é agendar consultas..."
              rows={6}
              className="w-full rounded-xl border border-purple-500/30 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all resize-none shadow-[0_0_15px_rgba(168,85,247,0.1)]"
            />
          </div>
        )}
      </section>

      {/* Horário de Atendimento */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🕐</span>
          <div>
            <h3 className="font-semibold text-white">Horário de Atendimento por Dia</h3>
            <p className="text-xs text-zinc-500">Configure individualmente cada dia da semana</p>
          </div>
        </div>

        {/* Grade por dia */}
        <div className="space-y-3">
          {WEEK_DAYS.map((day) => {
            const dayConfig = (settings.schedule_per_day || DEFAULT_SCHEDULE_PER_DAY)[day.id] ||
              DEFAULT_SCHEDULE_PER_DAY[day.id];
            return (
              <div key={day.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${
                dayConfig.enabled ? "border-purple-500/20 bg-purple-500/5" : "border-white/5 bg-black/20 opacity-60"
              }`}>
                <div className="flex items-center gap-3 min-w-[90px]">
                  <Toggle
                    enabled={dayConfig.enabled}
                    onChange={(v) => update("schedule_per_day", {
                      ...settings.schedule_per_day,
                      [day.id]: { ...dayConfig, enabled: v },
                    })}
                  />
                  <span className={`text-sm font-semibold ${dayConfig.enabled ? "text-white" : "text-zinc-500"}`}>
                    {day.label}
                  </span>
                </div>

                {dayConfig.enabled && (
                  <div className="flex flex-wrap items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-zinc-400">Das</label>
                      <input type="time" value={dayConfig.start}
                        onChange={(e) => update("schedule_per_day", {
                          ...settings.schedule_per_day,
                          [day.id]: { ...dayConfig, start: e.target.value },
                        })}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white text-sm focus:border-purple-500 focus:outline-none" />
                      <label className="text-xs text-zinc-400">até</label>
                      <input type="time" value={dayConfig.end}
                        onChange={(e) => update("schedule_per_day", {
                          ...settings.schedule_per_day,
                          [day.id]: { ...dayConfig, end: e.target.value },
                        })}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-white text-sm focus:border-purple-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-zinc-400">Máx. agend.</label>
                      <input type="number" min={1} max={99} value={dayConfig.max_appointments}
                        onChange={(e) => update("schedule_per_day", {
                          ...settings.schedule_per_day,
                          [day.id]: { ...dayConfig, max_appointments: parseInt(e.target.value) || 1 },
                        })}
                        className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white text-sm text-center focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                )}

                {!dayConfig.enabled && (
                  <span className="text-xs text-zinc-600">Fechado</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Intervalo entre agendamentos */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-black/10">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Intervalo entre Agendamentos</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tempo de respiro entre um atendimento e o próximo</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 justify-end">
              {[0, 10, 15, 20, 30].map((min) => (
                <button key={min} onClick={() => update("appointment_gap_min", min)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    settings.appointment_gap_min === min
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"
                  }`}>
                  {min === 0 ? "Sem intervalo" : `${min} min`}
                </button>
              ))}
              <button onClick={() => {
                if ([0, 10, 15, 20, 30].includes(settings.appointment_gap_min)) {
                  update("appointment_gap_min", 45); // default custom
                }
              }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  ![0, 10, 15, 20, 30].includes(settings.appointment_gap_min)
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"
                }`}>
                Personalizado
              </button>
            </div>
            {![0, 10, 15, 20, 30].includes(settings.appointment_gap_min) && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-black/40">
                <span className="text-xs text-zinc-400">Minutos personalizados:</span>
                <input
                  type="number"
                  min="1"
                  value={settings.appointment_gap_min || ""}
                  onChange={(e) => update("appointment_gap_min", parseInt(e.target.value) || 0)}
                  className="w-20 bg-black/40 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mensagem Fora do Horário</label>
          <textarea
            value={settings.off_hours_message}
            onChange={(e) => update("off_hours_message", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all resize-none"
          />
        </div>
      </section>

      {/* Feriados e Modo Gerente */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👑</span>
          <div>
            <h3 className="font-semibold text-white">Modo Gerente & Feriados</h3>
            <p className="text-xs text-zinc-500">Controle a IA diretamente pelo seu WhatsApp e bloqueie datas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telefone do Chefe */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Seu WhatsApp (Número do Chefe)</label>
              <p className="text-xs text-zinc-500 mb-2">A IA saberá que é você. Mande mensagens como "Quais meus agendamentos hoje?" ou "Feche minha agenda amanhã".</p>
              <input
                type="text"
                value={settings.manager_phone}
                onChange={(e) => update("manager_phone", e.target.value)}
                placeholder="Ex: 5511999999999"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Feriados */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Datas Bloqueadas (Feriados/Folgas)</label>
              <p className="text-xs text-zinc-500 mb-2">A IA não agendará nada nessas datas.</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="date"
                  id="new_holiday"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const el = document.getElementById("new_holiday") as HTMLInputElement;
                    if (el.value && !settings.blocked_dates?.includes(el.value)) {
                      update("blocked_dates", [...(settings.blocked_dates || []), el.value]);
                      el.value = "";
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(!settings.blocked_dates || settings.blocked_dates.length === 0) && (
                  <span className="text-xs text-zinc-600">Nenhuma data bloqueada</span>
                )}
                {settings.blocked_dates?.map((date) => (
                  <span key={date} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-zinc-300">
                    {new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                    <button
                      onClick={() => update("blocked_dates", settings.blocked_dates.filter(d => d !== date))}
                      className="text-red-400 hover:text-red-300 ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Produtos */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <div>
              <h3 className="font-semibold text-white">Catálogo de Produtos / Serviços</h3>
              <p className="text-xs text-zinc-500">A IA usará esses dados para apresentar preços, durações e cobranças</p>
            </div>
          </div>
          <button onClick={addProduct}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white rounded-xl text-sm font-bold border border-purple-400/20 transition-all active:scale-95 shadow-lg shadow-purple-500/20">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Produto
          </button>
        </div>

        {settings.products.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <span className="text-4xl block mb-3">📦</span>
            Nenhum produto/serviço cadastrado. Clique em <strong className="text-purple-400">Adicionar</strong> para começar!
          </div>
        ) : (
          <div className="space-y-4">
            {settings.products.map((product, i) => {
              const uploadState = productUploadState[i];
              const deliveryLabels: Record<string, { icon: string; label: string }> = {
                service: { icon: '🗓️', label: 'Serviço (Agendamento)' },
                physical: { icon: '📦', label: 'Físico (Delivery/Retirada)' },
                virtual_instant: { icon: '⚡', label: 'Digital Imediato' },
                virtual_deadline: { icon: '⏳', label: 'Digital com Prazo' },
                both: { icon: '📦⚡', label: 'Digital + Físico' },
              };
              const dl = deliveryLabels[product.delivery_type || 'service'] || { icon: '🗓️', label: product.delivery_type };

              return (
              <div key={i} className="p-5 bg-gradient-to-br from-[#0a0a0c] to-[#0d0d10] rounded-2xl border border-white/10 shadow-lg space-y-6 relative overflow-hidden group hover:border-purple-500/20 transition-all">
                {/* Header badge */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/10 flex items-center justify-center shrink-0">
                      <span className="text-lg">{dl.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <input value={product.name}
                        onChange={(e) => updateProduct(i, "name", e.target.value)}
                        placeholder="Nome do Produto/Serviço"
                        className="w-full bg-transparent text-base font-bold text-white placeholder-zinc-600 focus:outline-none border-b border-transparent focus:border-purple-500/50 pb-0.5 transition-all" />
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-emerald-400">
                          R$ {product.price || '0,00'}
                        </span>
                        <span className="text-[10px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded-full">
                          {dl.icon} {dl.label}
                        </span>
                        {product.requires_payment && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            💳 Pagamento obrigatório
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeProduct(i)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remover Produto">
                    ✕
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5"></div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Descrição</label>
                  <input value={product.description}
                    onChange={(e) => updateProduct(i, "description", e.target.value)}
                    placeholder="Descreva brevemente o produto para a IA apresentar aos clientes"
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-600 focus:border-purple-500/50 focus:bg-white/5 transition-all outline-none" />
                </div>

                {/* Grid: Image + Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Image */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                      <span>🖼️</span> Imagem de Vitrine (WhatsApp)
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 shrink-0">
                        {product.image_url ? (
                          <div className="relative group w-full h-full">
                            <img src={product.image_url} alt="" className="rounded-xl object-cover w-full h-full border border-white/10" />
                            <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <button onClick={() => fileInputRefs.current[i]?.click()} className="text-[10px] text-white bg-white/20 px-1.5 py-0.5 rounded">Trocar</button>
                              <button onClick={() => updateProduct(i, "image_url", "")} className="text-[10px] text-red-300 bg-red-500/20 px-1.5 py-0.5 rounded">X</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRefs.current[i]?.click()} disabled={uploadState?.uploading}
                            className="w-full h-full rounded-xl border-2 border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/40 transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50">
                            {uploadState?.uploading ? (
                              <span className="text-[10px] text-zinc-500">Enviando...</span>
                            ) : (
                              <>
                                <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                <span className="text-[9px] text-zinc-600">Adicionar Foto</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <input value={product.image_url || ""}
                        onChange={(e) => updateProduct(i, "image_url", e.target.value)}
                        placeholder="ou cole URL da imagem..."
                        className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-purple-500/50 transition-all outline-none" />
                    </div>
                    <input ref={(el) => { fileInputRefs.current[i] = el; }} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(i, file); e.target.value = ""; }} />
                    {uploadState?.error && <p className="text-xs text-red-400">⚠️ {uploadState.error}</p>}
                  </div>

                  {/* Right: Delivery & Payment */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Tipo de Entrega</label>
                      <select value={product.delivery_type || "service"}
                        onChange={(e) => {
                          const products = [...settings.products];
                          products[i] = { ...products[i], delivery_type: e.target.value as any };
                          update("products", products);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-zinc-300 outline-none focus:border-purple-500 transition-all">
                        <option value="service" className="bg-zinc-900">🗓️ Serviço (Agendamento)</option>
                        <option value="physical" className="bg-zinc-900">📦 Físico (Delivery / Retirada)</option>
                        <option value="virtual_instant" className="bg-zinc-900">⚡ Digital Imediato</option>
                        <option value="virtual_deadline" className="bg-zinc-900">⏳ Digital com Prazo</option>
                        <option value="both" className="bg-zinc-900">📦⚡ Digital + Físico</option>
                      </select>
                    </div>

                    {product.delivery_type === "service" && (
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Duração do Atendimento</label>
                        <div className="flex flex-wrap gap-1.5">
                          {[15, 30, 45, 60, 90, 120].map((min) => (
                            <button key={min} onClick={() => updateProduct(i, "duration_min", min)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                (product.duration_min || 60) === min
                                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"
                              }`}>
                              {min < 60 ? `${min}min` : `${Math.floor(min / 60)}h${min % 60 ? '' : ''}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                      <Toggle enabled={product.requires_payment || false} onChange={(v) => updateProduct(i, "requires_payment", v)} />
                      <div>
                        <p className="text-xs font-semibold text-purple-100">Exigir Pagamento</p>
                        <p className="text-[10px] text-zinc-500">Cliente precisa pagar antes de confirmar</p>
                      </div>
                    </div>

                    {product.delivery_type === "virtual_instant" && (
                      <div className={`p-3 rounded-xl border transition-all ${product.is_unique_keys ? 'bg-indigo-900/10 border-indigo-500/20' : 'bg-blue-500/5 border-blue-500/10'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${product.is_unique_keys ? 'text-indigo-400' : 'text-blue-400'}`}>
                            {product.is_unique_keys ? '🔑 Estoque Único (chaves/contas)' : '📄 Conteúdo Digital'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-zinc-500">Estoque único</span>
                            <Toggle enabled={product.is_unique_keys || false} onChange={(v) => updateProduct(i, "is_unique_keys", v)} />
                          </div>
                        </div>
                        {product.is_unique_keys ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] text-zinc-500">Uma chave por linha (entregue e removida)</span>
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">📦 {product.digital_content ? product.digital_content.split('\n').filter(Boolean).length : 0} em estoque</span>
                            </div>
                            <textarea value={product.digital_content || ""}
                              onChange={(e) => updateProduct(i, "digital_content", e.target.value)}
                              placeholder="joao@email.com,senha123&#10;maria@email.com,senha456&#10;ABCD-1234"
                              className="w-full h-20 bg-[#09090b] border border-indigo-500/30 rounded-lg p-2 text-[11px] text-indigo-100 font-mono focus:border-indigo-500/70 resize-none" />
                          </>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <textarea value={product.digital_content || ""}
                              onChange={(e) => updateProduct(i, "digital_content", e.target.value)}
                              placeholder="Link de download ou texto que será enviado a todos os compradores"
                              className="w-full h-14 bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-blue-500/50 resize-none" />
                            <button type="button" onClick={() => digitalFileInputRefs.current[i]?.click()} disabled={digitalUploadState[i]?.uploading}
                              className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center">
                              {digitalUploadState[i]?.uploading ? "Enviando..." : "📁 Upload de PDF / Arquivo"}
                            </button>
                            <input ref={(el) => { digitalFileInputRefs.current[i] = el; }} type="file" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleDigitalUpload(i, file); e.target.value = ""; }} />
                          </div>
                        )}
                        {digitalUploadState[i]?.error && <p className="text-[10px] text-red-400 mt-1">⚠️ {digitalUploadState[i]?.error}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={save} />
      </div>
    </div>
  );
}

function PaymentTab() {
  const [settings, setSettings] = useState<PaymentSettings>({
    payment_provider: "mercadopago",
    asaas_api_key: "",
    asaas_webhook_secret: "",
    mercadopago_access_token: "",
    plan_solo_price: "",
    plan_pro_price: "",
    plan_business_price: "",
    auto_charge_enabled: "false",
    auto_charge_days: "3",
    late_fee_percent: "2",
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
      });
  }, []);

  const update = (key: keyof PaymentSettings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      setAlert({ type: "success", msg: "Configurações de recebimento salvas! ✅" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar integrações de pagamento." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Provedor de Pagamento */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h3 className="font-semibold text-white">Provedor de Pagamento</h3>
            <p className="text-xs text-zinc-500">Escolha qual gateway de pagamento você usará</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "asaas", label: "Asaas", desc: "Boleto, Pix, Cartão (BR)" },
            { id: "mercadopago", label: "Mercado Pago", desc: "Pix, Cartão, Link" },
            { id: "stripe", label: "Stripe", desc: "Internacional" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => update("payment_provider", p.id)}
              className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                settings.payment_provider === p.id
                  ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              <span className="font-semibold text-white">{p.label}</span>
              <span className="text-xs text-zinc-400 mt-0.5">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* Campos por provedor */}
        {settings.payment_provider === "asaas" && (
          <div className="space-y-4 pt-2">

            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Ambiente de Pagamento</p>
                <p className="text-xs text-zinc-400">Escolha entre testes e produção real</p>
              </div>
              <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                <button
                  onClick={() => update("asaas_mode", "test")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    settings.asaas_mode === "test" || !settings.asaas_mode
                      ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Teste
                </button>
                <button
                  onClick={() => update("asaas_mode", "production")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    settings.asaas_mode === "production"
                      ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Produção
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                API Key Asaas {settings.asaas_mode === "production" ? "(Produção)" : "(Sandbox / Teste)"}
              </label>
              <button
                onClick={() => setShowKeys(!showKeys)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showKeys ? "🙈 Ocultar" : "👁 Mostrar"}
              </button>
            </div>
            <input
              type={showKeys ? "text" : "password"}
              value={settings.asaas_mode === "production" ? settings.asaas_api_key : settings.asaas_test_api_key}
              onChange={(e) => update(settings.asaas_mode === "production" ? "asaas_api_key" : "asaas_test_api_key", e.target.value)}
              placeholder="$aact_..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm"
            />
            <InputField
              label="Webhook Secret (Asaas)"
              value={settings.asaas_webhook_secret}
              onChange={(v) => update("asaas_webhook_secret", v)}
              placeholder="Chave para validar os webhooks recebidos"
              hint="Configure este mesmo valor no painel do Asaas em Configurações > Integrações > Webhooks"
            />
          </div>
        )}

        {settings.payment_provider === "mercadopago" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10">
              <div>
                <p className="text-sm font-medium text-white">Ambiente de Pagamento</p>
                <p className="text-xs text-zinc-400">Escolha entre credenciais de Teste ou Produção</p>
              </div>
              <div className="flex gap-2 p-1 bg-black/40 rounded-lg">
                <button
                  onClick={() => update("mercadopago_mode", "test")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    settings.mercadopago_mode === "test" || !settings.mercadopago_mode
                      ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Teste
                </button>
                <button
                  onClick={() => update("mercadopago_mode", "production")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    settings.mercadopago_mode === "production"
                      ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Produção
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                Access Token Mercado Pago {settings.mercadopago_mode === "production" ? "(Produção)" : "(Teste)"}
              </label>
              <button
                onClick={() => setShowKeys(!showKeys)}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showKeys ? "🙈 Ocultar" : "👁 Mostrar"}
              </button>
            </div>
            <input
              type={showKeys ? "text" : "password"}
              value={settings.mercadopago_mode === "production" ? settings.mercadopago_access_token : settings.mercadopago_test_access_token}
              onChange={(e) => update(settings.mercadopago_mode === "production" ? "mercadopago_access_token" : "mercadopago_test_access_token", e.target.value)}
              placeholder={settings.mercadopago_mode === "production" ? "APP_USR-..." : "TEST-..."}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm"
            />
          </div>
        )}
      </section>



      {/* Regras de Cobrança */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h3 className="font-semibold text-white">Regras de Cobrança Automática</h3>
            <p className="text-xs text-zinc-500">Como o sistema se comporta com pagamentos pendentes</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
          <div>
            <p className="text-sm font-medium text-white">Cobrança Automática de Inadimplentes</p>
            <p className="text-xs text-zinc-400 mt-0.5">Enviar cobranças automáticas via WhatsApp para clientes com pagamento vencido</p>
          </div>
          <Toggle
            enabled={settings.auto_charge_enabled === "true"}
            onChange={(v) => update("auto_charge_enabled", String(v))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField
            label="Dias para Recobrança"
            value={settings.auto_charge_days}
            onChange={(v) => update("auto_charge_days", v)}
            placeholder="3"
            type="number"
            hint="A cada quantos dias o sistema reenvia a cobrança para inadimplentes"
          />
          <InputField
            label="Multa por Atraso (%)"
            value={settings.late_fee_percent}
            onChange={(v) => update("late_fee_percent", v)}
            placeholder="2"
            type="number"
            hint="Percentual de multa aplicado ao valor em atraso (ex: 2 = 2% ao mês)"
          />
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300">
          <strong>URL do Webhook:</strong>{" "}
          <code className="font-mono text-xs bg-black/30 px-2 py-0.5 rounded">
            https://seusite.com/api/webhooks/asaas
          </code>{" "}
          — Configure este endereço no painel do seu provedor de pagamento para receber confirmações automáticas.
        </div>
      </section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={save} label="Salvar Configurações de Pagamento" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

const TABS = [
  { id: "ai", label: "🤖 IA & WhatsApp" },
  { id: "widget", label: "💬 Widget Site" },
  { id: "modules", label: "🧩 Módulos" },
  { id: "knowledge", label: "🧠 Conhecimento (RAG)" },
  { id: "payment", label: "💳 Pagamento" },
  { id: "blacklist", label: "🚫 Lista Negra" },
  { id: "security", label: "🔐 Segurança" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.tenantId) setTenantId(data.tenantId);
        // Se a empresa ainda não tiver um nome de IA configurado, redireciona para o Wizard inicial
        if (!data.settings || !data.settings.ai_name) {
          router.push("/onboarding");
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-transparent text-white relative overflow-hidden">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-zinc-400 text-sm">Carregando painel corporativo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex justify-center bg-transparent text-white p-4 relative overflow-hidden">
      {/* Background Lights */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-white/[0.02] border border-white/10 rounded-3xl p-8 md:p-10 backdrop-blur-3xl shadow-2xl relative z-10 flex flex-col h-fit">
        {/* Header */}
        <header className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Configuração da Empresa
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">Controle total do seu sistema de atendimento, IA e vendas.</p>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "ai" && <AITab />}
          {activeTab === "widget" && <WidgetTab tenantId={tenantId} />}
          {activeTab === "modules" && <ModulesTab />}
          {activeTab === "knowledge" && <KnowledgeBaseTab />}
          {activeTab === "payment" && <PaymentTab />}
          {activeTab === "blacklist" && <BlacklistPanel isOpen={true} onClose={() => setActiveTab("ai")} />}
          {activeTab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

const getPresetPrompt = (personality: string, name: string) => {
  const aiName = name || "Sofia";
  switch (personality) {
    case "profissional":
      return `Você é a ${aiName}, assistente virtual profissional e direta. Seu objetivo é ajudar o cliente de forma objetiva, mantendo um tom corporativo, polido, educado e focado em resolver as dúvidas de forma ágil.`;
    case "descontraido":
      return `Você é a ${aiName}, assistente virtual descontraída e muito amigável. Use um tom leve, casual, simpático e acolhedor. Converse de forma natural e próxima ao cliente, sendo muito prestativa.`;
    case "vendedor":
      return `Você é a ${aiName}, assistente virtual de vendas persuasiva. Identifique as necessidades do cliente, apresente os benefícios dos nossos produtos/serviços de forma atraente e incentive o fechamento da compra ou agendamento de forma ativa e entusiasmada.`;
    case "clinico":
      return `Você é a ${aiName}, assistente de atendimento em saúde. Seu tom é extremamente cuidadoso, empático, atencioso e seguro, transmitindo confiança para o agendamento de consultas ou exames e tirando dúvidas de forma acolhedora.`;
    case "tecnico":
      return `Você é a ${aiName}, assistente de suporte técnico. Seja altamente precisa, informativa, objetiva e clara, focando em detalhar as especificações dos serviços/produtos e resolver dúvidas de forma lógica e exata.`;
    default:
      return "";
  }
};

function WidgetTab({ tenantId }: { tenantId: string }) {
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.origin);
    }
  }, []);

  const scriptTag = `<script src="${host}/api/widget/${tenantId}"></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h3 className="font-semibold text-white">Widget do WhatsApp para Sites</h3>
            <p className="text-xs text-zinc-500">Adicione um botão flutuante elegante ao site do seu cliente</p>
          </div>
        </div>

        <p className="text-zinc-300 text-sm leading-relaxed">
          Ao instalar o Widget no site do seu cliente, os visitantes verão um botão elegante de WhatsApp no canto inferior da tela. Quando clicarem, serão direcionados para o número configurado iniciando automaticamente o atendimento com o bot configurado (seja de *Regras* ou *Inteligência Artificial*).
        </p>

        <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-300">Código de Instalação (HTML)</span>
            <button
              onClick={copyToClipboard}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/10 active:scale-95"
              }`}
            >
              {copied ? "✓ Copiado!" : "Copiar Código"}
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Copie o código abaixo e cole no final do arquivo HTML do site, logo antes do fechamento da tag <code className="text-purple-400 font-mono">&lt;/body&gt;</code>.
          </p>

          <div className="relative">
            <pre className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
              {scriptTag}
            </pre>
          </div>
        </div>

        <div className="bg-purple-600/10 border border-purple-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5 justify-between">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs uppercase font-bold tracking-wider text-purple-400">Dica de Sucesso 🚀</span>
            <p className="text-sm text-zinc-300">
              Você pode vender esse widget como um pacote agregado: *Site Pronto + Integração WhatsApp Inteligente*.
            </p>
          </div>
        </div>
      </section>

      {/* Simulated Preview Box */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
        <h4 className="font-semibold text-white text-sm">Visualização em Tempo Real</h4>
        <div className="w-full h-40 bg-black/40 border border-white/5 rounded-xl relative overflow-hidden flex items-center justify-center">
          <span className="text-xs text-zinc-500">Simulação de site do cliente</span>
          
          {/* Simulated WhatsApp Button */}
          <div className="absolute bottom-4 right-4 flex flex-col items-end pointer-events-none">
            <div className="bg-white text-zinc-900 border border-zinc-200/50 shadow-lg rounded-xl px-3 py-1.5 text-[11px] font-semibold mb-2 animate-bounce">
              Falar com o Suporte 👋
            </div>
            <div className="w-12 h-12 bg-[#25D366] rounded-full shadow-lg flex items-center justify-center relative">
              <div className="absolute w-full h-full bg-[#25D366] rounded-full opacity-40 scale-125 animate-ping"></div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="22" height="22">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
