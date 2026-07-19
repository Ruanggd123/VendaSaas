"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Plus,
  MoreVertical,
  ExternalLink,
  X,
  Loader2,
  Receipt,
  Search,
} from "lucide-react";

interface DeliveryInfo {
  status: string;
  product: string;
  client: string;
  clientPhone: string;
  address: string;
  updatedAt: string;
}

interface Sale {
  id: string;
  product_name: string;
  amount: number;
  status: string;
  payment_link?: string;
  due_date?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  lead?: { name?: string; phone?: string } | null;
  delivery?: DeliveryInfo;
}

interface Stats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  overdueAmount: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  paid: { label: "Pago", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  overdue: { label: "Vencido", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", dot: "bg-red-500" },
  cancelled: { label: "Cancelado", color: "bg-slate-500/10 text-slate-500 dark:text-zinc-400 border-slate-500/20", dot: "bg-slate-400" },
};

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function SkeletonMetric() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-8"></div>
        <div className="h-6 bg-slate-200 dark:bg-white/10 rounded w-24"></div>
        <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-20"></div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-white/5">
      <div className="animate-pulse flex-1 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-32"></div>
        <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-20"></div>
      </div>
      <div className="animate-pulse h-4 bg-slate-200 dark:bg-white/10 rounded w-16"></div>
      <div className="animate-pulse h-4 bg-slate-200 dark:bg-white/10 rounded w-16"></div>
    </div>
  );
}

function NewSaleModal({ isOpen, onClose, onCreated, products }: {
  isOpen: boolean; onClose: () => void; onCreated: () => void;
  products?: { name: string; price: string }[];
}) {
  const [form, setForm] = useState({ product_name: "", amount: "", due_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleProduct = (name: string) => {
    const p = products?.find((x) => x.name === name);
    const priceStr = String(p?.price || "");
    const price = priceStr.replace(/[^0-9,.]/g, "").replace(",", ".") || "";
    setForm((f) => ({ ...f, product_name: name, amount: price }));
  };

  const submit = async () => {
    if (!form.product_name || !form.amount) { setError("Preencha produto e valor."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Erro."); return; }
      onCreated(); onClose();
      setForm({ product_name: "", amount: "", due_date: "", notes: "" });
    } catch { setError("Erro de conexão."); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Receipt className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nova Cobrança</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Produto / Serviço</label>
            {products && products.length > 0 ? (
              <select value={form.product_name} onChange={(e) => handleProduct(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all">
                <option value="">Selecionar...</option>
                {products.map((p) => <option key={p.name} value={p.name}>{p.name} — {p.price}</option>)}
                <option value="__custom__">+ Outro</option>
              </select>
            ) : null}
            {(form.product_name === "__custom__" || !products?.length) && (
              <input type="text" value={form.product_name === "__custom__" ? "" : form.product_name}
                onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                placeholder="Nome do produto..." className="mt-2 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0,00" className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Data de Vencimento</label>
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all" />
          </div>

          <button onClick={submit} disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</> : "Criar Cobrança"}
          </button>
        </div>
      </div>
    </div>
  );
}

const DELIVERY_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pendente", color: "text-amber-500 border-amber-500/20 bg-amber-500/10", icon: "📦" },
  shipped: { label: "Enviado", color: "text-blue-500 border-blue-500/20 bg-blue-500/10", icon: "🚚" },
  delivered: { label: "Entregue", color: "text-emerald-500 border-emerald-500/20 bg-emerald-500/10", icon: "✅" },
};

function DeliveryBadge({ delivery, onUpdate }: { delivery: DeliveryInfo | null; onUpdate: (status: string) => void }) {
  if (!delivery) return null;
  const st = DELIVERY_MAP[delivery.status] || DELIVERY_MAP.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.color}`}>
      <span>{st.icon}</span> {st.label}
      {delivery.status === 'pending' && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onUpdate('shipped'); }}
            className="ml-1 px-1.5 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 rounded text-[9px] transition-all">Enviar</button>
        </>
      )}
      {delivery.status === 'shipped' && (
        <button onClick={(e) => { e.stopPropagation(); onUpdate('delivered'); }}
          className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded text-[9px] transition-all">Entregue</button>
      )}
    </span>
  );
}

function SaleRow({ sale, onStatusChange, onDeliveryUpdate }: { sale: Sale; onStatusChange: (id: string, status: string) => void; onDeliveryUpdate: (id: string, status: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const st = STATUS_MAP[sale.status] || STATUS_MAP.pending;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isOverdue = sale.status === "overdue" || (sale.status === "pending" && sale.due_date && new Date(sale.due_date) < new Date());

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
      <div className={`w-1 self-stretch rounded-full shrink-0 ${isOverdue ? "bg-red-500" : st.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{sale.product_name}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
          <svg viewBox="0 0 24 24" height="12" width="12" className="shrink-0"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          <span className="truncate">{sale.lead?.name || "Sem cliente"}</span>
          {sale.lead?.phone && (
            <>
              <span className="text-slate-300 dark:text-zinc-600">·</span>
              <span className="font-mono">{sale.lead.phone}</span>
            </>
          )}
        </div>
        {sale.notes && (
          <div className="mt-1 text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
            {sale.notes}
          </div>
        )}
        {sale.delivery && (
          <div className="mt-1">
            <DeliveryBadge delivery={sale.delivery} onUpdate={(s) => onDeliveryUpdate(sale.id, s)} />
          </div>
        )}
      </div>
      <div className="hidden sm:block text-right min-w-[100px]">
        <p className="font-bold text-sm text-slate-900 dark:text-white">{formatMoney(sale.amount)}</p>
        {sale.due_date && (
          <p className={`text-[10px] mt-0.5 ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400 dark:text-zinc-500"}`}>
            {isOverdue ? "Venceu " : "Vence "}{formatDate(sale.due_date)}
          </p>
        )}
      </div>
      <div className="min-w-[100px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${st.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {sale.status !== "paid" && sale.status !== "cancelled" && (
          <button
            onClick={() => onStatusChange(sale.id, "paid")}
            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Marcar como pago"
          >
            <svg viewBox="0 0 24 24" height="16" width="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </button>
        )}
        {sale.status === "paid" && (
          <button
            onClick={() => onStatusChange(sale.id, "pending")}
            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Reverter para pendente"
          >
            <svg viewBox="0 0 24 24" height="16" width="16" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
          </button>
        )}
        {sale.payment_link && (
          <a href={sale.payment_link} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            title="Abrir link de pagamento">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl py-1 animate-slide-up">
              {Object.entries(STATUS_MAP).map(([key, val]) => (
                <button key={key} onClick={() => { onStatusChange(sale.id, key); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${sale.status === key ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-600 dark:text-zinc-300"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${val.dot}`} />
                  {val.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FILTER_OPTIONS = [
  { key: "", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagas" },
  { key: "overdue", label: "Vencidas" },
  { key: "cancelled", label: "Canceladas" },
];

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, paid: 0, pending: 0, overdue: 0, overdueAmount: 0 });
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<{ name: string; price: string }[]>([]);

  const fetchSales = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("status", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/sales${params.toString() ? `?${params}` : ""}`);
      const data = await res.json();
      const parsed = (data.sales || []).map((s: any) => {
        let delivery = null;
        try { delivery = JSON.parse(s.notes || '{}'); if (!delivery.status) delivery = null; } catch { delivery = null; }
        return { ...s, delivery };
      });
      setSales(parsed);
      if (data.stats) setStats(data.stats);
    } catch {}
    setIsLoading(false);
  }, [filter, search]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  useEffect(() => {
    fetch("/api/settings/whatsapp").then((r) => r.json()).then((d) => {
      if (d.settings?.products) setProducts(d.settings.products);
    });
  }, []);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch("/api/sales", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchSales();
    } catch {}
  };

  const handleDeliveryUpdate = async (id: string, delivery_status: string) => {
    try {
      await fetch("/api/sales", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, delivery_status }),
      });
      fetchSales();
    } catch {}
  };

  const collectionRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] text-slate-900 dark:text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-green-500">$</span>
              Vendas & Cobranças
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Controle financeiro dos seus clientes.</p>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" />
            Nova Cobrança
          </button>
        </header>

        {/* Collection Rate Bar */}
        {stats.total > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Taxa de Recebimento</span>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">{collectionRate}%</span>
            </div>
            <div className="relative h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-700"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 dark:text-zinc-500">
              <span>Recebido: {formatMoney(stats.paid)}</span>
              <span>Total: {formatMoney(stats.total)}</span>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <SkeletonMetric />
              <SkeletonMetric />
              <SkeletonMetric />
              <SkeletonMetric />
            </>
          ) : (
            <>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 hover:shadow-sm transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-r" />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total</p>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white">{formatMoney(stats.total)}</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Faturamento total</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 hover:shadow-sm transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-r" />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Recebido</p>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatMoney(stats.paid)}</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{stats.total > 0 ? `${collectionRate}% do total` : "Nenhum"}</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 hover:shadow-sm transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-r" />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pendente</p>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{formatMoney(stats.pending)}</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">A receber</p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 hover:shadow-sm transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-r" />
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Atrasado</p>
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-extrabold text-red-500">{formatMoney(stats.overdueAmount)}</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{stats.overdue} cobrança{stats.overdue !== 1 ? "s" : ""} em atraso</p>
              </div>
            </>
          )}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por produto ou cliente..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder-slate-400 dark:placeholder-zinc-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTER_OPTIONS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  filter === f.key
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-white dark:bg-white/5 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sales List */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm">
          {/* Table Header (desktop) */}
          <div className="hidden md:flex items-center gap-4 px-4 py-3 border-b border-slate-200 dark:border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 first:rounded-t-2xl">
            <div className="flex-1">Produto / Cliente</div>
            <div className="text-right min-w-[100px]">Valor</div>
            <div className="min-w-[100px] text-center">Status</div>
            <div className="w-20"></div>
          </div>

          {isLoading ? (
            <div>
              {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-slate-300 dark:text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                {search || filter ? "Nenhuma cobrança encontrada" : "Nenhuma cobrança"}
              </p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4">
                {search || filter ? "Tente alterar os filtros ou busca." : "Crie sua primeira cobrança para começar."}
              </p>
              <button onClick={() => setModalOpen(true)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                + Criar cobrança
              </button>
            </div>
          ) : (
            <div>
              {sales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} onStatusChange={handleStatusChange} onDeliveryUpdate={handleDeliveryUpdate} />
              ))}
              <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-zinc-500 text-center">
                {sales.length} cobrança{sales.length !== 1 ? "s" : ""} no total
              </div>
            </div>
          )}
        </div>
      </div>

      <NewSaleModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreated={fetchSales} products={products} />
    </div>
  );
}
