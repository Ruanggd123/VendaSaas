import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { sendEmail, getRecoveryEmailHtml } from "@/lib/email";

const prisma = new PrismaClient();
const secretKey = process.env.NEXTAUTH_SECRET || "MudeEstaChaveSecreta@2026";
const key = new TextEncoder().encode(secretKey);

async function sendRecoveryCode(
  email: string,
  code: string,
  tenantName: string,
  tenantPhone: string | null,
  whatsappInstances: { name: string }[],
  targetPhone?: string | null
) {
  let sentViaEmail = false;
  let sentViaWhatsApp = false;

  sentViaEmail = await sendEmail(
    email,
    `Código de Recuperação - ${tenantName}`,
    getRecoveryEmailHtml(code, tenantName)
  );

  if (!sentViaEmail) {
    const instance = whatsappInstances[0];
    const phone = targetPhone || tenantPhone;
    if (instance && phone) {
      try {
        const msg = `🔐 *Recuperação de Senha - ${tenantName}*\n\nSeu código de verificação é:\n\n${code}\n\nEle expira em 15 minutos. Nunca compartilhe este código.`;
        sentViaWhatsApp = await sendWhatsAppMessage(instance.name, phone, msg);
      } catch (e) {
        console.error("Falha ao enviar código via WhatsApp:", e);
      }
    }
  }

  return { sentViaEmail, sentViaWhatsApp };
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        tenant: {
          include: {
            whatsapp_instances: { where: { status: "open" }, take: 1 },
          },
        },
      },
    });

    const partner = user ? null : await prisma.partner.findFirst({
      where: { email: normalizedEmail },
      include: {
        tenant: {
          include: {
            whatsapp_instances: { where: { status: "open" }, take: 1 },
          },
        },
      },
    });

    const account = user || partner;

    // Sempre retorna sucesso para não revelar se o email existe
    if (!account) {
      return NextResponse.json({
        success: true,
        message: "Se o email estiver cadastrado, você receberá um código de recuperação.",
      });
    }

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const isPartner = !!partner;

    // Cria token JWT com o código e email, expira em 15 minutos
    const token = await new SignJWT({
      email: account.email,
      code,
      purpose: "password-reset",
      isPartner,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(key);

    const { sentViaEmail, sentViaWhatsApp } = await sendRecoveryCode(
      account.email!,
      code,
      account.tenant.name,
      account.tenant.phone,
      account.tenant.whatsapp_instances,
      isPartner ? (partner as any).whatsappNumber : null
    );

    console.log(`[RESET PASSWORD] Código para ${account.email}: ${code}`);

    return NextResponse.json({
      success: true,
      message: "Se o email estiver cadastrado, você receberá um código de recuperação.",
      sentViaEmail: sentViaEmail || false,
      sentViaWhatsApp: sentViaWhatsApp || false,
      _debug_code: sentViaEmail || sentViaWhatsApp ? "" : code,
      _debug_token: token,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
