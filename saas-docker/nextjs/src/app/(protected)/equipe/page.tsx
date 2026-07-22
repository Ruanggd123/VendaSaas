"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Mail, ShieldAlert } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!newName || !newEmail || !newPassword) {
      setError("Preencha todos os campos.");
      return;
    }

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Erro ao adicionar funcionário.");
        return;
      }

      setTeam([data.user, ...team]);
      setIsAdding(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
    } catch (e) {
      setError("Erro de conexão.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este funcionário? Ele perderá o acesso à plataforma.")) return;

    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTeam(team.filter(t => t.id !== id));
      } else {
        alert("Erro ao remover funcionário.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Equipe e Funcionários
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Gerencie os atendentes que têm acesso à plataforma. Eles só enxergam Conversas, Vendas e Agenda.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          {isAdding ? "Cancelar" : "Novo Funcionário"}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-8 shadow-sm animate-fade-in">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Adicionar Atendente</h2>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-3 py-2 rounded-lg mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Nome Completo</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">E-mail (Login)</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                placeholder="joao@empresa.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Senha Provisória</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                placeholder="******"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/20">
                Salvar Funcionário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-10 flex justify-center text-indigo-500">
             <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
             </svg>
          </div>
        ) : team.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-slate-600 dark:text-zinc-300 font-medium">Nenhum funcionário cadastrado</p>
            <p className="text-sm text-slate-500 dark:text-zinc-500 mt-1">Crie contas para sua equipe acessar o painel de atendimento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-950/50 text-slate-500 dark:text-zinc-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Nome</th>
                  <th className="px-6 py-4">E-mail (Login)</th>
                  <th className="px-6 py-4">Data de Criação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {team.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                        title="Remover Funcionário"
                      >
                        <Trash2 className="w-4 h-4" />
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
  );
}
