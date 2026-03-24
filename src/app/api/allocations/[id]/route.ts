import { NextResponse } from 'next/server'
import { updateAllocation, deleteAllocation } from '@/lib/queries'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    updateAllocation(parseInt(id), body.load_hours)
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
  deleteAllocation(parseInt(id))
  return NextResponse.json({ success: true })
}
