'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, MessageSquare, ThumbsUp, DollarSign, XCircle, Calendar,
  ArrowRight, RefreshCw, Phone, Briefcase, UserPlus, Copy,
  Star, TrendingUp, Clock, Target, Sparkles, MapPin, Mail,
  ChevronDown, CheckCircle2, Check, X, AlertCircle, Globe,
  Search, Plus, ChevronLeft, ChevronRight, Save, Link2, Wallet
} from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  email?: string;
  referralCode: string;
  commissionRate: number;
  leadsCount: number;
  convertedCount: number;
  created_at: string;
  totalCommissions: number;
  paidCommissions: number;
}

interface Metrics {
  totalLeadsThisMonth: number;
  contactedLeads: number;
  interestedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  optedOutLeads: number;
  followUpsToday: number;
  role?: string;
}

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  interested_product: string | null;
  email: string | null;
  city: string | null;
  estado: string | null;
  status: string;
  source: string | null;
  created_at: string;
  nextContactAt: string | null;
  lastContactedAt: string | null;
  contactAttempts: number;
  value: number | null;
  notes: string | null;
}

export default function AutoVendasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'partners' | 'withdrawals' | 'automations'>('dashboard');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const metricsData = await fetch('/api/autovendas/metrics').then(r => r.json());
      const role = metricsData?.role;
      const isManager = role === 'manager' || role === 'superadmin';
      
      if (role !== 'superadmin') {
        router.replace('/dashboard');
        return;
      }

      const [leadsData, partnersData, tenantData] = await Promise.all([
        fetch('/api/autovendas/leads').then(r => r.json()),
        isManager ? fetch('/api/autovendas/partners').then(r => r.json().catch(() => [])) : Promise.resolve([]),
        fetch('/api/tenant/me').then(r => r.json()).catch(() => ({}))
      ]);
      if (tenantData.tenantId) setTenantId(tenantData.tenantId);
      if (metricsData && !metricsData.error) setMetrics(metricsData);
      if (Array.isArray(leadsData)) setLeads(leadsData);
      if (Array.isArray(partnersData)) setPartners(partnersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isManager = metrics?.role === 'manager' || metrics?.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <RocketIcon />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">AutoVendas</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Pipeline automático de vendas e leads</p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-1">
            {[
              { key: 'dashboard' as const, label: 'Dashboard' },
              ...(isManager ? [{ key: 'partners' as const, label: 'Parceiros' }] : []),
              ...(isManager ? [{ key: 'withdrawals' as const, label: 'Saques' }] : []),
              { key: 'automations' as const, label: 'Automações' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button onClick={fetchData} disabled={loading}
            className="p-2 bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {activeTab === 'dashboard' && (
        <DashboardTab metrics={metrics} leads={leads} loading={loading} onLeadsChange={setLeads} onLeadCreated={fetchData} />
      )}

      {activeTab === 'partners' && (
        <PartnerManagerTab tenantId={tenantId} partners={partners} onPartnerCreated={fetchData} />
      )}

      {activeTab === 'withdrawals' && (
        <WithdrawalsTab />
      )}

      {activeTab === 'automations' && (
        <AutomationsTab />
      )}
    </div>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 24 24" height="24" width="24" className="text-indigo-500" fill="currentColor">
      <path d="M12 2.5s-4.5 2.5-6 5c-1.5 2.5-2 6-2 8.5l8 5.5 8-5.5c0-2.5-.5-6-2-8.5-1.5-2.5-6-5-6-5zm0 2.5c2.5 1.5 4 3.5 4.5 5 .5 1.5.5 4 0 5.5L12 19l-4.5-3.5c-.5-1.5-.5-4 0-5.5C8 8.5 9.5 6.5 12 5zM9 12c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"/>
    </svg>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { key: '', label: 'Todos', color: 'slate' },
  { key: 'NEW', label: 'Novo', color: 'indigo' },
  { key: 'CONTACTED', label: 'Contatado', color: 'blue' },
  { key: 'INTERESTED', label: 'Interessado', color: 'amber' },
  { key: 'CONVERTED', label: 'Convertido', color: 'green' },
  { key: 'OPTED_OUT', label: 'Opt-out', color: 'red' },
  { key: 'NOT_INTERESTED', label: 'Não interessado', color: 'slate' },
] as const;

const PAGE_SIZE = 10;

function DashboardTab({ metrics, leads, loading, onLeadsChange, onLeadCreated }: { 
  metrics: Metrics | null; 
  leads: Lead[]; 
  loading: boolean; 
  onLeadsChange: (leads: Lead[]) => void;
  onLeadCreated: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editNextContact, setEditNextContact] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  useEffect(() => {
    let result = leads;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        l.phone.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      result = result.filter(l => l.status === statusFilter);
    }
    setFilteredLeads(result);
    setPage(1);
  }, [leads, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLead(leadId);
    try {
      const res = await fetch(`/api/autovendas/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
        onLeadsChange(updated);
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    } finally {
      setUpdatingLead(null);
    }
  };

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setEditNotes(lead.notes || '');
    setEditNextContact(lead.nextContactAt ? new Date(lead.nextContactAt).toISOString().slice(0, 16) : '');
  };

  const saveLeadDetail = async () => {
    if (!selectedLead) return;
    setSavingLead(true);
    try {
      const res = await fetch(`/api/autovendas/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: editNotes,
          nextContactAt: editNextContact || null,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        onLeadsChange(leads.map(l => l.id === selectedLead.id ? { ...l, notes: updated.notes, nextContactAt: updated.nextContactAt } : l));
        setSelectedLead(prev => prev ? { ...prev, notes: updated.notes, nextContactAt: updated.nextContactAt } : null);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    } finally {
      setSavingLead(false);
    }
  };

  const totalLeads = metrics?.totalLeadsThisMonth ?? 0;
  const contacted = metrics?.contactedLeads ?? 0;
  const interested = metrics?.interestedLeads ?? 0;
  const converted = metrics?.convertedLeads ?? 0;
  const rate = metrics?.conversionRate ?? 0;
  const optedOut = metrics?.optedOutLeads ?? 0;
  const followUps = metrics?.followUpsToday ?? 0;
  const pipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source || 'organico';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  const sourceEntries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
              <div className="animate-pulse space-y-2"><div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-16" /><div className="h-6 bg-slate-200 dark:bg-white/10 rounded w-12" /></div>
            </div>
          ))
        ) : (
          <>
            <MetricCard title="Leads (Mês)" value={totalLeads} icon={<Users className="w-4 h-4" />} color="indigo" subtitle={`${leads.filter(l => l.status === 'NEW').length} novos`} />
            <MetricCard title="Contatados" value={contacted} icon={<MessageSquare className="w-4 h-4" />} color="blue" subtitle={`${followUps} follow-ups hoje`} />
            <MetricCard title="Interessados" value={interested} icon={<ThumbsUp className="w-4 h-4" />} color="amber" subtitle={`${optedOut} opt-outs`} />
            <MetricCard title="Vendas" value={converted} icon={<DollarSign className="w-4 h-4" />} color="green" subtitle={`Conversão: ${rate.toFixed(1)}%`} />
            <MetricCard title="Pipeline (R$)" value={`R$ ${pipelineValue.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4" />} color="purple" subtitle={`${interested + converted} leads ativos`} />
          </>
        )}
      </div>

      {/* Funnel + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Funnel progress bar */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Progresso do Funil</span>
            </div>
            <span className="text-xs font-bold text-indigo-500">{contacted > 0 ? Math.round(converted / contacted * 100) : 0}% conversão</span>
          </div>
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
            {totalLeads > 0 && (
              <>
                <div className="bg-blue-500 h-full transition-all" style={{ width: `${(contacted / totalLeads) * 100}%` }} title="Contatados" />
                <div className="bg-amber-500 h-full transition-all" style={{ width: `${(interested / totalLeads) * 100}%` }} title="Interessados" />
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(converted / totalLeads) * 100}%` }} title="Convertidos" />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${(optedOut / totalLeads) * 100}%` }} title="Opt-outs" />
              </>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-400 dark:text-zinc-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Contatados {contacted}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Interessados {interested}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Convertidos {converted}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Opt-outs {optedOut}</span>
          </div>
        </div>

        {/* Source distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Origem
          </h3>
          <div className="space-y-2">
            {sourceEntries.length > 0 ? sourceEntries.map(([src, count]) => (
              <div key={src}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-slate-500 dark:text-zinc-400 capitalize">{src === 'meta_ads' ? 'Meta Ads' : src === 'organico' ? 'Orgânico' : src}</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-300">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${(count / leads.length) * 100}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Secondary + Leads Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Ações do Dia
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
                <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Follow-ups
                </span>
                <span className="text-sm font-bold text-indigo-500">{followUps}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-red-500 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Opt-outs
                </span>
                <span className="text-sm font-bold text-red-500">{optedOut}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Meta do Mês
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">30 leads/dia · {totalLeads} no mês</p>
            <div className="relative h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.min((totalLeads / 900) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
              <span>0</span>
              <span>{totalLeads}/900</span>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Leads</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{filteredLeads.length} de {leads.length}</span>
                <button onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[10px] font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-3 h-3" />
                  Novo
                </button>
              </div>
            </div>
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-1 mt-2">
              {STATUS_OPTIONS.map(opt => {
                const count = opt.key ? leads.filter(l => l.status === opt.key).length : leads.length;
                const cMap: Record<string, string> = {
                  slate: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/10 border-slate-200 dark:border-white/10',
                  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20',
                  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
                  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20',
                  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20',
                  red: 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20',
                };
                const activeCls = statusFilter === opt.key
                  ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ring-indigo-500/40'
                  : '';
                return (
                  <button key={opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${cMap[opt.color]} ${activeCls}`}
                  >
                    {opt.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                <tr className="border-b border-slate-200 dark:border-white/5">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Próx. Contato</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 dark:text-zinc-300 divide-y divide-slate-100 dark:divide-white/5">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-4"><div className="animate-pulse h-4 bg-slate-200 dark:bg-white/10 rounded w-full" /></td></tr>
                  ))
                ) : paginatedLeads.length > 0 ? paginatedLeads.map(lead => (
                  <tr key={lead.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => openLeadDetail(lead)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{lead.name || 'Sem nome'}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                        {(lead.city || lead.estado) && (
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[lead.city, lead.estado].filter(Boolean).join(', ')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.interested_product ? (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {lead.interested_product}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">—</span>
                      )}
                      {lead.value != null && (
                        <div className="text-[10px] text-emerald-500 font-bold mt-0.5">R$ {lead.value.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <LeadStatusBadge status={lead.status} />
                        {lead.source === 'checkout' && lead.status === 'NEW' && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 font-bold">Checkout</span>
                        )}
                        {lead.source === 'checkout' && lead.status === 'CONVERTED' && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 font-bold">Pago</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                        {lead.nextContactAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(lead.nextContactAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : lead.created_at ? (
                          <span>Criado {new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                        ) : '—'}
                      </div>
                      {lead.contactAttempts > 0 && (
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          {lead.contactAttempts}x tentativas
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {lead.status === 'NEW' && (
                          <ActionBtn icon={<MessageSquare className="w-3 h-3" />} label="Contatar" color="blue" onClick={() => updateLeadStatus(lead.id, 'CONTACTED')} disabled={updatingLead === lead.id} />
                        )}
                        {lead.status === 'CONTACTED' && (
                          <>
                            <ActionBtn icon={<ThumbsUp className="w-3 h-3" />} label="Interessado" color="amber" onClick={() => updateLeadStatus(lead.id, 'INTERESTED')} disabled={updatingLead === lead.id} />
                            <ActionBtn icon={<X className="w-3 h-3" />} label="Opt-out" color="red" onClick={() => updateLeadStatus(lead.id, 'OPTED_OUT')} disabled={updatingLead === lead.id} />
                          </>
                        )}
                        {lead.status === 'INTERESTED' && (
                          <>
                            <ActionBtn icon={<CheckCircle2 className="w-3 h-3" />} label="Converter" color="green" onClick={() => updateLeadStatus(lead.id, 'CONVERTED')} disabled={updatingLead === lead.id} />
                            <ActionBtn icon={<AlertCircle className="w-3 h-3" />} label="Não int." color="slate" onClick={() => updateLeadStatus(lead.id, 'NOT_INTERESTED')} disabled={updatingLead === lead.id} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-zinc-500">Nenhum lead encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {!loading && filteredLeads.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredLeads.length)} de {filteredLeads.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 text-[10px] font-bold rounded-lg transition-all ${
                      p === page
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal onClose={() => setShowCreateModal(false)} onCreated={onLeadCreated} />
      )}

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
          editNextContact={editNextContact}
          setEditNextContact={setEditNextContact}
          savingLead={savingLead}
          onSave={saveLeadDetail}
          onClose={() => setSelectedLead(null)}
          onStatusChange={updateLeadStatus}
          updatingLead={updatingLead}
        />
      )}
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick, disabled }: { icon: React.ReactNode; label: string; color: string; onClick: () => void; disabled?: boolean }) {
  const cMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-amber-500/20',
    green: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-600 dark:text-red-400 hover:bg-red-500/10 border-red-500/20',
    slate: 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 border-slate-200 dark:border-white/10',
  };
  return (
    <button onClick={onClick} disabled={disabled} title={label}
      className={`p-1.5 rounded-lg border border-transparent transition-all ${cMap[color]} disabled:opacity-40`}>
      {icon}
    </button>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    NEW: { label: 'Novo', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
    CONTACTED: { label: 'Contatado', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    INTERESTED: { label: 'Interessado', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    CONVERTED: { label: 'Convertido', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    OPTED_OUT: { label: 'Opt-out', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    NOT_INTERESTED: { label: 'Não interessado', cls: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-white/10' },
  };
  const s = map[status] || { label: status, cls: 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-white/10' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'NEW' ? 'bg-indigo-500' : status === 'CONTACTED' ? 'bg-blue-500' : status === 'INTERESTED' ? 'bg-amber-500' : status === 'CONVERTED' ? 'bg-emerald-500' : status === 'OPTED_OUT' ? 'bg-red-500' : 'bg-slate-400'}`} />
      {s.label}
    </span>
  );
}

// ─── CREATE LEAD MODAL ────────────────────────────────────────────────────────
function CreateLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [product, setProduct] = useState('');
  const [val, setVal] = useState('');
  const [city, setCity] = useState('');
  const [estado, setEstado] = useState('');
  const [notes, setNotes] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) { setError('Telefone é obrigatório'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/autovendas/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          phone,
          email: email || undefined,
          interested_product: product || undefined,
          value: val || undefined,
          city: city || undefined,
          estado: estado || undefined,
          notes: notes || undefined,
          source: 'manual',
          referral_code: referralCode || undefined,
        })
      });
      if (res.ok) {
        onClose();
        onCreated();
      } else {
        const d = await res.json();
        setError(d.error || 'Erro ao criar lead');
      }
    } catch {
      setError('Erro de conexão');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Novo Lead</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nome</label>
              <input type="text" placeholder="Ex: Maria Silva"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Telefone *</label>
              <input type="text" required placeholder="(11) 99999-9999"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" placeholder="maria@email.com"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Produto de Interesse</label>
              <input type="text" placeholder="Ex: Plano Premium"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
              <input type="number" step="0.01" min="0" placeholder="0,00"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={val} onChange={(e) => setVal(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Cidade</label>
              <input type="text" placeholder="São Paulo"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Estado</label>
              <input type="text" placeholder="SP"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                value={estado} onChange={(e) => setEstado(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Código de Indicação</label>
              <input type="text" placeholder="Ex: JOAO482"
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all uppercase"
                value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Observações</label>
              <textarea rows={2} placeholder="Informações adicionais..."
                className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
                value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
              {loading ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── LEAD DETAIL PANEL ────────────────────────────────────────────────────────
function LeadDetailPanel({ lead, editNotes, setEditNotes, editNextContact, setEditNextContact, savingLead, onSave, onClose, onStatusChange, updatingLead }: {
  lead: Lead;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editNextContact: string;
  setEditNextContact: (v: string) => void;
  savingLead: boolean;
  onSave: () => void;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  updatingLead: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900/98 border-l border-slate-200 dark:border-white/[0.06] shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-zinc-900/98 border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{lead.name || 'Sem nome'}</h3>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Detalhes do lead</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <LeadStatusBadge status={lead.status} />
            <div className="flex gap-1">
              {lead.status === 'NEW' && (
                <button onClick={() => onStatusChange(lead.id, 'CONTACTED')} disabled={updatingLead === lead.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-40">
                  <MessageSquare className="w-3 h-3" /> Contatar
                </button>
              )}
              {lead.status === 'CONTACTED' && (
                <>
                  <button onClick={() => onStatusChange(lead.id, 'INTERESTED')} disabled={updatingLead === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all disabled:opacity-40">
                    <ThumbsUp className="w-3 h-3" /> Interessado
                  </button>
                  <button onClick={() => onStatusChange(lead.id, 'OPTED_OUT')} disabled={updatingLead === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-40">
                    <X className="w-3 h-3" /> Opt-out
                  </button>
                </>
              )}
              {lead.status === 'INTERESTED' && (
                <>
                  <button onClick={() => onStatusChange(lead.id, 'CONVERTED')} disabled={updatingLead === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-40">
                    <CheckCircle2 className="w-3 h-3" /> Converter
                  </button>
                  <button onClick={() => onStatusChange(lead.id, 'NOT_INTERESTED')} disabled={updatingLead === lead.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-40">
                    <AlertCircle className="w-3 h-3" /> Não int.
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Telefone</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.phone}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Email</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.email || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Produto</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.interested_product || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Valor</label>
              <p className="text-sm font-semibold text-emerald-500 mt-0.5">{lead.value ? `R$ ${lead.value.toFixed(2)}` : '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Cidade / Estado</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{[lead.city, lead.estado].filter(Boolean).join(', ') || '—'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Origem</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5 capitalize">{lead.source || 'Orgânico'}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Criado em</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{new Date(lead.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Tentativas</label>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{lead.contactAttempts}x</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Próximo Contato</label>
            <input
              type="datetime-local"
              value={editNextContact}
              onChange={(e) => setEditNextContact(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Observações</label>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">{editNotes.length} caracteres</span>
            </div>
            <textarea
              rows={5}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Adicione observações sobre este lead..."
              className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          <button
            onClick={onSave}
            disabled={savingLead}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            {savingLead ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PARTNERS ────────────────────────────────────────────────────────────────
function PartnerManagerTab({ tenantId, partners, onPartnerCreated }: { tenantId: string; partners: Partner[]; onPartnerCreated: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [createdPassword, setCreatedPassword] = useState('');

  const generateCode = (fullName: string): string => {
    const cleaned = fullName.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '').toUpperCase();
    const prefix = cleaned.slice(0, 4).padEnd(4, 'X');
    const suffix = Math.floor(100 + Math.random() * 900);
    return `${prefix}${suffix}`;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!codeManuallyEdited) {
      setReferralCode(generateCode(val));
    }
  };

  const handleCodeChange = (val: string) => {
    setCodeManuallyEdited(true);
    setReferralCode(val);
  };

  const getEffectiveRate = (p: Partner): number => {
    const daysOld = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysOld < 30 ? 50 : p.commissionRate;
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCreatedPassword('');
    try {
      const res = await fetch('/api/autovendas/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, referralCode })
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedPassword(data.generatedPassword || '');
        setName('');
        setEmail('');
        setReferralCode('');
        setCodeManuallyEdited(false);
        onPartnerCreated();
      } else {
        const d = await res.json();
        setError(d.error || 'Erro ao criar parceiro');
      }
    } catch {
      setError('Erro de conexão');
    } finally { setLoading(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const totalEstimatedCommission = partners.reduce((sum, p) => {
    const rate = getEffectiveRate(p);
    return sum + p.convertedCount * 97 * (rate / 100);
  }, 0);

  return (
    <div className="space-y-6">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-zinc-900/95 p-6 shadow-2xl backdrop-blur-xl relative">
            <button type="button" onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Novo Parceiro</h3>
            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nome</label>
                <input type="text" required placeholder="Ex: João Vendedor"
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  value={name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Código de Indicação</label>
                  {codeManuallyEdited && (
                    <button type="button" onClick={() => { setCodeManuallyEdited(false); setReferralCode(generateCode(name)); }}
                      className="text-[10px] text-indigo-500 hover:text-indigo-600 font-semibold">Gerar automático</button>
                  )}
                </div>
                <input type="text" required placeholder="Ex: JOAO100"
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all uppercase"
                  value={referralCode} onChange={(e) => handleCodeChange(e.target.value.toUpperCase())} />
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  Código gerado automaticamente. Edite se quiser personalizar.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Email de Acesso</label>
                <input type="email" required placeholder="vendedor@email.com"
                  className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              {createdPassword ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Parceiro criado com sucesso!</p>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Email: <span className="font-mono text-slate-700 dark:text-zinc-300">{email}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Senha gerada: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{createdPassword}</span>
                  </p>
                  <p className="text-[9px] text-amber-600 dark:text-amber-400">Guarde esta senha. Ela não será mostrada novamente.</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { navigator.clipboard.writeText(createdPassword); setCopied('pwd'); setTimeout(() => setCopied(null), 2000); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-xl transition-all">
                      {copied === 'pwd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === 'pwd' ? 'Copiado!' : 'Copiar senha'}
                    </button>
                    <button type="button" onClick={() => setShowModal(false)}
                      className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3 space-y-1">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Regra de Comissão Automática</p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      1º mês: <span className="font-bold text-emerald-500">50%</span> · Após 30 dias: <span className="font-bold">30%</span>
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500">Aplicado automaticamente. Parceiro acessa <span className="font-mono text-indigo-500">/painel-parceiro</span></p>
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition-colors">Cancelar</button>
                    <button type="submit" disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
                      {loading ? 'Salvando...' : 'Cadastrar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Gestão de Parceiros</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Gerencie links de indicação e comissões</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
          <UserPlus className="w-4 h-4" />
          Novo Parceiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="Parceiros Ativos" value={partners.length} icon={<Users className="w-4 h-4" />} color="indigo" />
        <MetricCard title="Leads Indicados" value={partners.reduce((s, p) => s + p.leadsCount, 0)} icon={<ArrowRight className="w-4 h-4" />} color="blue" />
        <MetricCard title="Comissões Pendentes" value={`R$ ${partners.reduce((s, p) => s + (p.totalCommissions - p.paidCommissions), 0).toFixed(2)}`} icon={<Wallet className="w-4 h-4" />} color="amber" subtitle={partners.reduce((s, p) => s + (p.convertedCount - Math.round(p.paidCommissions / 97)), 0) + ' vendas a pagar'} />
        <MetricCard title="Comissões Pagas" value={`R$ ${partners.reduce((s, p) => s + p.paidCommissions, 0).toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} color="green" />
      </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Parceiros Cadastrados</h3>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500"><span className="text-emerald-500 font-bold">50%</span> 1º mês · <span className="font-bold">30%</span> após</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              <tr className="border-b border-slate-200 dark:border-white/5">
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Acesso</th>
                <th className="px-4 py-3">Link / Código</th>
                <th className="px-4 py-3 text-right">Comissão</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Conv.</th>
                <th className="px-4 py-3 text-right">Ganhos</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 dark:text-zinc-300 divide-y divide-slate-100 dark:divide-white/5">
              {partners.length > 0 ? partners.map(p => {
                const effRate = getEffectiveRate(p);
                const isFirstMonth = effRate === 50;
                const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                const referLink = `${baseUrl}/checkout/${tenantId}?ref=${p.referralCode}`;
                return (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      {isFirstMonth && <span className="ml-1.5 text-emerald-500 font-bold">· 1º mês</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">{p.email || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <code className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/10">
                          {p.referralCode}
                        </code>
                        <button onClick={() => copyCode(p.referralCode)}
                          className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Copiar código">
                          {copied === p.referralCode ? <span className="text-emerald-500 text-[10px]">OK</span> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(referLink); setCopied('link_' + p.id); setTimeout(() => setCopied(null), 2000); }}
                        className="flex items-center gap-1 text-[9px] text-indigo-500 hover:text-indigo-600 transition-colors w-fit">
                        <Link2 className="w-3 h-3" />
                        {copied === 'link_' + p.id ? 'Link copiado!' : 'Copiar link de indicação'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${isFirstMonth ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                      {effRate}%
                    </span>
                    {isFirstMonth && <div className="text-[9px] text-emerald-500">(promocional)</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">{p.leadsCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-bold text-emerald-500">{p.convertedCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-bold text-slate-900 dark:text-white">R$ {p.totalCommissions.toFixed(2)}</div>
                    {p.paidCommissions > 0 && (
                      <div className="text-[9px] text-emerald-500">R$ {p.paidCommissions.toFixed(2)} pagos</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Excluir "${p.name}"?`)) return;
                        await fetch(`/api/autovendas/partners/${p.id}`, { method: 'DELETE' });
                        onPartnerCreated();
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors" title="Excluir">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )}) : (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-zinc-500">Nenhum parceiro cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── WITHDRAWALS ───────────────────────────────────────────────────────────
function WithdrawalsTab() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    fetch('/api/autovendas/withdrawals')
      .then(r => r.json())
      .then(d => { if (!d.error) setWithdrawals(d.withdrawals || []); })
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionMsg('');
    try {
      const res = await fetch(`/api/autovendas/withdrawals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (d.error) { setActionMsg(d.error); return; }
      setActionMsg(action === 'approve' ? 'Saque aprovado!' : 'Saque rejeitado.');
      // Refresh
      const r = await fetch('/api/autovendas/withdrawals');
      const rd = await r.json();
      if (!rd.error) setWithdrawals(rd.withdrawals || []);
    } catch { setActionMsg('Erro ao processar'); }
  };

  if (loading) return <div className="text-center text-xs text-slate-400 py-8">Carregando...</div>;

  return (
    <div className="space-y-4">
      {actionMsg && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs text-indigo-400">{actionMsg}</div>
      )}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5">
          <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Solicitações de Saque</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              <tr className="border-b border-slate-200 dark:border-white/5">
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Chave PIX</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="text-xs text-slate-600 dark:text-zinc-300 divide-y divide-slate-100 dark:divide-white/5">
              {withdrawals.length > 0 ? withdrawals.map(w => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{w.partner?.name}</div>
                    <div className="text-[10px] text-slate-400">{w.partner?.email}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">R$ {w.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{w.pixKey}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] uppercase text-slate-400">{w.pixKeyType}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      w.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                      'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    }`}>
                      {w.status === 'approved' ? 'Aprovado' : w.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {w.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleAction(w.id, 'approve')}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all">
                          Aprovar
                        </button>
                        <button onClick={() => handleAction(w.id, 'reject')}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 transition-all">
                          Rejeitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-400">Nenhuma solicitação de saque.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AUTOMATIONS ──────────────────────────────────────────────────────────────
function AutomationsTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        {
          title: 'Follow-up Inteligente',
          desc: 'Reengaja leads que não responderam. Envia cases de sucesso 3 dias após "vou pensar".',
          icon: Calendar, color: 'indigo', active: true,
        },
        {
          title: 'Onboarding Automatizado',
          desc: 'Envia link de setup, tutorial e dispara check-in em 7 dias para leads convertidos.',
          icon: UserPlus, color: 'blue', active: true,
        },
        {
          title: 'Coleta de Prova Social',
          desc: 'Após 30 dias, envia NPS via WhatsApp. Pede autorização para depoimento.',
          icon: Star, color: 'amber', active: false,
        },
      ].map((item) => {
        const Icon = item.icon;
        const cMap: Record<string, string> = {
          indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
          blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
          amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
        };
        return (
          <div key={item.title} className="group relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-3 right-3">
              <span className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-400 dark:bg-zinc-600'}`} />
            </div>
            <div className={`w-10 h-10 rounded-xl ${cMap[item.color]} border flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4 leading-relaxed">{item.desc}</p>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${item.active ? 'text-emerald-500' : 'text-slate-400 dark:text-zinc-500'}`}>
                {item.active ? 'Ativo' : 'Pausado'}
              </span>
              <button className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                Configurar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMMON ───────────────────────────────────────────────────────────────────
function MetricCard({ title, value, icon, subtitle, color }: { title: string; value: string | number; icon: React.ReactNode; subtitle?: string; color: string }) {
  const cMap: Record<string, string> = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    red: 'bg-red-500/10 border-red-500/20 text-red-500',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-500',
  };
  const barColor: Record<string, string> = {
    indigo: 'bg-indigo-500', blue: 'bg-blue-500', amber: 'bg-amber-500', green: 'bg-emerald-500', red: 'bg-red-500', purple: 'bg-purple-500',
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm hover:shadow-md transition-all">
      <div className={`absolute top-0 left-0 w-1 h-full rounded-r ${barColor[color] || 'bg-indigo-500'}`} />
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{title}</p>
        <div className={`w-8 h-8 rounded-lg ${cMap[color] || cMap.indigo} border flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      {subtitle && <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
