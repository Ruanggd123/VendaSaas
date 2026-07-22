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

    // Suporta formato antigo (string CSV) e novo (array de objetos)
    const raw = settings.ignored_numbers || [];
    let numbers: string[] = [];
    let nameMap = new Map<string, string | null>();

    if (Array.isArray(raw)) {
      raw.forEach((item: any) => {
        if (typeof item === "string") {
          numbers.push(item);
        } else if (item && item.number) {
          numbers.push(item.number);
          if (item.name) nameMap.set(item.number, item.name);
        }
      });
    } else if (typeof raw === "string") {
      numbers = raw.split(",").map((n: string) => n.trim()).filter(Boolean);
    }

    // Busca nomes dos contatos nas conversas como fallback
    const orConditions = numbers.length > 0 ? numbers.map((n: string) => ({ contact_number: { contains: n } })) : [];
    let conversations: any[] = [];
    if (orConditions.length > 0) {
      conversations = await prisma.conversation.findMany({
        where: { tenant_id: session.tenant_id, OR: orConditions },
        select: { contact_number: true, contact_name: true },
      });
    }

    conversations.forEach((c) => {
       const cleanContact = c.contact_number.replace(/\D/g, "");
       numbers.forEach((n: string) => {
         if (cleanContact.includes(n) && !nameMap.has(n)) {
            nameMap.set(n, c.contact_name);
         }
       });
    });

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

    const { number, name } = await req.json();
    if (!number) return NextResponse.json({ error: "Número inválido" }, { status: 400 });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });

    let settings: any = {};
    try {
      settings = JSON.parse(tenant?.settings as string || "{}");
    } catch {}

    const cleanNumber = number.replace(/\D/g, "");

    const ignoredList: { number: string; name?: string }[] = Array.isArray(settings.ignored_numbers)
      ? settings.ignored_numbers
      : (typeof settings.ignored_numbers === "string" && settings.ignored_numbers
        ? settings.ignored_numbers.split(",").map((n: string) => ({ number: n.trim(), name: undefined }))
        : []);

    const exists = ignoredList.find((n) => n.number === cleanNumber);
    if (exists) {
      if (name) exists.name = name;
    } else {
      ignoredList.push({ number: cleanNumber, name: name || undefined });
    }

    settings.ignored_numbers = ignoredList;

    await prisma.tenant.update({
      where: { id: session.tenant_id },
      data: { settings: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, numbers: ignoredList });
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

    const cleanNumber = number.replace(/\D/g, "");

    let settings: any = {};
    try {
      settings = JSON.parse(tenant?.settings as string || "{}");
    } catch {}

    const raw = settings.ignored_numbers || [];
    let list: any[] = [];

    if (Array.isArray(raw)) {
      list = raw.filter((item: any) => {
        const num = typeof item === "string" ? item : item.number;
        return num !== cleanNumber;
      });
    } else if (typeof raw === "string") {
      const nums = raw.split(",").map((n: string) => n.trim()).filter(Boolean);
      list = nums.filter((n: string) => n !== cleanNumber);
    }

    settings.ignored_numbers = list;

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
