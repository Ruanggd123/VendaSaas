import { test, expect } from "@playwright/test";
import { join } from "path";

const simulatorSettings = {
  ai_name: "Nexus",
  ai_personality: "personalizada",
  ai_prompt: "Você é o assistente Nexus.",
  bot_type: "regras",
  welcome_menu_auto_append: true,
  welcome_message: "Olá! Bem-vindo à Nexus.",
  products: [
    { id: "p1", name: "Plano Growth", price: "147", requires_payment: true, delivery_type: "virtual_instant" },
  ],
  custom_rules_nodes: [
    { id: "node_bem_vindo", parentId: null, keyword: "inicio", title: "Bem-vindo", actionType: "text", textContent: "Olá! Bem-vindo à Nexus. Escolha uma opção:", showInPoll: true },
    { id: "node_produtos", parentId: "node_bem_vindo", keyword: "1", title: "Produtos", actionType: "catalog", textContent: "Catálogo:", showInPoll: true },
    { id: "node_humano", parentId: "node_bem_vindo", keyword: "3", title: "Humano", actionType: "human", textContent: "Transferindo...", showInPoll: true },
  ],
};

test.use({ storageState: join(__dirname, "storage-state.json") });

test.describe("Simulador WhatsApp vs rulesBot", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user_e2e_test",
          email: "e2e@test.local",
          name: "E2E Test",
          tenant_id: "tenant_e2e_test",
          role: "admin",
          tenant_name: "Empresa E2E",
        }),
      })
    );
    await page.route("**/api/settings/whatsapp", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: simulatorSettings, tenantId: "tenant_e2e_test" }),
      })
    );
  });

  test("menu inicial renderiza opções do fluxo (consistência com rulesBot)", async ({ page }) => {
    await page.goto("/workflow");
    await page.getByRole("button", { name: /Simulador/i }).first().click();

    // Mensagem de boas-vindas + botões/enquete com as opções dos nós raiz
    await expect(page.getByText(/Bem-vindo à Nexus/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Produtos", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Humano", { exact: true }).first()).toBeVisible();
  });

  test("digitar opção navega pelo fluxo igual ao rulesBot", async ({ page }) => {
    await page.goto("/workflow");
    await page.getByRole("button", { name: /Simulador/i }).first().click();

    const input = page.getByPlaceholder(/Digite uma opção ou mensagem/i);
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("1");
    await input.press("Enter");

    // Catálogo abre com o produto do tenant e segue para o checkout (requires_payment)
    await expect(page.getByText("Plano Growth", { exact: false }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Como você prefere pagar/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("pedido de humano pausa atendimento (handoff)", async ({ page }) => {
    await page.goto("/workflow");
    await page.getByRole("button", { name: /Simulador/i }).first().click();

    const input = page.getByPlaceholder(/Digite uma opção ou mensagem/i);
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill("atendente");
    await input.press("Enter");

    await expect(page.getByText(/Atendimento automático pausado/i)).toBeVisible({ timeout: 10000 });
  });
});
