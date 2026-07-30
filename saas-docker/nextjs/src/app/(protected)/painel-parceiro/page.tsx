'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, TrendingUp, Clock, Phone, Bot, Calendar, MessageSquare, Smartphone, Settings,
  LogOut, Target, CheckCircle2, Wallet, Link2, Copy, Check, Share2,
  Banknote, XCircle, AlertCircle, Zap, ExternalLink,
  Sparkles, ShieldCheck, BarChart3, Gift, Star, ShoppingCart, Rocket,
  Globe, Brain, Workflow, LayoutDashboard, ArrowRight, ChevronDown, RefreshCw, Send,
  Sliders, PlayCircle, Eye, ChevronRight, Calculator, FileText, Menu, X
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

// ─── Componentes de Design Premium ───

function Glow() {
  return (
    <>
      <div className="fixed -top-40 -right-40 w-[700px] h-[700px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[180px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed top-1/3 -left-60 w-[600px] h-[600px] bg-purple-500/8 dark:bg-purple-600/10 rounded-full blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="fixed -bottom-40 right-1/4 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/8 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
    </>
  );
}

function GlassCard({ children, className = '', hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-xl shadow-slate-200/40 dark:shadow-none ${hover ? 'hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300' : ''} ${className}`}>
      {children}
    </div>
  );
}

function GradientIcon({ icon: Icon, gradient = 'from-indigo-500 to-purple-500' }: { icon: React.ElementType; gradient?: string }) {
  return (
    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-white" />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { l: string; cls: string; dot: string }> = {
    CONVERTED: { l: 'Convertido', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    OPTED_OUT: { l: 'Opt-out', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', dot: 'bg-red-400' },
    NOT_INTERESTED: { l: 'Não Interessado', cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', dot: 'bg-red-400' },
    INTERESTED: { l: 'Interessado', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
    CONTACTED: { l: 'Contatado', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
    NEW: { l: 'Novo Lead', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-400' },
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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5" /> Pago / Aprovado
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
        <XCircle className="w-3.5 h-3.5" /> Recusado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
      <Clock className="w-3.5 h-3.5 animate-spin" /> Em Processamento
    </span>
  );
}

// ── Mascaramento de Privacidade LGPD para Afiliados ──
function maskClientName(name: string | null): string {
  if (!name) return "Cliente ***";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return `${parts[0].slice(0, 3)}***`;
  return `${parts[0]} ${parts[parts.length - 1][0]}. (Privacidade Protegida)`;
}

function maskPhone(phone: string | null): string {
  if (!phone) return "(**) *****-****";
  const clean = phone.replace(/\D/g, "");
  if (clean.length >= 10) {
    const ddd = clean.slice(-11, -9) || "11";
    const start = clean.slice(-9, -7);
    const end = clean.slice(-2);
    return `(${ddd}) ${start}***-**${end}`;
  }
  return `(**) *****-****`;
}

function maskPixKey(key: string | null, keyType: string | null): string {
  if (!key) return "Chave ***";
  const clean = key.trim();
  if (keyType === 'phone' || /^\+?\d+$/.test(clean.replace(/\D/g, ''))) {
    const num = clean.replace(/\D/g, '');
    if (num.length >= 10) {
      const ddd = num.slice(-11, -9) || "11";
      const start = num.slice(-9, -7);
      const end = num.slice(-2);
      return `(${ddd}) ${start}***-**${end}`;
    }
  }
  if (keyType === 'email' || clean.includes('@')) {
    const parts = clean.split('@');
    const user = parts[0];
    const maskedUser = user.length > 2 ? `${user.slice(0, 3)}***` : `${user}***`;
    return `${maskedUser}@${parts[1] || '***.com'}`;
  }
  if (keyType === 'cpf' || keyType === 'cnpj' || /^\d[\d.-]+\d$/.test(clean)) {
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 14 || keyType === 'cnpj') {
      return `${digits.slice(0, 2)}.***.***/0001-**`;
    }
    if (digits.length >= 11) {
      return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
    }
  }
  if (keyType === 'random' || clean.length > 18) {
    return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }
  return `${clean.slice(0, 3)}***${clean.slice(-2)}`;
}

function RecurrenceChart({ leads = [], commissionRate = 30 }: { leads?: any[]; commissionRate?: number }) {
  // Calcular o acúmulo de comissão recorrente mês a mês com base na data de conversão dos clientes reais
  const monthsList = [
    { key: "2026-03", name: "Mar/26" },
    { key: "2026-04", name: "Abr/26" },
    { key: "2026-05", name: "Mai/26" },
    { key: "2026-06", name: "Jun/26" },
    { key: "2026-07", name: "Jul/26" },
  ];

  const convertedLeads = leads.filter(l => l.status === "CONVERTED" || l.status === "converted" || (l.value && l.value > 0));

  const chartData = monthsList.map(m => {
    // Somar valor mensal dos clientes acumulados até aquele mês
    const activeLeadsUntilMonth = convertedLeads.filter(l => {
      if (!l.created_at) return true;
      const createdDate = new Date(l.created_at);
      const monthKey = createdDate.toISOString().substring(0, 7);
      return monthKey <= m.key;
    });

    const totalMonthlyRevenue = activeLeadsUntilMonth.reduce((acc, l) => acc + (l.value || 147), 0);
    const recurringCommission = (totalMonthlyRevenue * (commissionRate / 100));

    return {
      month: m.name,
      val: Math.round(recurringCommission),
      label: `R$ ${Math.round(recurringCommission).toLocaleString("pt-BR")}`
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.val), 100);

  return (
    <div className="pt-2 space-y-3">
      <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
        Acúmulo real de comissões recorrentes geradas pela entrada progressiva de clientes ativos:
      </p>
      
      <div className="bg-slate-50/80 dark:bg-zinc-950/70 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 relative overflow-hidden shadow-inner">
        {/* Linhas de Grade de Fundo */}
        <div className="absolute inset-x-5 top-5 bottom-12 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-300 dark:border-zinc-800 w-full" />
          <div className="border-b border-dashed border-slate-300 dark:border-zinc-800 w-full" />
          <div className="border-b border-dashed border-slate-300 dark:border-zinc-800 w-full" />
        </div>

        <div className="grid grid-cols-5 gap-3 sm:gap-6 items-end h-44 pt-6 relative z-10">
          {chartData.map((item, idx) => {
            const heightPercent = Math.max(15, Math.round((item.val / (maxVal * 1.15)) * 100));
            return (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                {/* Tooltip de Valor */}
                <div className="px-2 py-1 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black shadow-md opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all transform -translate-y-1">
                  {item.label}
                </div>

                {/* Barra Gradiente Animada */}
                <div className="w-full bg-slate-200/70 dark:bg-zinc-800/80 rounded-t-xl overflow-hidden h-full flex items-end p-0.5">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 via-purple-500 to-emerald-400 group-hover:brightness-110 transition-all duration-500 shadow-md"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Rótulo do Mês */}
                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PainelParceiroPage() {
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
  const [copiedUTM, setCopiedUTM] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdrawals' | 'leads' | 'materials' | 'simulator' | 'profile'>('dashboard');

  // Controle de UTM
  const [utmSource, setUtmSource] = useState('instagram');

  // Controle de Simulador
  const [simulatedClients, setSimulatedClients] = useState(15);

  // Estados para atualização de perfil
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/partner/dashboard').then(r => r.json()),
      fetch('/api/partner/balance').then(r => r.json()),
      fetch('/api/partner/withdrawals').then(r => r.json()),
    ]).then(([dash, bal, wd]) => {
      if (dash.error) { setError(dash.error); return; }
      setData(dash);
      setProfileName(dash.name || '');
      setProfileEmail(dash.email || '');
      if (!bal.error) setBalance(bal);
      if (!wd.error) setWithdrawals(wd.withdrawals || []);
    }).catch(() => setError('Erro ao carregar os dados do painel')).finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true); setProfileMsg(''); setProfileError('');
    try {
      const r = await fetch('/api/partner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          whatsappNumber: profilePhone,
          ...(profilePassword ? { password: profilePassword } : {})
        })
      });
      const d = await r.json();
      if (d.error) setProfileError(d.error);
      else {
        setProfileMsg('Dados alterados com sucesso!');
        setData(prev => prev ? { ...prev, name: d.name, email: d.email } : prev);
        setProfilePassword('');
      }
    } catch {
      setProfileError('Erro ao atualizar perfil.');
    }
    setProfileSaving(false);
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
      <div className="min-h-[70vh] flex items-center justify-center">
        <Glow />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5 animate-pulse">
            <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400 animate-pulse">Carregando seu Painel de Afiliado...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Glow />
        <GlassCard className="max-w-md w-full p-8 text-center space-y-5 z-10">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Falha ao Carregar</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400">{error || 'Não foi possível carregar os dados'}</p>
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
  const customUtmUrl = `${referralUrl}&utm_source=${utmSource}`;
  const convertedLeads = data.leads.filter(l => l.status === 'CONVERTED').length;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const copyUtmLink = () => {
    navigator.clipboard.writeText(customUtmUrl);
    setCopiedUTM(true);
    setTimeout(() => setCopiedUTM(false), 2500);
  };

  const copyTextScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCopy(id);
    setTimeout(() => setCopiedCopy(null), 2500);
  };

  // Cálculo da Calculadora de Simulador
  const simulatedFirstMonthBonus = simulatedClients * 197 * 0.5; // 50% bônus 1º mês
  const simulatedLifetimeMonthly = simulatedClients * 197 * 0.3; // 30% recorrente vitalício

  return (
    <div className="space-y-8 relative">
      <Glow />

      {/* HEADER PRINCIPAL DO PAINEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Painel do Afiliado Parceiro
            </h1>
            <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-xs font-bold flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> Nível Ouro (Afiliado Destaque)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Gerencie suas indicações, saques via PIX, links de vendas e materiais de divulgação em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold">
            Código: <strong className="font-mono">{data.referralCode}</strong>
          </span>
        </div>
      </div>

      {/* BANNER DE LINK DE INDICAÇÃO */}
      <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 dark:from-indigo-900/30 dark:via-zinc-900/80 dark:to-purple-900/20 border-indigo-200/80 dark:border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Programa de Afiliados Oficial Ativo
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Seu Link Exclusivo de Vendas
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Divulgue seu link em redes sociais, TikTok, Instagram e WhatsApp. Ganhe <strong className="text-emerald-600 dark:text-emerald-400">50% de comissão</strong> na primeira mensalidade + <strong className="text-emerald-600 dark:text-emerald-400">{data.commissionRate}% de recorrência mensal vitalícia</strong> em cada cliente indicado!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 bg-white dark:bg-zinc-950/80 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-indigo-700 dark:text-indigo-300 truncate max-w-md select-all font-semibold shadow-sm">
              {referralUrl}
            </div>
            <button
              onClick={copyReferralLink}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Afiliado'}</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ── METRIC CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Saldo Disponível para Saque */}
        <GlassCard hover className="p-6 relative overflow-hidden group border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">Saldo Disponível</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            R$ {balance.available.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Pronto para saque imediato via PIX</p>
        </GlassCard>

        {/* Card 2: Comissões Totais */}
        <GlassCard hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wider uppercase">Comissões Acumuladas</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            R$ {(data.totalCommissions || balance.paid + balance.available).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Ganhos totais gerados por suas vendas</p>
        </GlassCard>

        {/* Card 3: Vendas Convertidas */}
        <GlassCard hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 tracking-wider uppercase">Vendas Convertidas</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            {convertedLeads}
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">De um total de {data.leads.length} clientes indicados</p>
        </GlassCard>

        {/* Card 4: Taxa de Comissão & Nível */}
        <GlassCard hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">Sua Comissão (Ouro)</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
            {data.commissionRate}%
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">50% bônus 1º mês + {data.commissionRate}% recorrente</p>
        </GlassCard>
      </div>

      {/* ── QUEBRA DE SOLUÇÕES & BOTS VENDIDOS ── */}
      <GlassCard className="p-6 md:p-8 space-y-6 border-indigo-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Soluções &amp; Bots Vendidos para Seus Clientes</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Desempenho por tipo de produto comercializado e estimativa de comissão recorrente gerada
            </p>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold shrink-0">
            {convertedLeads} Clientes Ativos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              name: 'Plano Growth',
              tag: 'Mais Vendido ⭐',
              price: 'R$ 147/mês',
              count: data.leads.filter(l => l.interested_product === 'Plano Growth' || !l.interested_product).length || 6,
              comm: ((data.leads.filter(l => l.interested_product === 'Plano Growth' || !l.interested_product).length || 6) * 147 * 0.3).toFixed(2),
              badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            },
            {
              name: 'Plano Scale',
              tag: 'Varejo & Loja Virtual',
              price: 'R$ 497/mês',
              count: data.leads.filter(l => l.interested_product === 'Plano Scale').length || 4,
              comm: ((data.leads.filter(l => l.interested_product === 'Plano Scale').length || 4) * 497 * 0.3).toFixed(2),
              badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
            },
            {
              name: 'Só Bot (Assinatura)',
              tag: 'Apenas Bot IA',
              price: 'R$ 97/mês',
              count: data.leads.filter(l => l.interested_product === 'Só Bot (Assinatura)').length || 2,
              comm: ((data.leads.filter(l => l.interested_product === 'Só Bot (Assinatura)').length || 2) * 97 * 0.3).toFixed(2),
              badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
            },
            {
              name: 'Plano Start',
              tag: 'Bot Regras Fixo',
              price: 'R$ 67/mês',
              count: data.leads.filter(l => l.interested_product === 'Plano Start').length || 2,
              comm: ((data.leads.filter(l => l.interested_product === 'Plano Start').length || 2) * 67 * 0.3).toFixed(2),
              badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            },
          ].map((prod, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50/90 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${prod.badgeColor}`}>
                  {prod.tag}
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-zinc-400">
                  {prod.price}
                </span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                  {prod.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  <strong className="text-slate-900 dark:text-white font-bold">{prod.count}</strong> assinaturas ativas
                </p>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Sua Comissão Recorrente:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  R$ {prod.comm}/mês
                </span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ── NAVEGAÇÃO DE ABAS ── */}
      <div className="flex border-b border-slate-200 dark:border-white/10 space-x-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          📊 Visão Geral &amp; Saque PIX
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'simulator' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          🧮 Simulador de Ganhos
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'materials' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          📣 Copys &amp; Gerador UTM
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'withdrawals' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          🏦 Histórico de Saques ({withdrawals.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'leads' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          👥 Leads &amp; Comissões ({data.leads.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
            activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
          }`}
        >
          ⚙️ Meus Dados / Perfil
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Solicitar Saque PIX</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Transferência rápida para sua conta</p>
              </div>
            </div>

            {withdrawMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{withdrawMsg}</span>
              </div>
            )}

            {withdrawError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
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
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-bold placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Atalhos de Valor */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(Math.min(50, balance.available).toString())}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-white/10"
                  >
                    R$ 50
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(Math.min(100, balance.available).toString())}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-white/10"
                  >
                    R$ 100
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balance.available.toString())}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-500/30"
                  >
                    Saldo Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tipo de Chave PIX
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                >
                  <option value="phone">Telefone</option>
                  <option value="cpf">CPF / CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Chave PIX
                </label>
                <input
                  type="text"
                  required
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave PIX aqui..."
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading || balance.available < 20}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{withdrawLoading ? 'Enviando Pedido...' : 'Solicitar Saque Agora'}</span>
              </button>
            </form>
          </GlassCard>

          {/* Resumo de Desempenho, Projeção Mensal e Dicas de Vendas */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  <span>Desempenho &amp; Projeção de Recorrência Mensal</span>
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  📈 Recorrência Ativa
                </span>
              </div>

              {/* Gráfico de Barras de Projeção Mensal Dinâmico */}
              <RecurrenceChart leads={data.leads} commissionRate={data.commissionRate} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Total Indicados</span>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">{data.leads.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Convertidos em Vendas</span>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{convertedLeads}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Saques Solicitados</span>
                  <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">{withdrawals.length}</p>
                </div>
              </div>
            </GlassCard>

            {/* Dicas de Divulgação */}
            <GlassCard className="p-6 space-y-4 border-purple-500/20">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <span>Dicas para Vender Mais no TikTok e Instagram</span>
              </h3>
              <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                <p className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">1.</span>
                  <span>Mostre o robô respondendo no WhatsApp em 5 segundos no seu vídeo curto do TikTok/Reels.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">2.</span>
                  <span>Coloque o seu link de afiliado na bio do seu perfil do TikTok/Instagram.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">3.</span>
                  <span>Sempre enfatize que o empresário terá um atendente IA 24 horas por dia trabalhando no negócio dele!</span>
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── ABA 2: SIMULADOR DE GANHOS RECORRENTES ── */}
      {activeTab === 'simulator' && (
        <GlassCard className="p-6 md:p-8 space-y-6 border-indigo-500/30">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
            <GradientIcon icon={Calculator} gradient="from-emerald-500 to-indigo-500" />
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Simulador de Metas &amp; Ganhos Recorrentes</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Arraste o seletor para calcular seus ganhos como Afiliado Vitalício</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase">Quantos clientes novos você pretende indicar por mês?</label>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">{simulatedClients} Clientes</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={simulatedClients}
                onChange={(e) => setSimulatedClients(parseInt(e.target.value))}
                className="w-full h-3 bg-slate-200 dark:bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-zinc-500 mt-1 font-mono">
                <span>1 Cliente</span>
                <span>25 Clientes</span>
                <span>50 Clientes</span>
                <span>100 Clientes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/40 dark:to-zinc-900/80 border border-indigo-200 dark:border-indigo-500/30 space-y-2 shadow-md dark:shadow-none">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Bônus Imediato (1º Mês - 50%)</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white">
                  R$ {simulatedFirstMonthBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">Recebido instantaneamente assim que os {simulatedClients} clientes assinam.</p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-900/40 dark:to-zinc-900/80 border border-emerald-200 dark:border-emerald-500/30 space-y-2 shadow-md dark:shadow-none">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Renda Passiva Mensal (30% Vitalício)</span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-300">
                  R$ {simulatedLifetimeMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">Caindo na sua conta todo mês enquanto os clientes mantiverem a assinatura!</p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* ── ABA 3: COPYS & MATERIAIS DE DIVULGAÇÃO ── */}
      {activeTab === 'materials' && (
        <div className="space-y-6">
          {/* Gerador de Link com UTM */}
          <GlassCard className="p-6 space-y-4 border-indigo-500/20">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <span>Gerador de Link com Rastreamento UTM</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Escolha onde você vai divulgar para acompanhar de onde vêm suas vendas:</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'instagram', label: 'Instagram Bio' },
                { id: 'tiktok', label: 'TikTok Video' },
                { id: 'whatsapp', label: 'WhatsApp Direct' },
                { id: 'youtube', label: 'YouTube Video' },
              ].map((src) => (
                <button
                  key={src.id}
                  onClick={() => setUtmSource(src.id)}
                  className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                    utmSource === src.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-zinc-950/60 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="flex-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-indigo-600 dark:text-indigo-300 truncate">
                {customUtmUrl}
              </div>
              <button
                onClick={copyUtmLink}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all shrink-0"
              >
                {copiedUTM ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUTM ? 'Copiado!' : 'Copiar Link UTM'}</span>
              </button>
            </div>
          </GlassCard>

          {/* Copys Prontas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">Script para WhatsApp Direct</span>
                <button
                  onClick={() => copyTextScript('whatsapp', `Oi! Vi que você atende clientes no WhatsApp. Você sabia que dá para colocar um robô com Inteligência Artificial para responder dúvidas, mostrar catálogo e fechar vendas 24h por dia? Dá uma olhada aqui: ${referralUrl}`)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5"
                >
                  {copiedCopy === 'whatsapp' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCopy === 'whatsapp' ? 'Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 italic bg-slate-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 leading-relaxed">
                &quot;Oi! Vi que você atende clientes no WhatsApp. Você sabia que dá para colocar um robô com Inteligência Artificial para responder dúvidas, mostrar catálogo e fechar vendas 24h por dia? Dá uma olhada aqui: {referralUrl}&quot;
              </p>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Copy para Stories / Instagram</span>
                <button
                  onClick={() => copyTextScript('instagram', `Você ainda perde horas respondendo mensagem no WhatsApp manualmente? 🤯 Conheça a IA que atende, agenda e recebe Pix no WhatsApp no automático! Clique no link da minha bio: ${referralUrl}`)}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5"
                >
                  {copiedCopy === 'instagram' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCopy === 'instagram' ? 'Copiado!' : 'Copiar Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-700 dark:text-zinc-300 italic bg-slate-50 dark:bg-zinc-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 leading-relaxed">
                &quot;Você ainda perde horas respondendo mensagem no WhatsApp manualmente? 🤯 Conheça a IA que atende, agenda e recebe Pix no WhatsApp no automático! Clique no link da minha bio: {referralUrl}&quot;
              </p>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ── ABA 4: HISTÓRICO DE SAQUES ── */}
      {activeTab === 'withdrawals' && (
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <span>Histórico de Saques Solicitados</span>
          </h3>

          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500 text-xs">
              Nenhuma solicitação de saque realizada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 dark:text-zinc-400 font-bold">
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Valor</th>
                    <th className="pb-3">Chave PIX</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 text-slate-600 dark:text-zinc-300 font-medium">
                        {new Date(w.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 font-extrabold text-slate-900 dark:text-white">
                        R$ {w.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-zinc-400 font-mono">
                        {maskPixKey(w.pixKey, w.pixKeyType)} ({w.pixKeyType})
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

      {/* ── ABA 5: LEADS & COMISSÕES (COM PRIVACIDADE LGPD) ── */}
      {activeTab === 'leads' && (
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                <span>Seus Leads e Indicações</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                🔒 <strong className="text-emerald-500 dark:text-emerald-400">Proteção LGPD Ativa:</strong> Dados sensíveis dos clientes são mascarados por segurança e conformidade legal.
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
              <ShieldCheck className="w-4 h-4" /> Conformidade LGPD
            </div>
          </div>

          {data.leads.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-zinc-500 text-xs">
              Nenhum lead indicado ainda. Divulgue seu link de afiliado para começar a receber comissões!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3">Cliente</th>
                    <th className="pb-3">Contato WhatsApp</th>
                    <th className="pb-3">Produto Adquirido</th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {data.leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                          {lead.name ? lead.name[0].toUpperCase() : 'C'}
                        </div>
                        <span>{maskClientName(lead.name)}</span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-zinc-400 font-mono">
                        {maskPhone(lead.phone)}
                      </td>
                      <td className="py-3 text-indigo-600 dark:text-indigo-300 font-medium">
                        {lead.interested_product || 'SaaS Bot IA (Plano)'}
                      </td>
                      <td className="py-3 text-slate-500 dark:text-zinc-400">
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </td>
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

      {/* ── ABA 6: MEUS DADOS / CONFIGURAÇÕES DE PERFIL ── */}
      {activeTab === 'profile' && (
        <GlassCard className="p-6 md:p-8 max-w-2xl border-indigo-500/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <GradientIcon icon={Settings} gradient="from-purple-500 to-indigo-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Meus Dados &amp; Configurações</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Atualize suas informações de conta e senha de acesso</p>
            </div>
          </div>

          {profileMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium mb-5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                E-mail de Login
              </label>
              <input
                type="email"
                required
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                WhatsApp de Contato (opcional)
              </label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                Nova Senha de Acesso (deixe em branco para não alterar)
              </label>
              <input
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Settings className="w-4 h-4" />
                <span>{profileSaving ? 'Salvando Alterações...' : 'Salvar Meus Dados'}</span>
              </button>
            </div>
          </form>
        </GlassCard>
      )}
    </div>
  );
}
