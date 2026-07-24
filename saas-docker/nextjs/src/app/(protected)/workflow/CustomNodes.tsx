import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play, MessageSquare, BookOpen, Calendar, UserCheck, GitBranch, Sparkles, ShoppingCart, Package } from "lucide-react";

const actionConfig: Record<string, { color: string; bg: string; border: string }> = {
  catalog: { color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-500/10", border: "border-sky-200 dark:border-sky-500/20" },
  product: { color: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-500/10", border: "border-cyan-200 dark:border-cyan-500/20" },
  scheduling: { color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
  human: { color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10", border: "border-amber-200 dark:border-amber-500/20" },
  text: { color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-500/20" },
  collect_data: { color: "text-pink-700 dark:text-pink-300", bg: "bg-pink-50 dark:bg-pink-500/10", border: "border-pink-200 dark:border-pink-500/20" },
  checkout: { color: "text-fuchsia-700 dark:text-fuchsia-300", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", border: "border-fuchsia-200 dark:border-fuchsia-500/20" },
};

export const StartNode = ({ data, selected }: any) => {
  return (
    <div
      className={`w-72 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-900 shadow-xl flex flex-col justify-between ${
        selected
          ? "border-purple-500 ring-4 ring-purple-500/20 shadow-purple-500/20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-purple-300"
      }`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-md shadow-purple-500/20">
            <Play className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-slate-900 dark:text-white tracking-wider">Início</span>
        </div>
        <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono font-bold border border-purple-200 dark:border-purple-500/20">
          GATILHO
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-3 border-l-2 border-purple-500 pl-2">
          &ldquo;{data.welcome_message || "Mensagem de boas-vindas..."}&rdquo;
        </p>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[9px] font-bold text-slate-400">
        <Sparkles className="w-3 h-3 text-purple-500" />
        <span>Boas-vindas do Atendimento</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-purple-600 border-2 border-white dark:border-slate-900" />
    </div>
  );
};

export const MenuNode = ({ data, selected }: any) => {
  let Icon = MessageSquare;
  let label = "Submenu / Resposta";

  if (data.actionType === "catalog") {
    Icon = BookOpen;
    label = "📋 Catálogo de Produtos";
  } else if (data.actionType === "product") {
    Icon = Package;
    label = data.productPrice ? `📦 R$ ${data.productPrice}` : "📦 Produto";
  } else if (data.actionType === "scheduling") {
    Icon = Calendar;
    label = "📅 Agendamento";
  } else if (data.actionType === "human") {
    Icon = UserCheck;
    label = "👤 Transferir p/ Humano";
  } else if (data.actionType === "text" && data.childrenCount > 0) {
    Icon = GitBranch;
    label = "💬 Menu de Opções";
  } else if (data.actionType === "collect_data") {
    Icon = MessageSquare;
    label = "📝 Coletar Dados";
  } else if (data.actionType === "checkout") {
    Icon = ShoppingCart;
    label = "🛒 Gerar Checkout";
  } else if (data.actionType === "text") {
    Icon = MessageSquare;
    label = "💬 Exibir Texto";
  }

  const cfg = actionConfig[data.actionType] || actionConfig.text;

  return (
    <div
      className={`w-64 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none bg-white dark:bg-slate-900 shadow-xl ${
        selected
          ? "border-purple-500 ring-4 ring-purple-500/20 shadow-purple-500/20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-purple-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3.5 h-3.5 bg-slate-400 dark:bg-slate-600 border-2 border-white dark:border-slate-900" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-900 dark:text-white min-w-[24px] text-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
            {data.keyword || "*"}
          </div>
          <div className="flex-1 font-black text-xs text-slate-900 dark:text-white truncate">{data.title || "Nova Opção"}</div>
        </div>

        {data.actionType === "catalog" && (
          <div className="mt-2 space-y-1 p-2 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-xl text-[10px]">
            <span className="font-black text-sky-800 dark:text-sky-300 block mb-1">Itens Exibidos no Catálogo:</span>
            {(data.products || []).length > 0 ? (
              (data.products || []).slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="truncate max-w-[130px] font-bold">*{i + 1}* - {p.name}</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {p.price}</span>
                </div>
              ))
            ) : (
              <span className="text-slate-400 italic">Nenhum produto cadastrado</span>
            )}
          </div>
        )}

        {data.parentActionType === "catalog" && (
          <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-[10px] space-y-0.5">
            <span className="font-black text-emerald-800 dark:text-emerald-300 block">
              🎯 Responde ao Item #{data.keyword} do Catálogo:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white block truncate">
              {data.products?.[parseInt(data.keyword, 10) - 1]?.name || data.title || `Produto #${data.keyword}`}
            </span>
          </div>
        )}

        {data.actionType === "product" && data.productPrice ? (
          <div className={`flex items-center justify-between gap-1.5 text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border} border rounded-xl px-2.5 py-1.5 font-bold`}>
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" />
              <span className="font-bold">{data.productName || data.title}</span>
            </div>
            <span className="font-extrabold text-slate-900 dark:text-white bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded-md shadow-sm">R$ {data.productPrice}</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border} border rounded-xl px-2.5 py-1.5 font-bold`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
        )}
        {data.actionType === "product" && data.productDescription && (
          <p className="text-[9px] font-medium text-slate-500 leading-relaxed line-clamp-2 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-0.5">
            {data.productDescription}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 bg-purple-600 border-2 border-white dark:border-slate-900" />
    </div>
  );
};

export const nodeTypes = {
  startNode: StartNode,
  menuNode: MenuNode,
};
