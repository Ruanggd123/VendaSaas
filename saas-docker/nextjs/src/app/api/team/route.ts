import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs"; 

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === 'partner') {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const team = await prisma.user.findMany({
      where: { tenant_id: session.tenant_id, role: "agent" },
      select: { id: true, name: true, email: true, created_at: true },
      orderBy: { created_at: "desc" }
    });

    return NextResponse.json({ team });
  } catch (err) {
    console.error("GET /api/team:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 400 });
    }

    const password_hash = await hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        tenant_id: session.tenant_id,
        name,
        email,
        password_hash,
        role: "agent"
      },
      select: { id: true, name: true, email: true, created_at: true }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (err) {
    console.error("POST /api/team:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

    const user = await prisma.user.findFirst({
      where: { id, tenant_id: session.tenant_id, role: "agent" }
    });

    if (!user) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/team:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
