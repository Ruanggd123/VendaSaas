import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Play, MessageSquare, BookOpen, Calendar, UserCheck, GitBranch, Sparkles, ShoppingCart, Package, EyeOff, GitFork, ArrowDownRight, Layers, Tag, CheckCircle2 } from "lucide-react";

const actionConfig: Record<string, { color: string; bg: string; border: string; badge: string; accent: string }> = {
  catalog: { 
    color: "text-sky-700 dark:text-sky-300", 
    bg: "bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40", 
    border: "border-sky-300 dark:border-sky-500/40",
    badge: "bg-sky-500 text-white shadow-sky-500/30",
    accent: "from-sky-500 to-blue-600"
  },
  product: { 
    color: "text-cyan-700 dark:text-cyan-300", 
    bg: "bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/40 dark:to-teal-950/40", 
    border: "border-cyan-300 dark:border-cyan-500/40",
    badge: "bg-cyan-500 text-white shadow-cyan-500/30",
    accent: "from-cyan-500 to-teal-600"
  },
  scheduling: { 
    color: "text-emerald-700 dark:text-emerald-300", 
    bg: "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40", 
    border: "border-emerald-300 dark:border-emerald-500/40",
    badge: "bg-emerald-500 text-white shadow-emerald-500/30",
    accent: "from-emerald-500 to-teal-600"
  },
  human: { 
    color: "text-amber-700 dark:text-amber-300", 
    bg: "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40", 
    border: "border-amber-300 dark:border-amber-500/40",
    badge: "bg-amber-500 text-white shadow-amber-500/30",
    accent: "from-amber-500 to-orange-600"
  },
  text: { 
    color: "text-indigo-700 dark:text-indigo-300", 
    bg: "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40", 
    border: "border-indigo-300 dark:border-indigo-500/40",
    badge: "bg-indigo-500 text-white shadow-indigo-500/30",
    accent: "from-indigo-500 to-purple-600"
  },
  collect_data: { 
    color: "text-pink-700 dark:text-pink-300", 
    bg: "bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40", 
    border: "border-pink-300 dark:border-pink-500/40",
    badge: "bg-pink-500 text-white shadow-pink-500/30",
    accent: "from-pink-500 to-rose-600"
  },
  checkout: { 
    color: "text-fuchsia-700 dark:text-fuchsia-300", 
    bg: "bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-950/40 dark:to-purple-950/40", 
    border: "border-fuchsia-300 dark:border-fuchsia-500/40",
    badge: "bg-fuchsia-500 text-white shadow-fuchsia-500/30",
    accent: "from-fuchsia-500 to-purple-600"
  },
};

export const StartNode = ({ data, selected }: any) => {
  return (
    <div
      className={`w-80 p-4 rounded-3xl border transition-all duration-300 cursor-pointer select-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl flex flex-col justify-between relative overflow-hidden ${
        selected
          ? "border-purple-500 ring-4 ring-purple-500/30 shadow-purple-500/30 scale-[1.02]"
          : "border-purple-200 dark:border-purple-500/30 hover:border-purple-400 hover:shadow-purple-500/10"
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />
      
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-500/30 animate-pulse">
            <Play className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white tracking-wider block">Início da Conversa</span>
            <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">Gatilho de Entrada</span>
          </div>
        </div>
        <span className="text-[10px] bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-2.5 py-1 rounded-full font-mono font-black shadow-md shadow-purple-500/20">
          START
        </span>
      </div>

      <div className="space-y-2 bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/40">
        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-relaxed italic line-clamp-3 border-l-3 border-purple-500 pl-2.5">
          &ldquo;{data.welcome_message || "Boas-vindas ao nosso atendimento! Como posso te ajudar hoje?"}&rdquo;
        </p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 text-[10px] font-black text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Boas-vindas Automáticas</span>
        </div>
        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">Nó Fixo</span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-purple-600 border-3 border-white dark:border-slate-900 shadow-md !-bottom-2" />
    </div>
  );
};

export const MenuNode = ({ data, selected }: any) => {
  let Icon = MessageSquare;
  let label = "Submenu / Resposta";

  if (data.actionType === "catalog") {
    Icon = BookOpen;
    label = "📋 Catálogo Oficial";
  } else if (data.actionType === "product") {
    Icon = Package;
    label = data.productPrice ? `📦 R$ ${data.productPrice}` : "📦 Produto";
  } else if (data.actionType === "scheduling") {
    Icon = Calendar;
    label = "📅 Agendamento de Horário";
  } else if (data.actionType === "human") {
    Icon = UserCheck;
    label = "👤 Transfere p/ Humano";
  } else if (data.actionType === "text" && data.childrenCount > 0) {
    Icon = GitBranch;
    label = "💬 Menu de Opções";
  } else if (data.actionType === "collect_data") {
    Icon = MessageSquare;
    label = "📝 Coletar Formulário";
  } else if (data.actionType === "checkout") {
    Icon = ShoppingCart;
    label = "🛒 Checkout de Pagamento";
  } else if (data.actionType === "text") {
    Icon = MessageSquare;
    label = "💬 Exibir Mensagem";
  }

  const cfg = actionConfig[data.actionType] || actionConfig.text;

  return (
    <div
      className={`w-72 p-4 rounded-3xl border transition-all duration-300 cursor-pointer select-none bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl relative overflow-hidden ${
        selected
          ? "border-purple-500 ring-4 ring-purple-500/30 shadow-2xl shadow-purple-500/20 scale-[1.02]"
          : "border-slate-200/90 dark:border-slate-800 hover:border-purple-400 hover:shadow-purple-500/10"
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cfg.accent}`} />
      
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-indigo-600 border-3 border-white dark:border-slate-900 shadow-md !-top-2" />

      <div className="flex flex-col gap-3 pt-1">
        {/* Header do Nó */}
        <div className="flex items-center gap-2.5">
          <div className="px-2.5 py-1 rounded-xl text-[11px] font-black text-slate-900 dark:text-white min-w-[28px] text-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-inner">
            {data.keyword || "*"}
          </div>
          <div className="flex-1 font-black text-xs text-slate-900 dark:text-white truncate tracking-tight">{data.title || "Nova Opção"}</div>
          {data.showInPoll === false && <EyeOff className="size-4 shrink-0 text-slate-400" aria-label="Oculto na enquete" />}
        </div>

        {/* Badge do Tipo de Ação */}
        <div className={`flex items-center justify-between gap-1.5 text-[10px] ${cfg.color} ${cfg.bg} ${cfg.border} border rounded-2xl px-3 py-2 font-black shadow-sm`}>
          <div className="flex items-center gap-2 truncate">
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
          {data.actionType === "product" && data.productPrice && (
            <span className="font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg shadow-sm shrink-0">R$ {data.productPrice}</span>
          )}
        </div>

        {/* Detalhes Específicos por Tipo */}
        {data.actionType === "catalog" && (
          <div className="space-y-1.5 p-2.5 bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-500/30 rounded-2xl text-[10px]">
            <span className="font-black text-sky-800 dark:text-sky-300 block mb-1">Itens do Catálogo:</span>
            {(data.products || []).length > 0 ? (
              (data.products || []).slice(0, 4).map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-xl border border-sky-100 dark:border-sky-900/40">
                  <span className="truncate max-w-[150px] font-bold">{i + 1}. {p.name}</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">R$ {p.price}</span>
                </div>
              ))
            ) : (
              <span className="text-slate-400 italic">Nenhum produto cadastrado</span>
            )}
          </div>
        )}

        {data.parentActionType === "catalog" && (
          <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-[10px] space-y-1">
            <span className="font-black text-emerald-800 dark:text-emerald-300 block">
              🎯 Responde ao Item #{data.keyword} do Catálogo:
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white block truncate bg-white/70 dark:bg-slate-900/60 p-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              {data.products?.[parseInt(data.keyword, 10) - 1]?.name || data.title || `Produto #${data.keyword}`}
            </span>
          </div>
        )}

        {data.actionType === "collect_data" && (
          <div className="p-2.5 bg-pink-50/80 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-500/30 rounded-2xl text-[10px] space-y-2 shadow-sm">
            <div className="flex items-center justify-between gap-1 border-b border-pink-200/60 dark:border-pink-500/20 pb-1.5">
              <span className="font-black text-pink-800 dark:text-pink-300 truncate flex items-center gap-1">
                📋 <span className="underline decoration-pink-400">{data.title || "Formulário de Coleta"}</span>
              </span>
              {data.variableName ? (
                <span className="font-mono font-black text-[9px] bg-pink-600 text-white px-2 py-0.5 rounded-md shadow-sm shrink-0">
                  {`{${data.variableName}}`}
                </span>
              ) : (
                <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 italic shrink-0">sem variável</span>
              )}
            </div>
            {data.textContent && (
              <p className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight italic bg-white/70 dark:bg-slate-900/70 p-1.5 rounded-xl border border-pink-100 dark:border-pink-900/40">
                &ldquo;{data.textContent}&rdquo;
              </p>
            )}
            <div className="flex items-center justify-between text-[9px] font-bold text-pink-700 dark:text-pink-300 pt-0.5">
              <span>⚡ Pergunta Automática</span>
              {data.childrenCount === 1 && (
                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-mono">➡️ Próximo Passo</span>
              )}
            </div>
          </div>
        )}

        {data.productDescription && data.actionType === "product" && (
          <p className="text-[10px] font-medium text-slate-500 leading-relaxed line-clamp-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-0.5">
            {data.productDescription}
          </p>
        )}

        {data.textContent && data.actionType !== "product" && data.actionType !== "catalog" && data.actionType !== "collect_data" && (
          <p className="line-clamp-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            {data.textContent}
          </p>
        )}

        {/* Footer do Nó com Contador de Filhos */}
        {data.childrenCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30 mt-1">
            <GitFork className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{data.childrenCount} próxima(s) etapa(s) conectada(s)</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-purple-600 border-3 border-white dark:border-slate-900 shadow-md !-bottom-2" />
    </div>
  );
};

export const nodeTypes = {
  startNode: StartNode,
  menuNode: MenuNode,
};
