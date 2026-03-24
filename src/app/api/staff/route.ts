import { NextResponse } from 'next/server'
import { getAllStaff, getStaffWithLoad, createStaff, getSupervisionStats } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const withLoad = searchParams.get('withLoad') === 'true'
  const includeSupervision = searchParams.get('includeSupervision') === 'true'

  const staff = withLoad ? getStaffWithLoad() : getAllStaff()

  if (includeSupervision) {
    const supervision = getSupervisionStats()
    return NextResponse.json({ staff, supervision })
  }

  return NextResponse.json(staff)
}

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const id = createStaff({
      name: body.name,
      abbrev: body.abbrev,
      loa: body.loa || 0,
      mt_available: body.mt_available ?? 1,
      ht_available: body.ht_available ?? 1,
      expected_load: body.expected_load || 0,
      notes: body.notes || null,
      rank: body.rank || null,
      gender: body.gender || null,
      affiliation: body.affiliation || null
    })

    return NextResponse.json({ id }, { status: 201 })
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
