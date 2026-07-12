import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: {
        bot_config: true
      }
    })

    return NextResponse.json({
      success: true,
      config: tenant?.bot_config || {}
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load config' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { tenantId: string } }
) {
  try {
    const body = await request.json()

    await prisma.tenant.update({
      where: { id: params.tenantId },
      data: {
        bot_config: body
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save config' },
      { status: 500 }
    )
  }
}
