"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  DollarSign,
  Rocket,
  Smartphone,
  Settings,
  Workflow,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronRight,
  UserCircle,
  ExternalLink,
  Users,
  Wallet,
  Building2,
  Sparkles,
  ShieldCheck,
  ChevronUp,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import PartnerAccessTimer from "@/components/PartnerAccessTimer";
import AccountModal from "@/components/AccountModal";
import { getPlanDetails } from "@/lib/plans";

const navItems = [
  {
    section: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/conversas", label: "Conversas", icon: MessageSquare, requiresModule: "conversas" },
    ],
  },
  {
    section: "Operações",
    items: [
      { href: "/agenda", label: "Agenda", icon: Calendar, requiresModule: "agenda" },
      { href: "/vendas", label: "Vendas & Cobranças", icon: DollarSign, requiresModule: "crm" },
      { href: "/autovendas", label: "Afiliados & Saques", icon: Wallet, superAdminOnly: true },
      { href: "/projetos", label: "Projetos (Dev)", icon: Rocket, devOrAdminOnly: true },
      { href: "/meu-projeto", label: "Meu Site & Briefing", icon: Rocket, clientOnly: true, requiresModule: "site" },
    ],
  },
  {
    section: "Infraestrutura",
    managerOnly: true,
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: Smartphone, requiresModule: "whatsapp" },
      { href: "/equipe", label: "Equipe", icon: Users, requiresModule: "equipe" },
      { href: "/settings", label: "Configurações", icon: Settings },
      { href: "/workflow", label: "Workflow", icon: Workflow, requiresModule: "disparos" },
      { href: "/admin", label: "Super Admin", icon: Shield, superAdminOnly: true },
    ],
  },
  {
    section: "Parceiro",
    partnerOnly: true,
    items: [
      { href: "/painel-parceiro", label: "Meu Painel do Afiliado", icon: UserCircle },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [userAccount, setUserAccount] = useState({
    name: "",
    email: "",
    role: "",
    tenantName: "",
    tenantPlan: "",
    tenantId: "",
    userId: "",
    referralCode: "",
    partnerType: ""
  });
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [blockedModule, setBlockedModule] = useState<string | null>(null);

  const [partnerTrial, setPartnerTrial] = useState<{ expired: boolean; remainingMinutes: number; remainingSeconds: number } | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const blocked = new URLSearchParams(window.location.search).get("blocked");
    if (blocked) setBlockedModule(blocked);
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          const u = data.user;
          setUserAccount({
            name: u.name || "Usuário",
            email: u.email || "",
            role: u.role || "client",
            tenantName: u.tenant_name || "",
            tenantPlan: u.tenant_plan || "",
            tenantId: u.tenant_id || "",
            userId: u.id || u.userId || "",
            referralCode: u.referral_code || "",
            partnerType: u.partner_type || ""
          });
        }
      })
      .catch(console.error)
      .finally(() => setIsSessionLoaded(true));

    const val = localStorage.getItem("sidebar_collapsed");
    if (val === "true") setIsCollapsed(true);
  }, []);

  useEffect(() => {
    if (userAccount.role === "partner") {
      fetch('/api/partner/trial')
        .then(r => r.json())
        .then(d => {
          if (!d.error) setPartnerTrial(d);
        })
        .catch(() => {});
    }
  }, [userAccount.role, pathname]);

  const handleActivatePartnerTrial = async () => {
    setActivatingTrial(true);
    try {
      const res = await fetch('/api/partner/activate', { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setPartnerTrial({
          expired: false,
          remainingMinutes: data.remainingMinutes,
          remainingSeconds: data.remainingSeconds
        });
        alert('🚀 Degustação de 1 Hora Ativada com Sucesso! Toda a plataforma está liberada para você.');
      }
    } catch {
      alert('Erro ao ativar degustação');
    }
    setActivatingTrial(false);
  };

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", String(newVal));
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  const role = userAccount.role;
  const isManager = role === "superadmin" || role === "manager" || role === "admin";
  const isPartner = role === "partner";
  const roleLabel = isPartner ? "Parceiro Afiliado" : isManager ? "Admin" : "Atendente";
  const showInfraestrutura = isManager || isPartner;
  const initials = (userAccount.name || "RG")
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
      
      {/* Account Management Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={userAccount}
      />

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 dark:border-white/[0.06] bg-white dark:bg-black/40 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[68px]" : "w-64"
        } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo Header */}
        <div className={`h-16 flex items-center border-b border-slate-200 dark:border-white/[0.06] overflow-hidden ${isCollapsed ? "justify-center px-2" : "px-4 justify-between"}`}>
          {!isCollapsed && (
            <Link href="/dashboard" className="group flex items-center gap-3 min-w-0 py-1 transition-all">
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur-[3px] opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-9 h-9 rounded-xl bg-slate-950 p-1 border border-white/20 flex items-center justify-center shadow-md overflow-hidden">
                  <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    NEXUS
                  </span>
                  <span className="px-1.5 py-0.5 bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 rounded-md text-[9px] font-black uppercase tracking-wider">
                    SAAS
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1 truncate">
                  SISTEMAS &amp; ATENDIMENTO
                </span>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/dashboard" className="group relative w-9 h-9 shrink-0 flex items-center justify-center">
              <div className="absolute -inset-0.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur-[3px] opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-9 h-9 rounded-xl bg-slate-950 p-1 border border-white/20 flex items-center justify-center shadow-md overflow-hidden">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
              </div>
            </Link>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <button onClick={closeMenu} className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-5 overflow-y-auto overflow-x-hidden">
          {!mounted || !isSessionLoaded ? (
            <div className="space-y-4 px-2 py-4 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-20 mb-3" />
              <div className="h-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
              <div className="h-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
              <div className="h-9 bg-slate-200 dark:bg-white/10 rounded-xl" />
            </div>
          ) : (
            navItems.map((group) => {
            if (group.managerOnly && !showInfraestrutura) return null;
            if (group.partnerOnly && !isPartner) return null;
            return (
              <div key={group.section}>
                {!isCollapsed && (
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600 px-3 mb-1.5">
                    {group.section}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item: any) => {
                    if (item.superAdminOnly && role !== "superadmin") return null;
                    if (item.devOrAdminOnly && role !== "superadmin" && role !== "manager" && !(role === "partner" && (userAccount as any).partnerType === "dev")) return null;
                    if (item.clientOnly && (role === "superadmin" || (role === "partner" && (userAccount as any).partnerType === "dev"))) return null;

                    const currentPlan = getPlanDetails(userAccount.tenantPlan);
                    const planModules = Array.isArray((userAccount as any).modules) ? (userAccount as any).modules : [];
                    if (item.requiresModule && !planModules.includes(item.requiresModule)) return null;
                    if (item.requiresSite && !currentPlan.hasSite) return null;
                    if (item.requiresMassDispatch && !currentPlan.hasMassDispatch) return null;
                    if (item.requiresMultiUser && currentPlan.maxUsers <= 1) return null;

                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        onClick={closeMenu}
                        href={item.href}
                        title={item.label}
                        className={`group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                        } ${
                          active
                            ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm shadow-indigo-500/5"
                            : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent"
                        }`}
                      >
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-white"}`} />
                        {!isCollapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {!isCollapsed && active && (
                          <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-white/[0.06] p-3 space-y-2">
          {/* Cartão de Usuário Interativo */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className={`w-full group flex items-center gap-3 rounded-2xl py-2 px-2.5 bg-slate-100/60 dark:bg-white/[0.03] hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 border border-slate-200/80 dark:border-white/10 hover:border-indigo-500/30 transition-all duration-200 text-left ${
              isCollapsed ? "justify-center px-1" : ""
            }`}
            title="Gerenciar minha conta"
          >
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"></span>
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  {userAccount.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">
                    {isPartner ? "Afiliado Parceiro" : `Plano ${userAccount.tenantPlan ? userAccount.tenantPlan.toUpperCase() : "ENTERPRISE"}`}
                  </span>
                </div>
              </div>
            )}

            {!isCollapsed && (
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:rotate-45 transition-all ml-auto shrink-0 opacity-60 group-hover:opacity-100" />
            )}
          </button>

          {/* Partner Panel Button */}
          {!isCollapsed && isPartner && (
            <Link
              href="/painel-parceiro"
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all mb-1"
            >
              <UserCircle className="w-4 h-4" />
              <span>Painel do Afiliado</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
            </Link>
          )}

          {/* Actions */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={toggleSidebar}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors text-xs font-medium text-slate-500 dark:text-zinc-400"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Recolher</span>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
          {isCollapsed && (
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={toggleSidebar}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors hidden md:block"
                title="Expandir Menu"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-white/[0.06] bg-white/80 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-0.5" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Nexus</span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="p-4 md:p-8 flex-1 relative">
          {blockedModule && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-700 dark:text-amber-300 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="font-semibold">Acesso bloqueado: seu plano atual não inclui o módulo <strong>{blockedModule}</strong>.</span>
              </div>
              {userAccount.tenantId && (
                <Link
                  href={`/tenant/${userAccount.tenantId}/assinatura`}
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-xl"
                >
                  <Zap className="w-3.5 h-3.5" /> Fazer Upgrade
                </Link>
              )}
              <button
                onClick={() => setBlockedModule(null)}
                className="text-amber-500 hover:text-amber-700 shrink-0"
                aria-label="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {isPartner && pathname !== "/painel-parceiro" && (!partnerTrial || partnerTrial.expired) ? (
            <div className="max-w-2xl mx-auto my-8 py-10 px-6 bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl space-y-6 text-center backdrop-blur-xl">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 mx-auto animate-bounce">
                <div className="w-full h-full rounded-3xl bg-slate-900 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Bônus de Parceiro Oficial
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Ativar Degustação de 1 Hora da Plataforma!
                </h2>
                <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Como nosso parceiro oficial, você pode experimentar todos os recursos da ferramenta por <strong className="text-indigo-600 dark:text-indigo-400">1 hora totalmente grátis</strong> para testar no seu próprio WhatsApp ou apresentar ao vivo para seus clientes!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto bg-slate-50 dark:bg-zinc-950/80 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-xs font-medium">
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Robô IA com ChatGPT / Gemini
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Disparos em Massa &amp; CRM
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Conexão WhatsApp QR Code
                </div>
                <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Fluxos de Atendimento
                </div>
              </div>

              <div className="space-y-3 pt-2 max-w-md mx-auto">
                <button
                  onClick={handleActivatePartnerTrial}
                  disabled={activatingTrial}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>{activatingTrial ? 'Ativando Degustação...' : 'Ativar Degustação de 1 Hora Agora'}</span>
                </button>
                <Link
                  href="/painel-parceiro"
                  className="block w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 text-xs font-bold rounded-xl transition-all"
                >
                  Voltar para Meu Painel do Afiliado
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
        <PartnerAccessTimer />
      </main>
    </div>
  );
}
