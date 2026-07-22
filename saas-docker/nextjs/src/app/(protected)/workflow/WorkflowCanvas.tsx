import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './CustomNodes';

export default function WorkflowCanvas({ settings, updateField, setSelectedNodeId }: any) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const initialized = useRef(false);

  // Carrega custom_rules_nodes em React Flow Nodes
  useEffect(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // O Nó Start é obrigatório
    initialNodes.push({
      id: 'start',
      type: 'startNode',
      position: { x: 400, y: 50 },
      data: { welcome_message: settings.welcome_message },
    });

    const hasNodesProp = Object.hasOwn(settings, 'custom_rules_nodes');
    const customNodes = settings.custom_rules_nodes || [];

    // Só cria nós padrão na primeira carga se não houver configuração salva
    if (!hasNodesProp && !initialized.current) {
      initialized.current = true;
      initialNodes.push(
        { id: 'opt_1', type: 'menuNode', position: { x: 100, y: 250 }, data: { keyword: '1', title: 'Catálogo', actionType: 'catalog', textContent: '' } },
        { id: 'opt_2', type: 'menuNode', position: { x: 350, y: 250 }, data: { keyword: '2', title: 'Horários', actionType: 'text', textContent: 'Nosso horário é das 08h às 18h.' } },
        { id: 'opt_3', type: 'menuNode', position: { x: 600, y: 250 }, data: { keyword: '3', title: 'Agendar', actionType: 'scheduling', textContent: '' } },
        { id: 'opt_4', type: 'menuNode', position: { x: 850, y: 250 }, data: { keyword: '4', title: 'Humano', actionType: 'human', textContent: 'Transferindo para o atendente...' } }
      );
      initialEdges.push(
        { id: 'e_start-opt_1', source: 'start', target: 'opt_1' },
        { id: 'e_start-opt_2', source: 'start', target: 'opt_2' },
        { id: 'e_start-opt_3', source: 'start', target: 'opt_3' },
        { id: 'e_start-opt_4', source: 'start', target: 'opt_4' }
      );

      const defaultData = [
        { id: 'opt_1', parentId: null, keyword: '1', title: 'Catálogo', actionType: 'catalog', textContent: '' },
        { id: 'opt_2', parentId: null, keyword: '2', title: 'Horários', actionType: 'text', textContent: 'Nosso horário é das 08h às 18h.' },
        { id: 'opt_3', parentId: null, keyword: '3', title: 'Agendar', actionType: 'scheduling', textContent: '' },
        { id: 'opt_4', parentId: null, keyword: '4', title: 'Humano', actionType: 'human', textContent: 'Transferindo para o atendente...' }
      ];
      updateField("custom_rules_nodes", defaultData);
    } else if (customNodes.length > 0) {
      // Parse custom nodes to React Flow
      customNodes.forEach((cn: any, index: number) => {
        const hasChildren = customNodes.some((n: any) => n.parentId === cn.id);
        const xPos = cn.parentId ? 400 + (index * 50) : 100 + (index * 250);
        const yPos = cn.parentId ? 450 : 250;

        initialNodes.push({
          id: cn.id,
          type: 'menuNode',
          position: { x: xPos, y: yPos },
          data: { ...cn, childrenCount: hasChildren ? 1 : 0 }
        });

        initialEdges.push({
          id: `e_${cn.parentId || 'start'}-${cn.id}`,
          source: cn.parentId || 'start',
          target: cn.id
        });
      });
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [settings.welcome_message, settings.custom_rules_nodes]); // removed updateField to avoid loops

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => addEdge(params, eds));
      syncGraphToBackend(nodes, addEdge(params, edges));
    },
    [nodes]
  );

  const syncGraphToBackend = (currentNodes: Node[], currentEdges: Edge[]) => {
    const custom_rules_nodes: any[] = [];
    currentNodes.forEach(node => {
      if (node.id === 'start') return;
      const parentEdge = currentEdges.find(e => e.target === node.id);
      let parentId = null;
      if (parentEdge && parentEdge.source !== 'start') {
        parentId = parentEdge.source;
      }
      custom_rules_nodes.push({
        id: node.id,
        parentId,
        keyword: node.data.keyword || '0',
        title: node.data.title || 'Nova Opção',
        actionType: node.data.actionType || 'text',
        textContent: node.data.textContent || '',
        variableName: node.data.variableName || '',
        productId: node.data.productId || ''
      });
    });
    updateField("custom_rules_nodes", custom_rules_nodes);
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const isEmpty = nodes.length <= 1 && edges.length === 0;

  return (
    <div style={{ width: '100%', height: '100%' }} className="relative">
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4 opacity-20">☰</div>
            <p className="text-zinc-600 text-sm font-medium">Canvas vazio</p>
            <p className="text-zinc-700 text-xs mt-1">Clique em &quot;+ Novo Nó&quot; no topo para começar</p>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#09090b]"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls className="bg-zinc-900 border-zinc-800 fill-white text-white [&_button]:hover:bg-zinc-700 [&_button]:border-zinc-700" />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'startNode') return '#7c3aed';
            const action = node.data?.actionType;
            if (action === 'catalog') return '#0ea5e9';
            if (action === 'product') return '#06b6d4';
            if (action === 'scheduling') return '#10b981';
            if (action === 'human') return '#f59e0b';
            return '#6366f1';
          }}
          maskColor="rgba(9,9,11,0.8)"
          className="border border-zinc-800 rounded-lg overflow-hidden !bg-zinc-950"
        />
      </ReactFlow>
    </div>
  );
}
