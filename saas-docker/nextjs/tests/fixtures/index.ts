// Fixtures reutilizáveis: flows JSON completos e scripts de conversa.

export const VALID_FLOW_JSON = {
  custom_rules_nodes: [
    {
      id: "node_bem_vindo",
      parentId: null,
      keyword: "inicio",
      title: "🛎️ Bem-vindo",
      actionType: "text",
      textContent: "Olá! Bem-vindo à Nexus. Escolha uma opção:\n---LIST---\nProdutos|1\nAgendar|2\nFalar com Humano|3",
      showInPoll: true,
    },
    {
      id: "node_produtos",
      parentId: "node_bem_vindo",
      keyword: "1",
      title: "🛒 Produtos & Serviços",
      actionType: "catalog",
      textContent: "Confira nosso catálogo:",
      showInPoll: true,
    },
    {
      id: "node_agendar",
      parentId: "node_bem_vindo",
      keyword: "2",
      title: "📅 Agendar Horário",
      actionType: "scheduling",
      textContent: "Escolha uma data disponível:",
      showInPoll: true,
    },
    {
      id: "node_humano",
      parentId: "node_bem_vindo",
      keyword: "3",
      title: "👤 Falar com Humano",
      actionType: "human",
      textContent: "Transferindo para um atendente...",
      showInPoll: true,
    },
    {
      id: "node_nome",
      parentId: "node_produtos",
      keyword: "comprar",
      title: "Nome do cliente",
      actionType: "collect_data",
      collectData: { variableName: "name", askText: "Qual o seu nome?" },
      textContent: "Preciso do seu nome para prosseguir.",
      showInPoll: false,
    },
    {
      id: "node_checkout",
      parentId: "node_nome",
      keyword: "*",
      title: "Checkout",
      actionType: "checkout",
      textContent: "Gerando seu pedido...",
      showInPoll: false,
    },
  ],
};

export const VALID_FLOW_JSON_STRING = JSON.stringify(VALID_FLOW_JSON, null, 2);

// Fluxo inválido: keyword duplicada entre irmãos
export const INVALID_FLOW_DUPLICATE_KEYWORD = JSON.stringify({
  custom_rules_nodes: [
    { id: "a", parentId: null, keyword: "1", actionType: "text", title: "A" },
    { id: "b", parentId: null, keyword: "1", actionType: "text", title: "B" },
  ],
});

// Fluxo inválido: nó órfão (parentId inexistente)
export const INVALID_FLOW_ORPHAN = JSON.stringify({
  custom_rules_nodes: [
    { id: "a", parentId: null, keyword: "1", actionType: "text", title: "A" },
    { id: "b", parentId: "inexistente", keyword: "2", actionType: "text", title: "B" },
  ],
});

// Script de conversa persona×fluxo (para E2E e simulador)
export const CONVERSATION_SCRIPT = [
  { from: "customer", content: "inicio" },
  { from: "bot", expect: /Produtos|Agendar|Humano/ },
  { from: "customer", content: "1" },
  { from: "bot", expect: /catálogo|produtos|serviços/i },
];
