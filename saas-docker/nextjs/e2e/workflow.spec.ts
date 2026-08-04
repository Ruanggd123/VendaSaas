import { test, expect } from "@playwright/test";
import { join } from "path";
import { VALID_FLOW_JSON_STRING, INVALID_FLOW_DUPLICATE_KEYWORD } from "../tests/fixtures/index";

const workflowSettings = {
  ai_name: "Nexus",
  ai_personality: "personalizada",
  ai_prompt: "Você é o assistente Nexus.",
  bot_type: "regras",
  welcome_menu_auto_append: true,
  products: [
    { id: "p1", name: "Plano Growth", price: "147", requires_payment: true, delivery_type: "virtual_instant" },
  ],
  custom_rules_nodes: [
    { id: "node_bem_vindo", parentId: null, keyword: "inicio", title: "Bem-vindo", actionType: "text", textContent: "Olá! Escolha:", showInPoll: true },
    { id: "node_produtos", parentId: "node_bem_vindo", keyword: "1", title: "Produtos", actionType: "catalog", textContent: "Catálogo:", showInPoll: true },
  ],
};

test.use({ storageState: join(__dirname, "storage-state.json") });

test.describe("Workflow builder", () => {
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
    await page.route("**/api/settings/whatsapp", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ settings: workflowSettings, tenantId: "tenant_e2e_test" }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test("carrega nós do fluxo no canvas", async ({ page }) => {
    await page.goto("/workflow");
    await expect(page.getByText("Bem-vindo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Produtos", { exact: true }).first()).toBeVisible();
  });

  test("importa JSON válido e salva (round-trip)", async ({ page }) => {
    let putBody: any = null;
    await page.route("**/api/settings/whatsapp", (route) => {
      if (route.request().method() === "PUT") {
        putBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: workflowSettings, tenantId: "tenant_e2e_test" }),
      });
    });

    await page.goto("/workflow");
    await page.getByRole("button", { name: /JSON/i }).click();
    const editor = page.locator("textarea.font-mono");
    await expect(editor).toBeVisible();
    await editor.fill(VALID_FLOW_JSON_STRING);
    await page.getByRole("button", { name: /Importar & Salvar JSON/i }).click();

    await expect(page.getByText(/Configuração JSON restaurada/i)).toBeVisible();
    expect(putBody).not.toBeNull();
    const nodes = putBody.custom_rules_nodes || [];
    expect(nodes.length).toBeGreaterThanOrEqual(5);
    expect(nodes.some((n: any) => n.id === "node_checkout")).toBe(true);
  });

  test("rejeita JSON inválido (sintaxe)", async ({ page }) => {
    await page.goto("/workflow");
    await page.getByRole("button", { name: /JSON/i }).click();
    const editor = page.locator("textarea.font-mono");
    await editor.fill("{ este json não é válido");
    await page.getByRole("button", { name: /Importar & Salvar JSON/i }).click();
    await expect(page.getByText(/JSON inválido/i)).toBeVisible();
  });

  test("importa JSON com keyword duplicada entre irmãos (falha de validação)", async ({ page }) => {
    let putBody: any = null;
    await page.route("**/api/settings/whatsapp", (route) => {
      if (route.request().method() === "PUT") {
        putBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: workflowSettings, tenantId: "tenant_e2e_test" }),
      });
    });

    await page.goto("/workflow");
    await page.getByRole("button", { name: /JSON/i }).click();
    const editor = page.locator("textarea.font-mono");
    await editor.fill(INVALID_FLOW_DUPLICATE_KEYWORD);
    await page.getByRole("button", { name: /Importar & Salvar JSON/i }).click();

    // A página mantém o editor aberto (sem PUT) quando a validação falha
    await page.waitForTimeout(400);
    expect(putBody).toBeNull();
  });
});
