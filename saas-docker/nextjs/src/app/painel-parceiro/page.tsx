'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, TrendingUp, Clock, Phone,
  LogOut, Target, CheckCircle2, Wallet, Link2, Copy, Check, Share2,
  Banknote, ArrowUpRight, XCircle, AlertCircle, Timer, Hourglass, Zap, ExternalLink
} from 'lucide-react';

interface PartnerLead {
  id: string;
  name: string | null;
  phone: string;
  interested_product: string | null;
  value: number | null;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  pixKey: string;
  pixKeyType: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
}

interface PartnerData {
  tenantId: string;
  name: string;
  referralCode: string;
  leads: PartnerLead[];
  totalLeads: number;
  convertedLeads: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalCommissions: number;
  commissionRate: number;
}

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
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [profile, setProfile] = useState<{ name: string; email: string; whatsappNumber: string } | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [access, setAccess] = useState<{ accessExpiresAt: string | null; expired: boolean; remainingMinutes: number; remainingSeconds: number; remainingMs: number } | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const loadAccess = async () => {
    try {
      const res = await fetch('/api/partner/trial');
      const tr = await res.json();
      if (!tr.error) setAccess(tr);
    } catch {}
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/partner/dashboard').then(r => r.json()),
      fetch('/api/partner/balance').then(r => r.json()),
      fetch('/api/partner/withdrawals').then(r => r.json()),
      fetch('/api/partner/trial').then(r => r.json()),
      fetch('/api/partner/profile').then(r => r.json()),
    ])
      .then(([dash, bal, wd, tr, prof]) => {
        if (dash.error) { setError(dash.error); return; }
        setData(dash);
        if (!bal.error) setBalance(bal);
        if (!wd.error) setWithdrawals(wd.withdrawals || []);
        if (!tr.error) setAccess(tr);
        if (!prof.error) {
          setProfile(prof);
          setProfileName(prof.name || '');
          setProfileEmail(prof.email || '');
          setProfileWhatsapp(prof.whatsappNumber || '');
        }
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => { setLoading(false); setAccessLoading(false); });

    intervalRef.current = setInterval(loadAccess, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const [activateSuccess, setActivateSuccess] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    setActivateSuccess(false);
    try {
      const res = await fetch('/api/partner/activate', { method: 'POST' });
      const d = await res.json();
      if (d.error) {
        setError(d.error);
        setActivating(false);
      } else {
        setAccess({
          accessExpiresAt: d.accessExpiresAt,
          expired: false,
          remainingMinutes: d.remainingMinutes,
          remainingSeconds: d.remainingSeconds,
          remainingMs: d.remainingMs,
        });
        setActivateSuccess(true);
        setActivating(false);
        // Redireciona para o sistema após 2 segundos
        setTimeout(() => { router.push('/dashboard'); }, 2000);
      }
    } catch {
      setError('Erro ao ativar acesso');
      setActivating(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileError('');
    try {
      const res = await fetch('/api/partner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName, email: profileEmail, whatsappNumber: profileWhatsapp }),
      });
      const d = await res.json();
      if (d.error) {
        setProfileError(d.error);
      } else {
        setProfileMsg('Perfil atualizado com sucesso!');
        setProfile(d);
      }
    } catch {
      setProfileError('Erro ao salvar perfil');
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não conferem');
      return;
    }
    setChangingPassword(true);
    setPasswordMsg('');
    setPasswordError('');
    try {
      const res = await fetch('/api/partner/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const d = await res.json();
      if (d.error) {
        setPasswordError(d.error);
      } else {
        setPasswordMsg('Senha alterada com sucesso!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPasswordError('Erro ao alterar senha');
    }
    setChangingPassword(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawMsg('');
    setWithdrawLoading(true);
    try {
      const res = await fetch('/api/partner/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount), pixKey, pixKeyType }),
      });
      const d = await res.json();
      if (d.error) {
        setWithdrawError(d.error);
      } else {
        setWithdrawMsg('Solicitação enviada! Aguarde a aprovação do administrador.');
        setWithdrawAmount('');
        setPixKey('');
        const [bal, wd] = await Promise.all([
          fetch('/api/partner/balance').then(r => r.json()),
          fetch('/api/partner/withdrawals').then(r => r.json()),
        ]);
        if (!bal.error) setBalance(bal);
        if (!wd.error) setWithdrawals(wd.withdrawals || []);
      }
    } catch {
      setWithdrawError('Erro ao processar solicitação');
    }
    setWithdrawLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <p className="text-sm text-slate-500 dark:text-zinc-400">{error || 'Sem dados'}</p>
          <button onClick={() => { setLoading(true); setError(''); fetch('/api/partner/dashboard').then(r => r.json()).then(d => { if (d.error) setError(d.error); else setData(d); }).catch(() => setError('Erro')).finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-all">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const leadsAtivos = data.leads.filter(l => l.status !== 'OPTED_OUT' && l.status !== 'NOT_INTERESTED' && l.status !== 'CONVERTED').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900/95 border-b border-slate-200 dark:border-white/5 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/20">
              {data.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{data.name}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Painel do Parceiro</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-red-500 border border-slate-200 dark:border-white/10 rounded-lg hover:border-red-500/30 transition-all">
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      {/* Access Active Banner */}
      {access && !access.expired && access.accessExpiresAt && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-[11px] font-medium">
              <Zap className="w-4 h-4" />
              <span>
                <strong className="font-bold">Acesso Ativo</strong> — Restam{' '}
                <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-md font-mono font-bold text-sm">
                  {String(access.remainingMinutes).padStart(2, '0')}:
                  {String(access.remainingSeconds).padStart(2, '0')}
                </span>
              </span>
            </div>
            <a href={origin ? `/whatsapp` : '#'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold rounded-lg transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
              Ir para o Sistema
            </a>
          </div>
        </div>
      )}

      {/* Expired Overlay */}
      {access?.expired && !activateSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-emerald-500/20 bg-zinc-900 p-8 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Hourglass className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2">Acesso Expirado</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Seu tempo de acesso ao sistema acabou. Ative novamente para continuar usando todas as ferramentas por mais 1 hora.
              </p>
            </div>
            <button onClick={handleActivate} disabled={activating}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
              {activating ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              {activating ? 'Ativando...' : 'Ativar 1 Hora de Acesso'}
            </button>
          </div>
        </div>
      )}

      {/* Activate Success Overlay */}
      {activateSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-emerald-500/20 bg-zinc-900 p-8 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2">Acesso Ativado!</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Você tem <strong className="text-emerald-400">1 hora</strong> para usar o sistema completo. Redirecionando...
              </p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          </div>
        </div>
      )}

      <main className={`max-w-5xl mx-auto px-4 py-6 space-y-6 ${access?.expired ? 'opacity-30 pointer-events-none blur-[2px]' : ''}`}>
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Meus Leads</p>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{data.totalLeads}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{leadsAtivos} ativos</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Convertidos</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{data.convertedLeads}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{data.totalLeads > 0 ? Math.round(data.convertedLeads / data.totalLeads * 100) : 0}% conversão</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">A Receber</p>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-amber-500">R$ {data.pendingCommissions.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Comissões pendentes</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Já Recebido</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-emerald-500">R$ {data.paidCommissions.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Total: R$ {data.totalCommissions.toFixed(2)}</p>
          </div>
        </div>

        {/* Commission rate info */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/[0.02] dark:to-purple-500/[0.02] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Sua Comissão</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Você ganha <span className="font-bold text-emerald-500">{data.commissionRate}%</span> sobre cada venda convertida dos seus leads indicados
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Como Funciona</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Use o sistema por 1 hora, ative novamente quando quiser</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl p-3 border border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-500">1</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">Ative seu Acesso</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Clique em "Ativar 1 Hora" para começar a usar o sistema completo.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl p-3 border border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-indigo-500">2</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">Use o Sistema</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Acesse todas as ferramentas como um cliente normal por até 1 hora.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-white/[0.02] rounded-xl p-3 border border-slate-200 dark:border-white/10">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-amber-500">3</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-800 dark:text-zinc-200">Reative quando Quiser</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">Após 1 hora, ative novamente para continuar. Simples e direto.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Seu Link de Indicação</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Compartilhe para ganhar comissão</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input readOnly value={`${origin}/checkout/${data.tenantId}?ref=${data.referralCode}`}
              className="flex-1 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-zinc-300 font-mono truncate focus:outline-none" />
            <CopyButton text={`${origin}/checkout/${data.tenantId}?ref=${data.referralCode}`} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Use meu link e garanta condições especiais! 🚀\n\n' + (origin) + '/checkout/' + data.tenantId + '?ref=' + data.referralCode)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-xl transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar
            </a>
          </div>
        </div>

        {/* Account Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Minha Conta</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Gerencie suas informações pessoais</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Dados Pessoais</h4>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">Nome</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} required
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">E-mail</label>
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">WhatsApp</label>
                <input type="text" value={profileWhatsapp} onChange={e => setProfileWhatsapp(e.target.value)}
                  placeholder="5511999999999"
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {profileError && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {profileError}</p>}
              {profileMsg && <p className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {profileMsg}</p>}
              <button type="submit" disabled={savingProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all">
                {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>

            {/* Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Alterar Senha</h4>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">Senha Atual</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">Nova Senha</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mb-1 block">Confirmar Nova Senha</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                  className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {passwordError && <p className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {passwordError}</p>}
              {passwordMsg && <p className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {passwordMsg}</p>}
              <button type="submit" disabled={changingPassword}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all">
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </form>
          </div>
        </div>

        {/* Withdraw Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Sacar Comissões</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">Disponível: <span className="font-bold text-emerald-500">R$ {balance.available.toFixed(2)}</span></p>
            </div>
          </div>

          {balance.available > 0 && (
            <form onSubmit={handleWithdraw} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1 block">Valor (mín. R$ 20)</label>
                  <input type="number" step="0.01" min="20" max={balance.available} required
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="50,00"
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1 block">Tipo de Chave</label>
                  <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500">
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase mb-1 block">Chave PIX</label>
                  <input type="text" required
                    value={pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    placeholder="Sua chave PIX"
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              {withdrawError && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {withdrawError}
                </p>
              )}
              {withdrawMsg && (
                <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {withdrawMsg}
                </p>
              )}

              <button type="submit" disabled={withdrawLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all">
                <Banknote className="w-3.5 h-3.5" />
                {withdrawLoading ? 'Enviando...' : 'Solicitar Saque'}
              </button>
            </form>
          )}

          {balance.available <= 0 && (
            <p className="text-xs text-slate-400 dark:text-zinc-500">Nenhum saldo disponível para saque no momento.</p>
          )}
        </div>

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5">
              <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Histórico de Saques</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                  <tr className="border-b border-slate-200 dark:border-white/5">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 dark:text-zinc-300 divide-y divide-slate-100 dark:divide-white/5">
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td className="px-4 py-3 text-slate-400">{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">R$ {w.amount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{w.pixKey}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          w.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {w.status === 'approved' ? <><CheckCircle2 className="w-3 h-3" /> Aprovado</> :
                           w.status === 'rejected' ? <><XCircle className="w-3 h-3" /> Rejeitado</> :
                           <><Clock className="w-3 h-3" /> Pendente</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Meus Leads</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
                <tr className="border-b border-slate-200 dark:border-white/5">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600 dark:text-zinc-300 divide-y divide-slate-100 dark:divide-white/5">
                {data.leads.length > 0 ? data.leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{lead.name || 'Sem nome'}</div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {lead.interested_product ? (
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {lead.interested_product}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {lead.value ? `R$ ${lead.value.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                        lead.status === 'CONVERTED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        lead.status === 'OPTED_OUT' || lead.status === 'NOT_INTERESTED' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' :
                        lead.status === 'INTERESTED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        lead.status === 'CONTACTED' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                        'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          lead.status === 'CONVERTED' ? 'bg-emerald-500' :
                          lead.status === 'OPTED_OUT' || lead.status === 'NOT_INTERESTED' ? 'bg-red-500' :
                          lead.status === 'INTERESTED' ? 'bg-amber-500' :
                          lead.status === 'CONTACTED' ? 'bg-blue-500' : 'bg-indigo-500'
                        }`} />
                        {lead.status === 'NEW' ? 'Novo' :
                         lead.status === 'CONTACTED' ? 'Contatado' :
                         lead.status === 'INTERESTED' ? 'Interessado' :
                         lead.status === 'CONVERTED' ? 'Convertido' :
                         lead.status === 'OPTED_OUT' ? 'Opt-out' : 'Não int.'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-zinc-500">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400 dark:text-zinc-500">Nenhum lead indicado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 dark:text-zinc-600">
          Dúvidas sobre suas comissões? Entre em contato com o administrador.
        </p>
      </main>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 text-[10px] font-bold rounded-xl border border-slate-200 dark:border-white/10 transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}
