"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "senha" | "done" | "sent">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.sentViaEmail || data.sentViaWhatsApp) {
          setToken(data.token || "");
          setStep("senha");
        } else {
          setStep("sent");
          setStatus("success");
          setMessage("Se o email estiver cadastrado, você receberá um código de recuperação no email ou WhatsApp da empresa.");
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Erro ao solicitar código");
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão");
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("As senhas não conferem");
      return;
    }
    if (newPassword.length < 6) {
      setStatus("error");
      setMessage("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Senha alterada com sucesso! Redirecionando...");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Erro ao alterar senha");
      }
    } catch {
      setStatus("error");
      setMessage("Erro de conexão");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 font-sans selection:bg-indigo-500/30">
      <div className="absolute -top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[150px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/50 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
          
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">Recuperar Senha</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {step === "email" && "Informe seu email cadastrado."}
              {step === "sent" && "Verifique seu email ou WhatsApp."}
              {step === "senha" && "Digite o código recebido e crie uma nova senha."}
              {step === "done" && "Senha alterada com sucesso!"}
            </p>
          </div>

          {step === "email" && (
            <form onSubmit={requestCode} className="space-y-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Email Cadastrado</label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {status === "error" && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{message}</div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {status === "loading" ? "Verificando..." : "Continuar"}
              </button>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300">Voltar para o Login</Link>
              </div>
            </form>
          )}

          {step === "sent" && (
            <div className="space-y-6">
              <div className="rounded-lg bg-indigo-500/10 p-4 text-sm text-indigo-300 border border-indigo-500/20 text-center">
                {message}
              </div>
              <button
                onClick={() => { setStep("email"); setStatus("idle"); setMessage(""); }}
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-all"
              >
                Tentar novamente
              </button>
              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300">Voltar para o Login</Link>
              </div>
            </div>
          )}

          {step === "senha" && (
            <form onSubmit={resetPassword} className="space-y-6">
              <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-300 border border-emerald-500/20 text-center">
                📧 Código enviado para {email}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Código de 6 dígitos</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-white text-center text-2xl tracking-[0.5em] focus:border-indigo-500 focus:outline-none"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Nova Senha</label>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {status === "error" && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{message}</div>
              )}
              {status === "success" && (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400 border border-emerald-500/20">{message}</div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-all disabled:opacity-50"
              >
                {status === "loading" ? "Alterando..." : "Redefinir Senha"}
              </button>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setStatus("idle"); setMessage(""); }}
                  className="text-sm text-zinc-400 hover:text-zinc-300"
                >
                  Voltar
                </button>
                <Link href="/login" className="text-sm text-indigo-400 hover:text-indigo-300">Fazer Login</Link>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-zinc-300 text-sm">Sua senha foi alterada com sucesso!</p>
              <Link href="/login" className="inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-all">
                Ir para o Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
