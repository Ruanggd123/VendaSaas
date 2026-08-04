import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Shared mock store
const mockStore: Record<string, any> = {
  tenants: new Map<string, any>(),
  conversations: new Map<string, any>(),
  sales: new Map<string, any>(),
  messages: [] as any[],
};

vi.mock("@prisma/client", () => {
  const instance = {
    tenant: {
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.tenants.get(where.id) || null)),
      update: vi.fn(({ where, data }: any) => {
        const t = mockStore.tenants.get(where.id);
        if (t) Object.assign(t, typeof data.settings === "string" ? { settings: data.settings } : data);
        return Promise.resolve(t || {});
      }),
    },
    conversation: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findUnique: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
    },
    sale: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "sale_mock", ...data })),
      update: vi.fn(() => Promise.resolve({})),
    },
    activeModule: { findMany: vi.fn(() => Promise.resolve([])) },
    customModule: { findMany: vi.fn(() => Promise.resolve([])) },
    lead: { findFirst: vi.fn(() => Promise.resolve(null)), create: vi.fn(({ data }: any) => Promise.resolve({ id: "lead_mock", ...data })) },
    appointment: { findFirst: vi.fn(() => Promise.resolve(null)), findMany: vi.fn(() => Promise.resolve([])), create: vi.fn(({ data }: any) => Promise.resolve({ id: "appt_mock", ...data })) },
    whatsappInstance: { count: vi.fn(() => Promise.resolve(1)), findFirst: vi.fn(() => Promise.resolve(null)) },
  };
  return {
    PrismaClient: class MockPrismaClient {
      tenant = instance.tenant;
      conversation = instance.conversation;
      sale = instance.sale;
      activeModule = instance.activeModule;
      customModule = instance.customModule;
      lead = instance.lead;
      appointment = instance.appointment;
      whatsappInstance = instance.whatsappInstance;
    },
  };
});

vi.mock("@/lib/auth", () => ({
  getAppBaseUrl: () => "https://nexus-six-olive.vercel.app",
}));

vi.mock("@/lib/rag", () => ({
  getRelevantKnowledge: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/lib/ai/policies", () => ({
  extraPoliciesPrompt: "",
}));

vi.mock("@/lib/ai/guardian/security", () => ({
  sanitizeInput: vi.fn((msg: string) => msg),
  validateOutput: vi.fn((_out: string, _ctx: any) => true),
  checkRateLimit: vi.fn(() => true),
}));

vi.mock("@/lib/ai/tools", () => ({
  aiTools: [],
  handleToolCall: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/currency", () => ({
  formatBRL: vi.fn((v: number) => `R$ ${v.toFixed(2)}`),
  getProductPrice: vi.fn((p: any) => Number(p?.price) || 0),
  getProductPriceLabel: vi.fn((p: any) => `R$ ${p?.price}`),
}));

vi.mock("@/lib/ai/guardian/templates", () => ({
  templates: {
    appointment_scheduled: vi.fn(() => "Agendamento confirmado"),
  },
}));

import { processMessageWithAI } from "./engine";
import { checkRateLimit } from "@/lib/ai/guardian/security";

const TENANT_ID = "tenant_engine_001";
const CONTACT = "5511999998888";

function setupTenant(overrides: any = {}) {
  const tenant = {
    id: TENANT_ID,
    name: "Teste Engine",
    phone: "5511999998888",
    plan: "premium",
    settings: JSON.stringify({
      bot_type: "ia",
      ia_model: "deepseek-chat",
      deepseek_api_key: "sk-test",
      business_hours_start: "08:00",
      business_hours_end: "18:00",
      products: [{ name: "Plano Teste", price: "97", description: "Plano unitário" }],
      ...overrides,
    }),
    subscription_expires_at: new Date(Date.now() + 86400000),
    whitelisted_groups: "",
  };
  mockStore.tenants.set(TENANT_ID, tenant);
  return tenant;
}

beforeEach(() => {
  mockStore.tenants.clear();
  mockStore.conversations.clear();
  mockStore.sales.clear();
  mockStore.messages = [];
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockReturnValue(true);
});

describe("processMessageWithAI — Provider Routing", () => {
  it("retorna erro se tenant não existe", async () => {
    const resp = await processMessageWithAI("nonexistent_tenant", CONTACT, "oi");
    expect(resp).toContain("não consegui identificar");
  });

  it("retorna erro se assinatura expirada", async () => {
    const tenant = setupTenant();
    tenant.subscription_expires_at = new Date(Date.now() - 86400000);
    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "oi");
    expect(resp).toContain("assinatura");
    expect(resp).toContain("suspenso");
  });

  it("retorna erro de configuração quando nenhuma chave de API está disponível", async () => {
    setupTenant({
      deepseek_api_key: "",
      groq_api_key: "",
      openai_api_key: "",
      gemini_api_key: "",
    });
    process.env.GROQ_API_KEY = "";
    process.env.OPENROUTER_API_KEY = "";
    process.env.DEEPSEEK_API_KEY = "";
    process.env.GEMINI_API_KEY = "";
    process.env.OPENAI_API_KEY = "";
    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "ola");
    expect(resp).toContain("nenhuma chave de API válida");
  });

  it("bloqueia mensagens em grupo quando enable_groups é false", async () => {
    setupTenant({ enable_groups: false });
    const resp = await processMessageWithAI(TENANT_ID, "1234567890123@g.us", "ola");
    expect(resp).toBeNull();
  });

  it("retorna null para conversa com ai_paused=true", async () => {
    setupTenant();
    vi.mocked(
      (await import("@prisma/client")).PrismaClient.prototype as any
    );
    const mockConv = {
      id: "conv_001",
      ai_paused: true,
      contact_name: "Cliente Pausado",
      messages: [],
    };
    const prismaModule = await import("@prisma/client");
    const prisma = new prismaModule.PrismaClient();
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce(mockConv as any);

    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "ola");
    expect(resp).toBeNull();
  });
});

describe("processMessageWithAI — Bot Type Routing", () => {
  it("redireciona para rulesBot quando bot_type=regras e retorna null sem fallback", async () => {
    setupTenant({ bot_type: "regras" });
    vi.mocked(
      (await import("@prisma/client")).PrismaClient.prototype as any
    );
    const prismaModule = await import("@prisma/client");
    const prisma = new prismaModule.PrismaClient();

    const mockConversation = {
      id: "conv_002",
      ai_paused: false,
      contact_name: "Teste",
      messages: [],
    };
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce(mockConversation as any);

    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "mensagem qualquer que não casou");
    expect(resp).toBeNull();
  });
});

describe("processMessageWithAI — Rate Limiting", () => {
  it("retorna mensagem de rate limit quando checkRateLimit retorna false", async () => {
    setupTenant();
    vi.mocked(checkRateLimit).mockReturnValueOnce(false);

    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "ola");
    expect(resp).toContain("Muitas mensagens");
  });

  it("ignora rate limit para mensagens do proprietário (isMessageToMyself=true)", async () => {
    setupTenant();
    const callCountBefore = vi.mocked(checkRateLimit).mock.calls.length;
    // Should return early before reaching provider or show subscription error
    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "ola", true);
    // checkRateLimit was not called because isMessageToMyself bypasses it
    expect(vi.mocked(checkRateLimit).mock.calls.length).toBe(callCountBefore);
  });
});

describe("processMessageWithAI — Demo Mode", () => {
  it("ativa modo teste-ia", async () => {
    setupTenant();
    const prismaModule = await import("@prisma/client");
    const prisma = new prismaModule.PrismaClient();
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({
      id: "conv_demo_01",
      ai_paused: false,
      contact_name: "Parceiro",
      messages: [],
    } as any);

    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "#teste-ia");
    expect(resp).toContain("Demonstração IA");
  });

  it("ativa modo teste-regras", async () => {
    setupTenant();
    const prismaModule = await import("@prisma/client");
    const prisma = new prismaModule.PrismaClient();
    vi.mocked(prisma.conversation.findFirst).mockResolvedValueOnce({
      id: "conv_demo_02",
      ai_paused: false,
      contact_name: "Parceiro",
      messages: [],
    } as any);

    const resp = await processMessageWithAI(TENANT_ID, CONTACT, "#teste-regras");
    expect(resp).toContain("Demonstração Regras");
  });
});
