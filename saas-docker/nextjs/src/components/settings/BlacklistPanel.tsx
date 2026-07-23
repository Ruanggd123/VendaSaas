"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, X, Plus, UserX, Phone, User, RefreshCw } from "lucide-react";

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

  const identifiedCount = items.filter((i) => i.name).length;

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 rounded-3xl w-full p-6 sm:p-8 space-y-6 shadow-xl dark:shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Lista Negra &amp; Bloqueios</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Contatos bloqueados não acionam a IA automaticamente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 rounded-2xl px-4 py-3 text-center shadow-sm">
            <span className="block text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{items.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bloqueados</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 rounded-2xl px-4 py-3 text-center shadow-sm">
            <span className="block text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{identifiedCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identificados</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 rounded-2xl px-4 py-3 text-center shadow-sm">
            <span className="block text-xl font-black text-slate-700 dark:text-slate-300 font-mono">{items.length - identifiedCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sem Nome</span>
          </div>
        </div>

        {/* Form to add number */}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="Ex: 5511999999999"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-rose-500/20 transition-all font-medium"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl px-5 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-rose-600/20"
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
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nome do contato (opcional)"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
        </form>

        {/* List */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-center p-6 space-y-2 bg-slate-50/50 dark:bg-slate-950/30">
              <UserX className="w-10 h-10 text-slate-400 opacity-60" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nenhum contato bloqueado</span>
              <span className="text-[11px] text-slate-400 font-medium">Adicione números acima para impedir respostas da IA</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.number}
                className="group flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 hover:border-rose-300 dark:hover:border-rose-500/20 rounded-2xl p-3.5 transition-all shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0 font-black text-xs">
                  {item.name ? item.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  {item.name && (
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      {item.name}
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-mono font-bold border border-emerald-200 dark:border-emerald-500/20">
                        identificado
                      </span>
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 truncate">
                      {item.number}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.number)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                  title="Remover da lista negra"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4">
          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                await fetch("/api/settings/blacklist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ number: "5588981885499", name: "Ruan Gomes (Gerente / Suporte)" }),
                });
                await fetch("/api/settings/blacklist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ number: "5511999999999", name: "Contato de Teste Bloqueado" }),
                });
                await fetchBlacklist();
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            }}
            className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Restaurar Contatos de Exemplo
          </button>
          <button
            type="button"
            onClick={fetchBlacklist}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
            title="Atualizar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
