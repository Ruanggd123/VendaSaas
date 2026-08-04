import { SignJWT } from "jose";
import { mkdir, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

async function loadEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match) env[match[1]] = match[2].replace(/^"|"$/g, "");
      }
    }
  }
  return env;
}

export default async function globalSetup() {
  const env = await loadEnv();
  const secret = process.env.NEXTAUTH_SECRET || env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET não encontrado em .env.local/.env");
  }

  const token = await new SignJWT({
    id: "user_e2e_test",
    userId: "user_e2e_test",
    email: "e2e@test.local",
    name: "E2E Test",
    tenant_id: "tenant_e2e_test",
    tenantId: "tenant_e2e_test",
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(secret));

  const storageStatePath = join(__dirname, "storage-state.json");
  await mkdir(join(__dirname, ".tmp"), { recursive: true }).catch(() => undefined);
  await writeFile(
    storageStatePath,
    JSON.stringify({
      cookies: [
        {
          name: "session",
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 86_400,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
    "utf8",
  );
}
