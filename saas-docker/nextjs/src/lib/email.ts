import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function getConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) return null;

  return { host, port: parseInt(port), user, pass, from };
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const config = getConfig();
  if (!config) return false;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return false;
  }
}

export function getRecoveryEmailHtml(code: string, companyName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 40px; margin-bottom: 8px;">🔐</div>
        <h1 style="font-size: 20px; color: #1f2937; margin: 0;">Recuperação de Senha</h1>
      </div>
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Olá!</p>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Recebemos uma solicitação de recuperação de senha para sua conta em <strong>${companyName}</strong>.</p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 16px; border-radius: 8px; font-family: monospace;">${code}</div>
        </div>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Este código expira em <strong>15 minutos</strong>.</p>
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">Se você não solicitou esta alteração, ignore este email. Nunca compartilhe este código com ninguém.</p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #9ca3af; font-size: 11px;">${companyName} — Assistente Virtual</p>
      </div>
    </div>
  `;
}
