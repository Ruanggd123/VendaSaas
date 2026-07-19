"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";

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
        throw new Error(data.error || "Erro ao fazer login");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleLogin}>
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 animate-slide-up">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-950/50 px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
              Senha
            </label>
            <Link href="/forgot-password" className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors font-medium">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              className="block w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-950/50 px-4 py-3.5 pr-12 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
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
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:from-indigo-500 hover:to-purple-500 hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              <>
                Acessar Painel
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white dark:bg-zinc-950 px-4 font-sans selection:bg-indigo-500/30">
      
      {/* Background Effects */}
      <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 blur-[120px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[150px]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-8 shadow-2xl shadow-slate-200 dark:shadow-none backdrop-blur-xl">
          
          {/* Header */}
          <div className="mb-10 text-center">
            <Link href="/" className="inline-flex items-center gap-3 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30 overflow-hidden">
                <img src="/nexus-logo.png" alt="Nexus" className="w-full h-full object-contain p-1" />
              </div>
            </Link>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Bem-vindo de volta
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
              Entre na sua conta para continuar.
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
              <Sparkles className="w-3.5 h-3.5" />
              Plataforma com IA integrada
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-zinc-500">
          Acesso restrito. Área exclusiva para assinantes.
        </p>
      </div>
    </div>
  );
}
