import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.id || session.role !== 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const partner = await prisma.partner.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, whatsappNumber: true, referralCode: true, commissionRate: true },
    });

    if (!partner) return NextResponse.json({ error: "Parceiro não encontrado" }, { status: 404 });

    return NextResponse.json(partner);
  } catch (err) {
    console.error("GET /api/partner/profile:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session?.id || session.role !== 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, whatsappNumber } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (email !== undefined) {
      const existing = await prisma.partner.findFirst({
        where: { email, tenant_id: session.tenant_id, id: { not: session.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Este email já está em uso" }, { status: 409 });
      }
      dataToUpdate.email = email;
    }
    if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber;

    const updated = await prisma.partner.update({
      where: { id: session.id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, whatsappNumber: true, referralCode: true, commissionRate: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/partner/profile:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
