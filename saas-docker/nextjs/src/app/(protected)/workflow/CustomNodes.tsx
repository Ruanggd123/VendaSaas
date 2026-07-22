import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, MessageSquare, BookOpen, Calendar, UserCheck, GitBranch, Sparkles, ShoppingCart } from 'lucide-react';

  catalog: { color: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  scheduling: { color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  human: { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  text: { color: 'text-indigo-300', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  collect_data: { color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  checkout: { color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
};

export const StartNode = ({ data, selected }: any) => {
  return (
    <div className={`w-72 p-4 rounded-xl border transition-all duration-200 cursor-pointer select-none bg-gradient-to-b from-zinc-950 to-zinc-900/90 backdrop-blur flex flex-col justify-between shadow-xl hover:shadow-purple-500/5 ${
      selected
        ? "border-purple-500 ring-2 ring-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.25)]"
        : "border-zinc-800 hover:border-zinc-700"
    }`}>
      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
            <Play className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold text-white tracking-wider">Início</span>
        </div>
        <span className="text-[9px] bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full font-medium border border-purple-500/20">TRIGGER</span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] text-zinc-400 leading-relaxed italic line-clamp-3 border-l-2 border-zinc-700 pl-2">
          &ldquo;{data.welcome_message || 'Mensagem de boas-vindas...'}&rdquo;
        </p>
      </div>
      <div className="flex items-center gap-1 mt-2 text-[9px] text-zinc-600">
        <Sparkles className="w-3 h-3" />
        <span>Boas-vindas do bot</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-zinc-950" />
    </div>
  );
};

export const MenuNode = ({ data, selected }: any) => {
  let Icon = MessageSquare;
  let label = "Submenu / Resposta";

  if (data.actionType === "catalog") {
    Icon = BookOpen;
    label = "Catálogo de Produtos";
  } else if (data.actionType === "scheduling") {
    Icon = Calendar;
    label = "Agendamento";
  } else if (data.actionType === "human") {
    Icon = UserCheck;
    label = "Humano";
  } else if (data.actionType === "text" && data.childrenCount > 0) {
    Icon = GitBranch;
    label = "Menu de Opções";
  } else if (data.actionType === "collect_data") {
    Icon = MessageSquare;
    label = "Coletar Dados";
  } else if (data.actionType === "checkout") {
    Icon = ShoppingCart;
    label = "Gerar Checkout";
  }

  const cfg = actionConfig[data.actionType] || actionConfig.text;

  return (
    <div className={`w-64 p-3 rounded-xl border transition-all duration-200 cursor-pointer select-none bg-gradient-to-b from-zinc-950 to-zinc-900/80 backdrop-blur shadow-xl hover:shadow-lg ${
      selected
        ? "border-purple-500 ring-2 ring-purple-500/50 shadow-[0_0_20px_rgba(147,51,234,0.25)]"
        : "border-zinc-800 hover:border-zinc-700"
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-500 border-2 border-zinc-950" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded text-[10px] font-bold text-white min-w-[24px] text-center bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 shadow-inner">
            {data.keyword || '*'}
          </div>
          <div className="flex-1 font-bold text-xs text-white truncate">{data.title || 'Nova Opção'}</div>
        </div>

        <div className={`flex items-center gap-1.5 text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border} border rounded-lg px-2 py-1.5`}>
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-zinc-950" />
    </div>
  );
};

export const nodeTypes = {
  startNode: StartNode,
  menuNode: MenuNode,
};
