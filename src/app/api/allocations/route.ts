import { NextResponse } from 'next/server'
import { getAllAllocations, createAllocation, upsertAllocation, deleteAllocationByModuleAndStaff } from '@/lib/queries'

export async function GET() {
  const allocations = getAllAllocations()
  return NextResponse.json(allocations)
}

export async function POST(request: Request) {
  const body = await request.json()

  try {
    if (body.upsert) {
      // Upsert mode: update if exists, create if not
      upsertAllocation(body.module_id, body.staff_id, body.load_hours)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const id = createAllocation({
      module_id: body.module_id,
      staff_id: body.staff_id,
      load_hours: body.load_hours
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'This staff member is already allocated to this module' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const moduleId = searchParams.get('module_id')
  const staffId = searchParams.get('staff_id')

  if (!moduleId || !staffId) {
    return NextResponse.json(
      { error: 'module_id and staff_id are required' },
      { status: 400 }
    )
  }

  deleteAllocationByModuleAndStaff(parseInt(moduleId), parseInt(staffId))
  return NextResponse.json({ success: true })
}
