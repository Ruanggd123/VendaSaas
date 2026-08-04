import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockStore, mockPrismaInstance } = vi.hoisted(() => {
  const mockStore = {
    systemConfigs: new Map<string, any>(),
    tenants: new Map<string, any>(),
    leads: new Map<string, any>(),
    sales: new Map<string, any>(),
    appointments: new Map<string, any>(),
    whatsappInstances: new Map<string, any>(),
  };

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
      update: vi.fn(({ where, data }: any) => {
        const existing = mockStore.sales.get(where.id);
        if (existing) Object.assign(existing, data);
        return Promise.resolve(existing || {});
      }),
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

  return { mockStore, mockPrismaInstance };
});

vi.mock("@prisma/client", () => {
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
  mockPrismaInstance.sale.findFirst.mockResolvedValue(null);
  mockPrismaInstance.conversation.findFirst.mockResolvedValue(null);
  mockPrismaInstance.conversation.updateMany.mockResolvedValue({ count: 0 });
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

const stateKeyFor = (contact: string = CONTACT, instance: string = "test_instance") =>
  `rulesbot_state_${TENANT_ID}_${instance}_${contact}`;

describe("processMessageWithRules — Sessão e Erros", () => {
  it("expira sessão inativa >30min, reseta para menu e limpa o estado do banco", async () => {
    const settings = createSettings();
    const stateKey = stateKeyFor();
    mockStore.systemConfigs.set(stateKey, {
      key: stateKey,
      value: JSON.stringify({
        step: "collect_data:node_inexistente",
        data: { collect_variable: "nome" },
        updatedAt: Date.now() - 31 * 60 * 1000,
      }),
    });

    // Se a sessão não expirasse, "João" seria coletado e a resposta viria do collect_data.
    // Como expirou (volta ao main_menu), a mensagem curta "João" vira saudação → menu de boas-vindas.
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "João", settings, false);
    expect(resp).toContain("Seja bem-vindo");
    // O estado expirado foi resetado para main_menu (a saudação re-sava um estado novo).
    const saved = mockStore.systemConfigs.get(stateKey);
    expect(saved).toBeDefined();
    expect(JSON.parse(saved.value).step).toBe("main_menu");
  });

  it("mantém sessão ativa dentro de 30min", async () => {
    const settings = createSettings();
    const stateKey = stateKeyFor();
    mockStore.systemConfigs.set(stateKey, {
      key: stateKey,
      value: JSON.stringify({
        step: "collect_data:node_inexistente",
        data: { collect_variable: "nome" },
        updatedAt: Date.now() - 5 * 60 * 1000,
      }),
    });

    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "João", settings, false);
    expect(resp).toContain("Registrado com sucesso");
  });

  it("transfere para humano e pausa IA após 3 erros consecutivos", async () => {
    const settings = createSettings();
    const unmatched = "opcao invalida que nao existe para testar aqui";
    await processMessageWithRules(TENANT_ID, CONTACT, unmatched, settings, false);
    await processMessageWithRules(TENANT_ID, CONTACT, unmatched, settings, false);
    const resp = await processMessageWithRules(TENANT_ID, CONTACT, unmatched, settings, false);

    expect(resp).toContain("transferindo");
    expect(resp).toContain("atendente humano");
    const updateManyCalls = vi.mocked(mockPrismaInstance.conversation.updateMany).mock.calls as any[];
    expect(updateManyCalls.some((c) => (c[0] as any)?.data?.ai_paused === true)).toBe(true);
  });
});

describe("processMessageWithRules — Variáveis {var} (collect_data)", () => {
  const COLLECT_NODES = [
    { id: "node_catalogo", parentId: null, keyword: "1", title: "📋 Produtos", actionType: "catalog", textContent: "Confira:", showInPoll: true },
    { id: "node_5", parentId: null, keyword: "5", title: "📝 Cadastro", actionType: "collect_data", variableName: "nome", textContent: "Qual o seu nome?", showInPoll: true },
    { id: "node_idade", parentId: "node_5", title: "Idade", actionType: "collect_data", variableName: "idade", textContent: "Qual sua idade, {nome}?", showInPoll: false },
    { id: "node_fim", parentId: "node_idade", title: "Fim", actionType: "text", textContent: "Obrigado {nome}! Você tem {idade} anos.", showInPoll: false },
  ];

  it("coleta dados e substitui {var} nos nós seguintes", async () => {
    const settings = createSettings({ custom_rules_nodes: COLLECT_NODES });
    const r1 = await processMessageWithRules(TENANT_ID, CONTACT, "5", settings, false);
    expect(r1).toContain("Qual o seu nome");

    const r2 = await processMessageWithRules(TENANT_ID, CONTACT, "João", settings, false);
    expect(r2).toContain("Qual sua idade, João?");

    const r3 = await processMessageWithRules(TENANT_ID, CONTACT, "30", settings, false);
    expect(r3).toContain("Obrigado João! Você tem 30 anos");
  });
});

describe("processMessageWithRules — Finalização do Pedido", () => {
  it("exige confirmação antes de cobrar e trata PIX sem gateway configurado", async () => {
    const settings = createSettings({
      products: [{ name: "Plano Teste", price: "97", requires_payment: true, billing_type: "PIX", delivery_type: "virtual_instant" }],
    });
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);

    const r2 = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(r2).toContain("Resumo do Pedido");
    expect(r2).toContain("Confirma a compra");

    const r3 = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(r3).toContain("PIX");
    expect(r3).toContain("chave de gateway não configurada");
  });

  it("cancela o pedido na etapa de confirmação e volta ao menu", async () => {
    const settings = createSettings({
      products: [{ name: "Plano Teste", price: "97", requires_payment: true, billing_type: "PIX", delivery_type: "virtual_instant" }],
    });
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);
    const r2 = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(r2).toContain("Confirma a compra");

    const r3 = await processMessageWithRules(TENANT_ID, CONTACT, "2", settings, false);
    expect(r3).toContain("Produtos");
    expect(mockStore.sales.size).toBe(0);
  });

  it("gera PIX copia-e-cola após confirmação quando gateway está configurado", async () => {
    const settings = createSettings({ asaas_api_key: "asaas_test_123" });
    const stateKey = stateKeyFor();
    mockStore.systemConfigs.set(stateKey, {
      key: stateKey,
      value: JSON.stringify({
        step: "awaiting_payment_confirmation",
        data: {
          chosenService: { name: "Plano Teste", price: "97", requires_payment: true, delivery_type: "virtual_instant", billing_type: "PIX", description: "Plano unitário" },
          address: "Envio Digital Imediato",
          collected: { billingType: "PIX", name: "João Teste", email: "joao@teste.com" },
        },
      }),
    });

    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(resp).toContain("Resumo do Pedido");
    expect(resp).toContain("---PIX-COPY---");
    expect(resp).toContain("00020126580014br.gov.bcb.pix0136mock-pix-payload");
    expect(mockStore.sales.size).toBe(1);
    const sale = Array.from(mockStore.sales.values())[0];
    expect(sale.status).toBe("pending");
  });

  it("finaliza pedido sem pagamento (presencial) registrando venda", async () => {
    const settings = createSettings({
      products: [{ name: "Serviço Presencial", price: "0", requires_payment: false, delivery_type: "physical" }],
    });
    await processMessageWithRules(TENANT_ID, CONTACT, "3", settings, false);
    const r2 = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(r2).toContain("Entrega");

    const r3 = await processMessageWithRules(TENANT_ID, CONTACT, "1", settings, false);
    expect(r3).toContain("endereço");

    const r4 = await processMessageWithRules(TENANT_ID, CONTACT, "Rua Teste, 123", settings, false);
    expect(r4).toContain("registrada com sucesso");
    expect(mockStore.sales.size).toBe(1);
    const sale = Array.from(mockStore.sales.values())[0];
    expect(sale.status).toBe("pending");
    expect(sale.notes).toContain("presencial");
  });

  it("considera cobrança pendente expirada após 48h ao digitar 'paguei'", async () => {
    const settings = createSettings();
    mockPrismaInstance.sale.findFirst.mockResolvedValue({
      id: "sale_48h",
      tenant_id: TENANT_ID,
      product_name: "Plano Teste",
      amount: 97,
      status: "pending",
      payment_id: null,
      notes: `customer_phone:${CONTACT}`,
      created_at: new Date(Date.now() - 50 * 60 * 60 * 1000),
    } as any);

    const resp = await processMessageWithRules(TENANT_ID, CONTACT, "paguei", settings, false);
    expect(resp).toContain("48h");
    expect(resp).toContain("expirou");
    const updateCalls = vi.mocked(mockPrismaInstance.sale.update).mock.calls;
    expect(updateCalls.some((c) => (c[0] as any)?.data?.status === "expired")).toBe(true);
  });
});
