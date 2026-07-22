const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'src/app/(protected)/workflow/page.tsx');
let content = fs.readFileSync(pagePath, 'utf8');

// The file has 3 main parts inside the flex container:
// 1. <aside> (Left Sidebar)
// 2. <main> (Canvas)
// 3. <aside> (Right Sidebar)

const mainStartIndex = content.indexOf('<main className="flex-1');
if (mainStartIndex === -1) throw new Error("Could not find <main>");

// Find the end of the flex container (the last </div> before return)
const flexEndIndex = content.lastIndexOf('</div>\r\n    </div>\r\n  );\r\n}');
if (flexEndIndex === -1) {
  // Try without \r
  const flexEndIndex2 = content.lastIndexOf('</div>\n    </div>\n  );\n}');
  if (flexEndIndex2 === -1) {
    console.log("Could not find flex container end exactly, trying regex");
  }
}

// Just replace everything from `<main className="flex-1` to the end of the file, and close it properly.
const prefix = content.substring(0, mainStartIndex);

const newContent = `
        {/* NEW CANVAS */}
        <main className="flex-1 relative flex flex-col">
          {alert && (
            <div className={\`absolute top-4 left-[50%] translate-x-[-50%] px-4 py-2.5 rounded-xl text-xs font-semibold z-50 flex items-center gap-2 border shadow-lg \${
              alert.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }\`}>
              <span>{alert.msg}</span>
              <button onClick={() => setAlert(null)} className="ml-2 hover:text-white">✕</button>
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
            <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 pointer-events-auto shadow-xl">
              <span className="text-xs font-bold text-zinc-400">Status:</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-white">Editor Visual Ativo</span>
            </div>

            <div className="flex gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  const newNodes = [...(settings.custom_rules_nodes || [])];
                  newNodes.push({
                    id: 'node_' + Math.random().toString(36).substr(2, 9),
                    parentId: selectedNodeId !== 'start' ? selectedNodeId : null,
                    keyword: newNodes.length + 1 + '',
                    title: 'Nova Opção',
                    actionType: 'text',
                    textContent: 'Responda aqui...'
                  });
                  updateField('custom_rules_nodes', newNodes);
                }}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
              >
                <Plus className="w-4 h-4 text-purple-400" />
                <span>+ Novo Nó</span>
              </button>
              <button
                onClick={() => saveConfig()}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-xl"
              >
                <span>{saving ? "Salvando..." : "Salvar fluxo"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full h-full">
            <WorkflowCanvas 
              settings={settings} 
              updateField={updateField} 
              setSelectedNodeId={setSelectedNodeId} 
            />
          </div>
        </main>

        {/* PAINEL LATERAL DIREITO: CONFIGURAÇÃO DO NÓ SELECIONADO */}
        <aside className="w-80 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col flex-shrink-0 z-10">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Propriedades do Nó</h3>
          </div>

          <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {!selectedNodeId && (
              <div className="text-center text-xs text-zinc-500 mt-10">
                Selecione um nó no canvas para editar suas propriedades.
              </div>
            )}

            {selectedNodeId === 'start' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-purple-600/5 border border-purple-500/10">
                  <h4 className="text-xs font-bold text-white mb-1">Boas-vindas</h4>
                  <p className="text-[10px] text-zinc-400">
                    A primeira mensagem que o bot envia.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Mensagem</label>
                  <textarea
                    value={settings.welcome_message || ""}
                    onChange={(e) => updateField("welcome_message", e.target.value)}
                    rows={6}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {selectedNodeId && selectedNodeId !== 'start' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Dígito / Palavra-chave</label>
                  <input
                    type="text"
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.keyword || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].keyword = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Título do Menu</label>
                  <input
                    type="text"
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.title || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].title = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Ação / Tipo de Resposta</label>
                  <select
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.actionType || 'text'}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].actionType = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="text">Texto Simples / Submenu</option>
                    <option value="catalog">Mostrar Catálogo de Produtos</option>
                    <option value="scheduling">Fluxo de Agendamento</option>
                    <option value="human">Transferir para Humano</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-300">Conteúdo da Resposta</label>
                  <textarea
                    value={settings.custom_rules_nodes?.find((n:any)=>n.id===selectedNodeId)?.textContent || ''}
                    onChange={(e) => {
                      const newNodes = [...(settings.custom_rules_nodes || [])];
                      const idx = newNodes.findIndex(n=>n.id===selectedNodeId);
                      if(idx>-1) { newNodes[idx].textContent = e.target.value; updateField("custom_rules_nodes", newNodes); }
                    }}
                    rows={4}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const newNodes = settings.custom_rules_nodes.filter((n:any)=>n.id!==selectedNodeId && n.parentId!==selectedNodeId);
                    updateField("custom_rules_nodes", newNodes);
                    setSelectedNodeId(null);
                  }}
                  className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 text-xs font-bold transition-all"
                >
                  Excluir Nó
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
`;

// Now add the import statement at the top of the file
const importStatement = "import WorkflowCanvas from './WorkflowCanvas';\n";
const fileWithImport = importStatement + prefix.replace(/const \[selectedNode, setSelectedNode\] = useState<string>\("start"\);/g, "const [selectedNodeId, setSelectedNodeId] = useState<string | null>('start');");

fs.writeFileSync(pagePath, fileWithImport + newContent);
console.log("Rewrite successful!");
