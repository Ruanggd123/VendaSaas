'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, DollarSign, TrendingUp, Clock, Phone, Bot, Calendar, MessageSquare, Smartphone, Settings,
  LogOut, Target, CheckCircle2, Wallet, Link2, Copy, Check, Share2,
  Banknote, XCircle, AlertCircle, Zap, ExternalLink,
  Sparkles, ShieldCheck, BarChart3, Gift, Star, ShoppingCart, Rocket,
  Globe, Brain, Workflow, LayoutDashboard, ArrowRight, ChevronDown
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

// ─── Componentes de Design ───

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
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl shadow-2xl ${hover ? 'hover:bg-white/[0.04] hover:border-white/10 hover:-translate-y-1 transition-all duration-500' : ''} ${className}`}>
      {children}
    </div>
  );
}

function GradientIcon({ icon: Icon, gradient = 'from-indigo-500 to-purple-500' }: { icon: React.ElementType; gradient?: string }) {
  return (
    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} p-[1px]`}>
      <div className="w-full h-full rounded-2xl bg-zinc-950/90 flex items-center justify-center">
        <Icon className="w-[22px] h-[22px] text-white" />
      </div>
    </div>
  );
}

function SectionPill({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
      {text}
    </div>
  );
}

function CounterValue({ value, prefix = '', duration = 1500 }: { value: number; prefix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min((t - start) / duration, 1);
        setCount(Math.round(p * value));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      observer.disconnect();
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);
  return <span ref={ref} className="tabular-nums">{prefix}{count}</span>;
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${on ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-[0.98]'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={className}>{children}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-bold rounded-xl border border-white/10 hover:border-indigo-500/30 transition-all shrink-0">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, { l: string; cls: string; dot: string }> = {
    CONVERTED: { l: 'Convertido', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
    OPTED_OUT: { l: 'Opt-out', cls: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
    NOT_INTERESTED: { l: 'Não int.', cls: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
    INTERESTED: { l: 'Interessado', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
    CONTACTED: { l: 'Contatado', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-400' },
    NEW: { l: 'Novo', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-400' },
  };
  const x = c[status] || c.NEW;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${x.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${x.dot}`} />{x.l}</span>;
}

const PROJECT_FLOW: { key: string; label: string; next: string; color: string }[] = [
  { key: 'pendente', label: 'Pendente', next: 'em_contato', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
  { key: 'em_contato', label: 'Em Contato', next: 'em_desenvolvimento', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { key: 'em_desenvolvimento', label: 'Em Dev', next: 'homologacao', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { key: 'homologacao', label: 'Homologação', next: 'entregue', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { key: 'entregue', label: 'Entregue', next: '', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
];

function ProjectStatusBadge({ status, leadId, onUpdate }: { status: string; leadId: string; onUpdate: () => void }) {
  const [updating, setUpdating] = useState(false);
  const step = PROJECT_FLOW.find(s => s.key === status) || PROJECT_FLOW[0];
  const isLast = status === 'entregue';
  const isCanceled = status === 'cancelado';

  const advance = async () => {
    if (!step.next || updating) return;
    setUpdating(true);
    try {
      const r = await fetch('/api/partner/project-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: step.next }),
      });
      const d = await r.json();
      if (d.success) onUpdate();
    } catch {}
    setUpdating(false);
  };

  if (isCanceled) {
    return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border bg-red-500/10 text-red-400 border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Cancelado</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border ${step.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${step.color.split(' ')[0].replace('bg-', 'bg-').replace('/10', '')}`} />
        {step.label}
      </span>
      {!isLast && (
        <button onClick={advance} disabled={updating}
          className="text-[9px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2 py-0.5 rounded-lg transition-all disabled:opacity-50 text-left font-semibold">
          {updating ? '...' : `Avançar → ${PROJECT_FLOW.find(s => s.key === step.next)?.label || ''}`}
        </button>
      )}
      {isLast && (
        <span className="text-[9px] text-emerald-500/70 font-semibold">✓ Projeto concluído</span>
      )}
    </div>
  );
}

function Divider() {
  return <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />;
}

function PulseDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

// ─── Seções ───

function PlataformaSection() {
  const features = [
    { icon: Bot, title: 'IA que Vende Sozinha', desc: 'Atendente virtual inteligente que qualifica, agenda e fecha vendas 24h por dia. Fale com clientes como se fosse humano.', gradient: 'from-indigo-500 to-purple-500', tag: 'Destaque' },
    { icon: MessageSquare, title: 'Conversas Multi-Canal', desc: 'Centralize WhatsApp, Instagram e chat em um só lugar. Histórico completo, respostas rápidas e IA integrada.', gradient: 'from-blue-500 to-cyan-500', tag: '' },
    { icon: Calendar, title: 'Agendamento Automático', desc: 'Clientes agendam no WhatsApp sem esforço. A IA gerencia horários, evita conflitos e envia lembretes.', gradient: 'from-emerald-500 to-teal-500', tag: '' },
    { icon: ShoppingCart, title: 'Checkout & Cobrança Online', desc: 'Link de pagamento instantâneo enviado pelo WhatsApp. Aceite cartão, PIX e boleto com Mercado Pago e Asaas.', gradient: 'from-amber-500 to-orange-500', tag: '' },
    { icon: BarChart3, title: 'Pipeline de Vendas Visual', desc: 'Acompanhe cada lead em tempo real. Do primeiro contato até a venda convertida, tudo organizado num funil.', gradient: 'from-pink-500 to-rose-500', tag: '' },
    { icon: Smartphone, title: 'Multi-Instâncias WhatsApp', desc: 'Conecte vários números de WhatsApp ao mesmo painel. Cada atendente ou cliente com seu próprio número.', gradient: 'from-teal-500 to-cyan-500', tag: '' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
      {features.map((f, i) => (
        <GlassCard key={i} hover className="p-5 md:p-6 group relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${f.gradient} opacity-[0.03] rounded-bl-full blur-3xl group-hover:opacity-[0.06] transition-opacity duration-500`} />
          {f.tag && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold">
              {f.tag}
            </div>
          )}
          <GradientIcon icon={f.icon} gradient={f.gradient} />
          <h4 className="text-sm font-bold text-white mt-4 mb-2">{f.title}</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{f.desc}</p>
        </GlassCard>
      ))}
    </div>
  );
}

function ParaQuemSection() {
  const perfis = [
    { icon: Bot, title: 'Agências de Marketing', desc: 'Ofereça atendimento automático + sistema de vendas como serviço white-label para seus clientes. Diferencie-se da concorrência.' },
    { icon: BriefcaseIcon, title: 'Empresas com Vendas', desc: 'Qualquer negócio que vende online: infoprodutos, consultorias, serviços, e-commerce, clínicas, imobiliárias e muito mais.' },
    { icon: Users, title: 'Empreendedores Digitais', desc: 'Automatize 100% do atendimento e foque no que importa. Sua IA qualifica, agenda e vende enquanto você escala.' },
  ];

  function BriefcaseIcon(props: any) { return <Workflow {...props} />; }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {perfis.map((p, i) => (
        <GlassCard key={i} hover className="p-5 text-center group">
          <div className="mx-auto mb-4"><GradientIcon icon={p.icon} gradient={['from-indigo-500 to-purple-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'][i]} /></div>
          <h4 className="text-sm font-bold text-white mb-2">{p.title}</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed">{p.desc}</p>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Página Principal ───

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
  const [withdrawMsg, setWithdrawMsg] = useState(''); const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [profile, setProfile] = useState<{ name: string; email: string; whatsappNumber: string } | null>(null);
  const [profileName, setProfileName] = useState(''); const [profileEmail, setProfileEmail] = useState('');
  const [profileWhatsapp, setProfileWhatsapp] = useState('');
  const [profileMsg, setProfileMsg] = useState(''); const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(''); const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ── Asaas Integration ──
  const [showAsaasModal, setShowAsaasModal] = useState(false);
  const [asaasApiKey, setAsaasApiKey] = useState('');
  const [asaasLoading, setAsaasLoading] = useState(false);
  const [asaasMsg, setAsaasMsg] = useState('');
  const [asaasError, setAsaasError] = useState('');
  const [asaasConnected, setAsaasConnected] = useState(false);
  const [asaasEnv, setAsaasEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [asaasBalance, setAsaasBalance] = useState<number | null>(null);

  const handleAsaasSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asaasApiKey.trim()) return;
    setAsaasLoading(true); setAsaasMsg(''); setAsaasError('');
    try {
      const r = await fetch('/api/asaas/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: asaasApiKey, tenantId: data?.tenantId, environment: asaasEnv })
      });
      const d = await r.json();
      if (d.error) { setAsaasError(d.error); }
      else { setAsaasMsg(d.message); setAsaasBalance(d.balance); setAsaasConnected(true); setTimeout(() => setShowAsaasModal(false), 4000); }
    } catch { setAsaasError('Erro de conexão. Tente novamente.'); }
    setAsaasLoading(false);
  };

  const [access, setAccess] = useState<{ accessExpiresAt: string | null; expired: boolean; remainingMinutes: number; remainingSeconds: number; remainingMs: number } | null>(null);
  const [activating, setActivating] = useState(false); const [activateSuccess, setActivateSuccess] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [openProjects, setOpenProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myServices, setMyServices] = useState<DevService[]>([]);
  const [acceptingProject, setAcceptingProject] = useState<string | null>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const loadAccess = useCallback(async () => {
    try { const r = await fetch('/api/partner/trial'); const d = await r.json(); if (!d.error) setAccess(d); } catch {}
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/partner/dashboard').then(r => r.json()),
      fetch('/api/partner/balance').then(r => r.json()),
      fetch('/api/partner/withdrawals').then(r => r.json()),
      fetch('/api/partner/trial').then(r => r.json()),
      fetch('/api/partner/profile').then(r => r.json()),
      fetch('/api/projects?type=open').then(r => r.json()),
      fetch('/api/projects?type=mine').then(r => r.json()),
      fetch('/api/partner/services').then(r => r.json()),
    ]).then(([dash, bal, wd, tr, prof, op, mp, ms]) => {
      if (dash.error) { setError(dash.error); return; }
      setData(dash);
      if (!bal.error) setBalance(bal);
      if (!wd.error) setWithdrawals(wd.withdrawals || []);
      if (!tr.error) setAccess(tr);
      if (!prof.error) { setProfile(prof); setProfileName(prof.name || ''); setProfileEmail(prof.email || ''); setProfileWhatsapp(prof.whatsappNumber || ''); }
      if (Array.isArray(op)) setOpenProjects(op);
      if (Array.isArray(mp)) setMyProjects(mp);
      if (Array.isArray(ms)) setMyServices(ms);
    }).catch(() => setError('Erro ao carregar dados')).finally(() => setLoading(false));
    intervalRef.current = setInterval(loadAccess, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadAccess]);

  const handleAcceptProject = async (id: string) => {
    setAcceptingProject(id);
    try {
      const res = await fetch('/api/projects/accept', { method: 'POST', body: JSON.stringify({ project_id: id }) });
      const d = await res.json();
      if (d.error) alert(d.error);
      else {
        setOpenProjects(prev => prev.filter(p => p.id !== id));
        setMyProjects(prev => [d.project, ...prev]);
        alert('Projeto assumido com sucesso!');
      }
    } catch { alert('Erro ao aceitar projeto'); }
    setAcceptingProject(null);
  };

  const handleActivate = async () => {
    setActivating(true); setActivateSuccess(false);
    try {
      const r = await fetch('/api/partner/activate', { method: 'POST' }); const d = await r.json();
      if (d.error) { setError(d.error); setActivating(false); }
      else { setAccess({ accessExpiresAt: d.accessExpiresAt, expired: false, remainingMinutes: d.remainingMinutes, remainingSeconds: d.remainingSeconds, remainingMs: d.remainingMs }); setActivateSuccess(true); setActivating(false); setTimeout(() => router.push('/dashboard'), 2000); }
    } catch { setError('Erro ao ativar acesso'); setActivating(false); }
  };
  const handleLogout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); };
  const handleSaveProfile = async (e: React.FormEvent) => { e.preventDefault(); setSavingProfile(true); setProfileMsg(''); setProfileError(''); try { const r = await fetch('/api/partner/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profileName, email: profileEmail, whatsappNumber: profileWhatsapp }) }); const d = await r.json(); if (d.error) setProfileError(d.error); else { setProfileMsg('Perfil atualizado!'); setProfile(d); } } catch { setProfileError('Erro ao salvar'); } setSavingProfile(false); };
  const handleChangePassword = async (e: React.FormEvent) => { e.preventDefault(); if (newPassword !== confirmPassword) { setPasswordError('Senhas não conferem'); return; } setChangingPassword(true); setPasswordMsg(''); setPasswordError(''); try { const r = await fetch('/api/partner/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) }); const d = await r.json(); if (d.error) setPasswordError(d.error); else { setPasswordMsg('Senha alterada!'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); } } catch { setPasswordError('Erro ao alterar'); } setChangingPassword(false); };
  const handleWithdraw = async (e: React.FormEvent) => { e.preventDefault(); setWithdrawError(''); setWithdrawMsg(''); setWithdrawLoading(true); try { const r = await fetch('/api/partner/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(withdrawAmount), pixKey, pixKeyType }) }); const d = await r.json(); if (d.error) setWithdrawError(d.error); else { setWithdrawMsg('Solicitação enviada!'); setWithdrawAmount(''); setPixKey(''); const [b, wd] = await Promise.all([fetch('/api/partner/balance').then(r => r.json()), fetch('/api/partner/withdrawals').then(r => r.json())]); if (!b.error) setBalance(b); if (!wd.error) setWithdrawals(wd.withdrawals || []); } } catch { setWithdrawError('Erro'); } setWithdrawLoading(false); };

  // ─── Loading / Error ───
  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Glow /><div className="flex flex-col items-center gap-4 z-10"><div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse flex items-center justify-center"><Zap className="w-6 h-6 text-white" /></div><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div></div>;
  if (error || !data) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Glow /><GlassCard className="max-w-sm w-full p-8 text-center space-y-5 z-10"><AlertCircle className="w-8 h-8 text-red-400 mx-auto" /><p className="text-sm text-zinc-400">{error || 'Sem dados'}</p><button onClick={() => { setLoading(true); setError(''); fetch('/api/partner/dashboard').then(r => r.json()).then(d => { if (d.error) setError(d.error); else setData(d); }).catch(() => setError('Erro')).finally(() => setLoading(false)); }} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-xl">Tentar novamente</button></GlassCard></div>;

  const leadsAtivos = data.leads.filter(l => l.status !== 'OPTED_OUT' && l.status !== 'NOT_INTERESTED' && l.status !== 'CONVERTED').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden selection:bg-indigo-500/30">
      <Glow />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 p-[1px]">
              <div className="w-full h-full rounded-xl bg-zinc-950 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{data.name.charAt(0)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white">{data.name}</p>
              <div className="flex items-center gap-1.5"><PulseDot /><p className="text-[10px] text-zinc-500">{data.type === 'dev' ? 'Painel do Desenvolvedor' : 'Painel do Parceiro'}</p></div>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-zinc-400 hover:text-red-400 border border-white/10 rounded-xl hover:border-red-500/30 transition-all">Sair</button>
        </div>
      </header>

      {/* ── BANNER DE ACESSO ── */}
      {access && !access.expired && access.accessExpiresAt && (
        <div className="relative z-30 bg-gradient-to-r from-emerald-500/[0.05] via-emerald-500/[0.02] to-transparent border-b border-emerald-500/[0.08]">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[12px] text-zinc-300">
              <PulseDot />
              <span>Acesso ativo — <span className="font-mono font-bold text-emerald-400">{String(access.remainingMinutes).padStart(2, '0')}:{String(access.remainingSeconds).padStart(2, '0')}</span> restantes</span>
            </div>
            <a href={origin ? `/dashboard` : '#'} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-bold rounded-xl border border-indigo-500/20 transition-all">Ir para o Sistema <ExternalLink className="w-3 h-3" /></a>
          </div>
        </div>
      )}

      {/* ── OVERLAYS ── */}
      {access?.expired && !activateSuccess && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-white/10 bg-zinc-900/80 backdrop-blur-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]" />
            <div className="mx-auto"><GradientIcon icon={Zap} gradient="from-emerald-500 to-teal-500" /></div>
            <div><h2 className="text-xl font-extrabold text-white mb-2">Acesso Expirado</h2><p className="text-sm text-zinc-400">Seu tempo acabou. Ative novamente por mais <strong className="text-emerald-400">1 hora</strong>.</p></div>
            <button onClick={handleActivate} disabled={activating} className="w-full px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">{activating ? <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Zap className="w-5 h-5" />}{activating ? 'Ativando...' : 'Ativar 1 Hora'}</button>
          </div>
        </div>
      )}
      {activateSuccess && (
        <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl border border-emerald-500/20 bg-zinc-900/80 backdrop-blur-2xl p-8 text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 bg-emerald-500/10 rounded-full blur-[80px]" />
            <div className="mx-auto"><GradientIcon icon={Zap} gradient="from-emerald-500 to-teal-500" /></div>
            <div><h2 className="text-xl font-extrabold text-white animate-pulse">Acesso Ativado!</h2><p className="text-sm text-zinc-400">Redirecionando para o sistema...</p></div>
            <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      )}

      {/* ── CONTEÚDO ── */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16 space-y-16 md:space-y-20 ${access?.expired ? 'opacity-30 pointer-events-none blur-[2px]' : ''}`}>

        {/* ═══════════ HERO ═══════════ */}
        <Reveal>
          <section className="text-center space-y-6 md:space-y-8">
            <SectionPill text="Programa de Parceiros Nexus" />
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Seu sistema de vendas<br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">já está pronto.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-sm md:text-base text-zinc-400 leading-relaxed">
              Este é o painel de demonstração do <strong className="text-white">Nexus SaaS</strong> — um sistema completo de vendas, atendimento e automação com inteligência artificial. Tudo que uma empresa precisa para vender online, num só lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={handleActivate} disabled={activating} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {activating ? 'Ativando...' : 'Testar o Sistema Grátis'}
              </button>
              <a href="#plataforma" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-medium rounded-xl border border-white/10 transition-all flex items-center gap-2">
                Ver Funcionalidades <ChevronDown className="w-4 h-4" />
              </a>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { v: data.totalLeads, l: 'Leads Captados' },
                { v: data.convertedLeads, l: 'Vendas Convertidas' },
                { v: data.commissionRate, l: '% de Comissão', p: '%' },
                { v: 6, l: 'Ferramentas Integradas' },
              ].map((s, i) => (
                <GlassCard key={i} className="py-4 px-5 text-center">
                  <p className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                    {i < 2 ? <CounterValue value={s.v} /> : s.p ? `${s.v}${s.p}` : <CounterValue value={s.v} />}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-bold">{s.l}</p>
                </GlassCard>
              ))}
            </div>
          </section>
        </Reveal>

        <Divider />

        {/* ═══════════ O QUE É A PLATAFORMA ═══════════ */}
        <Reveal delay={100}>
          <section id="plataforma" className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <SectionPill text="O que a plataforma faz" />
              <h2 className="text-2xl md:text-4xl font-extrabold">
                Uma plataforma.<br />
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Vendas, atendimento e IA.</span>
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                O Nexus substitui vários sistemas: chatbot, CRM, agenda, checkout e WhatsApp. Tudo integrado com inteligência artificial que atende, qualifica e fecha vendas sozinha.
              </p>
            </div>
            <PlataformaSection />
          </section>
        </Reveal>

        {/* ═══════════ PARA QUEM ═══════════ */}
        <Reveal delay={150}>
          <section className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <SectionPill text="Para quem é?" />
              <h2 className="text-2xl md:text-3xl font-extrabold">Feito para <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">quem vende online</span></h2>
              <p className="text-sm text-zinc-400">Se o seu cliente precisa vender e atender online, o Nexus é a solução.</p>
            </div>
            <ParaQuemSection />
          </section>
        </Reveal>

        <Divider />

        {/* ═══════════ PARCEIRO: MÉTRICAS ═══════════ */}
        <Reveal delay={200}>
          <section className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-3">
              <SectionPill text="Suas Métricas" />
              <h2 className="text-xl md:text-2xl font-extrabold">{data.type === 'dev' ? <><span className="text-indigo-400">Você retém {data.commissionRate}%</span> do pagamento de seus clientes</> : <>Como parceiro, <span className="text-indigo-400">você ganha comissão</span> a cada venda convertida</>}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { l: data.type === 'dev' ? 'Clientes e Projetos' : 'Meus Leads', v: data.totalLeads, s: `${leadsAtivos} ativos`, ic: Users, g: 'from-indigo-500 to-purple-500' },
                { l: data.type === 'dev' ? 'Projetos Fechados' : 'Convertidos', v: data.convertedLeads, s: `${data.totalLeads > 0 ? Math.round(data.convertedLeads / data.totalLeads * 100) : 0}% conversão`, ic: CheckCircle2, g: 'from-emerald-500 to-teal-500', vc: 'text-emerald-400' },
                { l: data.type === 'dev' ? 'Repasse Pendente' : 'A Receber', v: `R$ ${data.pendingCommissions.toFixed(2)}`, s: 'Disponível para saque', ic: Clock, g: 'from-amber-500 to-orange-500', vc: 'text-amber-400', raw: false },
                { l: data.type === 'dev' ? 'Repasse Realizado' : 'Já Recebido', v: `R$ ${data.paidCommissions.toFixed(2)}`, s: `Total R$ ${data.totalCommissions.toFixed(2)}`, ic: DollarSign, g: 'from-emerald-500 to-teal-500', vc: 'text-emerald-400', raw: false },
              ].map((m, i) => (
                <GlassCard key={i} hover className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{m.l}</p>
                    <GradientIcon icon={m.ic} gradient={m.g} />
                  </div>
                  <p className={`text-2xl font-extrabold ${m.vc || 'text-white'}`}>{typeof m.raw === 'undefined' ? (typeof m.v === 'number' ? <CounterValue value={m.v as number} /> : m.v) : m.v}</p>
                  <p className="text-[11px] text-zinc-600 mt-1">{m.s}</p>
                </GlassCard>
              ))}
            </div>

            <GlassCard className="p-5 bg-gradient-to-r from-indigo-500/[0.02] to-purple-500/[0.02] border-indigo-500/10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-center sm:text-left">
                <GradientIcon icon={Target} gradient="from-indigo-500 to-purple-500" />
                <div className="flex-1">
                  <p className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">{data.commissionRate}%</p>
                  <p className="text-xs text-zinc-400 mt-1">de comissão sobre cada venda convertida dos seus leads</p>
                </div>
              </div>
            </GlassCard>
          </section>
        </Reveal>

        {/* ═══════════ COMO FUNCIONA + LINK ═══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Reveal delay={250} className="md:col-span-2">
            <GlassCard className="p-5 md:p-6 h-full">
              <div className="flex items-center gap-3 mb-5"><GradientIcon icon={TrendingUp} gradient="from-emerald-500 to-teal-500" /><div><h3 className="text-sm font-bold text-white">Como Ganhar Comissões</h3><p className="text-[10px] text-zinc-500">3 passos simples para começar a lucrar</p></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { n: '1', t: 'Compartilhe seu Link', d: 'Envie seu link de indicação no WhatsApp, Instagram ou onde preferir. Cada clique vira um lead.', ic: Gift, g: 'from-emerald-500 to-teal-500' },
                  { n: '2', t: 'Acompanhe no AutoVendas', d: 'Monitore cada lead no pipeline visual. Veja quem está interessado, agende e converta vendas.', ic: BarChart3, g: 'from-indigo-500 to-purple-500' },
                  { n: '3', t: 'Receba suas Comissões', d: 'Venda convertida = comissão na hora. Saque via PIX quando quiser, direto no painel.', ic: Wallet, g: 'from-amber-500 to-orange-500' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] hover:border-white/10 transition-all group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.g} p-[1px] shrink-0 mt-0.5`}><div className="w-full h-full rounded-lg bg-zinc-950 flex items-center justify-center"><s.ic className="w-4 h-4 text-white" /></div></div>
                    <div><p className="text-xs font-bold text-white mb-1">{s.t}</p><p className="text-[10px] text-zinc-500 leading-relaxed">{s.d}</p></div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <Reveal delay={300}>
            <GlassCard className="p-5 md:p-6 h-full flex flex-col border-indigo-500/10">
              <div className="flex items-center gap-3 mb-4"><GradientIcon icon={Link2} gradient="from-indigo-500 to-purple-500" /><div><h3 className="text-sm font-bold text-white">Seu Link</h3><p className="text-[10px] text-zinc-500">Compartilhe e ganhe</p></div></div>
              <div className="flex-1 flex flex-col justify-center space-y-3">
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.06] rounded-xl px-3 py-2.5">
                  <Link2 className="w-4 h-4 text-zinc-600 shrink-0" />
                  <input readOnly value={`${origin}/checkout/${data.tenantId}?ref=${data.referralCode}`} className="flex-1 bg-transparent text-[11px] text-zinc-400 font-mono truncate focus:outline-none" />
                </div>
                <div className="flex gap-2">
                  <CopyButton text={`${origin}/checkout/${data.tenantId}?ref=${data.referralCode}`} />
                  <a href={`https://wa.me/?text=${encodeURIComponent('🚀 Condições especiais para você!\n\n' + origin + '/checkout/' + data.tenantId + '?ref=' + data.referralCode)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/20">
                    <Share2 className="w-3.5 h-3.5" />WhatsApp
                  </a>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        </div>

        <Divider />

        {/* ═══════════ CTA: ADQUIRA ═══════════ */}
        <Reveal delay={350}>
          <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.05] via-purple-500/[0.03] to-transparent p-8 md:p-12 text-center space-y-6">
            <div className="absolute -top-24 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-16 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px]" />
            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <GradientIcon icon={Rocket} gradient="from-indigo-500 to-purple-500" />
              <h2 className="text-2xl md:text-4xl font-extrabold">
                Quer um sistema igual a esse<br />
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">para o seu negócio?</span>
              </h2>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
                O Nexus SaaS é white-label. Você revende com sua marca e oferece aos seus clientes um sistema profissional de vendas com IA, WhatsApp, agendamento e checkout integrado.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button onClick={handleActivate} disabled={activating} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                  <Zap className="w-5 h-5" />{activating ? 'Ativando...' : 'Testar o Sistema Grátis'}
                </button>
                <a href="https://wa.me/5588981885499" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-medium rounded-xl border border-white/10 transition-all flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />Falar com Consultor
                </a>
              </div>
            </div>
          </section>
        </Reveal>

        <Divider />

        {/* ═══════════ MINHA CONTA ═══════════ */}
        <Reveal delay={400}>
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6"><GradientIcon icon={Users} gradient="from-indigo-500 to-purple-500" /><div><h3 className="text-sm font-bold text-white">Minha Conta</h3><p className="text-[10px] text-zinc-500">Gerencie seu perfil e acesso</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /><h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Dados Pessoais</h4></div>
                {[{ l: 'Nome', v: profileName, s: setProfileName, t: 'text' }, { l: 'E-mail', v: profileEmail, s: setProfileEmail, t: 'email' }, { l: 'WhatsApp', v: profileWhatsapp, s: setProfileWhatsapp, t: 'text', p: '5511999999999' }].map((f, i) => (
                  <div key={i}><label className="text-[10px] font-semibold text-zinc-400 mb-1.5 block">{f.l}</label><input type={f.t} value={f.v} onChange={e => f.s(e.target.value)} required placeholder={f.p || ''} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all" /></div>
                ))}
                {profileError && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{profileError}</p>}
                {profileMsg && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{profileMsg}</p>}
                <button type="submit" disabled={savingProfile} className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">{savingProfile ? 'Salvando...' : 'Salvar'}</button>
              </form>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /><h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alterar Senha</h4></div>
                {[{ l: 'Senha Atual', v: currentPassword, s: setCurrentPassword }, { l: 'Nova Senha', v: newPassword, s: setNewPassword }, { l: 'Confirmar Senha', v: confirmPassword, s: setConfirmPassword }].map((f, i) => (
                  <div key={i}><label className="text-[10px] font-semibold text-zinc-400 mb-1.5 block">{f.l}</label><input type="password" value={f.v} onChange={e => f.s(e.target.value)} required minLength={i > 0 ? 6 : 0} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500/40 transition-all" /></div>
                ))}
                {passwordError && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{passwordError}</p>}
                {passwordMsg && <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{passwordMsg}</p>}
                <button type="submit" disabled={changingPassword} className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">{changingPassword ? 'Alterando...' : 'Alterar Senha'}</button>
              </form>
            </div>
          </GlassCard>
        </Reveal>

        {/* ═══════════ SAQUE ═══════════ */}
        <Reveal delay={450}>
          <GlassCard className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5"><GradientIcon icon={Wallet} gradient="from-emerald-500 to-teal-500" /><div><h3 className="text-sm font-bold text-white">{data.type === 'dev' ? 'Sacar Repasses' : 'Sacar Comissões'}</h3><p className="text-[10px] text-zinc-500">Disponível: <span className="font-bold text-emerald-400">R$ {balance.available.toFixed(2)}</span></p></div></div>
            {balance.available > 0 ? (
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="text-[10px] font-semibold text-zinc-400 mb-1.5 block">Valor (mín. R$ 20)</label><input type="number" step="0.01" min="20" max={balance.available} required value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="50,00" className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-all" /></div>
                  <div><label className="text-[10px] font-semibold text-zinc-400 mb-1.5 block">Tipo de Chave</label><select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)} className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/40 transition-all">{['cpf','cnpj','email','phone','random'].map(t => <option key={t} value={t} className="bg-zinc-900">{t.toUpperCase()}</option>)}</select></div>
                  <div><label className="text-[10px] font-semibold text-zinc-400 mb-1.5 block">Chave PIX</label><input type="text" required value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Sua chave" className="w-full bg-white/[0.02] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-emerald-500/40 transition-all" /></div>
                </div>
                {withdrawError && <p className="text-[10px] text-red-400"><AlertCircle className="w-3 h-3 inline mr-1" />{withdrawError}</p>}
                {withdrawMsg && <p className="text-[10px] text-emerald-400"><CheckCircle2 className="w-3 h-3 inline mr-1" />{withdrawMsg}</p>}
                <button type="submit" disabled={withdrawLoading} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"><Banknote className="w-3.5 h-3.5 inline mr-1.5" />{withdrawLoading ? 'Enviando...' : 'Solicitar Saque'}</button>
              </form>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white/[0.01] rounded-xl border border-dashed border-white/[0.06]"><DollarSign className="w-5 h-5 text-zinc-700" /><p className="text-xs text-zinc-600">Nenhum saldo para saque ainda. Compartilhe seu link e comece a ganhar!</p></div>
            )}
          </GlassCard>
        </Reveal>

        {/* ═══════════ UBER DE DEVS (OPORTUNIDADES) ═══════════ */}
        {data.type === 'dev' && (
          <Reveal delay={600}>
            <GlassCard className="overflow-hidden border-indigo-500/20">
              <div className="px-5 py-4 border-b border-indigo-500/10 bg-indigo-500/5">
                <div className="flex items-center gap-3">
                  <GradientIcon icon={Rocket} gradient="from-indigo-500 to-purple-500" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Pool de Projetos (Oportunidades)</h3>
                    <p className="text-[10px] text-indigo-300">Aceite novos projetos solicitados por clientes na plataforma central</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {openProjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {openProjects.map(p => (
                      <div key={p.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold text-white">{p.title}</h4>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                              R$ {p.price.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mb-3">{p.description || 'Sem descrição'}</p>
                          <p className="text-[10px] text-zinc-500 mb-4">Cliente: <span className="text-zinc-300">{p.client_name || 'Desconhecido'}</span></p>
                        </div>
                        <button 
                          onClick={() => handleAcceptProject(p.id)}
                          disabled={acceptingProject === p.id}
                          className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                          {acceptingProject === p.id ? 'Aceitando...' : 'Assumir Projeto'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Rocket className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-xs text-zinc-500">Nenhum projeto disponível no momento no Pool público.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </Reveal>
        )}

        {/* ═══════════ PROJETOS DO DEV E SERVIÇOS ═══════════ */}
        {data.type === 'dev' && (
          <Reveal delay={650}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <GradientIcon icon={Workflow} gradient="from-blue-500 to-cyan-500" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Meus Projetos Ativos</h3>
                      <p className="text-[10px] text-zinc-500">Projetos em andamento</p>
                    </div>
                  </div>
                </div>
                <div className="p-0">
                  {myProjects.length > 0 ? (
                    <div className="divide-y divide-white/[0.03]">
                      {myProjects.map(p => (
                        <div key={p.id} className="p-4 hover:bg-white/[0.01] transition-all flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white">{p.title}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1">{p.client_name}</p>
                          </div>
                          <StatusBadge status={p.status === 'IN_PROGRESS' ? 'INTERESTED' : 'CONVERTED'} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-6 text-center text-xs text-zinc-600">Nenhum projeto ativo.</p>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="overflow-hidden border-purple-500/10">
                <div className="px-5 py-4 border-b border-purple-500/10 bg-purple-500/5">
                  <div className="flex items-center gap-3">
                    <GradientIcon icon={ShoppingCart} gradient="from-purple-500 to-pink-500" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Meus Serviços Extras</h3>
                      <p className="text-[10px] text-purple-300">Venda SEO, Anúncios e customizações</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {myServices.length > 0 ? (
                    myServices.map(s => (
                      <div key={s.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-white">{s.title}</h4>
                          <p className="text-[10px] text-emerald-400 mt-0.5 font-bold">R$ {s.price.toFixed(2)} {s.is_recurring ? '/mês' : ''}</p>
                        </div>
                        <CopyButton text={`${origin}/checkout/service/${s.id}`} />
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-zinc-600 py-4">Você ainda não criou nenhum serviço extra.</p>
                  )}
                  <button className="w-full py-2.5 border border-dashed border-purple-500/30 hover:bg-purple-500/10 text-purple-400 text-xs font-bold rounded-xl transition-all">
                    + Criar Novo Serviço
                  </button>
                </div>
              </GlassCard>
            </div>
          </Reveal>
        )}

        {/* ═══════════ HISTÓRICO DE SAQUES ═══════════ */}
        {withdrawals.length > 0 && (
          <Reveal delay={500}>
            <GlassCard className="overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.04]"><div className="flex items-center gap-3"><GradientIcon icon={Clock} gradient="from-amber-500 to-orange-500" /><div><h3 className="text-sm font-bold text-white">Histórico de Saques</h3><p className="text-[10px] text-zinc-500">Acompanhe suas solicitações</p></div></div></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-white/[0.04] text-[10px] text-zinc-500 uppercase tracking-wider font-bold"><th className="px-5 py-3">Data</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Chave PIX</th><th className="px-5 py-3">Status</th></tr></thead>
                  <tbody className="text-xs divide-y divide-white/[0.03]">
                    {withdrawals.map(w => (
                      <tr key={w.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-5 py-3 text-zinc-500">{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3 font-bold text-white">R$ {w.amount.toFixed(2)}</td>
                        <td className="px-5 py-3 font-mono text-[10px] text-zinc-500">{w.pixKey}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : w.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {w.status === 'approved' ? <><CheckCircle2 className="w-3 h-3" /> Aprovado</> : w.status === 'rejected' ? <><XCircle className="w-3 h-3" /> Rejeitado</> : <><Clock className="w-3 h-3" /> Pendente</>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </Reveal>
        )}

        {/* ═══════════ MEUS LEADS ═══════════ */}
        <Reveal delay={550}>
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.04]"><div className="flex items-center gap-3"><GradientIcon icon={Users} gradient="from-indigo-500 to-purple-500" /><div><h3 className="text-sm font-bold text-white">{data.type === 'dev' ? 'Meus Clientes e Projetos' : 'Meus Leads'}</h3><p className="text-[10px] text-zinc-500">{data.type === 'dev' ? 'Todos os projetos hospedados' : 'Todos os leads que você indicou'}</p></div></div></div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-white/[0.04] text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                  <th className="px-5 py-3">{data.type === 'dev' ? 'Cliente' : 'Lead'}</th>
                  <th className="px-5 py-3">Produto</th>
                  <th className="px-5 py-3">Valor</th>
                  {data.type === 'dev' && <th className="px-5 py-3">Progresso</th>}
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Data</th>
                </tr></thead>
                <tbody className="text-xs divide-y divide-white/[0.03]">
                  {data.leads.length > 0 ? data.leads.map(l => {
                    const ps = l.project_status || 'pendente';
                    const isDev = data.type === 'dev';
                    return (
                    <tr key={l.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-white">{l.name || 'Sem nome'}</div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {l.phone}
                          {l.phone && (
                            <a href={`https://wa.me/${l.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                              title="Falar no WhatsApp">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              Chamar
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">{l.interested_product ? <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">{l.interested_product}</span> : '—'}</td>
                      <td className="px-5 py-3 font-bold text-white">{l.value ? `R$ ${l.value.toFixed(2)}` : '—'}</td>
                      {isDev && (
                        <td className="px-5 py-3">
                          <ProjectStatusBadge status={ps} leadId={l.id} onUpdate={() => window.location.reload()} />
                        </td>
                      )}
                      <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-5 py-3 text-zinc-500">{new Date(l.created_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  )}) : <tr><td colSpan={isDev ? 6 : 5} className="px-5 py-12 text-center text-xs text-zinc-600">Nenhum lead ainda. Compartilhe seu link e comece a indicar!</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </Reveal>

        {/* ═══════════ INTEGRAÇÃO ASAAS ═══════════ */}
        <Reveal delay={550}>
          <GlassCard className="p-6 md:p-8 border-indigo-500/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <GradientIcon icon={Banknote} gradient="from-emerald-500 to-teal-500" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-white">Integração Asaas</h3>
                    {asaasConnected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Conectado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed max-w-md">
                    Configure o gateway de pagamento do seu sistema. Cole sua chave da API do Asaas e o sistema configura o Webhook automaticamente — sem precisar mexer em mais nada.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowAsaasModal(true); setAsaasMsg(''); setAsaasError(''); }}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4" />{asaasConnected ? 'Reconfigurar' : 'Conectar Asaas'}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: '1', t: 'Cole sua API Key', d: 'Acesse: Configurações → Integrações → Chave de API.', ic: Settings, g: 'from-indigo-500 to-purple-500' },
                { n: '2', t: 'Clique em Conectar', d: 'O sistema valida a chave e configura o Webhook automaticamente.', ic: Zap, g: 'from-emerald-500 to-teal-500' },
                { n: '3', t: 'Pronto — 100% Automático', d: 'Todo Pix pago, boleto ou cartão cai na sua conta e o sistema libera o cliente.', ic: CheckCircle2, g: 'from-amber-500 to-orange-500' },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.g} p-[1px] shrink-0 mt-0.5`}><div className="w-full h-full rounded-lg bg-zinc-950 flex items-center justify-center"><s.ic className="w-4 h-4 text-white" /></div></div>
                  <div><p className="text-xs font-bold text-white mb-1">{s.t}</p><p className="text-[10px] text-zinc-500 leading-relaxed">{s.d}</p></div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>

        {/* ═══════════ FOOTER ═══════════ */}
        <p className="text-center text-[10px] text-zinc-700 pb-8">Nexus SaaS — Dúvidas? Fale com o administrador pelo WhatsApp.</p>

        {/* ═══════════ MODAL ASAAS ═══════════ */}
        {showAsaasModal && (
          <div className="fixed inset-0 z-[60] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => !asaasLoading && setShowAsaasModal(false)}>
            <div className="max-w-md w-full rounded-3xl border border-white/10 bg-zinc-900/95 backdrop-blur-2xl p-8 space-y-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-[60px]" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <GradientIcon icon={Banknote} gradient="from-emerald-500 to-teal-500" />
                    <div>
                      <h3 className="text-base font-extrabold text-white">Conectar Asaas</h3>
                      <p className="text-[10px] text-zinc-500">Configure seu gateway de pagamento</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAsaasModal(false)} disabled={asaasLoading} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Use a <strong>Chave de API</strong> encontrada em: <strong>Asaas → Minha Conta → Configurações → Integrações</strong>. Não compartilhe com ninguém.
                  </p>
                </div>

                  <form onSubmit={handleAsaasSetup} className="space-y-4">
                    {/* Seletor de Ambiente */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Ambiente</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAsaasEnv('sandbox')}
                          className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                            asaasEnv === 'sandbox'
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                              : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:border-white/10'
                          }`}
                        >
                          <span className="text-base">🧪</span>
                          Sandbox
                          <span className="text-[9px] font-normal opacity-70">Para testes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAsaasEnv('production')}
                          className={`flex flex-col items-center gap-1 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                            asaasEnv === 'production'
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                              : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:border-white/10'
                          }`}
                        >
                          <span className="text-base">🚀</span>
                          Produção
                          <span className="text-[9px] font-normal opacity-70">Dinheiro real</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Chave de API do Asaas</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={asaasApiKey}
                          onChange={e => setAsaasApiKey(e.target.value)}
                          required
                          placeholder="$aact_YTU5YmM2OWI..."
                          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all pr-12"
                        />
                        <ShieldCheck className="w-4 h-4 text-zinc-600 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1.5">Encontre em: <strong className="text-zinc-500">Asaas → Minha Conta → Integrações → Chave de API</strong></p>
                    </div>

                    {asaasError && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <p className="text-[11px] text-red-400">{asaasError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={asaasLoading || !asaasApiKey.trim()}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {asaasLoading ? (
                        <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Validando e configurando...</>
                      ) : (
                        <><Zap className="w-4 h-4" /> Conectar e Configurar Webhook</>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">Integração Completa!</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{asaasMsg}</p>
                      {asaasBalance !== null && (
                        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <Banknote className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">Saldo {asaasEnv === 'sandbox' ? 'Sandbox' : 'Real'}: R$ {Number(asaasBalance).toFixed(2)}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-zinc-500 mt-3">O Webhook foi configurado automaticamente. Todo pagamento aprovado será processado pelo sistema.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}