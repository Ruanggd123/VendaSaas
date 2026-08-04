import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStore = {
  tenants: new Map<string, any>(),
  sales: new Map<string, any>(),
  appointments: new Map<string, any>(),
  leads: new Map<string, any>(),
  conversations: new Map<string, any>(),
  serviceOrders: new Map<string, any>(),
  retailOrders: new Map<string, any>(),
  accountingTasks: new Map<string, any>(),
  customModules: new Map<string, any>(),
};

vi.mock("@prisma/client", () => {
  const instance = {
    tenant: {
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.tenants.get(where.id) || null)),
      update: vi.fn(({ where, data }: any) => {
        const t = mockStore.tenants.get(where.id);
        if (t && data.settings) t.settings = data.settings;
        return Promise.resolve(t || {});
      }),
    },
    lead: {
      findFirst: vi.fn(({ where }: any) => {
        const leads = Array.from(mockStore.leads.values()).filter((l: any) => l.tenant_id === where.tenant_id);
        return Promise.resolve(leads[0] || null);
      }),
      create: vi.fn(({ data }: any) => {
        const id = "lead_" + Date.now();
        const rec = { id, ...data };
        mockStore.leads.set(id, rec);
        return Promise.resolve(rec);
      }),
    },
    sale: {
      findFirst: vi.fn(({ where }: any) => {
        const sales = Array.from(mockStore.sales.values()).filter((s: any) => s.tenant_id === where.tenant_id);
        return Promise.resolve(sales[sales.length - 1] || null);
      }),
      findMany: vi.fn(({ where }: any) => {
        const sales = Array.from(mockStore.sales.values()).filter((s: any) => s.tenant_id === where.tenant_id);
        return Promise.resolve(sales);
      }),
      create: vi.fn(({ data }: any) => {
        const id = "sale_" + Date.now();
        const rec = { id, ...data };
        mockStore.sales.set(id, rec);
        return Promise.resolve(rec);
      }),
      update: vi.fn(({ where, data }: any) => {
        const sale = mockStore.sales.get(where.id);
        if (sale) Object.assign(sale, data);
        return Promise.resolve(sale || data);
      }),
    },
    appointment: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(({ data }: any) => {
        const id = "appt_" + Date.now();
        const rec = { id, ...data };
        mockStore.appointments.set(id, rec);
        return Promise.resolve(rec);
      }),
    },
    conversation: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
    },
    whatsappInstance: { count: vi.fn(() => Promise.resolve(1)) },
    serviceOrder: {
      create: vi.fn(({ data }: any) => {
        const id = "os_" + Date.now();
        const rec = { id, ...data };
        mockStore.serviceOrders.set(id, rec);
        return Promise.resolve(rec);
      }),
      findUnique: vi.fn(({ where }: any) => {
        const os = mockStore.serviceOrders.get(where.id);
        return Promise.resolve(os || null);
      }),
    },
    retailOrder: {
      create: vi.fn(({ data }: any) => {
        const id = "ro_" + Date.now();
        const rec = { id, ...data };
        mockStore.retailOrders.set(id, rec);
        return Promise.resolve(rec);
      }),
    },
    accountingTask: {
      create: vi.fn(({ data }: any) => {
        const id = "at_" + Date.now();
        const rec = { id, ...data };
        mockStore.accountingTasks.set(id, rec);
        return Promise.resolve(rec);
      }),
    },
    customModule: {
      upsert: vi.fn(({ where, create, update }: any) => {
        const key = where?.tenant_id_key?.key || create?.key || "default";
        const id = "cm_" + key;
        const rec = { id, ...create };
        mockStore.customModules.set(key, rec);
        return Promise.resolve(rec);
      }),
    },
    activeModule: { findMany: vi.fn(() => Promise.resolve([])) },
  };
  return {
    PrismaClient: class MockPrismaClient {
      tenant = instance.tenant;
      lead = instance.lead;
      sale = instance.sale;
      appointment = instance.appointment;
      conversation = instance.conversation;
      whatsappInstance = instance.whatsappInstance;
      serviceOrder = instance.serviceOrder;
      retailOrder = instance.retailOrder;
      accountingTask = instance.accountingTask;
      customModule = instance.customModule;
      activeModule = instance.activeModule;
    },
  };
});

vi.mock("@/lib/auth", () => ({
  getAppBaseUrl: () => "https://nexus-six-olive.vercel.app",
}));

vi.mock("@/lib/dateTime", () => ({
  getBusinessDayRange: vi.fn((d: Date) => ({
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
  })),
  zonedDateTimeToUtc: vi.fn((d: any) => new Date(d.year, d.month - 1, d.day, d.hour, d.minute)),
}));

vi.mock("@/lib/currency", () => ({
  formatBRL: vi.fn((v: number) => `R$ ${v.toFixed(2)}`),
  getProductPrice: vi.fn((p: any) => Number(p?.price) || 0),
  getProductPriceLabel: vi.fn((p: any) => `R$ ${p?.price}`),
}));

vi.mock("@/lib/ai/guardian/templates", () => ({
  templates: {
    appointment_scheduled: vi.fn(() => "Agendamento confirmado via template"),
    os_created: vi.fn((id: string, model: string, issue: string) => `OS #${id} criada para ${model}: ${issue}`),
    order_created: vi.fn((id: string, total: string, addr: string) => `Pedido #${id} criado: R$ ${total} para ${addr}`),
    guia_requested: vi.fn((tipo: string, desc: string) => `Guia ${tipo} solicitada: ${desc}`),
  },
}));

vi.mock("@/lib/asaas", () => ({
  createCustomer: vi.fn().mockResolvedValue({ id: "cus_mock" }),
  createPayment: vi.fn().mockResolvedValue({ id: "pay_mock", status: "PENDING", invoiceUrl: "https://asaas.com/mock" }),
  getPayment: vi.fn().mockResolvedValue({ id: "pay_mock", status: "RECEIVED" }),
  updatePayment: vi.fn().mockResolvedValue({}),
  getPixQrCode: vi.fn().mockResolvedValue({}),
  cancelPayment: vi.fn().mockResolvedValue({}),
}));

import { handleToolCall, aiTools, adminTools } from "./tools";

const TENANT_ID = "tenant_tools_001";
const CONTACT = "5511999998888";
const INSTANCE = "test_instance";

beforeEach(() => {
  mockStore.tenants.clear();
  mockStore.sales.clear();
  mockStore.appointments.clear();
  mockStore.leads.clear();
  mockStore.serviceOrders.clear();
  mockStore.retailOrders.clear();
  mockStore.accountingTasks.clear();
  mockStore.customModules.clear();
  mockStore.conversations.clear();
  vi.clearAllMocks();
});

function makeToolCall(name: string, args: any) {
  return { function: { name, arguments: JSON.stringify(args) } };
}

function setupTenantWithProducts(products: any[] = []) {
  mockStore.tenants.set(TENANT_ID, {
    id: TENANT_ID,
    settings: JSON.stringify({ products, asaas_api_key: "asaas_test_key" }),
  });
}

describe("Tool Definitions", () => {
  it("aiTools tem 8 ferramentas definidas", () => {
    expect(aiTools.length).toBe(8);
  });

  it("adminTools tem 6 ferramentas definidas", () => {
    expect(adminTools.length).toBe(6);
  });

  it("todas as aiTools têm nome e parâmetros", () => {
    for (const tool of aiTools) {
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.parameters).toBeTruthy();
    }
  });

  it("todas as adminTools têm nome e parâmetros", () => {
    for (const tool of adminTools) {
      expect(tool.function.name).toBeTruthy();
      expect(tool.function.parameters).toBeTruthy();
    }
  });
});

describe("handleToolCall — gerenciar_catalogo", () => {
  it("adiciona produto ao catálogo", async () => {
    setupTenantWithProducts([]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_catalogo", { acao: "adicionar", nome: "Plano VIP", preco: 199, descricao: "Plano premium" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("Plano VIP");
    expect(resp).toContain("foi adicionar");
  });

  it("edita produto existente no catálogo", async () => {
    setupTenantWithProducts([{ name: "Plano Old", price: 50, description: "Antigo" }]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_catalogo", { acao: "editar", nome: "Plano Old", preco: 100 }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("foi editar");
  });

  it("retorna erro ao editar produto inexistente", async () => {
    setupTenantWithProducts([]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_catalogo", { acao: "editar", nome: "Produto Fantasma", preco: 50 }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("não encontrado");
  });

  it("exclui produto do catálogo", async () => {
    setupTenantWithProducts([{ name: "Plano X", price: 99 }]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_catalogo", { acao: "excluir", nome: "Plano X" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("foi excluir");
  });

  it("retorna erro ao excluir produto inexistente", async () => {
    setupTenantWithProducts([{ name: "Plano Y", price: 99 }]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_catalogo", { acao: "excluir", nome: "Não Existe" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("não encontrado");
  });
});

describe("handleToolCall — gerar_link_pagamento", () => {
  it("gera link de pagamento com checkout URL", async () => {
    setupTenantWithProducts([]);
    const resp = await handleToolCall(
      makeToolCall("gerar_link_pagamento", { valor: 97, descricao: "Plano Mensal" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("link de pagamento");
    expect(resp).toContain("checkout");
    expect(resp).toContain("97");
  });
});

describe("handleToolCall — agendar_compromisso", () => {
  it("cria agendamento com sucesso quando há disponibilidade", async () => {
    setupTenantWithProducts([{ name: "Consulta", price: "0", duration_min: 30, requires_payment: false }]);
    const resp = await handleToolCall(
      makeToolCall("agendar_compromisso", { data: "2026-12-01", hora: "10:00", titulo: "Consulta" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toBeTruthy();
    expect(resp).toContain("Agendamento");
  });

  it("retorna erro quando horário está ocupado", async () => {
    setupTenantWithProducts([]);
    const existingAppointment = {
      id: "appt_existing",
      tenant_id: TENANT_ID,
      scheduled_at: new Date(2026, 11, 1, 10, 0),
      status: "scheduled",
      duration_min: 60,
    };
    mockStore.appointments.set("existing", existingAppointment);
    vi.mocked(
      (await import("@prisma/client")).PrismaClient.prototype as any
    );
    const prismaModule = await import("@prisma/client");
    const prisma = new prismaModule.PrismaClient();
    vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([existingAppointment] as any);

    const resp = await handleToolCall(
      makeToolCall("agendar_compromisso", { data: "2026-12-01", hora: "10:00", titulo: "Consulta" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("ocupado");
  });
});

describe("handleToolCall — pausar_ia", () => {
  it("pausa IA na conversa", async () => {
    const resp = await handleToolCall(
      makeToolCall("pausar_ia", { motivo: "Cliente irritado" }),
      TENANT_ID, CONTACT, "conv_001", INSTANCE
    );
    expect(resp).toBeNull();
  });
});

describe("handleToolCall — verificar_status_pagamento", () => {
  it("retorna mensagem quando não há pagamento registrado", async () => {
    setupTenantWithProducts([]);
    const resp = await handleToolCall(
      makeToolCall("verificar_status_pagamento", {}),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("Nenhuma tentativa de pagamento");
  });

  it("retorna status quando há pagamento pendente sem payment_id", async () => {
    setupTenantWithProducts([]);
    mockStore.sales.set("sale_001", {
      id: "sale_001",
      tenant_id: TENANT_ID,
      product_name: "Plano Teste",
      amount: 97,
      status: "pending",
      payment_id: null,
      notes: `customer_phone:${CONTACT}`,
      created_at: new Date(),
    });
    const resp = await handleToolCall(
      makeToolCall("verificar_status_pagamento", {}),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("Plano Teste");
    expect(resp).toContain("pending");
  });

  it("retorna confirmação quando pagamento foi confirmado", async () => {
    setupTenantWithProducts([]);
    mockStore.sales.set("sale_002", {
      id: "sale_002",
      tenant_id: TENANT_ID,
      product_name: "Plano VIP",
      amount: 199,
      status: "paid",
      payment_id: "pay_456",
      notes: `customer_phone:${CONTACT}`,
      created_at: new Date(),
    });
    const resp = await handleToolCall(
      makeToolCall("verificar_status_pagamento", {}),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("confirmado");
    expect(resp).toContain("Plano VIP");
  });
});

describe("handleToolCall — criar_ordem_servico", () => {
  it("cria OS com sucesso", async () => {
    const resp = await handleToolCall(
      makeToolCall("criar_ordem_servico", { modelo_aparelho: "iPhone 15", defeito_relatado: "Tela rachada" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("iPhone 15");
  });
});

describe("handleToolCall — criar_pedido_varejo", () => {
  it("cria pedido de varejo com sucesso", async () => {
    const resp = await handleToolCall(
      makeToolCall("criar_pedido_varejo", { produtos: ["Camiseta", "Boné"], valor_total: 89.90, endereco_entrega: "Rua Teste, 123" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("89.9");
    expect(resp).toContain("Rua Teste, 123");
  });
});

describe("handleToolCall — solicitar_guia_contabil", () => {
  it("registra solicitação de guia contábil", async () => {
    const resp = await handleToolCall(
      makeToolCall("solicitar_guia_contabil", { tipo_guia: "DARF", descricao: "Imposto referente a Julho/2026" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("DARF");
    expect(resp).toContain("Julho/2026");
  });
});

describe("handleToolCall — criar_ou_atualizar_modulo", () => {
  it("cria módulo customizado", async () => {
    const resp = await handleToolCall(
      makeToolCall("criar_ou_atualizar_modulo", {
        nome_tecnico: "petshop",
        titulo: "Petshop & Veterinária",
        icone: "🐾",
        descricao: "Atendimento para petshop",
        prompt_especialista: "Você é um veterinário virtual.",
      }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("Petshop & Veterinária");
    expect(resp).toContain("sucesso");
  });
});

describe("handleToolCall — listar_agendamentos", () => {
  it("retorna mensagem quando não há agendamentos", async () => {
    const resp = await handleToolCall(
      makeToolCall("listar_agendamentos", { periodo: "hoje" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("Nenhum agendamento");
  });
});

describe("handleToolCall — gerenciar_configuracoes", () => {
  it("atualiza configuração do tenant", async () => {
    setupTenantWithProducts([]);
    const resp = await handleToolCall(
      makeToolCall("gerenciar_configuracoes", { chave: "business_hours_start", valor: "09:00" }),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("business_hours_start");
    expect(resp).toContain("09:00");
    expect(resp).toContain("sucesso");
  });
});

describe("handleToolCall — toggle_ai_status", () => {
  it("altera status de IA na conversa", async () => {
    const resp = await handleToolCall(
      makeToolCall("toggle_ai_status", { numero_cliente: CONTACT, ai_paused: true }),
      TENANT_ID, CONTACT, "conv_001", INSTANCE
    );
    expect(resp).toContain("sucesso");
  });
});

describe("handleToolCall — Ferramenta desconhecida", () => {
  it("retorna mensagem de ferramenta desconhecida", async () => {
    const resp = await handleToolCall(
      makeToolCall("ferramenta_inexistente", {}),
      TENANT_ID, CONTACT
    );
    expect(resp).toContain("desconhecida");
  });
});
