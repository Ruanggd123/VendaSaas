import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function FlowEditor({ tenantId }) {
  const [flows, setFlows] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadFlows() {
      const res = await fetch(`/api/flows/${tenantId}`);
      const data = await res.json();
      setFlows(data.main);
      setCurrentFlow('main');
    }
    loadFlows();
  }, [tenantId]);

  const saveNode = async () => {
    const updatedFlows = [...flows];
    const nodeIndex = updatedFlows.findIndex(n => n.id === editingNode.id);
    updatedFlows[nodeIndex] = editingNode;
    
    await fetch(`/api/flows/${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flows: { main: updatedFlows } })
    });
    
    setFlows(updatedFlows);
    setEditingNode(null);
  };

  return (
    <div className="flow-editor">
      <h2>Editor de Fluxo de Conversação</h2>
      
      <div className="flow-nodes">
        {flows.map(node => (
          <div key={node.id} className="node" onClick={() => setEditingNode(node)}>
            <h3>{node.id}</h3>
            <p>{node.response.substring(0, 50)}...</p>
          </div>
        ))}
      </div>

      {editingNode && (
        <div className="node-editor">
          <h3>Editando: {editingNode.id}</h3>
          
          <div>
            <label>Palavras-chave (separadas por vírgula):</label>
            <input 
              value={editingNode.triggers.join(', ')} 
              onChange={(e) => setEditingNode({
                ...editingNode,
                triggers: e.target.value.split(',').map(t => t.trim())
              })}
            />
          </div>

          <div>
            <label>Resposta:</label>
            <textarea
              value={editingNode.response}
              onChange={(e) => setEditingNode({
                ...editingNode,
                response: e.target.value
              })}
              rows={5}
            />
          </div>

          <button onClick={saveNode}>Salvar</button>
        </div>
      )}
    </div>
  );
}
