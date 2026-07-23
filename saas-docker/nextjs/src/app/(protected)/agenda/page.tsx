"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Sparkles,
  CalendarDays,
  Filter,
  Check,
  X,
  FileText,
  Clock3,
} from "lucide-react";

interface Appointment {
  id: string;
  service_name: string;
  duration_min: number;
  scheduled_at: string;
  status: string;
  notes?: string;
  lead?: { name?: string; phone?: string } | null;
}

interface AISettings {
  products?: { name: string; price: string; description: string; duration_min?: number }[];
  business_hours_start?: string;
  business_hours_end?: string;
  business_days?: string[];
}

const STATUS_MAP: Record<string, { label: string; dot: string; bgLight: string; textLight: string; bgDark: string; textDark: string }> = {
  scheduled: {
    label: "Agendado",
    dot: "bg-blue-500",
    bgLight: "bg-blue-50 border-blue-200",
    textLight: "text-blue-700",
    bgDark: "bg-blue-500/10 border-blue-500/20",
    textDark: "text-blue-400",
  },
  confirmed: {
    label: "Confirmado",
    dot: "bg-emerald-500",
    bgLight: "bg-emerald-50 border-emerald-200",
    textLight: "text-emerald-700",
    bgDark: "bg-emerald-500/10 border-emerald-500/20",
    textDark: "text-emerald-400",
  },
  completed: {
    label: "Concluído",
    dot: "bg-slate-500",
    bgLight: "bg-slate-100 border-slate-200",
    textLight: "text-slate-700",
    bgDark: "bg-slate-500/10 border-slate-500/20",
    textDark: "text-slate-400",
  },
  cancelled: {
    label: "Cancelado",
    dot: "bg-rose-500",
    bgLight: "bg-rose-50 border-rose-200",
    textLight: "text-rose-700",
    bgDark: "bg-rose-500/10 border-rose-500/20",
    textDark: "text-rose-400",
  },
  no_show: {
    label: "Faltou",
    dot: "bg-amber-500",
    bgLight: "bg-amber-50 border-amber-200",
    textLight: "text-amber-700",
    bgDark: "bg-amber-500/10 border-amber-500/20",
    textDark: "text-amber-400",
  },
};

const DAYS_PT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function padZero(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
}

// ─── MODAL DE NOVO AGENDAMENTO ─────────────────────────────────────────────
function NewAppointmentModal({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  services,
  appointments,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultDate?: Date;
  services: AISettings["products"];
  appointments: Appointment[];
}) {
  const [form, setForm] = useState({
    service_name: "",
    duration_min: 60,
    date: "",
    time: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultDate) {
      setForm((f) => ({
        ...f,
        date: `${defaultDate.getFullYear()}-${padZero(defaultDate.getMonth() + 1)}-${padZero(defaultDate.getDate())}`,
        time: "09:00",
      }));
    }
  }, [defaultDate, isOpen]);

  const handleServiceChange = (name: string) => {
    const svc = services?.find((s) => s.name === name);
    setForm((f) => ({
      ...f,
      service_name: name,
      duration_min: svc?.duration_min || 60,
    }));
  };

  const submit = async () => {
    if (!form.service_name || !form.date || !form.time) {
      setError("Por favor, preencha o serviço, a data e o horário.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const scheduled_at = new Date(`${form.date}T${form.time}:00`).toISOString();
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduled_at }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Erro ao criar agendamento.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-7 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Novo Agendamento</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Reserve um horário na sua agenda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Serviço
            </label>
            {services && services.length > 0 ? (
              <select
                value={form.service_name}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              >
                <option value="" className="bg-white dark:bg-slate-900">Selecione um serviço cadastrado...</option>
                {services.map((s) => (
                  <option key={s.name} value={s.name} className="bg-white dark:bg-slate-900">
                    {s.name} {s.price ? `— ${s.price}` : ""}
                  </option>
                ))}
                <option value="__custom__" className="bg-white dark:bg-slate-900">+ Outro Serviço (Digitar Manualmente)</option>
              </select>
            ) : null}

            {(form.service_name === "__custom__" || !services?.length) && (
              <input
                type="text"
                value={form.service_name === "__custom__" ? "" : form.service_name}
                onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
                placeholder="Ex: Corte + Barba ou Consulta"
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Duração Estimada: <span className="text-indigo-600 dark:text-indigo-400 font-mono font-extrabold">{form.duration_min} min</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 90, 120, 180].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, duration_min: min }))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    form.duration_min === min
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                      : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-indigo-400"
                  }`}
                >
                  {min < 60 ? `${min}m` : `${min / 60}h${min % 60 ? `${min % 60}m` : ""}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Data
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Horário
              </label>
              <select
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              >
                <option value="">Selecione...</option>
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = Math.floor(i / 2) + 8;
                  const m = i % 2 === 0 ? "00" : "30";
                  const timeStr = `${padZero(h)}:${m}`;

                  let isAvailable = true;
                  if (form.date && appointments) {
                    const startSlot = new Date(`${form.date}T${timeStr}:00`).getTime();
                    const endSlot = startSlot + form.duration_min * 60000;

                    isAvailable = !appointments.some((app) => {
                      if (app.status === "cancelled") return false;
                      const appStart = new Date(app.scheduled_at).getTime();
                      const appEnd = appStart + app.duration_min * 60000;
                      return startSlot < appEnd && endSlot > appStart;
                    });
                  }

                  return isAvailable ? (
                    <option key={timeStr} value={timeStr} className="bg-white dark:bg-slate-900">
                      {timeStr}
                    </option>
                  ) : null;
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Ex: Cliente prefere atendimento presencial..."
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-4"
          >
            {saving ? "Confirmando Horário..." : "Confirmar Agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARTÃO DE AGENDAMENTO ──────────────────────────────────────────────────
function AppointmentCard({ appt, onStatusChange }: { appt: Appointment; onStatusChange: (id: string, status: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const st = STATUS_MAP[appt.status] || STATUS_MAP.scheduled;
  const endTime = new Date(new Date(appt.scheduled_at).getTime() + appt.duration_min * 60000);

  return (
    <div className="group relative p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{appt.service_name}</h4>
            {appt.lead?.name && (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium truncate">
                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{appt.lead.name}</span>
                {appt.lead.phone && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-500 font-mono">({appt.lead.phone})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Menu de Ações */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-44 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl py-2 backdrop-blur-2xl">
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => {
                    onStatusChange(appt.id, key);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center gap-2.5 ${
                    appt.status === key
                      ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${val.dot} shrink-0`} />
                  {val.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Horário & Duração */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-mono font-bold text-slate-700 dark:text-slate-300">
          <Clock3 className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            {formatTime(appt.scheduled_at)} – {padZero(endTime.getHours())}:{padZero(endTime.getMinutes())}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">({appt.duration_min} min)</span>
        </div>

        {/* Status Badge */}
        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${st.bgLight} ${st.textLight} dark:${st.bgDark} dark:${st.textDark}`}>
          {st.label}
        </span>
      </div>

      {appt.notes && (
        <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
          💬 {appt.notes}
        </p>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL DA AGENDA ──────────────────────────────────────────────
export default function AgendaPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStr = `${year}-${padZero(month + 1)}`;
      const res = await fetch(`/api/appointments?month=${monthStr}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch {}
    setIsLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetch("/api/settings/whatsapp")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setAiSettings(d.settings);
      });
  }, []);

  const getAppointmentsForDay = (day: number) =>
    appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const selectedDayAppts = selectedDay
    ? appointments.filter((a) => {
        const d = new Date(a.scheduled_at);
        return (
          d.getFullYear() === selectedDay.getFullYear() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getDate() === selectedDay.getDate()
        );
      })
    : [];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchAppointments();
    } catch {}
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const d = new Date();
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDay(d);
  };

  const todayAppts = getAppointmentsForDay(today.getDate());
  const monthTotal = appointments.filter((a) => a.status !== "cancelled").length;
  const confirmed = appointments.filter((a) => a.status === "confirmed" || a.status === "completed").length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Atendimento Inteligente
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Agenda &amp; Horários
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Gerencie compromissos, agendamentos automáticos e status de atendimento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToday}
            className="px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-2xl transition-all shadow-sm"
          >
            Hoje
          </button>
          <button
            onClick={() => {
              setSelectedDay(today);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" /> Novo Horário
          </button>
        </div>
      </header>

      {/* ── Top Metric Cards Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Agendados Hoje", value: todayAppts.length, sub: "Compromissos para hoje", icon: CalendarIcon, color: "indigo", badge: "HOJE" },
          { label: "Total no Mês", value: monthTotal, sub: "Atendimentos marcados", icon: CalendarDays, color: "purple", badge: "MÊS" },
          { label: "Confirmados", value: confirmed, sub: "Confirmados/Concluídos", icon: CheckCircle2, color: "emerald", badge: "OK" },
          { label: "Cancelados", value: cancelled, sub: "Cancelamentos no mês", icon: XCircle, color: "rose", badge: "OFF" },
        ].map((m, idx) => {
          const MIcon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-lg dark:shadow-2xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">
                  {m.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
                    m.color === "indigo"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-400"
                      : m.color === "purple"
                      ? "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-500/20 dark:border-purple-500/30 dark:text-purple-400"
                      : m.color === "emerald"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400"
                      : "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/30 dark:text-rose-400"
                  }`}
                >
                  <MIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {m.value}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">{m.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Calendar & Right Panel Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Calendar Grid (8 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-2xl space-y-6">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <button
              onClick={prevMonth}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all border border-slate-200/60 dark:border-white/10"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {MONTHS_PT[month]} {year}
              </h2>
              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                Visualização Mensal
              </span>
            </div>
            <button
              onClick={nextMonth}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all border border-slate-200/60 dark:border-white/10"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center">
            {DAYS_PT.map((d) => (
              <span key={d} className="text-[11px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[58px]" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAppts = getAppointmentsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected =
                selectedDay?.getDate() === day &&
                selectedDay?.getMonth() === month &&
                selectedDay?.getFullYear() === year;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  className={`min-h-[62px] p-2 rounded-2xl transition-all duration-200 flex flex-col items-center justify-between border relative ${
                    isSelected
                      ? "bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-700 text-white border-transparent shadow-xl shadow-indigo-600/30 scale-105 z-10"
                      : isToday
                      ? "bg-indigo-50/90 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-slate-900 dark:text-white font-black ring-1 ring-indigo-500/30"
                      : "bg-slate-50/80 dark:bg-slate-950/40 border-slate-200/70 dark:border-white/5 text-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-indigo-300"
                  }`}
                >
                  <span className={`text-xs font-black font-mono ${isSelected ? "text-white" : isToday ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
                    {day}
                  </span>

                  {/* Appointment Count Pills */}
                  {dayAppts.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-black rounded-md ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                        }`}
                      >
                        {dayAppts.length} {dayAppts.length === 1 ? "vaga" : "vagas"}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Agendado
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Confirmado
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Concluído
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cancelado
            </div>
          </div>
        </div>

        {/* Right Appointments Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 p-6 sm:p-7 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-2xl space-y-5 flex flex-col min-h-[460px]">
          {/* Selected Date Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {selectedDay
                  ? `${selectedDay.getDate()} de ${MONTHS_PT[selectedDay.getMonth()]}`
                  : "Selecione um Dia"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {selectedDayAppts.length} {selectedDayAppts.length === 1 ? "compromisso agendado" : "compromissos agendados"}
              </p>
            </div>

            {selectedDay && (
              <button
                onClick={() => setModalOpen(true)}
                className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 transition-all"
                title="Agendar neste dia"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* List or Empty State */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900 dark:text-white">Sem agendamentos neste dia</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs font-medium">
                  Sua agenda está livre! Clique abaixo para incluir um novo horário manualmente.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-xs font-bold hover:bg-indigo-100 transition-all"
              >
                + Agendar Horário Agora
              </button>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {selectedDayAppts
                .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .map((appt) => (
                  <AppointmentCard key={appt.id} appt={appt} onStatusChange={handleStatusChange} />
                ))}
            </div>
          )}
        </div>
      </div>

      <NewAppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchAppointments}
        defaultDate={selectedDay || today}
        services={aiSettings.products}
        appointments={appointments}
      />
    </div>
  );
}
