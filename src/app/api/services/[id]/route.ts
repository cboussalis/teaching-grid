import { NextResponse } from 'next/server'
import { getServiceRoleById, updateServiceRole, deleteServiceRole } from '@/lib/queries'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const role = getServiceRoleById(parseInt(id))

  if (!role) {
    return NextResponse.json({ error: 'Service role not found' }, { status: 404 })
  }

  return NextResponse.json(role)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    updateServiceRole(parseInt(id), body)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  deleteServiceRole(parseInt(id))
  return NextResponse.json({ success: true })
}
