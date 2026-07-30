import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let tenantName = "";
    let tenantPlan = "";
    let referralCode = "";

    if (session.tenant_id) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenant_id },
        select: { name: true, settings: true },
      });
      if (tenant) {
        tenantName = tenant.name;
        try {
          const s = JSON.parse(tenant.settings || '{}');
          tenantPlan = s.plan_name || s.subscription_plan || "Growth";
        } catch {
          tenantPlan = "Growth";
        }
      }
    }

    if (session.role === 'partner') {
      const partner = await prisma.partner.findFirst({
        where: { email: session.email },
        select: { referralCode: true, commissionRate: true },
      });
      if (partner) {
        referralCode = partner.referralCode;
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        tenant_id: session.tenant_id,
        tenant_name: tenantName,
        tenant_plan: tenantPlan,
        referral_code: referralCode,
      }
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
