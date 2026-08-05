import { describe, it, expect } from "vitest";
import { normalizePlanId, getPlanDetails, PLANS, blockedModuleForPath, getPlanModules } from "./plans";

describe("normalizePlanId", () => {
  const cases: Array<[string | null | undefined, string]> = [
    // Canônicos
    ["start", "start"],
    ["plano_97", "plano_97"],
    ["growth", "growth"],
    ["scale", "scale"],
    // Vocabulário legado
    ["solo", "start"],
    ["fixo", "start"],
    ["pro", "growth"],
    ["equipe", "growth"],
    ["business", "scale"],
    ["enterprise", "scale"],
    ["corporativo", "scale"],
    ["site_gratis", "plano_97"],
    // Nomes crus de produto gravados por webhooks/checkout
    ["Plano Start (R$ 67/mês)", "start"],
    ["Só Bot (Assinatura)", "start"],
    ["Bot Starter", "start"],
    ["Plano 97 (R$ 97/mês)", "plano_97"],
    ["Site + Bot (R$ 97)", "plano_97"],
    ["Plano Growth (Mais Vendido ⭐)", "growth"],
    ["CRM + Bot de IA", "growth"],
    ["Bot Pro IA", "growth"],
    ["Plano Scale (R$ 497/mês)", "scale"],
    ["Loja Virtual E-Commerce", "scale"],
    ["497", "scale"],
    // Vazios e desconhecidos => fail-closed (start)
    ["", "start"],
    [undefined, "start"],
    [null, "start"],
    ["plano_criativo_aleatorio", "start"],
  ];

  it.each(cases)("normaliza %s => %s", (input, expected) => {
    expect(normalizePlanId(input)).toBe(expected);
  });

  it("getPlanDetails de plano desconhecido retorna o plano Start (fail-closed)", () => {
    expect(getPlanDetails("qualquer_coisa_estranha").id).toBe("start");
    expect(getPlanDetails("").id).toBe("start");
  });

  it("getPlanDetails mapeia valores legados para os planos corretos", () => {
    expect(getPlanDetails("solo").id).toBe("start");
    expect(getPlanDetails("pro").id).toBe("growth");
    expect(getPlanDetails("enterprise").id).toBe("scale");
    expect(getPlanDetails("site_gratis").id).toBe("plano_97");
  });

  it("PLANS contém os 4 ids canônicos", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["growth", "plano_97", "scale", "start"]);
  });
});

describe("blockedModuleForPath (bloqueio por URL)", () => {
  it("plano Start é bloqueado nas rotas pagas, mas acessa conversas", () => {
    expect(blockedModuleForPath("/vendas", "start")).toBe("crm");
    expect(blockedModuleForPath("/agenda", "start")).toBe("agenda");
    expect(blockedModuleForPath("/workflow", "start")).toBe("disparos");
    expect(blockedModuleForPath("/equipe", "start")).toBe("equipe");
    expect(blockedModuleForPath("/meu-projeto", "start")).toBe("site");
    expect(blockedModuleForPath("/conversas", "start")).toBeNull();
    // rotas sem plano pago (dashboard/settings/whatsapp) nunca bloqueiam
    expect(blockedModuleForPath("/dashboard", "start")).toBeNull();
    expect(blockedModuleForPath("/settings", "start")).toBeNull();
  });

  it("plano 97 libera agenda/site mas bloqueia CRM e disparos", () => {
    expect(blockedModuleForPath("/agenda", "plano_97")).toBeNull();
    expect(blockedModuleForPath("/meu-projeto", "plano_97")).toBeNull();
    expect(blockedModuleForPath("/vendas", "plano_97")).toBe("crm");
    expect(blockedModuleForPath("/workflow", "plano_97")).toBe("disparos");
  });

  it("plano Growth libera CRM e equipe, bloqueia e-commerce/disparos", () => {
    expect(blockedModuleForPath("/vendas", "growth")).toBeNull();
    expect(blockedModuleForPath("/equipe", "growth")).toBeNull();
    expect(blockedModuleForPath("/ecommerce", "growth")).toBe("ecommerce");
    expect(blockedModuleForPath("/workflow", "growth")).toBe("disparos");
  });

  it("plano Scale tem tudo liberado", () => {
    for (const p of ["/vendas", "/agenda", "/equipe", "/workflow", "/ecommerce", "/meu-projeto", "/conversas"]) {
      expect(blockedModuleForPath(p, "scale")).toBeNull();
    }
  });

  it("plano desconhecido é tratado como Start (fail-closed)", () => {
    expect(blockedModuleForPath("/vendas", "plano_estranho")).toBe("crm");
    expect(blockedModuleForPath("/vendas", "")).toBe("crm");
    expect(blockedModuleForPath("/vendas", null)).toBe("crm");
  });

  it("cobre sub-rotas (ex: /vendas/123)", () => {
    expect(blockedModuleForPath("/vendas/novo", "start")).toBe("crm");
    expect(blockedModuleForPath("/conversas/abc", "start")).toBeNull();
  });

  it("planos sem lista própria caem no fallback Start", () => {
    expect(getPlanModules("plano_desconhecido")).toEqual(getPlanModules("start"));
  });
});
