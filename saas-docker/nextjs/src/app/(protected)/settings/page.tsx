"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KnowledgeBaseTab } from "../../../components/settings/KnowledgeBaseTab";
import { ModulesTab } from "../../../components/settings/ModulesTab";
import { BlacklistPanel } from "../../../components/settings/BlacklistPanel";
import {
  Sparkles,
  Bot,
  Clock,
  Phone,
  ShoppingBag,
  Plus,
  Trash2,
  Key,
  ShieldCheck,
  Zap,
  DollarSign,
  Calendar,
  AlertCircle,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Sliders,
  ChevronRight
} from "lucide-react";

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
  interactive_poll_enabled?: boolean;
  enable_groups?: boolean;
  whitelisted_groups?: string;
}

interface Product {
  id?: string;
  name: string;
  price: string;
  monthly?: any;
  type?: string;
  description: string;
  duration_min: number;
  requires_payment: boolean;
  image_url?: string;
  send_photo?: boolean;
  delivery_type?: "physical" | "virtual_instant" | "virtual_deadline" | "both" | "service";
  digital_content?: string;
  is_unique_keys?: boolean;
  stock?: number;
  low_stock_threshold?: number;
  is_subscription?: boolean;
  commission_fixed?: number;
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
  { id: "mon", label: "Segunda-feira" },
  { id: "tue", label: "Terça-feira" },
  { id: "wed", label: "Quarta-feira" },
  { id: "thu", label: "Quinta-feira" },
  { id: "fri", label: "Sexta-feira" },
  { id: "sat", label: "Sábado" },
  { id: "sun", label: "Domingo" },
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
  off_hours_message: "Olá! Estamos fora do horário de atendimento no momento. Deixe sua mensagem que responderemos assim que retornarmos! 🌙",
  products: [],
  manager_phone: "",
  blocked_dates: [],
  openai_api_key: "",
  ia_model: "deepseek-chat",
  interactive_poll_enabled: true,
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
        className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium shadow-sm"
      />
    </div>
  );
}

function SaveButton({ saving, onClick, label = "Salvar Alterações" }: {
  saving: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-md shadow-indigo-600/20"
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
          <CheckCircle2 className="h-4 w-4" />
          {label}
        </>
      )}
    </button>
  );
}

function Alert({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  const isSuccess = type === "success";
  return (
    <div
      className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
        isSuccess
          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
          : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300"
      }`}
    >
      <span className="text-xs font-bold leading-relaxed">{message}</span>
      <button onClick={onClose} className="text-xs font-black opacity-70 hover:opacity-100 ml-4">✕</button>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTES DAS ABAS
// ─────────────────────────────────────────────

// 1. ABA IDENTIDADE IA
function AIIdentityTab({ settings, update, userRole, saving, onSave }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" /> Identidade da IA & Atendimento
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Personalidade, modelo de linguagem e regras de resposta do WhatsApp
          </p>
        </div>
        <SaveButton saving={saving} onClick={onSave} />
      </div>

      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Seleção do Tipo de Bot */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Tipo de Atendente Automático</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => update("bot_type", "ia")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                settings.bot_type === "ia" || (!settings.bot_type)
                  ? "bg-indigo-50/80 dark:bg-indigo-500/15 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">Modo IA (100% IA)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Conversa livre, humanizada e persuasiva. Tira dúvidas do catálogo, qualifica leads e agenda horários automaticamente.
              </p>
            </button>

            <button
              type="button"
              onClick={() => update("bot_type", "hibrido")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                settings.bot_type === "hibrido"
                  ? "bg-indigo-50/80 dark:bg-indigo-500/15 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">Modo Híbrido ⭐ (Recomendado)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Menus e botões rápidos na recepção + IA inteligente para responder dúvidas livres do cliente.
              </p>
            </button>

            <button
              type="button"
              onClick={() => update("bot_type", "regras")}
              className={`p-5 rounded-2xl border text-left transition-all ${
                settings.bot_type === "regras"
                  ? "bg-indigo-50/80 dark:bg-indigo-500/15 border-2 border-indigo-500 shadow-sm"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">Modo Regras (Sem IA)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Menu estritamente numérico e botões fixos. Respostas pré-definidas sem acionar chave de IA.
              </p>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-5 bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Opções interativas no WhatsApp</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Exibe menus e formas de pagamento como enquete de escolha única. Desative para usar comandos numerados em texto.
            </p>
          </div>
          <Toggle
            enabled={settings.interactive_poll_enabled !== false}
            onChange={(enabled) => update("interactive_poll_enabled", enabled)}
          />
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
              className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
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

        {/* ADMIN MASTER MODEL SELECTOR */}
        {userRole === "superadmin" && (
          <div className="p-5 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Configuração Restrita ao Admin Master
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Modelo do Motor de IA</label>
                <select
                  value={settings.ia_model || "deepseek-chat"}
                  onChange={(e) => update("ia_model", e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                >
                  <option value="deepseek-chat">DeepSeek Chat V3 (Mais Econômico — Recomendado)</option>
                  <option value="deepseek-reasoner">DeepSeek Reasoner R1 (Raciocínio Profundo)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Ultra Rápido & Econômico)</option>
                  <option value="gpt-4o">GPT-4o (Máximo Raciocínio Completo)</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Groq Cloud)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Prompt de Instruções da IA</label>
          <textarea
            rows={6}
            value={settings.ai_prompt}
            onChange={(e) => update("ai_prompt", e.target.value)}
            className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-950 p-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono leading-relaxed"
          />
        </div>

        {/* WHATSAPP GROUPS CONTROL */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">Respostas em Grupos do WhatsApp</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Por padrão, o robô atende apenas mensagens diretas 1-x-1.</p>
              </div>
            </div>
            <Toggle
              enabled={settings.enable_groups || false}
              onChange={(val) => update("enable_groups", val)}
            />
          </div>

          {settings.enable_groups && (
            <div className="pt-2">
              <InputField
                label="IDs dos Grupos Permitidos (opcional)"
                value={settings.whitelisted_groups || ""}
                onChange={(v) => update("whitelisted_groups", v)}
                placeholder="Ex: 120363048593@g.us, 120363098123@g.us"
                hint="Deixe em branco para permitir todos os grupos onde o número for adicionado."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// 2. ABA HORÁRIOS & FERIADOS
function ScheduleTab({ settings, update, updateDaySchedule, saving, onSave }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-500" /> Horários, Vagas & Feriados
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Expediente da empresa, limites diários de agendamento e dias bloqueados
          </p>
        </div>
        <SaveButton saving={saving} onClick={onSave} />
      </div>

      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-sm">
        {/* HORÁRIOS POR DIA DA SEMANA */}
        <div className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Expediente por Dia da Semana
          </label>
          <div className="space-y-3">
            {WEEK_DAYS.map((day) => {
              const sched = settings.schedule_per_day?.[day.id] || { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 };
              return (
                <div
                  key={day.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 gap-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-[150px]">
                    <Toggle
                      enabled={sched.enabled}
                      onChange={(v) => updateDaySchedule(day.id, "enabled", v)}
                    />
                    <span className={`text-xs font-bold ${sched.enabled ? "text-slate-900 dark:text-white" : "text-slate-400 opacity-60"}`}>
                      {day.label}
                    </span>
                  </div>

                  {sched.enabled && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Das</span>
                        <input
                          type="time"
                          value={sched.start}
                          onChange={(e) => updateDaySchedule(day.id, "start", e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white font-bold"
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Até</span>
                        <input
                          type="time"
                          value={sched.end}
                          onChange={(e) => updateDaySchedule(day.id, "end", e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Máx. Vagas:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={sched.max_appointments}
                          onChange={(e) => updateDaySchedule(day.id, "max_appointments", parseInt(e.target.value) || 1)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1 text-xs font-mono text-slate-900 dark:text-white font-bold w-16 text-center"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FERIADOS E DATAS BLOQUEADAS */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Feriados & Datas Bloqueadas (Sem agendamentos nestes dias)
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {(settings.blocked_dates || []).length === 0 && (
              <span className="text-xs text-slate-400 italic">Nenhum feriado ou data bloqueada cadastrada.</span>
            )}
            {(settings.blocked_dates || []).map((dateStr: string, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs font-mono font-bold text-red-600 dark:text-red-400"
              >
                📅 {dateStr}
                <button
                  type="button"
                  onClick={() => {
                    const next = (settings.blocked_dates || []).filter((_: any, i: number) => i !== idx);
                    update("blocked_dates", next);
                  }}
                  className="hover:text-red-800 dark:hover:text-red-200 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              id="tab_blocked_date_input"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white font-bold"
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById("tab_blocked_date_input") as HTMLInputElement;
                if (input && input.value) {
                  const val = input.value;
                  if (!settings.blocked_dates?.includes(val)) {
                    update("blocked_dates", [...(settings.blocked_dates || []), val]);
                  }
                  input.value = "";
                }
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
            >
              + Bloquear Data
            </button>
          </div>
        </div>

        {/* MENSAGEM FORA DO HORÁRIO */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Mensagem Fora do Horário
          </label>
          <textarea
            rows={2}
            value={settings.off_hours_message}
            onChange={(e) => update("off_hours_message", e.target.value)}
            className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>

        {/* GERENTE DE TRANSBORDO */}
        <div className="pt-4 border-t border-slate-200 dark:border-white/10">
          <InputField
            label="WhatsApp do Gerente Responsável"
            value={settings.manager_phone}
            onChange={(v) => update("manager_phone", v)}
            placeholder="Ex: 5511999999999"
            hint="Número com DDD para onde os alertas de transbordo e agendamentos serão encaminhados."
          />
        </div>
      </section>
    </div>
  );
}

// 3. ABA PRODUTOS & SERVIÇOS
function ProductsTab({ settings, update, updateProduct, removeProduct, addProduct, saving, onSave }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-500" /> Catálogo de Produtos & Serviços
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Itens oferecidos pela IA para dúvidas, agendamentos e vendas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addProduct}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-2xl transition"
          >
            <Plus className="w-4 h-4 text-indigo-500" /> Adicionar Item
          </button>
          <SaveButton saving={saving} onClick={onSave} />
        </div>
      </div>

      <div className="space-y-4">
        {(settings.products || []).length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Nenhum produto ou serviço cadastrado ainda.</p>
            <button
              type="button"
              onClick={addProduct}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition"
            >
              + Adicionar Primeiro Item
            </button>
          </div>
        ) : (
          (settings.products || []).map((prod: Product, idx: number) => (
            <div
              key={prod.id || idx}
              className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 space-y-5 shadow-sm relative group"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 flex items-center justify-center text-[10px]">#{idx + 1}</span>
                  {prod.name || "Novo Produto / Serviço"}
                </span>
                <button
                  type="button"
                  onClick={() => removeProduct(idx)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                  title="Remover Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <InputField
                    label="Nome do Item / Serviço"
                    value={prod.name}
                    onChange={(v) => updateProduct(idx, "name", v)}
                    placeholder="Ex: Plano Growth, Consulta Médica..."
                  />
                </div>
                <InputField
                  label="Preço (R$)"
                  type="number"
                  value={prod.price}
                  onChange={(v) => updateProduct(idx, "price", v)}
                  placeholder="Ex: 147.00"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <InputField
                    label="Duração em Minutos"
                    type="number"
                    value={String(prod.duration_min || 30)}
                    onChange={(v) => updateProduct(idx, "duration_min", parseInt(v) || 30)}
                    placeholder="Ex: 30, 60"
                  />
                </div>
                <div className="sm:col-span-2">
                  <InputField
                    label="Descrição Detalhada"
                    value={prod.description}
                    onChange={(v) => updateProduct(idx, "description", v)}
                    placeholder="Resumo dos benefícios e o que está incluso..."
                  />
                </div>
              </div>

              {/* TOGGLES DO PRODUTO */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Toggle
                    enabled={prod.requires_payment !== false}
                    onChange={(v) => updateProduct(idx, "requires_payment", v)}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Exigir Pagamento
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Toggle
                    enabled={prod.is_subscription !== false}
                    onChange={(v) => updateProduct(idx, "is_subscription", v)}
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Assinatura Recorrente
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor={`delivery-type-${idx}`}>
                    Tipo de Entrega
                  </label>
                  <select
                    id={`delivery-type-${idx}`}
                    value={prod.delivery_type || "virtual_instant"}
                    onChange={(e) => updateProduct(idx, "delivery_type", e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="virtual_instant">Virtual imediato</option>
                    <option value="virtual_deadline">Virtual com prazo</option>
                    <option value="physical">Físico (entrega)</option>
                    <option value="service">Serviço presencial</option>
                    <option value="both">Físico + Virtual</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 4. ABA CONFIGURAÇÕES DE PAGAMENTO (ASAAS & MERCADOPAGO)
function PaymentTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [p, setP] = useState<PaymentSettings>({
    payment_provider: "asaas",
    asaas_api_key: "",
    asaas_test_api_key: "",
    asaas_webhook_secret: "",
    asaas_mode: "production",
    mercadopago_access_token: "",
    mercadopago_test_access_token: "",
    mercadopago_mode: "production",
    plan_solo_price: "197",
    plan_pro_price: "397",
    plan_business_price: "997",
    auto_charge_enabled: "false",
    auto_charge_days: "3",
    late_fee_percent: "2",
  });

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings || {};
        setP({
          payment_provider: s.payment_provider || "asaas",
          asaas_api_key: s.asaas_api_key || s.asaasApiKey || "",
          asaas_test_api_key: s.asaas_test_api_key || "",
          asaas_webhook_secret: s.asaas_webhook_secret || "",
          asaas_mode: s.asaas_mode || "production",
          mercadopago_access_token: s.mercadopago_access_token || "",
          mercadopago_test_access_token: s.mercadopago_test_access_token || "",
          mercadopago_mode: s.mercadopago_mode || "production",
          plan_solo_price: s.plan_solo_price || "197",
          plan_pro_price: s.plan_pro_price || "397",
          plan_business_price: s.plan_business_price || "997",
          auto_charge_enabled: s.auto_charge_enabled || "false",
          auto_charge_days: s.auto_charge_days || "3",
          late_fee_percent: s.late_fee_percent || "2",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const getRes = await fetch("/api/settings/whatsapp");
      const getData = await getRes.json();
      const currentSettings = getData.settings || {};
      const updated = { ...currentSettings, ...p };

      const res = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      if (!res.ok) throw new Error();
      setAlert({ type: "success", msg: "Configurações de pagamento salvas com sucesso! ✅" });
    } catch {
      setAlert({ type: "error", msg: "Erro ao salvar configurações de pagamento." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-mono text-slate-500">Carregando gateway de pagamento...</div>;
  }

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} message={alert.msg} onClose={() => setAlert(null)} />}

      <div className="flex items-center justify-between bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-500" /> Gateway de Pagamento & Cobranças
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Integração com Asaas e Mercado Pago para geração automática de PIX e Checkout
          </p>
        </div>
        <SaveButton saving={saving} onClick={save} />
      </div>

      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">Provedor Ativo</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setP({ ...p, payment_provider: "asaas" })}
              className={`p-4 rounded-2xl border font-bold text-xs transition ${
                p.payment_provider === "asaas"
                  ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600"
              }`}
            >
              Asaas (PIX + Boleto + Cartão)
            </button>
            <button
              type="button"
              onClick={() => setP({ ...p, payment_provider: "mercadopago" })}
              className={`p-4 rounded-2xl border font-bold text-xs transition ${
                p.payment_provider === "mercadopago"
                  ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-600"
              }`}
            >
              Mercado Pago
            </button>
          </div>
        </div>

        {p.payment_provider === "asaas" ? (
          <div className="space-y-4 pt-2">
            <InputField
              label="Chave API do Asaas ($aact_...)"
              value={p.asaas_api_key}
              onChange={(v) => setP({ ...p, asaas_api_key: v })}
              placeholder="$aact_Y3... (Chave Principal)"
            />
            <InputField
              label="Segredo do Webhook Asaas"
              value={p.asaas_webhook_secret}
              onChange={(v) => setP({ ...p, asaas_webhook_secret: v })}
              placeholder="Segredo para validação do webhook"
            />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <InputField
              label="Access Token do Mercado Pago (APP_USR-...)"
              value={p.mercadopago_access_token}
              onChange={(v) => setP({ ...p, mercadopago_access_token: v })}
              placeholder="APP_USR-..."
            />
          </div>
        )}
      </section>
    </div>
  );
}

// 5. ABA WIDGET DO SITE
function WidgetTab({ tenantId }: { tenantId: string }) {
  const [copied, setCopied] = useState(false);
  const scriptTag = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-tenant="${tenantId}" defer></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
        <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" /> Widget de Chat para o seu Site
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
          Instale o chat do WhatsApp e da IA diretamente no site da sua empresa
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Código de Inserção (HTML)
          </label>
          <button
            type="button"
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
          <pre className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-800 dark:text-slate-300 overflow-x-auto whitespace-pre-wrap break-all select-all">
            {scriptTag}
          </pre>
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────

const ALL_TABS = [
  { id: "ai", label: "🤖 Identidade IA", requiresModule: "ai" as const },
  { id: "schedule", label: "⏰ Horários & Feriados", requiresModule: null },
  { id: "products", label: "🛒 Produtos & Serviços", requiresModule: null },
  { id: "modules", label: "🧩 Módulos", requiresModule: "ai" as const },
  { id: "widget", label: "💬 Widget Site", requiresModule: null },
  { id: "knowledge", label: "🧠 Conhecimento (RAG)", requiresModule: "ai" as const },
  { id: "payment", label: "💳 Pagamento", requiresModule: null },
  { id: "blacklist", label: "🚫 Lista Negra", requiresModule: null },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [userModules, setUserModules] = useState<string[]>([]);
  const [bannerAlert, setBannerAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role) setUserRole(d.user.role);
        if (Array.isArray(d?.user?.modules)) setUserModules(d.user.modules);
      })
      .catch(() => {});

    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((data) => {
        if (data.tenantId) setTenantId(data.tenantId);
        if (!data.settings || !data.settings.ai_name) {
          router.push("/onboarding");
        } else {
          setSettings({ ...DEFAULT_AI, ...data.settings });
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const update = (key: keyof AISettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateDaySchedule = (dayId: string, field: string, value: any) => {
    setSettings((prev) => {
      const current = prev.schedule_per_day?.[dayId] || { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 };
      return {
        ...prev,
        schedule_per_day: {
          ...prev.schedule_per_day,
          [dayId]: { ...current, [field]: value },
        },
      };
    });
  };

  const addProduct = () => {
    const newProd: Product = {
      id: `product_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      price: "",
      description: "",
      duration_min: 30,
      requires_payment: true,
      is_subscription: true,
      image_url: "",
      send_photo: true,
    };
    update("products", [...(settings.products || []), newProd]);
  };

  const updateProduct = (idx: number, field: keyof Product, value: any) => {
    const prods = [...(settings.products || [])];
    const updated = { ...prods[idx], [field]: value };
    if (field === "price") {
      if (updated.is_subscription !== false) {
        updated.monthly = value;
      } else {
        delete updated.monthly;
      }
    }
    if (field === "is_subscription") {
      if (value) {
        updated.monthly = updated.price;
      } else {
        delete updated.monthly;
      }
    }
    prods[idx] = updated;
    update("products", prods);
  };

  const removeProduct = (idx: number) => {
    const prods = (settings.products || []).filter((_, i) => i !== idx);
    update("products", prods);
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
      setBannerAlert({ type: "success", msg: "Configurações salvas com sucesso! ✅" });
    } catch {
      setBannerAlert({ type: "error", msg: "Erro ao salvar configurações. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  const visibleTabs = ALL_TABS.filter((tab) => {
    if (tab.id === "knowledge") {
      return userRole === "superadmin";
    }
    if (tab.requiresModule && !userModules.includes(tab.requiresModule)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (activeTab === "knowledge" && userRole !== "superadmin") {
      setActiveTab("ai");
    }
    if (activeTab === "ai" && !userModules.includes("ai")) {
      setActiveTab("schedule");
    }
  }, [userRole, activeTab, userModules]);

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
      <div className="w-full max-w-6xl bg-transparent relative z-10 flex flex-col h-fit space-y-6">
        
        {bannerAlert && <Alert type={bannerAlert.type} message={bannerAlert.msg} onClose={() => setBannerAlert(null)} />}

        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Configurações da Empresa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs sm:text-sm font-medium">
              Gerencie a IA, horários, produtos e automações de forma simples e organizada.
            </p>
          </div>
          <SaveButton saving={saving} onClick={save} label="Salvar Tudo" />
        </header>

        {/* BARRA DE NAVEGAÇÃO DE ABAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-2 bg-slate-200/60 dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm backdrop-blur-md">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 rounded-2xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-center ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/10"
              }`}
            >
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* CONTEÚDO DA ABA ATIVA */}
        <div className="flex-1">
          {activeTab === "ai" && (
            <AIIdentityTab
              settings={settings}
              update={update}
              userRole={userRole}
              saving={saving}
              onSave={save}
            />
          )}

          {activeTab === "schedule" && (
            <ScheduleTab
              settings={settings}
              update={update}
              updateDaySchedule={updateDaySchedule}
              saving={saving}
              onSave={save}
            />
          )}

          {activeTab === "products" && (
            <ProductsTab
              settings={settings}
              update={update}
              updateProduct={updateProduct}
              removeProduct={removeProduct}
              addProduct={addProduct}
              saving={saving}
              onSave={save}
            />
          )}

          {activeTab === "modules" && <ModulesTab />}
          {activeTab === "widget" && <WidgetTab tenantId={tenantId} />}
          {activeTab === "knowledge" && userRole === "superadmin" && <KnowledgeBaseTab />}
          {activeTab === "payment" && <PaymentTab />}
          {activeTab === "blacklist" && <BlacklistPanel isOpen={true} onClose={() => setActiveTab("ai")} />}
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
