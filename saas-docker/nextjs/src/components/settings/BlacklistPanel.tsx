"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, X, Plus, UserX, Phone, User, Search, RefreshCw } from "lucide-react";

interface BlacklistItem {
  number: string;
  name: string | null;
}

interface BlacklistPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlacklistPanel({ isOpen, onClose }: BlacklistPanelProps) {
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchBlacklist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/blacklist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.numbers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBlacklist();
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNumber.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: newNumber, name: newName }),
      });
      if (res.ok) {
        setNewNumber("");
        setNewName("");
        await fetchBlacklist();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (num: string) => {
    try {
      const res = await fetch(`/api/settings/blacklist?number=${encodeURIComponent(num)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchBlacklist();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const identifiedCount = items.filter(i => i.name).length;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-red-500/10 rounded-2xl w-full p-6 space-y-6 shadow-xl shadow-red-500/5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Lista Negra</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Contatos bloqueados não acionam a IA automaticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-center">
            <span className="block text-lg font-bold text-red-400">{items.length}</span>
            <span className="text-[10px] text-zinc-500">Bloqueados</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-center">
            <span className="block text-lg font-bold text-emerald-400">{identifiedCount}</span>
            <span className="text-[10px] text-zinc-500">Identificados</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-center">
            <span className="block text-lg font-bold text-zinc-400">{items.length - identifiedCount}</span>
            <span className="text-[10px] text-zinc-500">Sem nome</span>
          </div>
        </div>

        {/* Form to add number */}
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                required
                placeholder="5511999999999"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:opacity-50 text-white font-bold rounded-xl px-5 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/20"
            >
              {submitting ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Nome do contato (opcional)"
              className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500/50 transition-all"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        </form>

        {/* List */}
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl text-center p-4">
              <UserX className="w-10 h-10 text-zinc-700 mb-3" />
              <span className="text-sm font-medium text-zinc-500">Nenhum contato bloqueado</span>
              <span className="text-xs text-zinc-600 mt-0.5">Adicione números acima para ignorar</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.number}
                className="group flex items-center gap-3 bg-white/[0.02] border border-white/5 hover:border-red-500/20 rounded-xl p-3 transition-all hover:bg-red-500/[0.02]"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/10 flex items-center justify-center text-red-500 shrink-0 shadow-lg shadow-red-500/5">
                  {item.name ? (
                    <span className="text-xs font-bold text-red-400">{item.name.charAt(0).toUpperCase()}</span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {item.name && (
                    <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                      {item.name}
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium border border-emerald-500/20">identificado</span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className="text-xs font-mono text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">
                      {item.number}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.number)}
                  className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Remover da lista negra"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                await fetch("/api/settings/blacklist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ number: "5588981885499", name: "Ruan Gomes (Gerente / Suporte)" })
                });
                await fetch("/api/settings/blacklist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ number: "5511999999999", name: "Contato de Teste Bloqueado" })
                });
                await fetchBlacklist();
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Restaurar Contatos de Exemplo
          </button>
          <button
            onClick={fetchBlacklist}
            className="p-2 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Atualizar lista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
