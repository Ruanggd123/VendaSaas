const VALID_ACTION_TYPES = [
  "catalog",
  "scheduling",
  "human",
  "collect_data",
  "text",
  "product",
  "checkout",
] as const;

export type FlowValidationError = {
  nodeId?: string;
  field?: string;
  message: string;
};

export type FlowValidationResult = {
  valid: boolean;
  errors: FlowValidationError[];
  warnings: FlowValidationError[];
};

export function validateFlow(nodes: unknown, products?: { id: string }[]): FlowValidationResult {
  const errors: FlowValidationError[] = [];
  const warnings: FlowValidationError[] = [];

  if (!Array.isArray(nodes)) {
    errors.push({ message: "O fluxo deve ser um array de nós." });
    return { valid: false, errors, warnings };
  }

  if (nodes.length === 0) {
    warnings.push({ message: "O fluxo está vazio. Nenhum nó foi configurado." });
    return { valid: true, errors, warnings };
  }

  const ids = new Set<string>();

  for (const node of nodes) {
    if (!node || typeof node !== "object") {
      errors.push({ message: "Nó inválido: deve ser um objeto." });
      continue;
    }

    const n = node as Record<string, any>;

    if (!n.id || typeof n.id !== "string" || n.id.trim() === "") {
      errors.push({ nodeId: n.id, message: "Nó sem 'id' válido." });
      continue;
    }

    if (ids.has(n.id)) {
      errors.push({ nodeId: n.id, field: "id", message: `ID duplicado: '${n.id}'.` });
    }
    ids.add(n.id);

    if (!n.title || typeof n.title !== "string" || n.title.trim() === "") {
      warnings.push({ nodeId: n.id, field: "title", message: `Nó '${n.id}' sem título.` });
    }

    if (n.actionType && !VALID_ACTION_TYPES.includes(n.actionType)) {
      errors.push({
        nodeId: n.id,
        field: "actionType",
        message: `actionType '${n.actionType}' inválido. Valores aceitos: ${VALID_ACTION_TYPES.join(", ")}.`,
      });
    }

    if (n.keyword !== undefined && n.keyword !== null) {
      if (typeof n.keyword !== "string" && typeof n.keyword !== "number") {
        errors.push({ nodeId: n.id, field: "keyword", message: "keyword deve ser string ou número." });
      }
    }

    if (n.parentId !== undefined && n.parentId !== null && typeof n.parentId !== "string") {
      errors.push({ nodeId: n.id, field: "parentId", message: "parentId deve ser string." });
    }

    if (n.price !== undefined) {
      const priceVal = Number(n.price);
      if (isNaN(priceVal) || priceVal < 0) {
        errors.push({ nodeId: n.id, field: "price", message: "price deve ser um número não-negativo." });
      }
    }

    if (n.actionType === "collect_data" && !n.variableName) {
      warnings.push({
        nodeId: n.id,
        field: "variableName",
        message: "Nó 'collect_data' sem variableName definido.",
      });
    }

    if (n.actionType === "product" && n.productId && products) {
      const productExists = products.some((p) => String(p.id) === String(n.productId));
      if (!productExists) {
        errors.push({
          nodeId: n.id,
          field: "productId",
          message: `productId '${n.productId}' não existe no catálogo.`,
        });
      }
    }
  }

  const idsArray = Array.from(ids);

  for (const node of nodes) {
    const n = node as Record<string, any>;
    if (n?.parentId && !idsArray.includes(n.parentId)) {
      errors.push({
        nodeId: n.id,
        field: "parentId",
        message: `parentId '${n.parentId}' não existe no fluxo.`,
      });
    }
  }

  // Detecta ciclos seguindo a cadeia de parentId
  const byId = new Map<string, Record<string, any>>();
  for (const node of nodes) {
    const n = node as Record<string, any>;
    if (n?.id) byId.set(String(n.id), n);
  }
  for (const node of nodes) {
    const n = node as Record<string, any>;
    if (!n?.id) continue;
    const visited = new Set<string>();
    let current: Record<string, any> | undefined = n;
    while (current && current.parentId) {
      if (visited.has(String(current.id))) {
        errors.push({
          nodeId: n.id,
          field: "parentId",
          message: `Ciclo detectado envolvendo o nó '${current.id}'.`,
        });
        break;
      }
      visited.add(String(current.id));
      current = byId.get(String(current.parentId));
    }
  }

  // Keywords duplicadas entre irmãos (mesmo parentId)
  const siblingKeywords = new Map<string, Map<string, string>>();
  for (const node of nodes) {
    const n = node as Record<string, any>;
    if (n?.keyword === undefined || n?.keyword === null) continue;
    const parentKey = n.parentId ? String(n.parentId) : "__root__";
    if (!siblingKeywords.has(parentKey)) siblingKeywords.set(parentKey, new Map());
    const kwMap = siblingKeywords.get(parentKey)!;
    const kw = String(n.keyword).trim();
    if (kw === "") continue;
    if (kwMap.has(kw)) {
      errors.push({
        nodeId: n.id,
        field: "keyword",
        message: `Keyword '${kw}' duplicada entre irmãos (também usada por '${kwMap.get(kw)}').`,
      });
    } else {
      kwMap.set(kw, n.id);
    }
  }

  const rootNodes = nodes.filter((n: any) => n && !n.parentId);
  if (rootNodes.length === 0 && nodes.length > 0) {
    warnings.push({ message: "Todos os nós têm parentId. Não há nó raiz." });
  }

  return { valid: errors.length === 0, errors, warnings };
}
