import { NextResponse } from 'next/server'
import { getModuleById, updateModule, deleteModule, getAllocationsForModule } from '@/lib/queries'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const module = getModuleById(parseInt(id))

  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  const allocations = getAllocationsForModule(module.id)

  return NextResponse.json({ ...module, allocations })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  try {
    updateModule(parseInt(id), body)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'A module with this code already exists' },
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
  deleteModule(parseInt(id))
  return NextResponse.json({ success: true })
}
