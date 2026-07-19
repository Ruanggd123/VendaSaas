import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const isPartner = session.role === 'partner';
    const leads = await prisma.lead.findMany({
      where: {
        tenant_id: session.tenant_id,
        ...(isPartner ? { partner_id: session.id } : {}),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({ leads }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar leads:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenant_id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id, status } = await req.json();

    const leadWhere: any = { id, tenant_id: session.tenant_id };
    if (session.role === 'partner') leadWhere.partner_id = session.id;

    const lead = await prisma.lead.update({
      where: leadWhere,
      data: { status }
    });

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
  }
}
