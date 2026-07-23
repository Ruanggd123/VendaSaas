"use client";

import { useState } from "react";
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Sparkles, 
  Copy, 
  Check, 
  Key, 
  Settings, 
  LogOut, 
  ExternalLink,
  Users,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    role: string;
    tenantName: string;
    tenantPlan: string;
    tenantId: string;
    userId: string;
  };
}

export default function AccountModal({ isOpen, onClose, user }: AccountModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ success?: string; error?: string }>({});
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  if (!isOpen) return null;

  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const getRoleBadge = (role: string) => {
    const r = role.toLowerCase();
    if (r === "superadmin") {
      return { label: "Super Admin", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    }
    if (r === "admin" || r === "manager") {
      return { label: "Administrador", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" };
    }
    if (r === "partner") {
      return { label: "Parceiro Afiliado", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    }
    return { label: "Atendente / Agente", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  };

  const roleInfo = getRoleBadge(user.role);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({});
    setIsSubmittingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPasswordStatus({ success: "Senha alterada com sucesso!" });
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setShowPasswordForm(false), 2000);
      } else {
        setPasswordStatus({ error: data.error || "Erro ao alterar a senha." });
      }
    } catch {
      setPasswordStatus({ error: "Erro de conexão com o servidor." });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decorativo com gradiente */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 flex justify-between items-start">
          <div className="flex items-center gap-2 text-white/90">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Gerenciamento de Conta</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Avatar Overlap */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-xl ring-4 ring-white dark:ring-zinc-950">
                <div className="w-full h-full rounded-[12px] bg-slate-900 flex items-center justify-center text-white font-extrabold text-2xl">
                  {initials}
                </div>
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-950"></span>
            </div>

            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${roleInfo.color} flex items-center gap-1.5`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {roleInfo.label}
            </span>
          </div>

          {/* User Basic Info */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user.name || "Usuário"}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{user.email || "Sem email cadastrado"}</span>
            </div>
          </div>

          {/* Organization & Plan Card */}
          <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 uppercase font-bold">Empresa / Organização</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">{user.tenantName || "Nexus Admin"}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3 h-3" />
                  Plano {user.tenantPlan ? user.tenantPlan.toUpperCase() : "ENTERPRISE"}
                </span>
              </div>
            </div>

            {user.tenantId && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-zinc-500 font-mono text-[11px] truncate max-w-[260px]">
                  ID: {user.tenantId}
                </span>
                <button
                  onClick={() => copyToClipboard(user.tenantId)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar ID</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Form de Alterar Senha Expansível */}
          {showPasswordForm && (
            <div className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-500" />
                  Alterar Minha Senha
                </h3>
                <button 
                  type="button" 
                  onClick={() => setShowPasswordForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {passwordStatus.error && (
                <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded-lg mb-3">{passwordStatus.error}</p>
              )}
              {passwordStatus.success && (
                <p className="text-xs text-emerald-500 bg-emerald-500/10 p-2 rounded-lg mb-3">{passwordStatus.success}</p>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Sua senha atual"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="No mínimo 6 caracteres"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSubmittingPassword ? "Atualizando..." : "Salvar Nova Senha"}
                </button>
              </form>
            </div>
          )}

          {/* Action Links */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all group"
            >
              <Settings className="w-4 h-4 text-indigo-500 group-hover:rotate-45 transition-transform" />
              <span>Configurações</span>
            </Link>

            {(user.role === "superadmin" || user.role === "admin" || user.role === "manager") && (
              <Link
                href="/equipe"
                onClick={onClose}
                className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all"
              >
                <Users className="w-4 h-4 text-purple-500" />
                <span>Gerenciar Equipe</span>
              </Link>
            )}

            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all text-left"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Trocar Senha</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 transition-all text-left"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-200 dark:border-white/5">
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              Nexus SaaS Platform &copy; 2026 - Conectado como {user.name || user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
