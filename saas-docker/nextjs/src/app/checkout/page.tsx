"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Sparkles, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const title = searchParams.get("title") || "Seu Plano";
  const setup = parseFloat(searchParams.get("setup") || "0");
  const monthly = parseFloat(searchParams.get("monthly") || "0");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    colors: "",
    references: "",
    objective: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const briefingJSON = JSON.stringify({
        cores: formData.colors,
        referencias: formData.references,
        objetivo: formData.objective,
        plano_escolhido: title,
        setup: setup,
        mensal: monthly
      });

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: formData.name,
          client_phone: formData.phone,
          title: `Projeto: ${title}`,
          description: `Novo cliente aguardando desenvolvimento/setup.\nMensalidade: R$ ${monthly}\nSetup: R$ ${setup}`,
          price: setup,
          briefing: briefingJSON,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProjectId(data.id);
        setSuccess(true);
      } else {
        alert("Erro ao criar projeto. Tente novamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro interno.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#030712] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-[100px] rounded-full" />
        <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md text-center relative z-10 shadow-2xl">
          <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Pedido Recebido!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Nossa equipe foi notificada e já tem acesso ao seu briefing. Em breve entraremos em contato via WhatsApp para alinhar os últimos detalhes.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/tracking/${projectId}`)}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold text-sm shadow-lg transition-all"
            >
              Acompanhar Projeto
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-slate-300 transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Summary */}
        <div className="lg:col-span-5 space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Finalizar Pedido</h1>
            <p className="text-sm text-slate-400">Preencha o briefing para acelerarmos a entrega.</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-4">Resumo do Plano</h3>
            <div className="flex items-center gap-3 mb-6 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">{title}</p>
                <p className="text-[10px] text-green-400 font-bold uppercase mt-0.5">Ativação Prioritária</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Setup (Único)</span>
                <span className="font-bold text-white">R$ {setup.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Mensalidade</span>
                <span className="font-bold text-white">R$ {monthly.toLocaleString('pt-BR')}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">Total Hoje</span>
                <span className="text-2xl font-black text-white">R$ {setup.toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Briefing Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 backdrop-blur-md">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> Briefing do Projeto
            </h3>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Seu Nome</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="Como devemos chamá-lo?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">WhatsApp</label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="(00) 90000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Cores da sua Marca</label>
                <input
                  required
                  type="text"
                  value={formData.colors}
                  onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                  className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Ex: Azul escuro e Dourado"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Sites de Referência (Opcional)</label>
                <input
                  type="text"
                  value={formData.references}
                  onChange={(e) => setFormData({ ...formData, references: e.target.value })}
                  className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="Tem algum site que você acha bonito?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Qual o objetivo principal?</label>
                <textarea
                  required
                  rows={3}
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  className="w-full bg-[#0a0f1a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Ex: Quero vender consultas médicas, Quero uma loja de roupas feminina..."
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="mt-8 w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 rounded-xl font-bold text-sm text-white shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Confirmar Pedido"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-4">
              Seus dados estão seguros. Nossa equipe fará contato em breve.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712] flex items-center justify-center text-white">Carregando...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
