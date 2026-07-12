"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("solo");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, plan }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setSuccess("Cliente cadastrado com sucesso!");
      setName(""); setEmail(""); setPhone(""); setPassword("");
      fetchTenants(); // Atualiza a lista
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdatePlan = async (id: string, newPlan: string) => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) fetchTenants();
      else alert("Erro ao atualizar plano");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDays = async (id: string, days: number) => {
    if (!confirm(`Deseja adicionar ${days} dias na assinatura deste cliente?`)) return;
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addDays: days }),
      });
      if (res.ok) fetchTenants();
      else alert("Erro ao adicionar dias");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Tem certeza que deseja suspender o acesso desta empresa imediatamente?")) return;
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      if (res.ok) fetchTenants();
      else alert("Erro ao suspender cliente");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] p-8 text-slate-900 dark:text-white -m-8">
      <div className="mx-auto max-w-7xl">
          <header className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Super Admin</h1>
              <p className="text-zinc-400">Gerenciamento de Clientes e Assinaturas</p>
            </div>
          </header>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Formulário de Cadastro Seguro */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-6 shadow-xl backdrop-blur-md lg:col-span-1 h-fit">
            <h2 className="mb-6 text-xl font-semibold">Novo Cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <div className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
              {success && <div className="rounded border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">{success}</div>}
              
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Nome da Empresa</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">E-mail do Admin</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Telefone / WhatsApp</label>
                <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Senha Inicial Segura</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Plano Contratado</label>
                <select value={plan} onChange={e => setPlan(e.target.value)} className="w-full rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none">
                  <option value="solo">Plano Solo (1 Instância)</option>
                  <option value="pro">Plano Pro (3 Instâncias)</option>
                  <option value="enterprise">Plano Enterprise (Ilimitado)</option>
                </select>
              </div>

              <button disabled={isCreating} className="w-full rounded-lg bg-indigo-600 p-3 text-sm font-medium hover:bg-indigo-500 transition-colors">
                {isCreating ? "Criando e Criptografando..." : "Gerar Acesso"}
              </button>

              {/* Super Admin Controls */}
              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
                  >
                    {showApiKey ? 'Esconder' : 'Mostrar'} Chave API
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAIAssistant(!showAIAssistant)}
                    className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors"
                  >
                    {showAIAssistant ? 'Esconder' : 'Mostrar'} Assistente IA
                  </button>
                </div>

                {showApiKey && (
                  <div className="mt-2 p-2 bg-zinc-800 rounded text-xs break-all">
                    <div className="text-zinc-500 mb-1">Chave API (Super Admin)</div>
                    {process.env.SUPERADMIN_API_KEY}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* AI Flow Assistant Panel */}
          {showAIAssistant && (
            <div className="absolute top-0 right-0 w-96 h-full bg-zinc-900 border-l border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Assistente de Fluxo IA</h3>
              {/* Add your AI assistant UI here */}
            </div>
          )}

          {/* Lista de Clientes */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-6 shadow-xl backdrop-blur-md lg:col-span-2">
            <h2 className="mb-6 text-xl font-semibold">Clientes Ativos</h2>
            {loading ? (
              <div className="animate-pulse text-zinc-500">Carregando carteira de clientes...</div>
            ) : tenants.length === 0 ? (
              <div className="text-zinc-500">Nenhum cliente cadastrado ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="py-3 pr-4">Empresa</th>
                      <th className="py-3 px-4">Plano</th>
                      <th className="py-3 px-4">Admin Principal</th>
                      <th className="py-3 px-4">Validade</th>
                      <th className="py-3 pl-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(tenant => (
                      <tr key={tenant.id} className="border-b border-slate-200 dark:border-zinc-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors align-top">
                        <td className="py-4 pr-4">
                          <div className="font-medium text-white">{tenant.name}</div>
                          <div className="text-xs text-zinc-500 mt-1">{tenant.phone}</div>
                        </td>
                        <td className="py-4 px-4">
                          <select 
                            className={`rounded-lg px-2 py-1 text-[10px] uppercase tracking-wider focus:outline-none appearance-none cursor-pointer ${tenant.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : tenant.plan === 'pro' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'}`}
                            value={tenant.plan}
                            onChange={(e) => handleUpdatePlan(tenant.id, e.target.value)}
                          >
                            <option className="bg-zinc-900 text-white" value="solo">SOLO</option>
                            <option className="bg-zinc-900 text-white" value="pro">PRO</option>
                            <option className="bg-zinc-900 text-white" value="enterprise">ENTERPRISE</option>
                          </select>
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {tenant.users[0]?.email}
                        </td>
                        <td className="py-4 px-4">
                          <div className={`text-xs mb-2 ${new Date(tenant.subscription_expires_at) < new Date() ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                            Validade: {new Date(tenant.subscription_expires_at).toLocaleDateString('pt-BR')}
                          </div>
                          
                          {/* Listagem de Instâncias (Celulares virtuais do cliente) */}
                          <div className="mt-2 space-y-2">
                            <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">
                              Aparelhos WhatsApp ({tenant.whatsapp_instances?.length || 0})
                            </div>
                            {tenant.whatsapp_instances?.length === 0 ? (
                              <div className="text-xs text-zinc-600 italic">Nenhum aparelho conectado</div>
                            ) : (
                              tenant.whatsapp_instances?.map((inst: any) => (
                                <div key={inst.id} className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/80 p-2 rounded border border-slate-200 dark:border-zinc-800">
                                  <div>
                                    <div className="text-xs font-medium text-zinc-200">{inst.connectionName}</div>
                                    <div className="text-[10px] text-zinc-500">{inst.name}</div>
                                  </div>
                                  <div>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      inst.status === 'open' || inst.status === 'connected' 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                      {inst.status}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-4 pl-4 space-y-2">
                          <button 
                            onClick={() => handleAddDays(tenant.id, 30)}
                            className="block w-full text-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            +30 Dias
                          </button>
                          <button 
                            onClick={() => handleSuspend(tenant.id)}
                            className="block w-full text-center rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            Suspender
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
