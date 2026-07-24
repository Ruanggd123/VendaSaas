import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
    authenticated: true,
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      tenant_id: session.tenant_id,
    }
  }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
