import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

vi.mock("@prisma/client", () => {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue([]),
    systemConfig: {
      findUnique: vi.fn(({ where }: any) => {
        const value = store.get(where.key);
        return Promise.resolve(value ? { key: where.key, value } : null);
      }),
      count: vi.fn(({ where }: any) => {
        const prefix = where.key.startsWith;
        let total = 0;
        for (const key of store.keys()) {
          if (key.startsWith(prefix)) total++;
        }
        return Promise.resolve(total);
      }),
      create: vi.fn(({ data }: any) => {
        store.set(data.key, data.value);
        return Promise.resolve({ key: data.key, value: data.value });
      }),
    },
  };
  return {
    PrismaClient: class MockPrismaClient {
      $transaction = vi.fn((fn: any) => fn(tx));
    },
  };
});

import { reserveMonthlyAttendance } from "./usage";

const TENANT_ID = "tenant_usage_001";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("reserveMonthlyAttendance", () => {
  it("não conta quando o plano não tem limite (maxConversations null)", async () => {
    const result = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "scale",
      instanceName: "instancia_1",
      contactNumber: "5511999991111",
    });
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.counted).toBe(false);
  });

  it("conta cada contato único e libera enquanto estiver abaixo do limite", async () => {
    const a = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "start",
      instanceName: "instancia_1",
      contactNumber: "5511999991111",
    });
    expect(a.allowed).toBe(true);
    expect(a.counted).toBe(true);

    const b = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "start",
      instanceName: "instancia_1",
      contactNumber: "5511999992222",
    });
    expect(b.allowed).toBe(true);
    expect(b.counted).toBe(true);

    const c = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "start",
      instanceName: "instancia_1",
      contactNumber: "5511999991111",
    });
    // Mesmo contato já contado: libera sem contar de novo
    expect(c.allowed).toBe(true);
    expect(c.counted).toBe(false);
  });

  it("bloqueia quando o limite do plano é atingido", async () => {
    // Plano start = 1000 por mês; simula 1000 contatos únicos
    for (let i = 0; i < 1000; i++) {
      await reserveMonthlyAttendance({
        tenantId: TENANT_ID,
        tenantPlan: "start",
        instanceName: "instancia_1",
        contactNumber: `551199999${String(1000 + i).padStart(4, "0")}`,
      });
    }

    const blocked = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "start",
      instanceName: "instancia_1",
      contactNumber: "5511999998888",
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.used).toBe(1000);
    expect(blocked.limit).toBe(1000);
  });

  it("respeita limite configurado manualmente quando é maior que o do plano", async () => {
    const result = await reserveMonthlyAttendance({
      tenantId: TENANT_ID,
      tenantPlan: "growth",
      instanceName: "instancia_1",
      contactNumber: "5511999991111",
      configuredLimit: 50,
    });
    expect(result.limit).toBe(50);
  });
});
