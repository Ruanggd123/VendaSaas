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
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import PartnerAccessTimer from "@/components/PartnerAccessTimer";

const navItems = [
  {
    section: "Visão Geral",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/conversas", label: "Conversas", icon: MessageSquare },
    ],
  },
  {
    section: "Operações",
    items: [
      { href: "/agenda", label: "Agenda", icon: Calendar },
      { href: "/vendas", label: "Vendas & Cobranças", icon: DollarSign },
    ],
  },
  {
    section: "Infraestrutura",
    managerOnly: true,
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: Smartphone },
      { href: "/settings", label: "Configurações", icon: Settings },
      { href: "/workflow", label: "Workflow", icon: Workflow },
      { href: "/admin", label: "Super Admin", icon: Shield, superAdminOnly: true },
    ],
  },
  {
    section: "Parceiro",
    partnerOnly: true,
    items: [
      { href: "/painel-parceiro", label: "Meu Painel", icon: UserCircle },
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
  const [role, setRole] = useState<string>("agent");
  const [userName, setUserName] = useState<string>("Cliente");

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setRole(data.user.role);
          setUserName(data.user.name || "Cliente");
        }
      })
      .catch(console.error);

    const val = localStorage.getItem("sidebar_collapsed");
    if (val === "true") setIsCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", String(newVal));
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  const isManager = role === "superadmin" || role === "manager";
  const isPartner = role === "partner";
  const roleLabel = isPartner ? "Parceiro" : isManager ? "Gerente" : "Atendente";
  const showInfraestrutura = isManager || isPartner;
  const initials = userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden">
      
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
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 overflow-hidden">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Nexus SaaS</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{roleLabel}</p>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 overflow-hidden">
              <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-0.5" />
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
          {navItems.map((group) => {
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
                  {group.items.map((item) => {
                    if (item.superAdminOnly && role !== "superadmin") return null;
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
          })}
        </nav>

        {/* Footer */}
        <div className={`border-t border-slate-200 dark:border-white/[0.06] p-3 space-y-2`}>
          {/* User */}
          <div className={`flex items-center gap-3 rounded-xl py-2 ${isCollapsed ? "justify-center" : "px-2"}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
              {initials}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
                <p className="text-[10px] text-green-500 dark:text-green-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Plano Ativo
                </p>
              </div>
            )}
          </div>

          {/* Partner Panel Button */}
          {!isCollapsed && isPartner && (
            <Link
              href="/painel-parceiro"
              className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-all mb-2"
            >
              <UserCircle className="w-4 h-4" />
              <span>Painel do Parceiro</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-60" />
            </Link>
          )}

          {/* Actions */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSidebar}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors text-xs font-medium text-slate-500 dark:text-zinc-400"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Recolher</span>
              </button>
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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

        <div className="p-4 md:p-8 flex-1">
          {children}
        </div>
        <PartnerAccessTimer />
      </main>
    </div>
  );
}
