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
import { LayoutDashboard, MousePointer2 } from "lucide-react";
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
    const spacing = Math.max(280, 920 / Math.max(children.length, 1));
    const startX = centerX - ((children.length - 1) * spacing) / 2;
    children.forEach((child, index) => {
      if (path.has(child.id)) return;
      const x = startX + index * spacing;
      positions.set(child.id, { x, y: 70 + level * 210 });
      placeChildren(child.id, x, level + 1, new Set(path).add(child.id));
    });
  };

  positions.set("start", { x: 400, y: 30 });
  placeChildren("start", 400, 1, new Set(["start"]));
  return positions;
}

export default function WorkflowCanvas({ settings, updateField, selectedNodeId, setSelectedNodeId }: WorkflowCanvasProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const customNodesRef = useRef<any[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      nextNodes.push({
        id: node.id,
        type: "menuNode",
        position: typeof node.position?.x === "number" && typeof node.position?.y === "number"
          ? node.position
          : calculated.get(node.id) || { x: 400, y: 260 },
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
        type: "smoothstep",
        animated: selectedNodeId === node.id,
        style: { strokeWidth: selectedNodeId === node.id ? 2.5 : 1.5, stroke: selectedNodeId === node.id ? "#7c3aed" : "#94a3b8" },
      });
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [selectedNodeId, settings.custom_rules_nodes, settings.products, settings.welcome_message]);

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
    const next = addEdge({ ...connection, type: "smoothstep" }, withoutOldParent);
    setEdges(next);
    queuePersist(nodesRef.current, next);
  }, [queuePersist]);

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

  return (
    <div className="relative size-full">
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
        className="bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.08),_transparent_32%)] dark:bg-slate-950"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="#94a3b8" />
        <Controls className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900" />
        <MiniMap pannable zoomable nodeColor={(node) => node.id === "start" ? "#7c3aed" : "#6366f1"} maskColor="rgba(15,23,42,.72)" className="!rounded-2xl !border !border-white/10 !bg-slate-900" />
        <Panel position="top-left" className="m-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex items-center gap-2 px-2 text-[11px] font-bold text-slate-500"><MousePointer2 className="size-3.5 text-indigo-500" /> Arraste para mover. Conecte pelas bolinhas.</div>
          <button type="button" onClick={organize} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300"><LayoutDashboard className="size-3.5" /> Organizar</button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
