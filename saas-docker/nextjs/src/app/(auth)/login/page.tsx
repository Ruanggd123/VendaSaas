"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  ShieldCheck,
  Zap,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  Bot,
  Star,
  Users,
} from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Credenciais inválidas");
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleLogin}>
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Input de E-mail */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            E-mail de Acesso
          </label>
          <div className="relative group">
            <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 pl-11 pr-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Input de Senha */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Senha
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="block w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/80 pl-11 pr-12 py-3.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 p-0.5 shadow-xl shadow-indigo-600/25 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
        >
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-4 px-6 rounded-[14px] flex items-center justify-center text-sm font-black text-white gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Autenticando Acesso...
              </>
            ) : (
              <>
                Entrar no Painel
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </div>
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-white transition-colors duration-300 px-4 py-12 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Dynamic Glow Orbs */}
      <div className="fixed top-1/4 left-10 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="fixed bottom-1/4 right-10 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="fixed inset-0 bg-grid-pattern opacity-20 dark:opacity-30 pointer-events-none -z-10" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Visual Showcase (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col space-y-8 pr-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 p-0.5 shadow-xl shadow-indigo-500/30">
              <div className="w-full h-full bg-white dark:bg-[#030712] rounded-[14px] flex items-center justify-center p-1.5">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-slate-900 dark:text-white">NEXUS</span>
              <span className="text-[10px] block text-indigo-600 dark:text-indigo-400 font-mono tracking-widest uppercase font-bold">
                Plataforma de Vendas &amp; Automação
              </span>
            </div>
          </Link>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
              Gerencie suas conversas e faturamento em um só lugar.
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Acesse seu painel exclusivo para acompanhar atendimentos em tempo real, configurar agentes virtuais e visualizar relatórios de desempenho.
            </p>
          </div>

          {/* Floating Animated Card Preview */}
          <div className="p-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 rounded-3xl backdrop-blur-xl shadow-xl dark:shadow-2xl space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Atendimentos Concluídos Hoje</h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">+42 conversas finalizadas</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-[9px] font-mono font-extrabold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                AO VIVO
              </span>
            </div>

            <div className="space-y-2 border-t border-slate-200 dark:border-white/5 pt-3">
              {[
                { title: "Venda aprovada via WhatsApp", detail: "R$ 350,00 • Pix Confirmado", time: "há 2 min" },
                { title: "Agendamento de consulta", detail: "Amanhã às 14:30 • Confirmado", time: "há 5 min" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block text-[11px]">{item.title}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.detail}</span>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400 font-semibold pt-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Conexão Criptografada
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Servidores em Alta Velocidade
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Box */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white dark:bg-slate-900/90 p-8 sm:p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-2xl relative overflow-hidden text-slate-900 dark:text-white">
            {/* Header Mobile Brand */}
            <div className="lg:hidden mb-8 text-center space-y-3">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/30">
                  <div className="w-full h-full bg-white dark:bg-[#030712] rounded-[14px] flex items-center justify-center p-1.5">
                    <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain" />
                  </div>
                </div>
              </Link>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">NEXUS SAAS</h2>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Plataforma de Atendimento e Vendas
                </p>
              </div>
            </div>

            <div className="hidden lg:block mb-8 space-y-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Bem-vindo de volta!</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Informe suas credenciais para entrar no sistema.</p>
            </div>

            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>

            {/* Links e Rodapé */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
              <Link
                href="/painel-parceiro"
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-semibold transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Painel de Parceiros
              </Link>
              <Link href="/" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-semibold">
                Voltar ao Site
              </Link>
            </div>
          </div>

          {/* Footer info */}
          <p className="mt-6 text-center text-[11px] text-slate-500 font-semibold">
            Área restrita e segura para clientes e parceiros cadastrados.
          </p>
        </div>
      </div>
    </div>
  );
}
