"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Sparkles, Lock, Mail, ShieldCheck, Zap, Rocket } from "lucide-react";

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
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-400 animate-slide-up">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Input de E-mail */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
            E-mail de Acesso
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-xl border border-white/10 bg-zinc-950/80 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Input de Senha */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Senha
            </label>
            <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="block w-full rounded-xl border border-white/10 bg-zinc-950/80 pl-10 pr-11 py-3 text-sm text-white placeholder-zinc-600 transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
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
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Autenticando Acesso...
              </>
            ) : (
              <>
                Entrar na Plataforma
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 font-sans selection:bg-indigo-500/30">
      
      {/* Glow Effects */}
      <div className="fixed -top-40 -right-40 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[180px] pointer-events-none animate-pulse" />
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[180px] pointer-events-none animate-pulse" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card Glassmorphic */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-2xl">
          
          {/* Header */}
          <div className="mb-8 text-center space-y-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/30 p-[1px]">
                <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
                  <Rocket className="w-7 h-7 text-indigo-400" />
                </div>
              </div>
            </Link>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Nexus SaaS
              </h2>
              <p className="mt-1 text-xs text-zinc-400">
                Plataforma de Atendimento e Vendas com Inteligência Artificial
              </p>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          {/* Links e Rodapé */}
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <Link href="/painel-parceiro" className="hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Painel do Afiliado
            </Link>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Seguro
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <p className="mt-6 text-center text-[11px] text-zinc-500 font-medium">
          Área exclusiva para clientes e parceiros cadastrados.
        </p>
      </div>
    </div>
  );
}
