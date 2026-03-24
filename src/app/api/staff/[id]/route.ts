import { NextResponse } from 'next/server'
import { getStaffById, updateStaff, deleteStaff, getAllocationsForStaff } from '@/lib/queries'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const staff = getStaffById(parseInt(id))

  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  const allocations = getAllocationsForStaff(staff.id)

  return NextResponse.json({ ...staff, allocations })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    updateStaff(parseInt(id), body)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A staff member with this abbreviation already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  deleteStaff(parseInt(id))
  return NextResponse.json({ success: true })
}
