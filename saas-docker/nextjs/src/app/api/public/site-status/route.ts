import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || searchParams.get("id");

    if (!tenantId) {
      return new NextResponse("// Missing tenantId", {
        headers: { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" }
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, settings: true }
    });

    if (!tenant) {
      return new NextResponse("// Tenant not found", {
        headers: { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" }
      });
    }

    // Check last sale status or subscription status for this tenant
    const lastSale = await prisma.sale.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { created_at: "desc" }
    });

    // If sale status is overdue or canceled, output suspension script
    const isSuspended = lastSale && (lastSale.status === "overdue" || lastSale.status === "canceled");

    if (isSuspended) {
      const jsContent = `
(function() {
  window.addEventListener('DOMContentLoaded', function() {
    document.body.innerHTML = \`
      <div style="min-height:100vh;background:#09090b;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;">
        <div style="max-w:500px;background:#18181b;border:1px solid #27272a;padding:40px;border-radius:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="width:64px;height:64px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px;">⚠️</div>
          <h1 style="font-size:22px;font-weight:700;margin-bottom:12px;">Site Temporariamente Suspenso</h1>
          <p style="font-size:14px;color:#a1a1aa;line-height:1.6;margin-bottom:24px;">Este site encontra-se suspenso devido a pendências na mensalidade de hospedagem. Se você é o proprietário, realize a quitação da sua fatura para restabelecer o acesso instantaneamente.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://nexus-six-olive.vercel.app'}/checkout/${tenantId}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:14px;padding:14px 28px;border-radius:14px;text-decoration:none;box-shadow:0 10px 20px rgba(99,102,241,0.3);">Regularizar Pagamento via Pix</a>
        </div>
      </div>
    \`;
  });
})();
      `;
      return new NextResponse(jsContent, {
        headers: { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new NextResponse("// License Active", {
      headers: { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return new NextResponse("// Error checking status", {
      headers: { "Content-Type": "application/javascript", "Access-Control-Allow-Origin": "*" }
    });
  }
}
