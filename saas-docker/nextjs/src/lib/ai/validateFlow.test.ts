import { describe, it, expect } from "vitest";
import { validateFlow } from "./validateFlow";

describe("validateFlow", () => {
  it("aceita fluxo vazio com aviso", () => {
    const result = validateFlow([]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("vazio");
  });

  it("rejeita input que não é array", () => {
    const result = validateFlow(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("array");
  });

  it("rejeita input que é string", () => {
    const result = validateFlow("invalid");
    expect(result.valid).toBe(false);
  });

  it("aceita fluxo válido com nós mínimos", () => {
    const nodes = [
      { id: "n1", title: "Menu Principal", actionType: "text", keyword: "1" },
      { id: "n2", parentId: "n1", title: "Sub-item", textContent: "Detalhes" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detecta IDs duplicados", () => {
    const nodes = [
      { id: "n1", title: "Item 1" },
      { id: "n1", title: "Item Duplicado" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("duplicado"))).toBe(true);
  });

  it("rejeita nó sem id", () => {
    const nodes = [
      { title: "Sem ID", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("id");
  });

  it("avisa quando nó não tem título", () => {
    const nodes = [
      { id: "n1", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("título"))).toBe(true);
  });

  it("rejeita actionType inválido", () => {
    const nodes = [
      { id: "n1", title: "Teste", actionType: "invalid_action" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("actionType");
  });

  it("aceita todos os actionType válidos", () => {
    const nodes = [
      { id: "n1", title: "Catalog", actionType: "catalog", keyword: "1" },
      { id: "n2", title: "Scheduling", actionType: "scheduling", keyword: "2" },
      { id: "n3", title: "Human", actionType: "human", keyword: "3" },
      { id: "n4", title: "Collect", actionType: "collect_data", variableName: "nome" },
      { id: "n5", title: "Text", actionType: "text", keyword: "5" },
      { id: "n6", title: "Product", actionType: "product", keyword: "6" },
      { id: "n7", title: "Checkout", actionType: "checkout", keyword: "7" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detecta parentId inexistente", () => {
    const nodes = [
      { id: "n1", title: "Parent", actionType: "text" },
      { id: "n2", parentId: "n999", title: "Órfão", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("não existe"))).toBe(true);
  });

  it("aceita nó com parentId válido", () => {
    const nodes = [
      { id: "parent", title: "Pai", actionType: "catalog" },
      { id: "child", parentId: "parent", title: "Filho", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });

  it("avisa quando collect_data não tem variableName", () => {
    const nodes = [
      { id: "n1", title: "Coletar Nome", actionType: "collect_data" },
    ];
    const result = validateFlow(nodes);
    expect(result.warnings.some((w) => w.message.includes("variableName"))).toBe(true);
  });

  it("rejeita preço negativo", () => {
    const nodes = [
      { id: "n1", title: "Produto", actionType: "product", price: -10 },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("price");
  });

  it("aceita preço válido como string", () => {
    const nodes = [
      { id: "n1", title: "Produto", actionType: "product", price: "97" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });

  it("avisa quando não há nó raiz", () => {
    const nodes = [
      { id: "n1", parentId: "n0", title: "Órfão", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.warnings.some((w) => w.message.includes("nó raiz"))).toBe(true);
  });

  it("não aceita keyword como tipo inválido", () => {
    const nodes = [
      { id: "n1", title: "Teste", keyword: true },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("keyword");
  });

  it("aceita keyword numérica", () => {
    const nodes = [
      { id: "n1", title: "Opção 1", keyword: 1 },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });

  it("aceita nó inválido ignorado (null no array)", () => {
    const nodes = [null, { id: "n1", title: "OK" }];
    const result = validateFlow(nodes as any);
    expect(result.errors.some((e) => e.message.includes("inválido"))).toBe(true);
  });

  it("rejeita keyword duplicada entre irmãos", () => {
    const nodes = [
      { id: "n1", title: "Opção 1", keyword: "1", parentId: null },
      { id: "n2", title: "Opção 2", keyword: "1", parentId: null },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "keyword" && e.message.includes("duplicada"))).toBe(true);
  });

  it("aceita keywords iguais em níveis diferentes", () => {
    const nodes = [
      { id: "n1", title: "Menu", keyword: "1" },
      { id: "n2", parentId: "n1", title: "Sub 1", keyword: "1" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });

  it("detecta ciclo de parentId", () => {
    const nodes = [
      { id: "n1", parentId: "n2", title: "A", actionType: "text" },
      { id: "n2", parentId: "n1", title: "B", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Ciclo"))).toBe(true);
  });

  it("detecta auto-referência (nó filho de si mesmo)", () => {
    const nodes = [
      { id: "n1", parentId: "n1", title: "Auto", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("Ciclo"))).toBe(true);
  });

  it("aceita cadeia longa sem ciclo", () => {
    const nodes = [
      { id: "n1", title: "Raiz", actionType: "text" },
      { id: "n2", parentId: "n1", title: "Nível 2", actionType: "text" },
      { id: "n3", parentId: "n2", title: "Nível 3", actionType: "text" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });

  it("rejeita productId inexistente no catálogo", () => {
    const nodes = [
      { id: "n1", title: "Produto", actionType: "product", productId: "prod_inexistente" },
    ];
    const result = validateFlow(nodes, [{ id: "prod_real" }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "productId")).toBe(true);
  });

  it("aceita productId existente no catálogo", () => {
    const nodes = [
      { id: "n1", title: "Produto", actionType: "product", productId: "prod_real" },
    ];
    const result = validateFlow(nodes, [{ id: "prod_real" }]);
    expect(result.valid).toBe(true);
  });

  it("não valida productId quando catálogo não é informado", () => {
    const nodes = [
      { id: "n1", title: "Produto", actionType: "product", productId: "prod_qualquer" },
    ];
    const result = validateFlow(nodes);
    expect(result.valid).toBe(true);
  });
});
