"use client";

import { useState, useEffect } from "react";
import { Rocket, Search, MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

type Project = {
  id: string;
  client_name: string;
  client_phone: string;
  title: string;
  description: string;
  briefing: string | null;
  price: number;
  status: string;
  created_at: string;
  partner_id: string | null;
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects?type=all")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openWhatsApp = (phone: string, title: string) => {
    // Strip non-numeric characters from phone
    const cleanPhone = phone.replace(/\D/g, '');
    const text = encodeURIComponent(`Olá! Sou da Nexus e estou entrando em contato sobre o seu pedido do ${title}. Vamos dar início ao projeto!`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Aguardando Dev</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Em Desenvolvimento</span>;
      case "REVIEW":
        return <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-500 rounded text-xs font-bold flex items-center gap-1"><Search className="w-3 h-3"/> Em Análise</span>;
      case "COMPLETED":
        return <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Concluído</span>;
      default:
        return <span className="px-2 py-1 bg-slate-500/10 text-slate-500 rounded text-xs">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Rocket className="w-6 h-6 text-indigo-500" /> Gestão de Projetos
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Gerencie os sites e robôs comprados pelos clientes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando projetos...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0a0f1a] rounded-2xl border border-slate-200 dark:border-white/10">
          <Rocket className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum projeto encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400">Quando um cliente comprar um site ou robô, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            let briefingObj = null;
            if (p.briefing) {
              try {
                briefingObj = JSON.parse(p.briefing);
              } catch (e) {
                // Not JSON
              }
            }

            return (
              <div key={p.id} className="bg-white dark:bg-[#0a0f1a] border border-slate-200 dark:border-white/10 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{p.client_name || "Cliente sem nome"}</h3>
                    <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl text-sm border border-slate-100 dark:border-white/5">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Item Contratado</span>
                    <strong className="text-slate-700 dark:text-slate-200">{p.title}</strong>
                    <div className="text-xs text-indigo-500 mt-1 font-bold">R$ {p.price.toLocaleString('pt-BR')} (Setup)</div>
                  </div>

                  {briefingObj && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10">
                      <span className="block text-[10px] font-bold uppercase text-indigo-400 mb-2">Briefing do Cliente</span>
                      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <p><strong>Cores:</strong> {briefingObj.cores}</p>
                        <p><strong>Referências:</strong> {briefingObj.referencias || "Nenhuma"}</p>
                        <p><strong>Objetivo:</strong> {briefingObj.objetivo}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openWhatsApp(p.client_phone, p.title)}
                    className="flex-1 py-2.5 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" /> Chamar WhatsApp
                  </button>
                  <Link
                    href={`/tracking/${p.id}`}
                    target="_blank"
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center text-center"
                  >
                    Ver Tracking
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
