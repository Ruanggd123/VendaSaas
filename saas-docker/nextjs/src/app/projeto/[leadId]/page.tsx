'use client';

import { useEffect, useState } from 'react';

const STATUS_MAP: Record<string, { label: string; desc: string; icon: string; color: string }> = {
  pedido: { label: 'Pedido Recebido', desc: 'Seu pedido foi recebido com sucesso!', icon: '📋', color: 'from-zinc-500 to-zinc-600' },
  pendente: { label: 'Aguardando Início', desc: 'Seu projeto está na fila. Em breve entraremos em contato.', icon: '⏳', color: 'from-zinc-400 to-zinc-500' },
  em_contato: { label: 'Contato Realizado', desc: 'Já falamos com você para entender os detalhes.', icon: '📞', color: 'from-blue-500 to-blue-600' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', desc: 'Seu projeto está sendo criado!', icon: '⚙️', color: 'from-amber-500 to-orange-500' },
  homologacao: { label: 'Em Homologação', desc: 'Estamos revisando e ajustando os últimos detalhes.', icon: '🔍', color: 'from-purple-500 to-violet-500' },
  entregue: { label: 'Entregue 🎉', desc: 'Seu projeto foi concluído! Aproveite!', icon: '✅', color: 'from-emerald-500 to-green-500' },
  cancelado: { label: 'Cancelado', desc: 'Este projeto foi cancelado.', icon: '❌', color: 'from-red-500 to-red-600' },
};

const FLOW = ['pedido', 'pendente', 'em_contato', 'em_desenvolvimento', 'homologacao', 'entregue'];

export default function ProjectStatusPage({ params }: { params: { leadId: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/projeto/${params.leadId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Erro ao carregar'));
  }, [params.leadId]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <h1 className="text-xl font-bold text-white">Projeto não encontrado</h1>
          <p className="text-sm text-zinc-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-600 text-sm">Carregando...</div>
      </div>
    );
  }

  const currentIdx = FLOW.indexOf(data.projectStatus);
  const statusInfo = STATUS_MAP[data.projectStatus] || STATUS_MAP.pendente;

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 text-2xl shadow-2xl shadow-indigo-500/20">
            📊
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Status do Projeto</h1>
          <p className="text-sm text-zinc-500">{data.clientName || 'Cliente'}</p>
        </div>

        {/* Card Principal */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 md:p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${statusInfo.color} flex items-center justify-center text-2xl shadow-lg`}>
              {statusInfo.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{statusInfo.label}</h2>
              <p className="text-xs text-zinc-500">{statusInfo.desc}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Produto</p>
              <p className="text-sm font-semibold text-white">{data.product || '—'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Valor</p>
              <p className="text-sm font-semibold text-white">{data.value ? `R$ ${data.value.toFixed(2)}` : '—'}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-0">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-4 font-bold">Linha do Tempo</p>
            {FLOW.map((step, i) => {
              const info = STATUS_MAP[step];
              const isPast = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const isFuture = i > currentIdx;
              return (
                <div key={step} className="flex gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 transition-all ${
                      isPast
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                    }`}>
                      {isPast ? '✓' : isCurrent ? '●' : ''}
                    </div>
                    {i < FLOW.length - 1 && (
                      <div className={`w-0.5 h-8 ${isPast ? 'bg-emerald-500/50' : 'bg-zinc-800'}`} />
                    )}
                  </div>
                  <div className={`pb-6 ${isFuture ? 'opacity-40' : ''}`}>
                    <p className={`text-xs font-bold ${isCurrent ? 'text-white' : isPast ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {info.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">{info.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contato com o Dev */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 text-center">
          <p className="text-xs text-zinc-500 mb-3">Tem dúvidas sobre seu projeto?</p>
          <p className="text-sm text-zinc-400 mb-4">Fale diretamente com <span className="font-bold text-white">{data.devName}</span></p>
          <a href={`https://wa.me/${data.devWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Falar com {data.devName}
          </a>
        </div>
      </div>
    </div>
  );
}
