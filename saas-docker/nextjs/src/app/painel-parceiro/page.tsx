'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, TrendingUp, Clock, Phone, Bot, Calendar, MessageSquare, Smartphone, Settings,
  LogOut, Target, CheckCircle2, Wallet, Link2, Copy, Check, Share2,
  Banknote, XCircle, AlertCircle, Zap, ExternalLink,
  Sparkles, ShieldCheck, BarChart3, Gift, Star, ShoppingCart, Rocket,
  Globe, Brain, Workflow, LayoutDashboard, ArrowRight, ChevronDown, RefreshCw, Send
} from 'lucide-react';

// ─── Tipos ───
interface PartnerLead {
  id: string; name: string | null; phone: string; interested_product: string | null;
  value: number | null; status: string; created_at: string;
  project_status?: string; project_updated_at?: string | null; project_notes?: string | null;
}
interface Withdrawal {
  id: string; amount: number; status: string; pixKey: string; pixKeyType: string;
  created_at: string; approved_at: string | null; rejected_at: string | null;
}
interface PartnerData {
  tenantId: string; name: string; referralCode: string; leads: PartnerLead[];
  paidCommissions: number; totalCommissions: number; commissionRate: number; type?: string;
}
interface Project {
  id: string; title: string; description: string; price: number; status: string; created_at: string; client_name: string;
}
interface DevService {
  id: string; title: string; price: number; is_recurring: boolean;
}

// ─── Componentes de Design Premium ───

function Glow() {
  return (
    <>
      <div className="fixed -top-40 -right-40 w-[700px] h-[700px] bg-indigo-600/15 rounded-full blur-[180px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed top-1/3 -left-60 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="fixed -bottom-40 right-1/4 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-indigo-600/5 via-purple-600/3 to-transparent rounded-full blur-[200px] pointer-events-none" />
    </>
  );
}

function GlassCard({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-2xl shadow-2xl ${hover ? 'hover:bg-zinc-900/80 hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300' : ''} ${className}`}>
      {children}
    </div>
  );
}

function GradientIcon({ icon: Icon, gradient = 'from-indigo-500 to-purple-500' }: { icon: React.ElementType; gradient?: string }) {
  return (
    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="w-full h-full rounded-2xl bg-zinc-950/90 flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { l: string; cls: string; dot: string }> = {
    CONVERTED: { l: 'Convertido', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    OPTED_OUT: { l: 'Opt-out', cls: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    NOT_INTERESTED: { l: 'Não Interessado', cls: 'bg-red-500/10 text-red-400 border-red-500/30', dot: 'bg-red-400' },
    INTERESTED: { l: 'Interessado', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
    CONTACTED: { l: 'Contatado', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
    NEW: { l: 'Novo Lead', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-400' },
  };
  const x = c[status] || c.NEW;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${x.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${x.dot}`} />
      {x.l}
    </span>
  );
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  if (status === 'approved' || status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5" /> Pago / Aprovado
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
        <XCircle className="w-3.5 h-3.5" /> Recusado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
      <Clock className="w-3.5 h-3.5 animate-spin" /> Em Processamento
    </span>
  );
}

// ─── Página Principal do Painel ───

export default function PainelParceiro() {
  const router = useRouter();
  const [data, setData] = useState<PartnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [origin, setOrigin] = useState('');
  const [balance, setBalance] = useState({ available: 0, pending: 0, paid: 0, pendingWithdrawal: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('phone');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdrawals' | 'leads'>('dashboard');

  const [access, setAccess] = useState<{ accessExpiresAt: string | null; expired: boolean; remainingMinutes: number; remainingSeconds: number; remainingMs: number } | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const loadAccess = useCallback(async () => {
    try {
      const r = await fetch('/api/partner/trial');
      const d = await r.json();
      if (!d.error) setAccess(d);
    } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/partner/dashboard').then(r => r.json()),
      fetch('/api/partner/balance').then(r => r.json()),
      fetch('/api/partner/withdrawals').then(r => r.json()),
      fetch('/api/partner/trial').then(r => r.json()),
    ]).then(([dash, bal, wd, tr]) => {
      if (dash.error) { setError(dash.error); return; }
      setData(dash);
      if (!bal.error) setBalance(bal);
      if (!wd.error) setWithdrawals(wd.withdrawals || []);
      if (!tr.error) setAccess(tr);
    }).catch(() => setError('Erro ao carregar os dados do painel')).finally(() => setLoading(false));
  }, []);

  const handleActivateTrial = async () => {
    setActivating(true);
    try {
      const r = await fetch('/api/partner/activate', { method: 'POST' });
      const d = await r.json();
      if (d.error) alert(d.error);
      else {
        setAccess({
          accessExpiresAt: d.accessExpiresAt,
          expired: false,
          remainingMinutes: d.remainingMinutes,
          remainingSeconds: d.remainingSeconds,
          remainingMs: d.remainingMs
        });
        alert('Modo Teste de 1 Hora da Plataforma Ativado com Sucesso!');
        router.push('/dashboard');
      }
    } catch { alert('Erro ao ativar modo teste'); }
    setActivating(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(''); setWithdrawMsg(''); setWithdrawLoading(true);
    const amountVal = parseFloat(withdrawAmount);

    if (isNaN(amountVal) || amountVal < 20) {
      setWithdrawError('O valor mínimo de saque é R$ 20,00');
      setWithdrawLoading(false);
      return;
    }

    if (amountVal > balance.available) {
      setWithdrawError('Valor maior do que o saldo disponível para saque');
      setWithdrawLoading(false);
      return;
    }

    try {
      const r = await fetch('/api/partner/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountVal, pixKey, pixKeyType })
      });
      const d = await r.json();
      if (d.error) setWithdrawError(d.error);
      else {
        setWithdrawMsg('Solicitação de saque via PIX enviada com sucesso! Aguarde a aprovação.');
        setWithdrawAmount('');
        setPixKey('');
        const [b, wd] = await Promise.all([
          fetch('/api/partner/balance').then(r => r.json()),
          fetch('/api/partner/withdrawals').then(r => r.json())
        ]);
        if (!b.error) setBalance(b);
        if (!wd.error) setWithdrawals(wd.withdrawals || []);
      }
    } catch { setWithdrawError('Erro de comunicação ao solicitar saque'); }
    setWithdrawLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Glow />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
              <Zap className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-400 animate-pulse">Carregando seu Painel de Parceiro...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Glow />
        <GlassCard className="max-w-md w-full p-8 text-center space-y-5 z-10">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Falha ao Carregar</h3>
          <p className="text-sm text-zinc-400">{error || 'Não foi possível carregar os dados'}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg hover:opacity-90 transition-all"
          >
            Tentar Novamente
          </button>
        </GlassCard>
      </div>
    );
  }

  const referralUrl = `${origin}/?ref=${data.referralCode}`;
  const convertedLeads = data.leads.filter(l => l.status === 'CONVERTED').length;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden selection:bg-indigo-500/30">
      <Glow />

      {/* ── HEADER NA NAVEGAÇÃO ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px]">
              <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">{data.name}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                  {data.referralCode}
                </span>
              </div>
              <p className="text-xs text-zinc-400">Painel Oficial de Parceiro & Afiliado</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão Opcional para Testar a Plataforma por 1 Horas (Sem Bloqueio Padrão) */}
            <button
              onClick={handleActivateTrial}
              disabled={activating}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 text-purple-300 text-xs font-semibold rounded-xl border border-purple-500/30 transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              {activating ? 'Ativando...' : 'Testar Plataforma (1h)'}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-semibold rounded-xl border border-white/10 hover:border-red-500/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        
        {/* BANNER DE LINK DE INDICAÇÃO & PROMOÇÃO */}
        <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-indigo-900/30 via-zinc-900/80 to-purple-900/20 border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Programa de Afiliados Ativo
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Seu Link Exclusivo de Vendas
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Divulgue seu link em redes sociais, TikTok, Instagram e WhatsApp. Ganhe <strong className="text-emerald-400">50% de comissão</strong> na primeira mensalidade + <strong className="text-emerald-400">{data.commissionRate}% de recorrência mensal vitalícia</strong> em cada cliente indicado!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-indigo-300 truncate max-w-md select-all">
                {referralUrl}
              </div>
              <button
                onClick={copyReferralLink}
                className="px-5 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Afiliado'}</span>
              </button>
            </div>
          </div>
        </GlassCard>

        {/* ── METRIC CARDS (CARDS DE SALDO E COMISSÕES) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Saldo Disponível para Saque */}
          <GlassCard hover className="p-6 relative overflow-hidden group border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-zinc-900/60">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-400 tracking-wider uppercase">Saldo Disponível</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1">
              R$ {balance.available.toFixed(2)}
            </div>
            <p className="text-xs text-zinc-400">Pronto para saque imediato via PIX</p>
          </GlassCard>

          {/* Card 2: Comissões Totais */}
          <GlassCard hover className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Comissões Acumuladas</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1">
              R$ {(data.totalCommissions || balance.paid + balance.available).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-400">Ganhos totais gerados por suas vendas</p>
          </GlassCard>

          {/* Card 3: Vendas Convertidas */}
          <GlassCard hover className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Vendas Convertidas</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1">
              {convertedLeads}
            </div>
            <p className="text-xs text-zinc-400">De um total de {data.leads.length} clientes indicados</p>
          </GlassCard>

          {/* Card 4: Taxa de Comissão */}
          <GlassCard hover className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Sua Comissão</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight mb-1">
              {data.commissionRate}%
            </div>
            <p className="text-xs text-zinc-400">50% bônus 1º mês + {data.commissionRate}% recorrente</p>
          </GlassCard>
        </div>

        {/* ── NAVEGAÇÃO DE ABAS ── */}
        <div className="flex border-b border-white/10 space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'dashboard' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            📊 Visão Geral & Saque PIX
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'withdrawals' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🏦 Histórico de Saques ({withdrawals.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-4 text-sm font-bold transition-all relative ${
              activeTab === 'leads' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            👥 Leads & Comissões ({data.leads.length})
          </button>
        </div>

        {/* ── ABA 1: SOLICITAR SAQUE PIX & DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulário de Saque PIX */}
            <GlassCard className="p-6 lg:col-span-1 border-indigo-500/20">
              <div className="flex items-center gap-3 mb-6">
                <GradientIcon icon={Banknote} gradient="from-emerald-500 to-teal-500" />
                <div>
                  <h3 className="text-base font-bold text-white">Solicitar Saque PIX</h3>
                  <p className="text-xs text-zinc-400">Transferência rápida para sua conta</p>
                </div>
              </div>

              {withdrawMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{withdrawMsg}</span>
                </div>
              )}

              {withdrawError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Valor do Saque (mínimo R$ 20,00)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs text-zinc-500 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="20"
                      max={balance.available}
                      required
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white font-bold placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>

                  {/* Atalhos de Valor */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(Math.min(50, balance.available).toString())}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-bold rounded-lg border border-white/10"
                    >
                      R$ 50
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(Math.min(100, balance.available).toString())}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px] font-bold rounded-lg border border-white/10"
                    >
                      R$ 100
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(balance.available.toString())}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-500/30"
                    >
                      Saldo Total
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Tipo de Chave PIX
                  </label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="phone">Telefone</option>
                    <option value="cpf">CPF / CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="random">Chave Aleatória (EVP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Chave PIX
                  </label>
                  <input
                    type="text"
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua chave PIX aqui..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-medium placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={withdrawLoading || balance.available < 20}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{withdrawLoading ? 'Enviando Pedido...' : 'Solicitar Saque Agora'}</span>
                </button>
              </form>
            </GlassCard>

            {/* Resumo de Desempenho e Dicas de Vendas */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  <span>Resumo do seu Desempenho</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Total Indicados</span>
                    <p className="text-xl font-extrabold text-white">{data.leads.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Convertidos em Vendas</span>
                    <p className="text-xl font-extrabold text-emerald-400">{convertedLeads}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase">Saques Solicitados</span>
                    <p className="text-xl font-extrabold text-indigo-400">{withdrawals.length}</p>
                  </div>
                </div>
              </GlassCard>

              {/* Dicas de Divulgação */}
              <GlassCard className="p-6 space-y-4 border-purple-500/20">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-purple-400" />
                  <span>Dicas para Vender Mais no TikTok e Instagram</span>
                </h3>
                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>Mostre o robô respondendo no WhatsApp em 5 segundos no seu vídeo curto do TikTok/Reels.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>Coloque o seu link de afiliado na bio do seu perfil do TikTok/Instagram.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">3.</span>
                    <span>Sempre enfatize que o empresário terá um atendente IA 24 horas por dia trabalhando no negócio dele!</span>
                  </p>
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* ── ABA 2: HISTÓRICO DE SAQUES ── */}
        {activeTab === 'withdrawals' && (
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              <span>Histórico de Saques Solicitados</span>
            </h3>

            {withdrawals.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Nenhuma solicitação de saque realizada ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-bold">
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Valor</th>
                      <th className="pb-3">Chave PIX</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 text-zinc-300 font-medium">
                          {new Date(w.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 font-extrabold text-white">
                          R$ {w.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-zinc-400 font-mono">
                          {w.pixKey} ({w.pixKeyType})
                        </td>
                        <td className="py-3">
                          <WithdrawalStatusBadge status={w.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {/* ── ABA 3: LEADS & COMISSÕES ── */}
        {activeTab === 'leads' && (
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>Seus Leads e Indicações</span>
            </h3>

            {data.leads.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                Nenhum lead indicado ainda. Divulgue seu link de afiliado para começar a receber comissões!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400 font-bold">
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Telefone</th>
                      <th className="pb-3">Produto</th>
                      <th className="pb-3">Data</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 font-bold text-white">{lead.name || 'Cliente'}</td>
                        <td className="py-3 text-zinc-400 font-mono">{lead.phone}</td>
                        <td className="py-3 text-indigo-300 font-medium">{lead.interested_product || 'SaaS Bot IA'}</td>
                        <td className="py-3 text-zinc-400">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3">
                          <StatusBadge status={lead.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}
      </main>
    </div>
  );
}