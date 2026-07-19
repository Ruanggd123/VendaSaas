import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();
const secretKey = process.env.NEXTAUTH_SECRET || "MudeEstaChaveSecreta@2026";
const key = new TextEncoder().encode(secretKey);

export async function POST(request: Request) {
  try {
    const { token, code, newPassword } = await request.json();

    if (!token || !code || !newPassword) {
      return NextResponse.json(
        { error: "Token, código e nova senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    let payload;
    try {
      const result = await jwtVerify(token, key, { algorithms: ["HS256"] });
      payload = result.payload;
    } catch {
      return NextResponse.json(
        { error: "Token expirado ou inválido. Solicite um novo código." },
        { status: 401 }
      );
    }

    if (payload.purpose !== "password-reset") {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 401 }
      );
    }

    if (payload.code !== code) {
      return NextResponse.json(
        { error: "Código incorreto. Verifique o código recebido." },
        { status: 401 }
      );
    }

    const email = payload.email as string;
    const isPartner = payload.isPartner === true;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isPartner) {
      await prisma.partner.updateMany({
        where: { email },
        data: { password_hash: hashedPassword },
      });
    } else {
      await prisma.user.update({
        where: { email },
        data: { password_hash: hashedPassword },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Senha alterada com sucesso!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
