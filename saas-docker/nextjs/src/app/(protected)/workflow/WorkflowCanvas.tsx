import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from "@xyflow/react";
import { LayoutDashboard, MousePointer2, Settings2, Download, Upload, Sparkles, SlidersHorizontal, RefreshCw, Layers } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./CustomNodes";

type WorkflowCanvasProps = {
  settings: any;
  updateField: (field: any, value: any) => void;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
};

const editorOnlyFields = new Set(["childrenCount", "products", "parentActionType", "parentTitle"]);

function automaticPositions(customNodes: any[]) {
  const childrenByParent = new Map<string, any[]>();
  customNodes.forEach((node) => {
    const parent = node.parentId || "start";
    childrenByParent.set(parent, [...(childrenByParent.get(parent) || []), node]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const placeChildren = (parentId: string, centerX: number, level: number, path: Set<string>) => {
    const children = childrenByParent.get(parentId) || [];
    const spacing = Math.max(300, 960 / Math.max(children.length, 1));
    const startX = centerX - ((children.length - 1) * spacing) / 2;
    children.forEach((child, index) => {
      if (path.has(child.id)) return;
      const x = startX + index * spacing;
      positions.set(child.id, { x, y: 80 + level * 230 });
      placeChildren(child.id, x, level + 1, new Set(path).add(child.id));
    });
  };

  positions.set("start", { x: 450, y: 30 });
  placeChildren("start", 450, 1, new Set(["start"]));
  return positions;
}

export default function WorkflowCanvas({ settings, updateField, selectedNodeId, setSelectedNodeId }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  
  // Opções de Personalização do Canvas
  const [bgVariant, setBgVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);
  const [edgeType, setEdgeType] = useState<"smoothstep" | "straight" | "default">("smoothstep");
  const [edgeColor, setEdgeColor] = useState<string>("#8b5cf6");
  const [showCustomizer, setShowCustomizer] = useState<boolean>(false);

  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const customNodesRef = useRef<any[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => {
    customNodesRef.current = Array.isArray(settings.custom_rules_nodes) ? settings.custom_rules_nodes : [];
  }, [settings.custom_rules_nodes]);

  useEffect(() => {
    const customNodes = Array.isArray(settings.custom_rules_nodes) ? settings.custom_rules_nodes : [];
    const calculated = automaticPositions(customNodes);
    const nextNodes: Node[] = [{
      id: "start",
      type: "startNode",
      position: calculated.get("start")!,
      data: { welcome_message: settings.welcome_message },
    }];
    const nextEdges: Edge[] = [];

    customNodes.forEach((node: any) => {
      const parent = customNodes.find((candidate: any) => candidate.id === node.parentId);
      const isSelected = selectedNodeId === node.id;
      nextNodes.push({
        id: node.id,
        type: "menuNode",
        position: typeof node.position?.x === "number" && typeof node.position?.y === "number"
          ? node.position
          : calculated.get(node.id) || { x: 450, y: 280 },
        data: {
          ...node,
          products: settings.products || [],
          childrenCount: customNodes.filter((candidate: any) => candidate.parentId === node.id).length,
          parentActionType: parent?.actionType,
          parentTitle: parent?.title,
        },
      });
      nextEdges.push({
        id: `edge-${node.parentId || "start"}-${node.id}`,
        source: node.parentId || "start",
        target: node.id,
        type: edgeType,
        animated: isSelected || true,
        style: { 
          strokeWidth: isSelected ? 3 : 2, 
          stroke: isSelected ? "#a855f7" : edgeColor 
        },
      });
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [selectedNodeId, settings.custom_rules_nodes, settings.products, settings.welcome_message, edgeType, edgeColor]);

  const persistGraph = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    const persisted = nextNodes.flatMap((node) => {
      if (node.id === "start") return [];
      const parentEdge = nextEdges.find((edge) => edge.target === node.id);
      const latestNode = customNodesRef.current.find((candidate: any) => candidate.id === node.id);
      const data = latestNode || Object.fromEntries(Object.entries(node.data).filter(([key]) => !editorOnlyFields.has(key)));
      return [{
        ...data,
        id: node.id,
        parentId: parentEdge?.source && parentEdge.source !== "start" ? parentEdge.source : null,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      }];
    });
    updateField("custom_rules_nodes", persisted);
  }, [updateField]);

  const queuePersist = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => persistGraph(nextNodes, nextEdges), 120);
  }, [persistGraph]);

  useEffect(() => () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
  }, []);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => {
      const safeChanges = changes.filter((change) => !(change.type === "remove" && change.id === "start"));
      const removedIds = new Set(safeChanges.filter((change) => change.type === "remove").map((change) => change.id));
      if (removedIds.size > 0) {
        let foundChild = true;
        while (foundChild) {
          foundChild = false;
          edgesRef.current.forEach((edge) => {
            if (removedIds.has(edge.source) && !removedIds.has(edge.target)) {
              removedIds.add(edge.target);
              foundChild = true;
            }
          });
        }
        removedIds.forEach((id) => {
          if (!safeChanges.some((change) => change.type === "remove" && change.id === id)) {
            safeChanges.push({ type: "remove", id });
          }
        });
        if (selectedNodeId && removedIds.has(selectedNodeId)) setSelectedNodeId("start");
      }
      const next = applyNodeChanges(safeChanges, current);
      if (safeChanges.some((change) => change.type === "remove")) {
        const nodeIds = new Set(next.map((node) => node.id));
        const nextEdges = edgesRef.current.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
        setEdges(nextEdges);
        queuePersist(next, nextEdges);
      }
      return next;
    });
  }, [queuePersist, selectedNodeId, setSelectedNodeId]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => {
      const next = applyEdgeChanges(changes, current);
      if (changes.some((change) => change.type === "remove")) queuePersist(nodesRef.current, next);
      return next;
    });
  }, [queuePersist]);

  const createsCycle = (source: string, target: string, currentEdges: Edge[]) => {
    const pending = [target];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (current === source) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      currentEdges.filter((edge) => edge.source === current).forEach((edge) => pending.push(edge.target));
    }
    return false;
  };

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.target === "start" || connection.source === connection.target) return;
    if (createsCycle(connection.source, connection.target, edgesRef.current)) return;
    const withoutOldParent = edgesRef.current.filter((edge) => edge.target !== connection.target);
    const next = addEdge({ ...connection, type: edgeType, animated: true, style: { strokeWidth: 2, stroke: edgeColor } }, withoutOldParent);
    setEdges(next);
    queuePersist(nodesRef.current, next);
  }, [queuePersist, edgeType, edgeColor]);

  const organize = () => {
    const customNodes = nodesRef.current.filter((node) => node.id !== "start").map((node) => ({
      id: node.id,
      parentId: edgesRef.current.find((edge) => edge.target === node.id)?.source || null,
    }));
    const positions = automaticPositions(customNodes);
    const next = nodesRef.current.map((node) => ({ ...node, position: positions.get(node.id) || node.position }));
    setNodes(next);
    queuePersist(next, edgesRef.current);
  };

  // Exportar Workflow em JSON
  const exportWorkflowJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings.custom_rules_nodes || [], null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workflow_nexus_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Importar Workflow em JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          updateField("custom_rules_nodes", json);
          alert("✨ Workflow importado com sucesso!");
        } else {
          alert("❌ Arquivo JSON inválido. Deve conter uma lista de nós.");
        }
      } catch (err) {
        alert("❌ Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative size-full overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        onNodeDragStop={(_, dragged) => {
          const next = nodesRef.current.map((node) => node.id === dragged.id ? { ...node, position: dragged.position } : node);
          setNodes(next);
          queuePersist(next, edgesRef.current);
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={1.6}
        deleteKeyCode={["Backspace", "Delete"]}
        className="bg-slate-950/5 dark:bg-slate-950"
      >
        <Background variant={bgVariant} gap={24} size={1.4} color="#a855f7" />
        <Controls className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90" />
        <MiniMap 
          pannable 
          zoomable 
          nodeColor={(node) => node.id === "start" ? "#8b5cf6" : "#6366f1"} 
          maskColor="rgba(15,23,42,.85)" 
          className="!rounded-3xl !border !border-white/10 !bg-slate-900/90 backdrop-blur" 
        />

        {/* Toolbar de Controle Esquerda */}
        <Panel position="top-left" className="m-4 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200/80 bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex items-center gap-2 px-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <MousePointer2 className="size-4 text-purple-600 dark:text-purple-400 animate-bounce" /> 
            <span>Arraste para organizar</span>
          </div>
          <button 
            type="button" 
            onClick={organize} 
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all"
          >
            <LayoutDashboard className="size-4" /> Auto Layout
          </button>
          
          <button
            type="button"
            onClick={() => setShowCustomizer(!showCustomizer)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
          >
            <SlidersHorizontal className="size-4 text-purple-500" /> Personalizar Canvas
          </button>
        </Panel>

        {/* Panel de Personalização Avançada */}
        {showCustomizer && (
          <Panel position="top-right" className="m-4 w-80 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-purple-500" /> Personalizar Estilo do Canvas
              </span>
              <button onClick={() => setShowCustomizer(false)} className="text-xs font-black text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            {/* Estilo do Fundo */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block mb-1.5">Estilo do Fundo (Grid)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { name: "Pontos", val: BackgroundVariant.Dots },
                  { name: "Linhas", val: BackgroundVariant.Lines },
                  { name: "Cruz", val: BackgroundVariant.Cross },
                ].map((bg) => (
                  <button
                    key={bg.val}
                    type="button"
                    onClick={() => setBgVariant(bg.val)}
                    className={`py-1.5 text-[10px] font-bold rounded-xl border transition-all ${
                      bgVariant === bg.val
                        ? "bg-purple-600 text-white border-purple-600 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {bg.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Formato das Linhas */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block mb-1.5">Formato das Conexões</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { name: "Curvo", val: "smoothstep" },
                  { name: "Reta", val: "straight" },
                  { name: "Suave", val: "default" },
                ].map((type) => (
                  <button
                    key={type.val}
                    type="button"
                    onClick={() => setEdgeType(type.val as any)}
                    className={`py-1.5 text-[10px] font-bold rounded-xl border transition-all ${
                      edgeType === type.val
                        ? "bg-purple-600 text-white border-purple-600 shadow-md"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor das Linhas */}
            <div>
              <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 block mb-1.5">Cor dos Cabos / Conexões</label>
              <div className="flex items-center gap-2">
                {[
                  { color: "#8b5cf6", name: "Roxo" },
                  { color: "#06b6d4", name: "Ciano" },
                  { color: "#10b981", name: "Verde" },
                  { color: "#f43f5e", name: "Rosa" },
                  { color: "#f59e0b", name: "Laranja" },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setEdgeColor(item.color)}
                    className={`size-6 rounded-full border-2 transition-all ${
                      edgeColor === item.color ? "scale-125 border-slate-900 dark:border-white shadow-lg" : "border-transparent"
                    }`}
                    style={{ backgroundColor: item.color }}
                  />
                ))}
              </div>
            </div>

            {/* Exportar / Importar JSON */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={exportWorkflowJSON}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="size-3.5 text-purple-500" /> Exportar JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Upload className="size-3.5 text-purple-500" /> Importar JSON
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
