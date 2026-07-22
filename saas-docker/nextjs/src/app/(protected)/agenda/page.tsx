"use client";

import { useState, useEffect, useCallback } from "react";

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

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  scheduled:  { label: "Agendado",   dot: "bg-blue-500" },
  confirmed:  { label: "Confirmado", dot: "bg-emerald-500" },
  completed:  { label: "Concluído",  dot: "bg-zinc-500" },
  cancelled:  { label: "Cancelado",  dot: "bg-red-500" },
  no_show:    { label: "Não veio",   dot: "bg-amber-500" },
};

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function padZero(n: number) { return n.toString().padStart(2, "0"); }

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${padZero(d.getDate())}/${padZero(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function NewAppointmentModal({
  isOpen, onClose, onCreated, defaultDate, services, appointments
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
      setError("Preencha serviço, data e horário.");
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
        setError(data.message || data.error || "Erro ao agendar.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900/95 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Agendamento</h2>
          <button onClick={onClose} className="text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">✕</button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Serviço</label>
            {services && services.length > 0 ? (
              <select
                value={form.service_name}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] px-4 py-2.5 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-all text-sm"
              >
                <option value="" className="bg-white dark:bg-zinc-900">Selecione um serviço...</option>
                {services.map((s) => (
                  <option key={s.name} value={s.name} className="bg-white dark:bg-zinc-900">
                    {s.name} {s.price ? `— ${s.price}` : ""}
                  </option>
                ))}
                <option value="__custom__" className="bg-white dark:bg-zinc-900">+ Outro (digitar)</option>
              </select>
            ) : null}
            {(form.service_name === "__custom__" || !services?.length) && (
              <input
                type="text"
                value={form.service_name === "__custom__" ? "" : form.service_name}
                onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
                placeholder="Nome do serviço..."
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-all text-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
              Duração: <span className="text-indigo-500 font-bold">{form.duration_min} min</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 90, 120, 180, 240].map((min) => (
                <button
                  key={min}
                  onClick={() => setForm((f) => ({ ...f, duration_min: min }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    form.duration_min === min
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : "bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30"
                  }`}
                >
                  {min < 60 ? `${min}min` : `${min / 60}h${min % 60 ? `${min % 60}` : ""}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] px-4 py-2.5 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Horário</label>
              <select
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] px-4 py-2.5 text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none transition-all text-sm"
              >
                <option value="">Selecione...</option>
                {Array.from({ length: 28 }).map((_, i) => {
                  const h = Math.floor(i / 2) + 8; // Começa às 08:00, termina às 21:30
                  const m = i % 2 === 0 ? "00" : "30";
                  const timeStr = `${padZero(h)}:${m}`;
                  
                  // Verificar conflito apenas se houver uma data selecionada
                  let isAvailable = true;
                  if (form.date && appointments) {
                    const startSlot = new Date(`${form.date}T${timeStr}:00`).getTime();
                    const endSlot = startSlot + (form.duration_min * 60000);
                    
                    isAvailable = !appointments.some(app => {
                      const appStart = new Date(app.scheduled_at).getTime();
                      const appEnd = appStart + (app.duration_min * 60000);
                      // Só considera conflitos de agendamentos que não foram cancelados
                      if (app.status === 'cancelled') return false;
                      return startSlot < appEnd && endSlot > appStart;
                    });
                  }

                  return isAvailable ? (
                    <option key={timeStr} value={timeStr}>{timeStr}</option>
                  ) : null;
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Observações (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Informações adicionais..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.03] px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition-all text-sm resize-none"
            />
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            {saving ? "Agendando..." : "Confirmar Agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────
function AppointmentCard({ appt, onStatusChange }: { appt: Appointment; onStatusChange: (id: string, status: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const st = STATUS_MAP[appt.status] || STATUS_MAP.scheduled;
  const endTime = new Date(new Date(appt.scheduled_at).getTime() + appt.duration_min * 60000);

  return (
    <div className="group relative flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-indigo-500/30 hover:shadow-sm transition-all">
      <div className={`w-1 self-stretch rounded-full shrink-0 ${st.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{appt.service_name}</p>
            {appt.lead?.name && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg viewBox="0 0 24 24" height="12" width="12" className="text-slate-400 dark:text-zinc-500 shrink-0"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">{appt.lead.name}</span>
                {appt.lead.phone && (
                  <>
                    <span className="text-slate-300 dark:text-zinc-600">·</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{appt.lead.phone}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all opacity-0 group-hover:opacity-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl py-1 backdrop-blur-xl">
                {Object.entries(STATUS_MAP).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => { onStatusChange(appt.id, key); setMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${
                      appt.status === key ? "text-indigo-500 font-bold" : "text-slate-600 dark:text-zinc-300"
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

        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 24 24" height="12" width="12" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            {formatTime(appt.scheduled_at)} – {padZero(endTime.getHours())}:{padZero(endTime.getMinutes())}
          </span>
          <span>{appt.duration_min}min</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {["confirmed", "completed", "cancelled"].map((s) => {
            const st = STATUS_MAP[s];
            const isActive = appt.status === s;
            return (
              <button
                key={s}
                onClick={() => onStatusChange(appt.id, s)}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-all ${
                  isActive
                    ? `${st.dot.replace("bg-", "bg-").replace("-500", "-500/20")} ${st.dot.replace("bg-", "text-")} border-transparent`
                    : "text-slate-400 dark:text-zinc-500 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {appt.notes && (
          <p className="text-xs text-slate-400 dark:text-zinc-500 italic border-t border-slate-100 dark:border-white/5 pt-2 mt-2">{appt.notes}</p>
        )}
      </div>
    </div>
  );
}

// ─── PÁGINA ──────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
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
      .then((d) => { if (d.settings) setAiSettings(d.settings); });
  }, []);

  const getAppointmentsForDay = (day: number) =>
    appointments.filter((a) => {
      const d = new Date(a.scheduled_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const selectedDayAppts = selectedDay
    ? appointments.filter((a) => {
        const d = new Date(a.scheduled_at);
        return d.getFullYear() === selectedDay.getFullYear() &&
               d.getMonth() === selectedDay.getMonth() &&
               d.getDate() === selectedDay.getDate();
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

  // Timeline slots for selected day
  const timelineSlots = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00
  const getApptAtHour = (hour: number) =>
    selectedDayAppts.filter((a) => new Date(a.scheduled_at).getHours() === hour);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">Agenda</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Gerencie seus agendamentos e horários</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
          >
            Hoje
          </button>
          <button
            onClick={() => setViewMode(viewMode === "month" ? "week" : "month")}
            className="px-3 py-2 text-xs font-semibold bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
          >
            {viewMode === "month" ? "Semana" : "Mês"}
          </button>
          <button
            onClick={() => { setSelectedDay(today); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo
          </button>
        </div>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Hoje", value: todayAppts.length, sub: "agendamentos", icon: "calendar", color: "indigo" },
          { label: "No Mês", value: monthTotal, sub: "total", icon: "chart", color: "purple" },
          { label: "Confirmados", value: confirmed, sub: "este mês", icon: "check", color: "emerald" },
          { label: "Cancelados", value: appointments.filter((a) => a.status === "cancelled").length, sub: "este mês", icon: "x", color: "red" },
        ].map((m) => (
          <div key={m.label} className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className={`absolute top-0 left-0 w-1 h-full rounded-r ${
              m.color === "indigo" ? "bg-indigo-500" :
              m.color === "purple" ? "bg-purple-500" :
              m.color === "emerald" ? "bg-emerald-500" : "bg-red-500"
            }`} />
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{m.label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                m.color === "indigo" ? "bg-indigo-500/10 text-indigo-500" :
                m.color === "purple" ? "bg-purple-500/10 text-purple-500" :
                m.color === "emerald" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
              }`}>
                {m.icon === "calendar" && <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>}
                {m.icon === "chart" && <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/></svg>}
                {m.icon === "check" && <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                {m.icon === "x" && <svg viewBox="0 0 24 24" height="14" width="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>}
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{m.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Calendário + Painel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 shadow-sm">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {MONTHS_PT[month]} {year}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_PT.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 py-1 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAppts = getAppointmentsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month && selectedDay?.getFullYear() === year;
              const statusCounts = { confirmed: 0, cancelled: 0, other: 0 };
              dayAppts.forEach((a) => {
                if (a.status === "confirmed" || a.status === "completed") statusCounts.confirmed++;
                else if (a.status === "cancelled") statusCounts.cancelled++;
                else statusCounts.other++;
              });

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  className={`relative min-h-[52px] p-1 rounded-xl text-sm transition-all flex flex-col items-center ${
                    isSelected
                      ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                      : isToday
                      ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-slate-900 dark:text-white ring-1 ring-indigo-500/30"
                      : "text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="text-xs font-bold">{day}</span>
                  {dayAppts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {statusCounts.confirmed > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {statusCounts.other > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      {statusCounts.cancelled > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                    </div>
                  )}
                  {dayAppts.length > 0 && (
                    <span className={`text-[9px] font-bold mt-0.5 ${
                      isSelected ? "text-white/80" : "text-slate-400 dark:text-zinc-500"
                    }`}>
                      {dayAppts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-slate-200 dark:border-white/5">
            {Object.entries(STATUS_MAP).map(([, val]) => (
              <div key={val.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${val.dot}`} />
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">{val.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedDay
                  ? `${padZero(selectedDay.getDate())} de ${MONTHS_PT[selectedDay.getMonth()]}`
                  : "Selecione um dia"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {selectedDayAppts.length} agendamento{selectedDayAppts.length !== 1 ? "s" : ""}
              </p>
            </div>
            {selectedDay && (
              <button
                onClick={() => setModalOpen(true)}
                className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 transition-all border border-indigo-500/20"
                title="Adicionar neste dia"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          {/* Timeline view */}
          {selectedDay && selectedDayAppts.length > 0 && (
            <div className="mb-4 space-y-1 max-h-44 overflow-y-auto pr-1">
              {timelineSlots.map((hour) => {
                const apps = getApptAtHour(hour);
                if (apps.length === 0) return null;
                return (
                  <div key={hour} className="flex items-center gap-2 py-1">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 w-8 shrink-0">{padZero(hour)}h</span>
                    <div className="flex-1 flex gap-1">
                      {apps.map((a) => {
                        const st = STATUS_MAP[a.status] || STATUS_MAP.scheduled;
                        return (
                          <span key={a.id} className={`text-[10px] px-2 py-0.5 rounded-md font-medium truncate ${
                            a.status === "cancelled" ? "bg-red-500/10 text-red-500 line-through" :
                            a.status === "confirmed" || a.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}>
                            {a.service_name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Appointment list */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : selectedDayAppts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-3">
                <svg viewBox="0 0 24 24" height="24" width="24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-zinc-400">Nenhum agendamento</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                + Agendar agora
              </button>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto">
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
