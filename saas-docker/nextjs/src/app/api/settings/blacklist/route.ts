import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });

    let settings: any = {};
    try {
      settings = JSON.parse(tenant.settings as string || "{}");
    } catch {}

    const ignored = settings.ignored_numbers || "";
    const numbers = ignored ? ignored.split(",").map((n: string) => n.trim()).filter(Boolean) : [];

    // Busca nomes dos contatos nas conversas
    const conversations = await prisma.conversation.findMany({
      where: { tenant_id: session.tenant_id, contact_number: { in: numbers } },
      select: { contact_number: true, contact_name: true },
    });
    const nameMap = new Map(conversations.map((c) => [c.contact_number.replace(/\D/g, ""), c.contact_name]));

    const list = numbers.map((num: string) => ({
      number: num,
      name: nameMap.get(num) || null,
    }));

    return NextResponse.json({ numbers: list });
  } catch (err) {
    console.error("GET /api/settings/blacklist:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { number } = await req.json();
    if (!number) return NextResponse.json({ error: "Número inválido" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    let settings: any = {};
    try {
      settings = JSON.parse(tenant?.settings as string || "{}");
    } catch {}

    const currentIgnored = settings.ignored_numbers || "";
    const list = currentIgnored ? currentIgnored.split(",").map((n: string) => n.trim()).filter(Boolean) : [];

    const cleanNumber = number.replace(/\D/g, "");
    if (!list.includes(cleanNumber)) {
      list.push(cleanNumber);
    }

    settings.ignored_numbers = list.join(",");

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, numbers: list });
  } catch (err) {
    console.error("POST /api/settings/blacklist:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const number = searchParams.get("number");
    if (!number) return NextResponse.json({ error: "Número inválido" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    let settings: any = {};
    try {
      settings = JSON.parse(tenant?.settings as string || "{}");
    } catch {}

    const currentIgnored = settings.ignored_numbers || "";
    let list = currentIgnored ? currentIgnored.split(",").map((n: string) => n.trim()).filter(Boolean) : [];

    const cleanNumber = number.replace(/\D/g, "");
    list = list.filter((n: string) => n !== cleanNumber);

    settings.ignored_numbers = list.join(",");

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, numbers: list });
  } catch (err) {
    console.error("DELETE /api/settings/blacklist:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
