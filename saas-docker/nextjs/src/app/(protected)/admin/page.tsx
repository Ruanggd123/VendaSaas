"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Building2,
  Phone,
  Search,
  Plus,
  UserCheck,
  Calendar,
  Sparkles,
  Award,
  Layers,
  X,
  Lock,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Briefcase,
} from "lucide-react";

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  tenant?: { id: string; name: string } | null;
};

type PartnerItem = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  pix_key?: string;
  created_at: string;
  _count?: { leads: number; dev_services: number; withdrawals: number };
};

type TenantItem = {
  id: string;
  name: string;
  phone: string;
  plan: string;
  subscription_expires_at?: string;
  users?: UserItem[];
  partners?: PartnerItem[];
  whatsapp_instances?: Array<{
    id: string;
    connectionName: string;
    name: string;
    status: string;
  }>;
  _count?: { users: number; leads: number; whatsapp_instances: number; sales: number };
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [allPartners, setAllPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "partners" | "create">("tenants");
  const [selectedTenantModal, setSelectedTenantModal] = useState<TenantItem | null>(null);

  // Search filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");

  // Create form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("solo");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants");
      if (res.ok) {
        const data = await res.json();
        if (data.tenants) setTenants(data.tenants);
        if (data.allUsers) setAllUsers(data.allUsers);
        if (data.allPartners) setAllPartners(data.allPartners);
      }
    } catch (e) {
      console.error(e);
      setError("Erro ao carregar dados do Super Admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.replace(/\D/g, ""),
          password,
          plan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao criar cliente");

      setSuccess("Cliente e empresa cadastrados com sucesso!");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      fetchData();
      setActiveTab("tenants");
    } catch (err: any) {
      setError(err.message || "Falha ao criar cliente.");
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
      if (res.ok) fetchData();
    } catch (e) {}
  };

  const handleAddDays = async (id: string, days: number) => {
    if (!confirm(`Deseja adicionar ${days} dias na assinatura deste cliente?`)) return;
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addDays: days }),
      });
      if (res.ok) fetchData();
    } catch (e) {}
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Tem certeza que deseja suspender o acesso desta empresa?")) return;
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) {}
  };

  // Filtered lists
  const filteredTenants = tenants.filter((t) => {
    const term = tenantSearch.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.phone.includes(term);
  });

  const filteredUsers = allUsers.filter((u) => {
    const term = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.tenant?.name || "").toLowerCase().includes(term);
  });

  const filteredPartners = allPartners.filter((p) => {
    const term = partnerSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term);
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 text-slate-900 dark:text-white">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Painel Master Super Admin
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Gestão Global da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Gerencie todas as empresas contratantes, usuários das equipes, afiliados e conexões de WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setActiveTab("create")}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg shadow-indigo-600/25 active:scale-95 flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Cards de Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{tenants.length}</span>
            <span className="text-xs font-bold text-slate-500 block">Empresas (Tenants)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{allUsers.length}</span>
            <span className="text-xs font-bold text-slate-500 block">Usuários de Equipes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{allPartners.length}</span>
            <span className="text-xs font-bold text-slate-500 block">Afiliados &amp; Parceiros</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/90 p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {tenants.reduce((acc, t) => acc + (t.whatsapp_instances?.length || 0), 0)}
            </span>
            <span className="text-xs font-bold text-slate-500 block">Instâncias WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <button
          onClick={() => setActiveTab("tenants")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === "tenants"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          <span>Empresas &amp; Instâncias ({tenants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === "users"
              ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-md"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 text-purple-500" />
          <span>Todos os Usuários ({allUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("partners")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === "partners"
              ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>Afiliados &amp; Indicações ({allPartners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === "create"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md"
              : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>Cadastrar Empresa</span>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : activeTab === "tenants" ? (
        /* ── ABA 1: EMPRESAS & INSTÂNCIAS ── */
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
            <h3 className="text-base font-black text-slate-900 dark:text-white">Empresas Cadastradas</h3>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa ou número..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase font-mono font-bold">
                <tr>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Plano</th>
                  <th className="py-3 px-4">Dono / Admin</th>
                  <th className="py-3 px-4">Equipe &amp; Aparelhos</th>
                  <th className="py-3 px-4">Validade</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      <div>{t.name}</div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{t.phone}</span>
                    </td>
                    <td className="py-4 px-4">
                      <select
                        value={t.plan}
                        onChange={(e) => handleUpdatePlan(t.id, e.target.value)}
                        className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold rounded-xl px-2.5 py-1 text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                      >
                        <option value="solo">SOLO</option>
                        <option value="pro">PRO</option>
                        <option value="enterprise">ENTERPRISE</option>
                      </select>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {t.users?.[0]?.email || "Sem admin registrado"}
                    </td>
                    <td className="py-4 px-4 space-y-1">
                      <button
                        onClick={() => setSelectedTenantModal(t)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-bold border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" /> Ver Equipe ({t.users?.length || 0})
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        WhatsApp: {t.whatsapp_instances?.length || 0} aparelhos
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold">
                      {t.subscription_expires_at ? (
                        <span className={new Date(t.subscription_expires_at) < new Date() ? "text-rose-500" : "text-emerald-600"}>
                          {new Date(t.subscription_expires_at).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        "Ilimitado"
                      )}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleAddDays(t.id, 30)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-xl font-bold"
                      >
                        +30 Dias
                      </button>
                      <button
                        onClick={() => handleSuspend(t.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl font-bold"
                      >
                        Suspender
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "users" ? (
        /* ── ABA 2: TODOS OS USUÁRIOS & EQUIPES ── */
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Usuários &amp; Integrantes de Equipe</h3>
              <p className="text-xs text-slate-500 font-medium">Listagem unificada de todos os membros cadastrados na plataforma</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou empresa..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase font-mono font-bold">
                <tr>
                  <th className="py-3 px-4">Nome do Usuário</th>
                  <th className="py-3 px-4">E-mail de Acesso</th>
                  <th className="py-3 px-4">Empresa / Cliente</th>
                  <th className="py-3 px-4">Função (Role)</th>
                  <th className="py-3 px-4 text-right">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{u.name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      {u.tenant?.name || "Global / Plataforma"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase border ${
                        u.role === "superadmin"
                          ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300"
                          : u.role === "admin"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-300"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-400 text-right">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "partners" ? (
        /* ── ABA 3: AFILIADOS & INDICAÇÕES ── */
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Afiliados &amp; Desenvolvedores Parceiros</h3>
              <p className="text-xs text-slate-500 font-medium">Relatório de parceiros registrados e volume de indicações</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar parceiro..."
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase font-mono font-bold">
                <tr>
                  <th className="py-3 px-4">Nome do Parceiro</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Chave PIX</th>
                  <th className="py-3 px-4">Leads Indicados</th>
                  <th className="py-3 px-4 text-right">Data de Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{p.name}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">{p.email}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{p.pix_key || "Não cadastrada"}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400 font-mono">
                      {p._count?.leads || 0} indicações
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-400 text-right">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── ABA 4: CADASTRAR NOVA EMPRESA ── */
        <div className="bg-white dark:bg-slate-900/90 rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 shadow-xl max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Cadastrar Novo Cliente</h3>
              <p className="text-xs text-slate-500 font-medium">Gere acesso e empresa para um novo contratante</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold">{error}</div>}
            {success && <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl text-xs font-bold">{success}</div>}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa / Marca</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                placeholder="Ex: Barbearia Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">E-mail do Administrador</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                placeholder="admin@empresa.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
              <input
                required
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                placeholder="5588981885499"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Senha Inicial de Acesso</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Plano Contratado</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="solo">Plano Solo (1 Aparelho)</option>
                <option value="pro">Plano Pro (3 Aparelhos)</option>
                <option value="enterprise">Plano Enterprise (Ilimitado)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              {isCreating ? "Cadastrando..." : "Cadastrar Cliente e Liberar Acesso"}
            </button>
          </form>
        </div>
      )}

      {/* ── MODAL: VER EQUIPE DO CLIENTE SELECIONADO ── */}
      {selectedTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-7 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-white space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Equipe de {selectedTenantModal.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Membros e agentes com acesso a esta empresa</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(selectedTenantModal.users || []).length === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-4 text-center">Nenhum membro cadastrado nesta empresa.</p>
              ) : (
                (selectedTenantModal.users || []).map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-white/5 text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-black text-slate-900 dark:text-white block">{u.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{u.email}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[9px] font-mono font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                      {u.role}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedTenantModal(null)}
                className="w-full py-3 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
