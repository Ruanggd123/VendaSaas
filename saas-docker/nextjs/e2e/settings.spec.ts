import { test, expect } from "@playwright/test";
import { join } from "path";

const baseSettings = {
  ai_name: "Sofia",
  ai_personality: "personalizada",
  ai_prompt: "Você é a assistente virtual Sofia.",
  business_hours_start: "09:00",
  business_hours_end: "18:00",
  business_days: ["seg", "ter", "qua", "qui", "sex"],
  bot_type: "rules",
  payment_provider: "asaas",
};

test.use({ storageState: join(__dirname, "storage-state.json") });

test.describe("Settings (configurações)", () => {
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
          body: JSON.stringify({ settings: baseSettings }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
  });

  test("carrega as configurações existentes do servidor", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Configurações da Empresa")).toBeVisible();
    await expect(page.getByPlaceholder(/Sofia, Carlos/)).toHaveValue("Sofia");
  });

  test("salva alterações (round-trip GET -> PUT)", async ({ page }) => {
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
        body: JSON.stringify({ settings: baseSettings }),
      });
    });

    await page.goto("/settings");
    const nameField = page.getByPlaceholder(/Sofia, Carlos/);
    await expect(nameField).toHaveValue("Sofia");
    await nameField.fill("Nina");
    await page.getByRole("button", { name: /Salvar Tudo/i }).click();

    await expect(page.getByText(/Configurações salvas com sucesso/i)).toBeVisible();
    expect(putBody).not.toBeNull();
    expect(putBody.ai_name).toBe("Nina");
    expect(putBody.ai_prompt).toContain("assistente virtual");
  });
});
