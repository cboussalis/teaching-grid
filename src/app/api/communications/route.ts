import { NextResponse } from 'next/server'
import { getAllCommunications, getCommunicationStats, initializeAllCommunications } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  if (type === 'stats') {
    const stats = getCommunicationStats()
    return NextResponse.json(stats)
  }

  const communications = getAllCommunications()
  return NextResponse.json(communications)
}

export async function POST() {
  try {
    const count = initializeAllCommunications()
    return NextResponse.json({ initialized: count }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
