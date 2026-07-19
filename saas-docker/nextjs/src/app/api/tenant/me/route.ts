import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return NextResponse.json({ tenantId: session.tenantId });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
