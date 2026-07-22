import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.NEXTAUTH_SECRET || "MudeEstaChaveSecreta@2026";
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
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

  cookies().set("session", session, { expires, httpOnly: true });
}

export async function logout() {
  cookies().set("session", "", { expires: new Date(0) });
}

export async function getSession() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}

export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.startsWith("http") && !envUrl.includes("NEXT_PUBLIC_APP_URL")) {
    return envUrl.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "https://nexus-six-olive.vercel.app";
}
