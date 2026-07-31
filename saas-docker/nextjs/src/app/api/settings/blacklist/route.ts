import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

type BlacklistEntry = { number: string; name?: string };
type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

function parseSettings(raw: string | null | undefined) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function parseBlacklist(raw: unknown): BlacklistEntry[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  const entries = values.flatMap((item): BlacklistEntry[] => {
    if (typeof item === "string") {
      const number = item.replace(/\D/g, "");
      return number ? [{ number }] : [];
    }
    if (!item || typeof item !== "object") return [];

    const value = item as { number?: unknown; name?: unknown };
    const number = String(value.number || "").replace(/\D/g, "");
    if (!number) return [];
    const name = typeof value.name === "string" ? value.name.trim() : "";
    return [{ number, ...(name ? { name } : {}) }];
  });

  return Array.from(new Map(entries.map((entry) => [entry.number, entry])).values());
}

function phoneNumbersMatch(left: string, right: string) {
  const leftDigits = left.replace(/\D/g, "");
  const rightDigits = right.replace(/\D/g, "");
  const leftWithout55 = leftDigits.startsWith("55") ? leftDigits.slice(2) : leftDigits;
  const rightWithout55 = rightDigits.startsWith("55") ? rightDigits.slice(2) : rightDigits;
  return leftDigits === rightDigits
    || leftWithout55 === rightWithout55
    || (leftWithout55.length >= 8 && rightWithout55.length >= 8 && (
      leftWithout55.endsWith(rightWithout55) || rightWithout55.endsWith(leftWithout55)
    ));
}

async function getScopedSettings(session: Session, instanceName: string | null) {
  if (!instanceName) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenant_id },
      select: { settings: true },
    });
    return tenant
      ? { settings: parseSettings(tenant.settings as string), instance: null }
      : null;
  }

  const instance = await prisma.whatsappInstance.findFirst({
    where: {
      tenant_id: session.tenant_id,
      OR: [{ name: instanceName }, { connectionName: instanceName }],
      ...(session.role === "partner" ? { partner_id: session.id } : {}),
    },
    select: { id: true, name: true, settings: true },
  });
  return instance
    ? { settings: parseSettings(instance.settings), instance }
    : null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const instanceName = new URL(req.url).searchParams.get("instanceName");
    const scoped = await getScopedSettings(session, instanceName);
    if (!scoped) return NextResponse.json({ error: "Conta ou número não encontrado" }, { status: 404 });

    const entries = parseBlacklist(scoped.settings.ignored_numbers);
    if (!instanceName) {
      const allInstances = await prisma.whatsappInstance.findMany({
        where: { tenant_id: session.tenant_id },
        select: { settings: true },
      });
      for (const inst of allInstances) {
        const instSettings = parseSettings(inst.settings);
        const instEntries = parseBlacklist(instSettings.ignored_numbers);
        for (const e of instEntries) {
          if (!entries.some((x) => x.number === e.number)) {
            entries.push(e);
          }
        }
      }
    }
    const nameMap = new Map(entries.map((entry) => [entry.number, entry.name || null]));
    if (entries.length > 0) {
      const conversations = await prisma.conversation.findMany({
        where: {
          tenant_id: session.tenant_id,
          OR: entries.map((entry) => ({ contact_number: { contains: entry.number.slice(-8) } })),
        },
        select: { contact_number: true, contact_name: true },
      });

      for (const conversation of conversations) {
        const contact = conversation.contact_number.replace(/\D/g, "");
        for (const entry of entries) {
          if (phoneNumbersMatch(contact, entry.number) && !nameMap.get(entry.number)) {
            nameMap.set(entry.number, conversation.contact_name);
          }
        }
      }
    }

    const instances = await prisma.whatsappInstance.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(session.role === "partner" ? { partner_id: session.id } : {}),
      },
      orderBy: { created_at: "desc" },
      select: { name: true, connectionName: true, phone_number: true, status: true },
    });

    return NextResponse.json({
      numbers: entries.map((entry) => ({ number: entry.number, name: nameMap.get(entry.number) || null })),
      instances,
      scope: instanceName ? scoped.instance?.name : null,
    });
  } catch (err) {
    console.error("GET /api/settings/blacklist:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { number, name, instanceName = null } = await req.json();
    const cleanNumber = String(number || "").replace(/\D/g, "");
    if (cleanNumber.length < 8) return NextResponse.json({ error: "Número inválido" }, { status: 400 });

    const scoped = await getScopedSettings(session, instanceName);
    if (!scoped) return NextResponse.json({ error: "Conta ou número não encontrado" }, { status: 404 });

    const list = parseBlacklist(scoped.settings.ignored_numbers);
    const existing = list.find((entry) => entry.number === cleanNumber);
    let cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          tenant_id: session.tenant_id,
          contact_number: { contains: cleanNumber.slice(-8) },
          ...(scoped.instance ? { instance_name: scoped.instance.name } : {}),
        },
        orderBy: { last_message_at: "desc" },
        select: { contact_name: true },
      });
      cleanName = conversation?.contact_name?.trim() || "";
    }
    if (!cleanName) {
      cleanName = "Contato Bloqueado";
    }
    if (existing) {
      existing.name = cleanName;
    } else {
      list.push({ number: cleanNumber, name: cleanName });
    }
    scoped.settings.ignored_numbers = list;

    if (scoped.instance) {
      await prisma.whatsappInstance.update({
        where: { id: scoped.instance.id },
        data: { settings: JSON.stringify(scoped.settings) },
      });
    } else {
      await prisma.tenant.update({
        where: { id: session.tenant_id },
        data: { settings: JSON.stringify(scoped.settings) },
      });
    }

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
    const cleanNumber = (searchParams.get("number") || "").replace(/\D/g, "");
    const instanceName = searchParams.get("instanceName");
    if (!cleanNumber) return NextResponse.json({ error: "Número inválido" }, { status: 400 });

    const scoped = await getScopedSettings(session, instanceName);
    if (!scoped) return NextResponse.json({ error: "Conta ou número não encontrado" }, { status: 404 });

    const list = parseBlacklist(scoped.settings.ignored_numbers).filter((entry) => entry.number !== cleanNumber);
    scoped.settings.ignored_numbers = list;

    if (scoped.instance) {
      await prisma.whatsappInstance.update({
        where: { id: scoped.instance.id },
        data: { settings: JSON.stringify(scoped.settings) },
      });
    } else {
      await prisma.tenant.update({
        where: { id: session.tenant_id },
        data: { settings: JSON.stringify(scoped.settings) },
      });
    }

    return NextResponse.json({ success: true, numbers: list });
  } catch (err) {
    console.error("DELETE /api/settings/blacklist:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
