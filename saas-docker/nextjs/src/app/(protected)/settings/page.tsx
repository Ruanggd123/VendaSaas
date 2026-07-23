"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeBaseTab } from "../../../components/settings/KnowledgeBaseTab";
import { ModulesTab } from "../../../components/settings/ModulesTab";
import { BlacklistPanel } from "../../../components/settings/BlacklistPanel";

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface AISettings {
  bot_type?: string;
  ai_name: string;
  ai_personality: string;
  ai_prompt: string;
  business_hours_start: string;
  business_hours_end: string;
  business_days: string[];
  schedule_per_day: Record<string, { enabled: boolean; start: string; end: string; max_appointments: number }>;
  appointment_gap_min: number;
  off_hours_message: string;
  products: Product[];
  manager_phone: string;
  blocked_dates: string[];
  openai_api_key?: string;
  ia_model?: string;
}

interface Product {
  name: string;
  price: string;
  description: string;
  duration_min: number;
  requires_payment: boolean;
  image_url?: string;
  delivery_type?: "physical" | "virtual_instant" | "virtual_deadline" | "both" | "service";
  digital_content?: string;
  is_unique_keys?: boolean;
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

// ─────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
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
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{hint}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium shadow-sm"
      />
    </div>
  );
}

function SaveButton({ saving, onClick, label = "Salvar Configurações" }: {
  saving: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/25"
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
    <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-bold border shadow-sm ${
      type === "success"
        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
        : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
    }`}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 font-black">✕</button>
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
      <div className="bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">Segurança e Login</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 font-medium">Altere sua senha de acesso ao painel.</p>

        {message && (
          <div className={`mb-4 p-3 rounded-2xl text-xs font-bold border ${
            status === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300"
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Senha Atual</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Nova Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Confirmar Nova Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            />
          </div>
          
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
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
    <div className="space-y-8 text-slate-900 dark:text-white">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      {/* Identidade da IA */}
      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Identidade da IA &amp; Atendimento</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Como a automação do WhatsApp se comporta com seus clientes</p>
          </div>
        </div>

        {/* Tipo de Bot Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Tipo de Atendente Automático</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => update("bot_type", "ia")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                settings.bot_type !== "regras"
                  ? "bg-indigo-50 dark:bg-indigo-500/15 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">🤖</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">Atendente Inteligência Artificial (IA)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Conversa livre, natural, tira dúvidas do catálogo, qualifica leads e agenda horários.
              </p>
            </button>

            <button
              type="button"
              onClick={() => update("bot_type", "regras")}
              className={`p-4 rounded-2xl border text-left transition-all ${
                settings.bot_type === "regras"
                  ? "bg-indigo-50 dark:bg-indigo-500/15 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">📋</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">Atendente de Regras / Menu (Sem IA)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Menu passo-a-passo numérico (oi, voltar, 1, 2, 3). Respostas rápidas e agendamento guiado.
              </p>
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Personalidade</label>
            <select
              value={settings.ai_personality}
              onChange={(e) => {
                const val = e.target.value;
                update("ai_personality", val);
                if (val !== "personalizada") {
                  update("ai_prompt", getPresetPrompt(val, settings.ai_name));
                }
              }}
              className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            >
              <option value="profissional">Profissional e Direto</option>
              <option value="descontraido">Descontraído e Amigável</option>
              <option value="vendedor">Focado em Vendas (Persuasivo)</option>
              <option value="clinico">Clínico (Cuidadoso e Empático)</option>
              <option value="tecnico">Técnico (Preciso e Informativo)</option>
              <option value="personalizada">Personalizada ✍️ (Manual)</option>
            </select>
          </div>
        </div>

        {userRole === 'superadmin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Modelo da IA</label>
              <select
                value={settings.ia_model || "gpt-4o-mini"}
                onChange={(e) => update("ia_model", e.target.value)}
                className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Ultra Rápido &amp; Econômico)</option>
                <option value="gpt-4o">GPT-4o (Máximo Raciocínio Completo)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq Cloud)</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Prompt de Instruções da IA</label>
          <textarea
            rows={5}
            value={settings.ai_prompt}
            onChange={(e) => update("ai_prompt", e.target.value)}
            className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono leading-relaxed"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={save} label="Salvar Configurações de IA" />
      </div>
    </div>
  );
}

function PaymentTab() {
  const [settings, setSettings] = useState<PaymentSettings>({
    payment_provider: "asaas",
    asaas_api_key: "",
    asaas_test_api_key: "",
    asaas_webhook_secret: "",
    asaas_mode: "sandbox",
    mercadopago_access_token: "",
    mercadopago_test_access_token: "",
    mercadopago_mode: "sandbox",
    plan_solo_price: "97",
    plan_pro_price: "197",
    plan_business_price: "397",
    auto_charge_enabled: "false",
    auto_charge_days: "3",
    late_fee_percent: "2",
  });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
      if (!res.ok) throw new Error("Erro ao salvar");
      setAlert({ type: "success", msg: "Configurações de pagamento salvas! ✅" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar pagamentos." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-white">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Integração de Pagamentos</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Configure Asaas ou Mercado Pago para cobranças via PIX e Cartão</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InputField
            label="Chave API Asaas"
            value={settings.asaas_api_key}
            onChange={(v) => update("asaas_api_key", v)}
            type="password"
            placeholder="$aact_..."
          />
          <InputField
            label="Asaas Webhook Secret"
            value={settings.asaas_webhook_secret}
            onChange={(v) => update("asaas_webhook_secret", v)}
            type="password"
            placeholder="Chave de segurança..."
          />
        </div>
      </section>

      <div className="flex justify-end">
        <SaveButton saving={saving} onClick={save} label="Salvar Configurações de Pagamento" />
      </div>
    </div>
  );
}

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
    <div className="space-y-6 text-slate-900 dark:text-white">
      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💬</span>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Widget do WhatsApp para Sites</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Adicione um botão flutuante elegante ao site do seu cliente</p>
          </div>
        </div>

        <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
          Ao instalar o Widget no site do seu cliente, os visitantes verão um botão elegante de WhatsApp no canto inferior da tela. Quando clicarem, serão direcionados para o número configurado iniciando automaticamente o atendimento com o bot.
        </p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Código de Instalação (HTML)</span>
            <button
              onClick={copyToClipboard}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95"
              }`}
            >
              {copied ? "✓ Copiado!" : "Copiar Código"}
            </button>
          </div>

          <div className="relative">
            <pre className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs font-mono text-slate-800 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
              {scriptTag}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

const ALL_TABS = [
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
  const [userRole, setUserRole] = useState<string>("manager");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setUserRole(d.user.role);
      })
      .catch(() => {});

    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.tenantId) setTenantId(data.tenantId);
        if (!data.settings || !data.settings.ai_name) {
          router.push("/onboarding");
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  // Esconde Conhecimento (RAG) se não for superadmin
  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.id === "knowledge") {
      return userRole === "superadmin";
    }
    return true;
  });

  useEffect(() => {
    if (activeTab === "knowledge" && userRole !== "superadmin") {
      setActiveTab("ai");
    }
  }, [userRole, activeTab]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-500 text-xs font-mono font-bold">Carregando painel de configurações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex justify-center bg-slate-50/50 dark:bg-[#030712] text-slate-900 dark:text-white p-4 sm:p-8 relative overflow-hidden transition-colors duration-300">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-xl dark:shadow-2xl relative z-10 flex flex-col h-fit">
        {/* Header */}
        <header className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Configurações da Empresa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-sm font-medium">
              Controle total do seu sistema de atendimento, automações e segurança.
            </p>
          </div>
        </header>

        {/* Tabs Bar */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-white/10 mb-8 shadow-sm">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5"
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
          {activeTab === "knowledge" && userRole === "superadmin" && <KnowledgeBaseTab />}
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
      return `Você é a ${aiName}, assistente de suporte técnico. Seja highly precisa, informativa, objetiva e clara, focando em detalhar as especificações dos serviços/produtos e resolver dúvidas de forma lógica e exata.`;
    default:
      return "";
  }
};
