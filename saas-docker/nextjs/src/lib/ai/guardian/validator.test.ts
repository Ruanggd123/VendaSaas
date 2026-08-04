import { describe, it, expect } from "vitest";
import { validateIntent } from "./validator";

const toolDefinitions = [
  {
    function: {
      name: "criar_ordem_servico",
      parameters: {
        required: ["modelo_aparelho", "defeito_relatado", "orcamento_estimado"],
      },
    },
  },
];

describe("validateIntent", () => {
  it("valida intent com todos os campos obrigatórios", () => {
    const result = validateIntent(
      "criar_ordem_servico",
      { modelo_aparelho: "iPhone 14", defeito_relatado: "Não carrega", orcamento_estimado: 0 },
      toolDefinitions
    );
    expect(result.valid).toBe(true);
    expect(result.parameters?.orcamento_estimado).toBe(0);
  });

  it("rejeita campos vazios", () => {
    const result = validateIntent(
      "criar_ordem_servico",
      { modelo_aparelho: "", defeito_relatado: "Não carrega", orcamento_estimado: 0 },
      toolDefinitions
    );
    expect(result.valid).toBe(false);
    expect(result.response).toMatch(/modelo_aparelho/);
  });

  it("rejeita tool inexistente", () => {
    const result = validateIntent("tool_ficticia", { foo: "bar" }, toolDefinitions);
    expect(result.valid).toBe(false);
  });

  it("rejeita valores inválidos (null, undefined, n/a)", () => {
    const result = validateIntent(
      "criar_ordem_servico",
      { modelo_aparelho: null, defeito_relatado: "n/a", orcamento_estimado: 0 },
      toolDefinitions
    );
    expect(result.valid).toBe(false);
  });
});
