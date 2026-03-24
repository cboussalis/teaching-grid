import { NextResponse } from 'next/server'
import { ensureCommunicationExists, getCommunicationByStaffId, updateCommunicationStatus } from '@/lib/queries'
import type { CommunicationStatus } from '@/types'

const VALID_STATUSES: CommunicationStatus[] = ['not_started', 'email_sent', 'in_discussion', 'agreed', 'disputed']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  const id = parseInt(staffId)

  // Lazy-create the communication record
  ensureCommunicationExists(id)

  const detail = getCommunicationByStaffId(id)
  if (!detail) {
    return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params
  const body = await request.json()

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    updateCommunicationStatus(parseInt(staffId), body.status)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
