import { describe, it, expect, vi, afterEach } from "vitest";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: mockGetSession,
}));

import { getPlanModules, planHas, PLAN_MODULES, assertModule, MODULES } from "./permissions";

describe("matriz de permissões por plano", () => {
  it("todos os planos canônicos estão na matriz", () => {
    for (const planId of ["start", "plano_97", "growth", "scale"]) {
      expect(Array.isArray(PLAN_MODULES[planId])).toBe(true);
    }
  });

  it("plano Start tem acesso só ao básico", () => {
    const modules = getPlanModules("start");
    expect(modules).toContain("conversas");
    expect(modules).toContain("whatsapp");
    expect(modules).not.toContain("agenda");
    expect(modules).not.toContain("crm");
    expect(modules).not.toContain("equipe");
    expect(modules).not.toContain("site");
    expect(modules).not.toContain("ai");
    expect(modules).not.toContain("ecommerce");
    expect(modules).not.toContain("disparos");
  });

  it("plano 97 adiciona agenda, site e IA", () => {
    const modules = getPlanModules("plano_97");
    expect(modules).toContain("agenda");
    expect(modules).toContain("site");
    expect(modules).toContain("ai");
    expect(modules).not.toContain("crm");
    expect(modules).not.toContain("disparos");
  });

  it("plano Growth adiciona CRM e equipe", () => {
    const modules = getPlanModules("growth");
    expect(modules).toContain("crm");
    expect(modules).toContain("equipe");
    expect(modules).not.toContain("ecommerce");
    expect(modules).not.toContain("disparos");
  });

  it("plano Scale tem tudo", () => {
    const modules = getPlanModules("scale");
    for (const m of Object.values(MODULES)) {
      expect(modules).toContain(m);
    }
  });

  it("plano desconhecido falha fechado (vira Start)", () => {
    expect(getPlanModules("plano_aleatorio")).toEqual(getPlanModules("start"));
    expect(getPlanModules("")).toEqual(getPlanModules("start"));
  });

  it("planHas respeita os módulos por plano", () => {
    expect(planHas("start", "conversas")).toBe(true);
    expect(planHas("start", "crm")).toBe(false);
    expect(planHas("solo", "crm")).toBe(false);
    expect(planHas("pro", "crm")).toBe(true);
    expect(planHas("enterprise", "ecommerce")).toBe(true);
    expect(planHas("unknown_plan", "crm")).toBe(false);
  });
});

describe("assertModule", () => {
  afterEach(() => {
    mockGetSession.mockReset();
  });

  it("retorna 401 sem sessão", async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await assertModule("crm");
    expect(res?.status).toBe(401);
  });

  it("retorna 403 se o plano não inclui o módulo", async () => {
    mockGetSession.mockResolvedValue({ id: "u1", role: "client", tenant_id: "t1", tenant_plan: "start" });
    const res = await assertModule("crm");
    expect(res?.status).toBe(403);
    const body = await res!.json();
    expect(body.module).toBe("crm");
  });

  it("retorna null se o plano inclui o módulo", async () => {
    mockGetSession.mockResolvedValue({ id: "u1", role: "client", tenant_id: "t1", tenant_plan: "start" });
    expect(await assertModule("conversas")).toBeNull();
  });

  it("superadmin e parceiro (degustação) têm acesso global", async () => {
    mockGetSession.mockResolvedValue({ id: "u1", role: "superadmin", tenant_id: "t1", tenant_plan: "solo" });
    expect(await assertModule("ecommerce")).toBeNull();

    mockGetSession.mockResolvedValue({ id: "u1", role: "partner", tenant_id: "t1" });
    expect(await assertModule("ecommerce")).toBeNull();
  });
});
