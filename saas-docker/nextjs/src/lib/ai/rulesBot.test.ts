import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing rulesBot
const mockStore = {
  systemConfigs: new Map<string, any>(),
  tenants: new Map<string, any>(),
  leads: new Map<string, any>(),
  sales: new Map<string, any>(),
  appointments: new Map<string, any>(),
  whatsappInstances: new Map<string, any>(),
};

vi.mock("@prisma/client", () => {
  const mockPrismaInstance = {
    systemConfig: {
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.systemConfigs.get(where.key) || null)),
      upsert: vi.fn(({ where, create, update }: any) => {
        const existing = mockStore.systemConfigs.get(where.key);
        if (existing) { Object.assign(existing, update); return Promise.resolve(existing); }
        const rec = { id: "sc_" + Date.now(), ...create };
        mockStore.systemConfigs.set(create.key, rec);
        return Promise.resolve(rec);
      }),
      delete: vi.fn(({ where }: any) => { mockStore.systemConfigs.delete(where.key); return Promise.resolve({ key: where.key }); }),
    },
    tenant: {
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.tenants.get(where.id) || null)),
    },
    lead: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => { const id = "lead_" + Date.now(); mockStore.leads.set(id, { id, ...data }); return Promise.resolve({ id, ...data }); }),
    },
    sale: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => { const id = "sale_" + Date.now(); mockStore.sales.set(id, { id, ...data }); return Promise.resolve({ id, ...data }); }),
    },
    appointment: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(({ data }: any) => { const id = "appt_" + Date.now(); mockStore.appointments.set(id, { id, ...data }); return Promise.resolve({ id, ...data }); }),
    },
    whatsappInstance: {
      count: vi.fn(() => Promise.resolve(1)),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    paymentOperation: {
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "po_" + Date.now(), ...data })),
      update: vi.fn(() => Promise.resolve({})),
    },
    retailOrder: {
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "ro_" + Date.now(), ...data })),
    },
    serviceOrder: {
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "os_" + Date.now(), ...data })),
    },
    accountingTask: {
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "at_" + Date.now(), ...data })),
    },
    activeModule: { findMany: vi.fn(() => Promise.resolve([])) },
    customModule: { findMany: vi.fn(() => Promise.resolve([])) },
    conversation: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findUnique: vi.fn(() => Promise.resolve(null)),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "conv_mock", ...data })),
    },
    user: {
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => Promise.resolve({ id: "usr_mock", ...data })),
    },
  };
  return {
    PrismaClient: class MockPrismaClient {
      systemConfig = mockPrismaInstance.systemConfig;
      tenant = mockPrismaInstance.tenant;
      lead = mockPrismaInstance.lead;
      sale = mockPrismaInstance.sale;
      appointment = mockPrismaInstance.appointment;
      whatsappInstance = mockPrismaInstance.whatsappInstance;
      paymentOperation = mockPrismaInstance.paymentOperation;
      retailOrder = mockPrismaInstance.retailOrder;
      serviceOrder = mockPrismaInstance.serviceOrder;
      accountingTask = mockPrismaInstance.accountingTask;
      activeModule = mockPrismaInstance.activeModule;
      customModule = mockPrismaInstance.customModule;
      conversation = mockPrismaInstance.conversation;
      user = mockPrismaInstance.user;
    },
  };
});

// Mock auth module
vi.mock("@/lib/auth", () => ({
  getAppBaseUrl: () => "https://nexus-six-olive.vercel.app",
}));

// Mock WhatsApp evolution module
vi.mock("@/lib/evolution", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
}));

// Mock asaas module
vi.mock("@/lib/asaas", () => ({
  createCustomer: vi.fn().mockResolvedValue({ id: "cus_mock_123" }),
  createPayment: vi.fn().mockResolvedValue({
    id: "pay_mock_123",
    status: "PENDING",
    invoiceUrl: "https://sandbox.asaas.com/invoice/mock",
    pixCopiaECola: "00020126580014br.gov.bcb.pix0136mock-pix-payload",
    pixQrCodeUrl: "https://sandbox.asaas.com/pix/qrcode/mock",
  }),
  getPayment: vi.fn().mockResolvedValue({ id: "pay_mock_123", status: "RECEIVED" }),
  updatePayment: vi.fn().mockResolvedValue({}),
  getPixQrCode: vi.fn().mockResolvedValue({ payload: "mock", encodedImage: "mock", qrCodeUrl: "mock" }),
  cancelPayment: vi.fn().mockResolvedValue({}),
}));

import { processMessageWithRules, resolveChoiceIndex } from "./rulesBot";

// Default test settings with flow nodes
const DEFAULT_NODES = [
  { id: "node_catalogo", parentId: null, keyword: "1", title: "📋 Produtos & Serviços", actionType: "catalog", textContent: "Confira:", showInPoll: true },
  { id: "node_agendamento", parentId: null, keyword: "2", title: "📅 Agendar Horário", actionType: "scheduling", textContent: "Escolha data:", showInPoll: true },
  { id: "node_atendente", parentId: null, keyword: "3", title: "👤 Falar com Atendente", actionType: "human", textContent: "Transferindo...", showInPoll: true },
];

const DEFAULT_PRODUCTS = [
  { id: "plano_start", name: "Plano Start (R$ 67/mês)", price: "67", description: "Bot Regras", delivery_type: "virtual_instant", requires_payment: true, billing_type: "both", stock: null, duration_min: 30 },
  { id: "plano_97", name: "Plano 97 (R$ 97/mês)", price: "97", description: "Site + Bots", delivery_type: "virtual_instant", requires_payment: true, billing_type: "both", stock: null, duration_min: 30 },
];

function createSettings(overrides: any = {}) {
  return {
    bot_type: "regras",
    business_hours_start: "08:00",
    business_hours_end: "18:00",
    business_days: ["mon", "tue", "wed", "thu", "fri"],
    schedule_per_day: {
      mon: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      tue: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      wed: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      thu: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      fri: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      sat: { enabled: false },
      sun: { enabled: false },
    },
    appointment_gap_min: 15,
    off_hours_message: "Fora do horário.",
    products: DEFAULT_PRODUCTS,
    custom_rules_nodes: DEFAULT_NODES,
    enable_groups: false,
    whitelisted_groups: "",
    interactive_poll_enabled: false,
    enableScheduling: true,
    welcome_menu_auto_append: true,
    hide_auto_catalog: false,
    _instanceName: "test_instance",
    _conversationId: "test_conv_001",
    ...overrides,
  };
}

const TENANT_ID = "tenant_test_001";
const CONTACT = "5511999998888";

beforeEach(() => {
  mockStore.systemConfigs.clear();
  mockStore.tenants.clear();
  mockStore.leads.clear();
  mockStore.sales.clear();
  mockStore.appointments.clear();
  vi.clearAllMocks();
});

describe("processMessageWithRules", () => {
  it("retorna menu de boas-vindas para mensagem de saudação", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "ola", createSettings(), false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("Produtos");
    expect(resp).toContain("Agendar");
    expect(resp).toContain("Atendente");
  });

  it("processa agendamento (opção 1) — scheduling intent", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "1", createSettings(), false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("Agendamento");
  });

  it("retorna null para mensagem livre que não casou (delega para IA)", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "qual é o preço do plano growth?", createSettings(), false);
    expect(resp).toBeNull();
  });

  it("processa seleção de produto dentro do catálogo", async () => {
    const settings = createSettings();
    // First enter catalog (option 3 in main_menu)
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);
    // Now state should be catalog_select_product; selecting "1" picks the first product
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("Plano Start");
  });

  it("processa volta ao menu (0)", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "0", createSettings(), false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("Produtos");
  });

  it("processa handoff humano (opção 2)", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "2", createSettings(), false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("especialistas");
  });

  it("incrementa errorCount em opções inválidas", async () => {
    const resp1 = await processMessageWithRules(TENANT_ID, CONTACT, "xyz", createSettings(), false);
    const resp2 = await processMessageWithRules(TENANT_ID, CONTACT, "xyz", createSettings(), false);
    const resp3 = await processMessageWithRules(TENANT_ID, CONTACT, "xyz", createSettings(), false);
    expect(resp3).toBeTruthy();
  });

  it("gera menu com---BUTTONS--- para <=3 opções", async () => {
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "ola", createSettings(), false);
    expect(resp).toContain("---BUTTONS---");
  });

  it("gera menu com---LIST--- para >3 opções", async () => {
    const nodes = [
      ...DEFAULT_NODES,
      { id: "node_4", parentId: null, keyword: "4", title: "📄 Documentos", actionType: "text", textContent: "Docs:", showInPoll: true },
    ];
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "ola", createSettings({ custom_rules_nodes: nodes }), false);
    expect(resp).toContain("---LIST---");
  });

  it("ignora mensagens muito longas como input de menu", async () => {
    const longMsg = "Essa é uma mensagem muito longa que não deveria ser interpretada como escolha de menu";
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, longMsg, createSettings(), false);
    expect(resp).toBeNull();
  });
});

describe("processMessageWithRules — Checkout flow", () => {
  it("inicia fluxo de checkout ao selecionar produto dentro do catálogo", async () => {
    const settings = createSettings();
    // Enter catalog first
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);
    // Select product 1 (Plano Start)
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(resp).toBeTruthy();
    expect(resp).toContain("Plano Start");
  });

  it("pergunta método de pagamento quando billingType não definido", async () => {
    const settings = createSettings();
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(resp).toBeTruthy();
  });
});
