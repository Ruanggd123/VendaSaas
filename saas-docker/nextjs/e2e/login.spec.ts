import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join } from "path";

function validSessionCookie() {
  const state = JSON.parse(readFileSync(join(__dirname, "storage-state.json"), "utf8"));
  const session = state.cookies.find((c: any) => c.name === "session");
  return session ? `session=${session.value}; Path=/; HttpOnly; SameSite=Lax` : "";
}

test.describe("Login", () => {
  test("renderiza o formulário de login com campos de e-mail e senha", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("E-mail de Acesso")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: /Entrar no Painel/i })).toBeVisible();
  });

  test("exibe erro quando as credenciais são inválidas", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Credenciais inválidas" }),
      })
    );

    await page.goto("/login");
    await page.getByLabel("E-mail de Acesso").fill("naoexiste@test.local");
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: /Entrar no Painel/i }).click();

    await expect(page.getByText("Credenciais inválidas")).toBeVisible();
  });

  test("redireciona para o dashboard após login válido", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        headers: { "set-cookie": validSessionCookie() },
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto("/login");
    await page.getByLabel("E-mail de Acesso").fill("cliente@empresa.com");
    await page.getByLabel("Senha").fill("senha-correta");
    await page.getByRole("button", { name: /Entrar no Painel/i }).click();

    await page.waitForURL("**/dashboard");
  });
});
