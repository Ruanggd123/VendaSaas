"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Trash2, X, Plus, UserX, Phone, User } from "lucide-react";

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
        body: JSON.stringify({ number: newNumber }),
      });
      if (res.ok) {
        setNewNumber("");
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

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-white/5 rounded-2xl w-full p-6 space-y-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Lista de Ignorados</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Contatos na blacklist não acionam a IA.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form to add number */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="flex-1 relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              required
              placeholder="5511999999999"
              className="w-full bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl px-4 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-500/20"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-white/[0.02] rounded-xl px-3 py-2 border border-slate-200 dark:border-white/5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>{items.length} contato{items.length !== 1 ? "s" : ""} bloqueado{items.length !== 1 ? "s" : ""}</span>
            {items.some((i) => i.name) && (
              <>
                <span className="text-slate-300 dark:text-zinc-600">·</span>
                <span>{items.filter((i) => i.name).length} com nome identificado</span>
              </>
            )}
          </div>
        )}

        {/* List */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <svg className="animate-spin h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="h-36 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-center p-4">
              <UserX className="w-8 h-8 text-slate-300 dark:text-zinc-600 mb-2" />
              <span className="text-sm font-medium text-slate-400 dark:text-zinc-500">Nenhum contato bloqueado</span>
              <span className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Adicione números acima para ignorar</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.number}
                className="group flex items-center gap-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:border-red-500/20 rounded-xl p-3 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  {item.name && (
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                    <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 truncate">
                      {item.number}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.number)}
                  className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Remover da blacklist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/[0.06] pt-4">
          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
            A IA ignora automaticamente esses contatos
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
