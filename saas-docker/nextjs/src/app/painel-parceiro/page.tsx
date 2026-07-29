'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const [copiedUTM, setCopiedUTM] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdrawals' | 'leads' | 'materials' | 'simulator' | 'profile'>('dashboard');

  // Controle de UTM
  const [utmSource, setUtmSource] = useState('instagram');

  // Controle de Simulador
  const [simulatedClients, setSimulatedClients] = useState(15);

  // Controle do Menu Lateral Mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Controle do Modal de Degustação de 1 Hora
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [pendingFeatureName, setPendingFeatureName] = useState('');

  // Estados para atualização de perfil
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  const [access, setAccess] = useState<{ accessExpiresAt: string | null; expired: boolean; remainingMinutes: number; remainingSeconds: number; remainingMs: number } | null>(null);
  const [activating, setActivating] = useState(false);

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
      fetch('/api/partner/trial').then(r => r.json()),
    ]).then(([dash, bal, wd, tr]) => {
      if (dash.error) { setError(dash.error); return; }
      setData(dash);
      setProfileName(dash.name || '');
      setProfileEmail(dash.email || '');
      if (!bal.error) setBalance(bal);
      if (!wd.error) setWithdrawals(wd.withdrawals || []);
      if (!tr.error) setAccess(tr);
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
        setTrialModalOpen(false);
        alert('🚀 Modo Teste de 1 Hora Ativado com Sucesso! Toda a plataforma está liberada para você.');
        router.push('/dashboard');
      }
    } catch { alert('Erro ao ativar modo teste'); }
    setActivating(false);
  };

  const handleFeatureClick = (featureName: string, targetRoute: string) => {
    if (access && !access.expired) {
      router.push(targetRoute);
    } else {
      setPendingFeatureName(featureName);
      setTrialModalOpen(true);
    }
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

  const sidebarMenuItems = [
    { id: 'partner_dash', label: 'Painel Afiliado (Visão Geral)', icon: LayoutDashboard, route: '/painel-parceiro', isAffiliate: true },
    { id: 'autovendas', label: 'Robô IA & Automação', icon: Bot, route: '/autovendas' },
    { id: 'workflow', label: 'Fluxo de Atendimento', icon: Workflow, route: '/workflow' },
    { id: 'conversas', label: 'Conversas no WhatsApp', icon: MessageSquare, route: '/conversas' },
    { id: 'crm', label: 'CRM & Clientes', icon: Users, route: '/leads' },
    { id: 'agenda', label: 'Agendamentos IA', icon: Calendar, route: '/agenda' },
    { id: 'conexoes', label: 'Conexões WhatsApp', icon: Smartphone, route: '/conexoes' },
    { id: 'produtos', label: 'Catálogo de Produtos', icon: ShoppingCart, route: '/produtos' },
    { id: 'settings', label: 'Configurações da Empresa', icon: Settings, route: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden selection:bg-indigo-500/30 flex">
      <Glow />

      {/* ── 1. MENU LATERAL SIDEBAR COMPLETO DA PLATAFORMA ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px]">
              <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">Nexus SaaS</span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Painel do Parceiro</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status do Teste no Topo da Sidebar */}
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Degustação da Plataforma</span>
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>
          {access && !access.expired ? (
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>{access.remainingMinutes}m {access.remainingSeconds}s de Teste Restantes</span>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-zinc-300">Ganhe 1 hora de acesso total às ferramentas para testar ou apresentar!</p>
              <button
                onClick={handleActivateTrial}
                disabled={activating}
                className="mt-2.5 w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>{activating ? 'Ativando...' : 'Ativar 1 Hora Grátis'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Lista de Recursos do Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Menu do Afiliado &amp; Plataforma</p>
          {sidebarMenuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = item.isAffiliate;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isAffiliate) {
                    setActiveTab('dashboard');
                  } else {
                    handleFeatureClick(item.label, item.route);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-indigo-400'}`} />
                  <span>{item.label}</span>
                </div>
                {!item.isAffiliate && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-indigo-300 font-mono">1h Teste</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Rodapé do Menu */}
        <div className="p-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
              {data.name[0]}
            </div>
            <div className="flex-1 truncate">
              <span className="text-xs font-bold text-white block truncate">{data.name}</span>
              <span className="text-[10px] text-zinc-400 block font-mono">{data.referralCode}</span>
            </div>
            <button onClick={handleLogout} title="Sair" className="text-zinc-400 hover:text-red-400 p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop Mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" />
      )}

      {/* ── 2. CONTEÚDO PRINCIPAL (ÁREA DIREITA) ── */}
      <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
        
        {/* HEADER TOP BAR */}
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-2xl">
          <div className="px-4 lg:px-8 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-400 hover:text-white rounded-xl border border-white/10">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">{data.name}</span>
                  <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" /> Nível Ouro (Afiliado Destaque)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Painel Oficial de Parceiro &amp; Afiliado Nexus SaaS</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {access && !access.expired ? (
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl">
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Degustação Ativa ({access.remainingMinutes}m {access.remainingSeconds}s)</span>
                </div>
              ) : (
                <button
                  onClick={handleActivateTrial}
                  disabled={activating}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>{activating ? 'Ativando...' : 'Experimentar Plataforma por 1h'}</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-semibold rounded-xl border border-white/10 hover:border-red-500/30 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── CORPO DO PAINEL ── */}
        <main className="px-4 lg:px-8 py-8 space-y-8 flex-1">
          
          {/* BANNER DE LINK DE INDICAÇÃO & PROMOÇÃO */}
          <GlassCard className="p-6 md:p-8 bg-gradient-to-br from-indigo-900/30 via-zinc-900/80 to-purple-900/20 border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Programa de Afiliados Oficial Ativo
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

            {/* Card 4: Taxa de Comissão & Nível */}
            <GlassCard hover className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">Sua Comissão (Ouro)</span>
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
          <div className="flex border-b border-white/10 space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'dashboard' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📊 Visão Geral &amp; Saque PIX
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'simulator' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🧮 Simulador de Ganhos
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'materials' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📣 Copys &amp; Gerador UTM
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'withdrawals' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🏦 Histórico de Saques ({withdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'leads' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              👥 Leads &amp; Comissões ({data.leads.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${
                activeTab === 'profile' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-zinc-400 hover:text-zinc-200'
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

              {/* Resumo de Desempenho, Projeção Mensal e Dicas de Vendas */}
              <div className="lg:col-span-2 space-y-6">
                <GlassCard className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-indigo-400" />
                      <span>Desempenho &amp; Projeção de Recorrência Mensal</span>
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      📈 Recorrência Ativa
                    </span>
                  </div>

                  {/* Gráfico de Barras de Projeção Mensal */}
                  <div className="pt-2 space-y-3">
                    <p className="text-xs text-zinc-400">Projeção estimada de comissões recorrentes nos próximos meses baseada em seus clientes ativos:</p>
                    <div className="grid grid-cols-5 gap-2 pt-2 items-end h-32 bg-zinc-950/70 p-4 rounded-xl border border-white/5">
                      {[
                        { month: "Ago/26", val: "R$ 4.560", height: "h-20", bg: "bg-indigo-500" },
                        { month: "Set/26", val: "R$ 5.120", height: "h-24", bg: "bg-indigo-400" },
                        { month: "Out/26", val: "R$ 5.980", height: "h-28", bg: "bg-purple-500" },
                        { month: "Nov/26", val: "R$ 6.840", height: "h-32", bg: "bg-purple-400" },
                        { month: "Dez/26", val: "R$ 7.950", height: "h-36", bg: "bg-emerald-500" },
                      ].map((m, idx) => (
                        <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                          <span className="text-[9px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">{m.val}</span>
                          <div className={`w-full ${m.height} ${m.bg} rounded-t-lg shadow-lg group-hover:brightness-125 transition-all`} />
                          <span className="text-[10px] font-bold text-zinc-400">{m.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>

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

          {/* ── ABA 2: SIMULADOR DE GANHOS RECORRENTES ── */}
          {activeTab === 'simulator' && (
            <GlassCard className="p-6 md:p-8 space-y-6 border-indigo-500/30">
              <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                <GradientIcon icon={Calculator} gradient="from-emerald-500 to-indigo-500" />
                <div>
                  <h3 className="text-lg font-extrabold text-white">Simulador de Metas &amp; Ganhos Recorrentes</h3>
                  <p className="text-xs text-zinc-400">Arraste o seletor para calcular seus ganhos como Afiliado Vitalício</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-zinc-300 uppercase">Quantos clientes novos você pretende indicar por mês?</label>
                    <span className="text-lg font-black text-indigo-400 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-xl">{simulatedClients} Clientes</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={simulatedClients}
                    onChange={(e) => setSimulatedClients(parseInt(e.target.value))}
                    className="w-full h-3 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                    <span>1 Cliente</span>
                    <span>25 Clientes</span>
                    <span>50 Clientes</span>
                    <span>100 Clientes</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-900/40 to-zinc-900/80 border border-indigo-500/30 space-y-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Bônus Imediato (1º Mês - 50%)</span>
                    <div className="text-3xl font-black text-white">
                      R$ {simulatedFirstMonthBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-zinc-400">Recebido instantaneamente assim que os {simulatedClients} clientes assinam.</p>
                  </div>

                  <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-zinc-900/80 border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Renda Passiva Mensal (30% Vitalício)</span>
                    <div className="text-3xl font-black text-emerald-300">
                      R$ {simulatedLifetimeMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /mês
                    </div>
                    <p className="text-xs text-zinc-400">Caindo na sua conta todo mês enquanto os clientes mantiverem a assinatura!</p>
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
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-400" />
                  <span>Gerador de Link com Rastreamento UTM</span>
                </h3>
                <p className="text-xs text-zinc-400">Escolha onde você vai divulgar para acompanhar de onde vêm suas vendas:</p>

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
                          : 'bg-zinc-950/60 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <div className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-indigo-300 truncate">
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
                    <span className="text-xs font-bold text-indigo-400 uppercase">Script para WhatsApp Direct</span>
                    <button
                      onClick={() => copyTextScript('whatsapp', `Oi! Vi que você atende clientes no WhatsApp. Você sabia que dá para colocar um robô com Inteligência Artificial para responder dúvidas, mostrar catálogo e fechar vendas 24h por dia? Dá uma olhada aqui: ${referralUrl}`)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5"
                    >
                      {copiedCopy === 'whatsapp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCopy === 'whatsapp' ? 'Copiado!' : 'Copiar Script'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 italic bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 leading-relaxed">
                    "Oi! Vi que você atende clientes no WhatsApp. Você sabia que dá para colocar um robô com Inteligência Artificial para responder dúvidas, mostrar catálogo e fechar vendas 24h por dia? Dá uma olhada aqui: {referralUrl}"
                  </p>
                </GlassCard>

                <GlassCard className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 uppercase">Copy para Stories / Instagram</span>
                    <button
                      onClick={() => copyTextScript('instagram', `Você ainda perde horas respondendo mensagem no WhatsApp manualmente? 🤯 Conheça a IA que atende, agenda e recebe Pix no WhatsApp no automático! Clique no link da minha bio: ${referralUrl}`)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] rounded-lg flex items-center gap-1.5"
                    >
                      {copiedCopy === 'instagram' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCopy === 'instagram' ? 'Copiado!' : 'Copiar Copy'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 italic bg-zinc-950/80 p-3.5 rounded-xl border border-white/5 leading-relaxed">
                    "Você ainda perde horas respondendo mensagem no WhatsApp manualmente? 🤯 Conheça a IA que atende, agenda e recebe Pix no WhatsApp no automático! Clique no link da minha bio: {referralUrl}"
                  </p>
                </GlassCard>
              </div>
            </div>
          )}

          {/* ── ABA 4: HISTÓRICO DE SAQUES ── */}
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

          {/* ── ABA 5: LEADS & COMISSÕES (COM PRIVACIDADE LGPD) ── */}
          {activeTab === 'leads' && (
            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <span>Seus Leads e Indicações</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    🔒 <strong className="text-emerald-400">Proteção LGPD Ativa:</strong> Dados sensíveis dos clientes são mascarados por segurança e conformidade legal.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
                  <ShieldCheck className="w-4 h-4" /> Conformidade LGPD
                </div>
              </div>

              {data.leads.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Nenhum lead indicado ainda. Divulgue seu link de afiliado para começar a receber comissões!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Contato WhatsApp</th>
                        <th className="pb-3">Produto Adquirido</th>
                        <th className="pb-3">Data</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                              {lead.name ? lead.name[0].toUpperCase() : 'C'}
                            </div>
                            <span>{maskClientName(lead.name)}</span>
                          </td>
                          <td className="py-3 text-zinc-400 font-mono">
                            {maskPhone(lead.phone)}
                          </td>
                          <td className="py-3 text-indigo-300 font-medium">
                            {lead.interested_product || 'SaaS Bot IA (Plano)'}
                          </td>
                          <td className="py-3 text-zinc-400">
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
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <GradientIcon icon={Settings} gradient="from-purple-500 to-indigo-500" />
                <div>
                  <h3 className="text-base font-bold text-white">Meus Dados &amp; Configurações</h3>
                  <p className="text-xs text-zinc-400">Atualize suas informações de conta e senha de acesso</p>
                </div>
              </div>

              {profileMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileMsg}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium mb-5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    E-mail de Login
                  </label>
                  <input
                    type="email"
                    required
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    WhatsApp de Contato (opcional)
                  </label>
                  <input
                    type="text"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Nova Senha de Acesso (deixe em branco para não alterar)
                  </label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500 transition-all"
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
        </main>
      </div>

      {/* ── 3. MODAL WOW DE DEGUSTAÇÃO GRÁTIS DE 1 HORA ── */}
      {trialModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <GlassCard className="max-w-lg w-full p-6 md:p-8 space-y-6 relative border-indigo-500/40 animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setTrialModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 mx-auto animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="w-full h-full rounded-3xl bg-zinc-950 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Bônus Exclusivo de Afiliado
              </span>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Degustação de 1 Hora da Plataforma!
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Como nosso parceiro oficial, você pode experimentar a ferramenta <strong className="text-indigo-400">{pendingFeatureName || 'da Plataforma'}</strong> e todos os recursos de IA, automação e conversas por <strong className="text-emerald-400">1 hora totalmente grátis</strong>!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acesso liberado a todas as ferramentas
              </div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Conecte seu próprio WhatsApp para testar
              </div>
              <div className="flex items-center gap-2 text-indigo-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mostre ao vivo como funciona para clientes
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleActivateTrial}
                disabled={activating}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>{activating ? 'Ativando Degustação...' : 'Ativar Degustação de 1 Hora Agora'}</span>
              </button>
              <button
                onClick={() => setTrialModalOpen(false)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl transition-all"
              >
                Voltar para o Painel de Afiliado
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}