import { vi } from "vitest";

// Mock do Evolution API — intercepta chamadas HTTP para a API externa
export function mockEvolutionApi() {
  const sendText = vi.fn().mockResolvedValue({ key: { id: "mock_msg_" + Date.now() } });
  const sendList = vi.fn().mockResolvedValue({ key: { id: "mock_list_" + Date.now() } });
  const sendButtons = vi.fn().mockResolvedValue({ key: { id: "mock_btn_" + Date.now() } });
  const sendPoll = vi.fn().mockResolvedValue({ key: { id: "mock_poll_" + Date.now() } });
  const sendMedia = vi.fn().mockResolvedValue({ key: { id: "mock_media_" + Date.now() } });
  const getProfilePicture = vi.fn().mockResolvedValue(null);
  const fetchInstances = vi.fn().mockResolvedValue([]);

  return { sendText, sendList, sendButtons, sendPoll, sendMedia, getProfilePicture, fetchInstances };
}

// Mock do Asaas — simula criação de pagamento, cliente, QR code
export function mockAsaasApi() {
  const createCustomer = vi.fn().mockResolvedValue({
    id: "cus_mock_" + Date.now(),
    name: "Cliente Teste",
  });

  const createPayment = vi.fn().mockResolvedValue({
    id: "pay_mock_" + Date.now(),
    status: "PENDING",
    invoiceUrl: "https://sandbox.asaas.com/invoice/mock",
    pixCopiaECola: "00020126580014br.gov.bcb.pix0136mock-pix-payload-1234567890",
    pixQrCodeUrl: "https://sandbox.asaas.com/pix/qrcode/mock",
  });

  const getPayment = vi.fn().mockResolvedValue({
    id: "pay_mock",
    status: "RECEIVED",
  });

  const updatePayment = vi.fn().mockResolvedValue({
    id: "pay_mock",
    status: "UPDATED",
    invoiceUrl: "https://sandbox.asaas.com/invoice/mock-updated",
  });

  const getPixQrCode = vi.fn().mockResolvedValue({
    payload: "00020126580014br.gov.bcb.pix0136mock-pix-payload-1234567890",
    encodedImage: "data:image/png;base64,mockbase64",
    qrCodeUrl: "https://sandbox.asaas.com/pix/qrcode/mock",
  });

  const cancelPayment = vi.fn().mockResolvedValue({ id: "pay_mock", status: "CANCELLED" });

  return { createCustomer, createPayment, getPayment, updatePayment, getPixQrCode, cancelPayment };
}

// Mock do Prisma Client — simula operações de banco de dados em memória
export function createMockPrisma() {
  const store = {
    tenants: new Map<string, any>(),
    conversations: new Map<string, any>(),
    messages: new Map<string, any>(),
    sales: new Map<string, any>(),
    appointments: new Map<string, any>(),
    retailOrders: new Map<string, any>(),
    serviceOrders: new Map<string, any>(),
    accountingTasks: new Map<string, any>(),
    leads: new Map<string, any>(),
    systemConfigs: new Map<string, any>(),
    paymentOperations: new Map<string, any>(),
    whatsappInstances: new Map<string, any>(),
    activeModules: new Map<string, any>(),
    customModules: new Map<string, any>(),
    documents: new Map<string, any>(),
    documentChunks: new Map<string, any>(),
  };

  const prisma = {
    tenant: {
      findUnique: vi.fn(({ where }) => {
        if (where.id) return Promise.resolve(store.tenants.get(where.id) || null);
        if (where.phone) {
          for (const t of store.tenants.values()) {
            if (t.phone === where.phone) return Promise.resolve(t);
          }
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      update: vi.fn(({ where, data }) => {
        const existing = store.tenants.get(where.id);
        if (existing) Object.assign(existing, data);
        return Promise.resolve(existing);
      }),
    },
    conversation: {
      findFirst: vi.fn(({ where }) => {
        for (const c of store.conversations.values()) {
          if (where.id && c.id === where.id) return Promise.resolve(c);
          if (c.tenant_id === where.tenant_id && c.contact_number === where.contact_number) {
            return Promise.resolve(c);
          }
        }
        return Promise.resolve(null);
      }),
      upsert: vi.fn(({ where, create, update }) => {
        const existing = store.conversations.get(where.id);
        if (existing) {
          Object.assign(existing, update);
          return Promise.resolve(existing);
        }
        store.conversations.set(create.id || "conv_" + Date.now(), create);
        return Promise.resolve(create);
      }),
      updateMany: vi.fn(({ where, data }) => {
        for (const c of store.conversations.values()) {
          if (c.tenant_id === where.tenant_id) Object.assign(c, data);
        }
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ where, data }) => {
        for (const c of store.conversations.values()) {
          if (where.id && c.id === where.id) {
            Object.assign(c, data);
            return Promise.resolve(c);
          }
        }
        return Promise.resolve(null);
      }),
    },
    message: {
      create: vi.fn(({ data }) => {
        const id = "msg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        store.messages.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
    },
    sale: {
      create: vi.fn(({ data }) => {
        const id = "sale_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        store.sales.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
      findFirst: vi.fn(({ where }) => {
        for (const s of store.sales.values()) {
          if (s.tenant_id === where.tenant_id) return Promise.resolve(s);
        }
        return Promise.resolve(null);
      }),
      update: vi.fn(({ where, data }) => {
        const existing = store.sales.get(where.id);
        if (existing) Object.assign(existing, data);
        return Promise.resolve(existing);
      }),
    },
    retailOrder: {
      create: vi.fn(({ data }) => {
        const id = "ro_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        store.retailOrders.set(id, { id, ...data, items: data.items ? { create: data.items.create || [] } : [] });
        return Promise.resolve({ id, ...data });
      }),
    },
    appointment: {
      create: vi.fn(({ data }) => {
        const id = "appt_" + Date.now();
        store.appointments.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    serviceOrder: {
      create: vi.fn(({ data }) => {
        const id = "os_" + Date.now();
        store.serviceOrders.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
    },
    accountingTask: {
      create: vi.fn(({ data }) => {
        const id = "at_" + Date.now();
        store.accountingTasks.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
    },
    lead: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }) => {
        const id = "lead_" + Date.now();
        store.leads.set(id, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
    },
    systemConfig: {
      findUnique: vi.fn(({ where }) => {
        return Promise.resolve(store.systemConfigs.get(where.key) || null);
      }),
      upsert: vi.fn(({ where, create, update }) => {
        const existing = store.systemConfigs.get(where.key);
        if (existing) {
          Object.assign(existing, update);
          return Promise.resolve(existing);
        }
        store.systemConfigs.set(create.key, { id: "sc_" + Date.now(), ...create });
        return Promise.resolve(store.systemConfigs.get(create.key));
      }),
      delete: vi.fn(({ where }) => {
        store.systemConfigs.delete(where.key);
        return Promise.resolve({ key: where.key });
      }),
    },
    paymentOperation: {
      findUnique: vi.fn(({ where }) => {
        return Promise.resolve(store.paymentOperations.get(where.idempotency_key) || null);
      }),
      create: vi.fn(({ data }) => {
        const id = "po_" + Date.now();
        store.paymentOperations.set(data.idempotency_key, { id, ...data });
        return Promise.resolve({ id, ...data });
      }),
      update: vi.fn(({ where, data }) => {
        const existing = store.paymentOperations.get(where.idempotency_key);
        if (existing) Object.assign(existing, data);
        return Promise.resolve(existing);
      }),
    },
    whatsappInstance: {
      findMany: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(1)),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    activeModule: {
      findMany: vi.fn(() => Promise.resolve([])),
    },
    customModule: {
      findMany: vi.fn(() => Promise.resolve([])),
      upsert: vi.fn(({ where, create, update }) => {
        const id = "cm_" + Date.now();
        const record = { id, ...create, ...update };
        store.customModules.set(where.key_tenant || id, record);
        return Promise.resolve(record);
      }),
    },
    $transaction: vi.fn(async (fn: any) => fn(prisma)),
    $executeRaw: vi.fn().mockResolvedValue(0),
  };

  return { prisma, store };
}

// Default test tenant settings (SaaS/Nexus store)
export function createTestSettings(overrides: any = {}): any {
  return {
    bot_type: "regras",
    ai_name: "Bot Teste",
    ai_personality: "profissional",
    ai_prompt: "Você é um atendente virtual de teste.",
    business_hours_start: "08:00",
    business_hours_end: "18:00",
    business_days: ["mon", "tue", "wed", "thu", "fri"],
    schedule_per_day: {
      mon: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      tue: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      wed: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      thu: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      fri: { enabled: true, start: "08:00", end: "18:00", max_appointments: 8 },
      sat: { enabled: false, start: "09:00", end: "14:00", max_appointments: 4 },
      sun: { enabled: false, start: "09:00", end: "12:00", max_appointments: 2 },
    },
    appointment_gap_min: 15,
    off_hours_message: "Estamos fora do horário.",
    products: [],
    manager_phone: "",
    blocked_dates: [],
    enable_groups: false,
    whitelisted_groups: "",
    interactive_poll_enabled: true,
    enableScheduling: true,
    hide_auto_catalog: false,
    welcome_menu_auto_append: true,
    ...overrides,
  };
}

// Default test tenant (in-memory)
export function createTestTenant(id = "tenant_test_001", overrides: any = {}) {
  return {
    id,
    name: "Empresa Teste LTDA",
    phone: "5511999998888",
    plan: "growth",
    status: "active",
    settings: JSON.stringify(createTestSettings(overrides)),
    subscription_expires_at: new Date("2027-12-31"),
    whitelisted_groups: "",
    ...overrides,
  };
}

// Default test catalog (Nexus SaaS plans)
export const TEST_CATALOG = [
  {
    id: "plano_start",
    name: "Plano Start (R$ 67/mês)",
    price: "67",
    description: "Bot Fixo de Regras + Atendimento Automático 24h",
    delivery_type: "virtual_instant",
    requires_payment: true,
    billing_type: "both",
    stock: null,
    duration_min: 30,
  },
  {
    id: "plano_97",
    name: "Plano 97 (R$ 97/mês)",
    price: "97",
    description: "Site Institucional + Bot Regras + Bot IA",
    delivery_type: "virtual_instant",
    requires_payment: true,
    billing_type: "both",
    stock: null,
    duration_min: 30,
  },
  {
    id: "plano_growth",
    name: "Plano Growth (R$ 147/mês)",
    price: "147",
    description: "Site + Bots + CRM + Agendamento",
    delivery_type: "virtual_instant",
    requires_payment: true,
    billing_type: "both",
    stock: null,
    duration_min: 30,
  },
  {
    id: "site_avulso",
    name: "Site Avulso (R$ 497)",
    price: "497",
    description: "Site Personalizado taxa única",
    delivery_type: "virtual_deadline",
    requires_payment: true,
    billing_type: "both",
    stock: null,
    duration_min: 60,
  },
];

// Default flow nodes (generic client)
export const TEST_FLOW_NODES = [
  {
    id: "node_catalogo",
    parentId: null,
    keyword: "1",
    title: "📋 Produtos & Serviços",
    actionType: "catalog",
    textContent: "Confira nossos produtos e serviços:",
    showInPoll: true,
  },
  {
    id: "node_agendamento",
    parentId: null,
    keyword: "2",
    title: "📅 Agendar Horário",
    actionType: "scheduling",
    textContent: "Escolha uma data disponível:",
    showInPoll: true,
  },
  {
    id: "node_atendente",
    parentId: null,
    keyword: "3",
    title: "👤 Falar com Atendente",
    actionType: "human",
    textContent: "Transferindo para um atendente...",
    showInPoll: true,
  },
];
