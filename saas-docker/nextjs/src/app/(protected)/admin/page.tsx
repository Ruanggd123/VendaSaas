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
  const [blacklistNumber, setBlacklistNumber] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [messageLogs, setMessageLogs] = useState<any[]>([]);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);

  // Verifica cooldown periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (cooldownEnd && new Date() > cooldownEnd) {
        setCooldownActive(false);
        setCooldownEnd(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const fetchMessageLogs = async () => {
    try {
      const res = await fetch("/api/admin/message-logs");
      if (res.ok) {
        const data = await res.json();
        setMessageLogs(data);
      }
    } catch (e) {
      console.error("Erro ao buscar logs:", e);
    }
  };

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
    const initialize = async () => {
      try {
        await Promise.all([
          fetchTenants(),
          fetchMessageLogs()
        ]);
        handleUserActivity();

        // Verificar e adicionar número problemático se necessário
        const problemNumber = "558881681751";
        try {
          const checkRes = await fetch(`/api/admin/blacklist/check?number=${problemNumber}`);
          if (!checkRes.ok) throw new Error('Failed to check blacklist');
          
          const { isBlocked } = await checkRes.json();
          if (isBlocked) {
            setSuccess(`Número ${problemNumber} já está na lista negra`);
            return;
          }
          
          const blockRes = await fetch("/api/admin/blacklist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ number: problemNumber }),
          });

          if (!blockRes.ok) throw new Error('Failed to block number');
          setSuccess(`Número ${problemNumber} foi adicionado à lista negra`);
        } catch (err) {
          console.error("Erro na lista negra:", err);
          // Não mostra erro ao usuário para não poluir a UI
        }
      } catch (error) {
        console.error("Erro na inicialização:", error);
        setError("Falha ao carregar dados iniciais");
      } finally {
        setLoading(false);
      }
    };

    initialize();
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

  const [lastUserActivity, setLastUserActivity] = useState<Date | null>(null);

  // Verifica atividade do usuário a cada minuto
  useEffect(() => {
    const activityCheck = setInterval(() => {
      if (lastUserActivity && new Date().getTime() - lastUserActivity.getTime() > 5 * 60 * 1000) {
        setError('Sistema inativo - mensagens automáticas desativadas');
      }
    }, 60000);
    return () => clearInterval(activityCheck);
  }, [lastUserActivity]);

  const handleUserActivity = () => {
    setLastUserActivity(new Date());
  };

  const activateCooldown = (minutes: number) => {
    setCooldownActive(true);
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + minutes);
    setCooldownEnd(endTime);
  };

  const handleBlockNumber = async () => {
    handleUserActivity();
    
    if (cooldownActive) {
      setError('Sistema em cooldown - operação não permitida');
      return;
    }
    if (!blacklistNumber) return;
    
    const formattedNumber = blacklistNumber.replace(/\D/g, '');
    
    if (!/^55\d{10,11}$/.test(formattedNumber)) {
      setError("Número inválido. Deve conter DDI 55 + DDD + número (ex: 558881681751)");
      return;
    }

    if (!confirm(`Bloquear o número ${formattedNumber}? Isso impedirá qualquer comunicação.`)) {
      return;
    }

    setIsBlocking(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: formattedNumber }),
      });
      if (!res.ok) throw new Error("Falha ao bloquear número");
      setSuccess(`Número ${blacklistNumber} adicionado à lista negra`);
      setBlacklistNumber("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsBlocking(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#09090b] dark:to-[#111113] p-8 text-slate-900 dark:text-white -m-8">
      <div className="mx-auto max-w-7xl">
          <header className="mb-12 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500">
                Super Admin
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                Painel de controle para gerenciamento de clientes e assinaturas
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                SA
              </div>
            </div>
          </header>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Formulário de Cadastro Seguro */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-6 shadow-lg hover:shadow-xl transition-shadow backdrop-blur-md lg:col-span-1 h-fit">
            <div className="flex items-center mb-6">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 mr-3">
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Novo Cliente</h2>
            </div>
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
              <div 
                className="pt-4 mt-4 border-t border-slate-200 dark:border-zinc-800 space-y-4"
                onClick={handleUserActivity}
                onKeyDown={handleUserActivity}
              >
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Monitor de Mensagens</h3>
                    {cooldownActive && (
                      <span className="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded">
                        COOLDOWN ATIVO ({Math.ceil(((cooldownEnd?.getTime() || 0) - Date.now()) / 60000)}min)
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-2 max-h-40 overflow-y-auto">
                    {messageLogs.slice(0, 5).map((log, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{log.number}</span>
                        <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))}
                    {messageLogs.length > 5 && (
                      <button 
                        onClick={fetchMessageLogs}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Ver todos ({messageLogs.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => activateCooldown(30)}
                    disabled={cooldownActive}
                    className={`rounded-lg p-2 text-sm font-medium transition-colors ${
                      cooldownActive 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {cooldownActive ? 'Cooldown Ativo' : 'Ativar Cooldown (30min)'}
                  </button>
                  <label className="mb-1 block text-xs text-zinc-400">Adicionar à Lista Negra</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={blacklistNumber}
                      onChange={(e) => setBlacklistNumber(e.target.value)}
                      placeholder="Número com DDD (ex: 558881681751)"
                      className="flex-1 rounded-lg border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 p-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={handleBlockNumber}
                      disabled={isBlocking || !blacklistNumber}
                      className="rounded-lg bg-red-600 hover:bg-red-500 px-4 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isBlocking ? "Bloqueando..." : "Bloquear"}
                    </button>
                  </div>
                </div>
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
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">Chave API (Super Admin)</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(process.env.SUPERADMIN_API_KEY || '')}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Copiar
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        readOnly
                        value={process.env.SUPERADMIN_API_KEY || ''}
                        className="w-full p-2 bg-zinc-800 rounded text-xs break-all font-mono"
                      />
                      <button
                        onClick={() => {
                          const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                          input.type = input.type === 'password' ? 'text' : 'password';
                        }}
                        className="absolute right-2 top-2 text-xs text-zinc-400 hover:text-white"
                      >
                        👁️
                      </button>
                    </div>
                    <div className="mt-1 text-[10px] text-red-400">
                      Atenção: Esta chave fornece acesso total ao sistema
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* AI Flow Assistant Panel */}
          {showAIAssistant && (
            <div className="absolute top-0 right-0 w-96 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Assistente de Fluxo IA</h3>
                <button 
                  onClick={() => setShowAIAssistant(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Configurações Rápidas</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Nível de Acesso</label>
                      <select className="w-full bg-zinc-700 rounded p-2 text-sm">
                        <option>Básico (somente leitura)</option>
                        <option>Intermediário (ações limitadas)</option>
                        <option>Super Admin (acesso total)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Modo de Operação</label>
                      <select className="w-full bg-zinc-700 rounded p-2 text-sm">
                        <option>Automatizado</option>
                        <option>Assistido</option>
                        <option>Manual</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Histórico de Ações</h4>
                  <div className="text-xs text-zinc-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Atualização de plano</span>
                      <span className="text-zinc-500">12/07 14:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Criação de cliente</span>
                      <span className="text-zinc-500">12/07 10:15</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-zinc-800">
                <button className="w-full bg-indigo-600 hover:bg-indigo-500 rounded p-2 text-sm">
                  Salvar Configurações
                </button>
              </div>
            </div>
          )}

          {/* Lista de Clientes */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-6 shadow-lg hover:shadow-xl transition-shadow backdrop-blur-md lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 mr-3">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Clientes Ativos</h2>
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Total: {tenants.length} {tenants.length === 1 ? 'cliente' : 'clientes'}
              </div>
            </div>
            {loading ? (
              <div className="animate-pulse text-zinc-500">Carregando carteira de clientes...</div>
            ) : tenants.length === 0 ? (
              <div className="text-zinc-500">Nenhum cliente cadastrado ainda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800/50">
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
                          {tenant.users?.[0]?.email || 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <div className={`text-xs mb-2 ${tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) < new Date() ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                            Validade: {tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at).toLocaleDateString('pt-BR') : 'N/A'}
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
