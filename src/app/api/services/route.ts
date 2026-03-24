import { NextResponse } from 'next/server'
import { getAllServiceRoles, createServiceRole } from '@/lib/queries'

export async function GET() {
  const roles = getAllServiceRoles()
  return NextResponse.json(roles)
}

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const id = createServiceRole({
      name: body.name,
      category: body.category,
      staff_id: body.staff_id || null,
      term: body.term || null
    })

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
