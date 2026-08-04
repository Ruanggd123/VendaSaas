import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const { mockStore, mockPrismaInstance } = vi.hoisted(() => {
  const mockStore = {
    instances: new Map<string, any>(),
    tenants: new Map<string, any>(),
    systemConfigs: new Map<string, any>(),
    conversations: new Map<string, any>(),
    leads: new Map<string, any>(),
    messages: [] as any[],
  };

  const mockPrismaInstance = {
    whatsappInstance: {
      findFirst: vi.fn(({ where }: any) => {
        const name = where?.OR?.[0]?.name;
        const match = Array.from(mockStore.instances.values()).find(
          (i) => i.name === name || i.connectionName === name
        );
        return Promise.resolve(match || null);
      }),
    },
    tenant: {
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.tenants.get(where.id) || null)),
      update: vi.fn(() => Promise.resolve({})),
    },
    systemConfig: {
      create: vi.fn(async ({ data }: any) => {
        if (mockStore.systemConfigs.has(data.key)) {
          throw new Error("Unique constraint failed on the fields: (`key`)");
        }
        const rec = { id: "sc_" + Date.now() + Math.random(), ...data };
        mockStore.systemConfigs.set(data.key, rec);
        return rec;
      }),
      findUnique: vi.fn(({ where }: any) => Promise.resolve(mockStore.systemConfigs.get(where.key) || null)),
      upsert: vi.fn(({ where, create, update }: any) => {
        const existing = mockStore.systemConfigs.get(where.key);
        if (existing) { Object.assign(existing, typeof update === "object" ? update : {}); return Promise.resolve(existing); }
        const rec = { id: "sc_" + Date.now() + Math.random(), ...create };
        mockStore.systemConfigs.set(create.key, rec);
        return Promise.resolve(rec);
      }),
      deleteMany: vi.fn(({ where }: any) => {
        if (where?.key) {
          const removed = mockStore.systemConfigs.delete(where.key);
          return Promise.resolve({ count: removed ? 1 : 0 });
        }
        return Promise.resolve({ count: 1 });
      }),
    },
    conversation: {
      upsert: vi.fn(({ create, update }: any) => {
        const existing = Array.from(mockStore.conversations.values()).find(
          (c) => c.tenant_id === create.tenant_id && c.instance_name === create.instance_name && c.contact_number === create.contact_number
        );
        if (existing) { Object.assign(existing, update); return Promise.resolve(existing); }
        const rec = { id: "conv_" + Date.now() + Math.random(), created_at: new Date(), last_message_at: new Date(), ai_paused: false, ...create };
        mockStore.conversations.set(rec.id, rec);
        return Promise.resolve(rec);
      }),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
    message: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => {
        const rec = { id: "msg_" + Date.now() + Math.random(), created_at: new Date(), ...data };
        mockStore.messages.push(rec);
        return Promise.resolve(rec);
      }),
      update: vi.fn(() => Promise.resolve({})),
    },
    lead: {
      findFirst: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(({ data }: any) => {
        const rec = { id: "lead_" + Date.now() + Math.random(), ...data };
        mockStore.leads.set(rec.id, rec);
        return Promise.resolve(rec);
      }),
    },
  };

  return { mockStore, mockPrismaInstance };
});

vi.mock("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {
    whatsappInstance = mockPrismaInstance.whatsappInstance;
    tenant = mockPrismaInstance.tenant;
    systemConfig = mockPrismaInstance.systemConfig;
    conversation = mockPrismaInstance.conversation;
    message = mockPrismaInstance.message;
    lead = mockPrismaInstance.lead;
  },
}));

vi.mock("@/lib/evolution", () => ({
  getProfilePicture: vi.fn().mockResolvedValue(""),
  sendWhatsAppMedia: vi.fn().mockResolvedValue(true),
  sendWhatsAppMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send() { return {}; }
  },
  PutObjectCommand: class {
    constructor(public input: any) {}
  },
}));

vi.mock("@/lib/whatsappOptions", () => ({
  ensureMinimumWhatsAppPollOptions: vi.fn((x: any) => x),
  formatWhatsAppOptionText: vi.fn((x: any) => x),
}));

vi.mock("@/lib/usage", () => ({
  reserveMonthlyAttendance: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock("@/lib/dateTime", () => ({
  formatBusinessDateKey: vi.fn(() => "2026-08-04"),
}));

vi.mock("@/lib/diagnostics", () => ({
  recordDiagnostic: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/engine", () => ({
  processMessageWithAI: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";
import { reserveMonthlyAttendance } from "@/lib/usage";
import { processMessageWithAI } from "@/lib/ai/engine";
import { sendWhatsAppMessage, sendWhatsAppMedia } from "@/lib/evolution";

const GLOBAL_TOKEN = "test-global-token-0000";
const INSTANCE = "inst_webhook";
const TENANT_ID = "tenant_webhook_001";

function buildTenant(overrides: any = {}) {
  return {
    id: TENANT_ID,
    name: "Webhook Tenant",
    phone: "5511999990000",
    plan: "premium",
    settings: JSON.stringify({
      enable_groups: false,
      whitelisted_groups: "",
      ignored_numbers: [],
      message_debounce_ms: 300,
      ...overrides,
    }),
  };
}

function baseEvent(overrides: any = {}) {
  return {
    instance: INSTANCE,
    event: "messages.upsert",
    data: {
      key: {
        remoteJid: "5511987654321@s.whatsapp.net",
        fromMe: false,
        id: "MSG_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
      },
      message: { conversation: "olá" },
      pushName: "Cliente Teste",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ...overrides,
    },
  };
}

function makeRequest(body: any, headers: Record<string, string> = {}) {
  return new Request("https://nexus.test/api/webhooks/evolution", {
    method: "POST",
    headers: { "content-type": "application/json", apikey: GLOBAL_TOKEN, ...headers },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return response.json();
}

beforeEach(() => {
  mockStore.instances.clear();
  mockStore.tenants.clear();
  mockStore.systemConfigs.clear();
  mockStore.conversations.clear();
  mockStore.leads.clear();
  mockStore.messages = [];
  vi.clearAllMocks();
  mockPrismaInstance.systemConfig.deleteMany.mockImplementation((({ where }: any) => {
    if (where?.key) {
      const removed = mockStore.systemConfigs.delete(where.key);
      return Promise.resolve({ count: removed ? 1 : 0 });
    }
    return Promise.resolve({ count: 1 });
  }) as any);
  process.env.EVOLUTION_API_KEY = GLOBAL_TOKEN;
  mockStore.instances.set(INSTANCE, {
    id: "inst_id_1",
    name: INSTANCE,
    connectionName: INSTANCE,
    tenant_id: TENANT_ID,
    phone_number: "5511999990000",
    settings: "{}",
  });
  mockStore.tenants.set(TENANT_ID, buildTenant());
  vi.mocked(reserveMonthlyAttendance).mockResolvedValue({ allowed: true, used: 1, limit: 100, counted: true });
});

describe("POST /api/webhooks/evolution — Autenticação", () => {
  it("retorna 401 sem apikey", async () => {
    const res = await POST(makeRequest(baseEvent(), { apikey: "" }));
    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toBe("Não autorizado");
  });

  it("retorna 401 com apikey inválida", async () => {
    const res = await POST(makeRequest(baseEvent(), { apikey: "token-errado" }));
    expect(res.status).toBe(401);
  });

  it("retorna 401 quando a instância não existe", async () => {
    mockStore.instances.clear();
    const res = await POST(makeRequest(baseEvent()));
    expect(res.status).toBe(401);
    expect((await readJson(res)).error).toContain("Instância não encontrada");
  });
});

describe("POST /api/webhooks/evolution — Guardas de entrada", () => {
  it("ignora status@broadcast", async () => {
    const body = baseEvent({ key: { remoteJid: "status@broadcast", fromMe: false, id: "STATUS_" } });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Status");
  });

  it("ignora grupos quando enable_groups=false (padrão)", async () => {
    mockStore.tenants.set(TENANT_ID, buildTenant({ enable_groups: false }));
    const body = baseEvent({ key: { remoteJid: "1234567890@g.us", fromMe: false, id: "GRP_" } });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Respostas em grupos desativadas");
  });

  it("ignora grupo fora da whitelist", async () => {
    mockStore.tenants.set(TENANT_ID, buildTenant({ enable_groups: true, whitelisted_groups: "grupo-permitido" }));
    const body = baseEvent({ key: { remoteJid: "outro-grupo@g.us", fromMe: false, id: "GRP2_" } });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Grupo não autorizado na whitelist");
  });

  it("ignora grupo quando whitelist está vazia", async () => {
    mockStore.tenants.set(TENANT_ID, buildTenant({ enable_groups: true, whitelisted_groups: "" }));
    const body = baseEvent({ key: { remoteJid: "1234567890@g.us", fromMe: false, id: "GRP3_" } });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Nenhum grupo cadastrado na lista");
  });

  it("ignora contato na blacklist (ignored_numbers)", async () => {
    mockStore.tenants.set(TENANT_ID, buildTenant({ ignored_numbers: ["5511987654321"] }));
    const res = await POST(makeRequest(baseEvent()));
    const json = await readJson(res);
    expect(json.ignored).toBe("Blacklist");
  });

  it("ignora mensagem antiga (>24h, sincronização de histórico)", async () => {
    const body = baseEvent({ messageTimestamp: Math.floor(Date.now() / 1000) - 90000 });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Mensagem Antiga (Sync)");
  });

  it("ignora criação de enquete enviada pelo bot", async () => {
    const body = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "POLL_" },
      message: { pollCreationMessage: { name: "Qual plano?" } },
    });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Criação de enquete do bot");
  });

  it("ignora menu interativo (buttons/list) enviado pelo bot", async () => {
    const body = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "BTN_" },
      message: { buttonsMessage: { text: "Menu" } },
    });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Menu interativo do bot");
  });
});

describe("POST /api/webhooks/evolution — Idempotência", () => {
  it("ignora evento duplicado (receipt atômico)", async () => {
    const id = "MSG_DUP_001";
    const receiptKey = `evolution_message_${INSTANCE}_${id}`;
    mockStore.systemConfigs.set(receiptKey, { key: receiptKey, value: new Date().toISOString() });
    const body = baseEvent({ key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: false, id } });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Evento duplicado");
  });

  it("ignora retry duplicado por providerMessageId", async () => {
    const body = baseEvent();
    vi.mocked(mockPrismaInstance.message.findFirst).mockResolvedValueOnce({
      id: "msg_duplicate_retry",
      conversation_id: "conv_x",
    } as any);
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Retry duplicado");
  });
});

describe("POST /api/webhooks/evolution — Supressão de eco", () => {
  it("ignora eco persistente de mídia enviada pelo bot", async () => {
    const body = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "MEDIA_ECHO_" },
      message: { imageMessage: { caption: "Foto do pedido", mimetype: "image/jpeg" } },
    });
    vi.mocked(mockPrismaInstance.systemConfig.findUnique).mockResolvedValueOnce({
      key: "outbound_media_echo_hash",
      value: String(Date.now() + 120000),
    } as any);
    vi.mocked(mockPrismaInstance.systemConfig.deleteMany).mockResolvedValueOnce({ count: 1 });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Eco persistente de mídia do bot");
  });

  it("ignora echo de resposta do bot (conteúdo idêntico ao outbound recente)", async () => {
    const body = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "ECHO_IA_" },
      message: { conversation: "Como posso ajudar?" },
    });
    vi.mocked(mockPrismaInstance.message.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "msg_recent",
        content: "Como posso ajudar?",
      } as any);
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(["Echo da IA", "Eco do bot", "Eco de resposta do bot"]).toContain(json.ignored);
  });
});

describe("POST /api/webhooks/evolution — Mídia e cota", () => {
  it("trata mídia sem legenda como [Mídia: image] e ignora como sistema/status", async () => {
    const body = baseEvent({
      message: { imageMessage: { mimetype: "image/jpeg" } },
    });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(json.ignored).toBe("Sistema/Status");
  });

  it("ignora outbound enviado pelo operador para outra pessoa (fromMe)", async () => {
    const body = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "OPERATOR_" },
    });
    const res = await POST(makeRequest(body));
    const json = await readJson(res);
    expect(["Outbound enviado pelo operador ou sistema", "Eco do bot"]).toContain(json.ignored);
  });

  it("bloqueia quando a cota mensal de atendimentos é atingida", async () => {
    vi.mocked(reserveMonthlyAttendance).mockResolvedValueOnce({ allowed: false, used: 100, limit: 100, counted: false });
    const res = await POST(makeRequest(baseEvent()));
    const json = await readJson(res);
    expect(json.ignored).toBe("Limite mensal de atendimentos atingido");
  });

  it("processa mensagem de texto de cliente (não ignora)", async () => {
    const res = await POST(makeRequest(baseEvent()));
    const json = await readJson(res);
    expect(json.success).toBe(true);
    expect(json.ignored).toBeUndefined();
    expect(mockStore.messages.length).toBeGreaterThan(0);
  });
});

describe("POST /api/webhooks/evolution — Debounce e concorrência", () => {
  it("agrupa mensagem concorrente (debounce: outra mais recente reivindicou)", async () => {
    vi.mocked(mockPrismaInstance.systemConfig.deleteMany).mockImplementation(({ where }: any) =>
      Promise.resolve({ count: where?.value ? 0 : 1 })
    );
    const res = await POST(makeRequest(baseEvent()));
    const json = await readJson(res);
    expect(json.ignored).toBe("Mensagem agrupada");
  });

  it("ignora quando uma resposta concorrente já foi enviada", async () => {
    vi.mocked(mockPrismaInstance.message.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "resposta_concorrente" } as any);
    const res = await POST(makeRequest(baseEvent()));
    const json = await readJson(res);
    expect(json.ignored).toBe("Resposta concorrente já enviada");
  });
});

describe("POST /api/webhooks/evolution — Eco rastreado e markers", () => {
  it("ignora eco rastreado do bot (outboundEchoCache)", async () => {
    vi.mocked(processMessageWithAI).mockResolvedValue("Resposta única de teste 001");
    const firstRes = await POST(makeRequest(baseEvent({ message: { conversation: "quero comprar" } })));
    const firstJson = await readJson(firstRes);
    expect(firstJson.success).toBe(true);

    const echoBody = baseEvent({
      key: { remoteJid: "5511987654321@s.whatsapp.net", fromMe: true, id: "ECHO_TRACKED_" },
      message: { conversation: "Resposta única de teste 001" },
    });
    const res = await POST(makeRequest(echoBody));
    const json = await readJson(res);
    expect(json.ignored).toBe("Eco rastreado do bot");
  });

  it("renderiza response com BUTTONS, PIX-COPY e IMAGE", async () => {
    mockStore.tenants.set(TENANT_ID, buildTenant({ interactive_poll_enabled: false }));
    vi.mocked(processMessageWithAI).mockResolvedValue(
      "Pagamento confirmado\n\n---PIX-COPY---\n0002012652fakepix\n\n---BUTTONS---\nPIX|1\nCartão|2\n\n---IMAGE---\niVBORw0KGgofake"
    );
    const res = await POST(makeRequest(baseEvent({ message: { conversation: "quero pagar" } })));
    const json = await readJson(res);
    expect(json.success).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      INSTANCE,
      "5511987654321",
      expect.stringContaining("Pagamento confirmado")
    );
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      INSTANCE,
      "5511987654321",
      expect.stringContaining("0002012652fakepix")
    );
    expect(sendWhatsAppMedia).toHaveBeenCalledWith(
      INSTANCE,
      "5511987654321",
      "iVBORw0KGgofake",
      "QR Code PIX",
      "image"
    );
  });
});
