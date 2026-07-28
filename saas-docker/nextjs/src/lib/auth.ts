import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
function getAuthKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("CRÍTICO: NEXTAUTH_SECRET não configurado. Defina esta variável de ambiente para segurança do sistema.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(getAuthKey());
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, getAuthKey(), {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function login(user: any) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ 
    id: user.id, 
    userId: user.id,
    email: user.email, 
    name: user.name,
    tenant_id: user.tenant_id,
    tenantId: user.tenant_id,
    role: user.role,
    accessExpiresAt: user.accessExpiresAt ?? null
  });

  (await cookies()).set("session", session, { expires, httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}

export async function logout() {
  (await cookies()).set("session", "", { expires: new Date(0), path: "/" });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  try {
    const payload = await decrypt(session);
    if (!payload) return null;

    if (payload.role === 'partner') {
      const partner = await prisma.partner.findUnique({
        where: { id: payload.id },
        select: { id: true, tenant_id: true }
      });
      if (!partner) {
        try { cookieStore.set("session", "", { expires: new Date(0), path: "/" }); } catch (e) {}
        return null;
      }
    } else if (payload.id || payload.userId) {
      const userId = payload.id || payload.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          tenant_id: true,
          email: true,
          name: true,
          tenant: { select: { id: true, name: true, plan: true, status: true } }
        }
      });
      if (!user) {
        // Usuário foi apagado do banco! Desloga automaticamente.
        try { cookieStore.set("session", "", { expires: new Date(0), path: "/" }); } catch (e) {}
        return null;
      }
      // Sempre garante dados reais atualizados do banco
      payload.name = user.name || payload.name || "Usuário";
      payload.email = user.email || payload.email || "";
      payload.role = user.role;
      payload.tenant_id = user.tenant_id;
      payload.tenant_name = user.tenant?.name || "Minha Empresa";
      payload.tenant_plan = user.tenant?.plan || "solo";
    }
    return payload;
  } catch {
    try { cookieStore.set("session", "", { expires: new Date(0), path: "/" }); } catch (e) {}
    return null;
  }
}

export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.startsWith("http") && !envUrl.includes("NEXT_PUBLIC_APP_URL")) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://nexus-six-olive.vercel.app";
}
