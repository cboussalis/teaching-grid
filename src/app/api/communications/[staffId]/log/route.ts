import { NextResponse } from 'next/server'
import { ensureCommunicationExists, addCommunicationLog, deleteCommunicationLog } from '@/lib/queries'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  const body = await request.json()

  if (!body.note || typeof body.note !== 'string' || !body.note.trim()) {
    return NextResponse.json({ error: 'Note is required' }, { status: 400 })
  }

  try {
    const comm = ensureCommunicationExists(parseInt(staffId))
    const log = addCommunicationLog(comm.id, body.note.trim())
    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const logId = searchParams.get('logId')

  if (!logId) {
    return NextResponse.json({ error: 'logId is required' }, { status: 400 })
  }

  try {
    deleteCommunicationLog(parseInt(logId))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
