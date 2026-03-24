import { NextResponse } from 'next/server'
import { getAllModules, getModulesWithAllocations, createModule } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const withAllocations = searchParams.get('withAllocations') === 'true'
  const level = searchParams.get('level') || undefined
  const term = searchParams.get('term') || undefined

  if (withAllocations) {
    const modules = getModulesWithAllocations({ level, term })
    return NextResponse.json(modules)
  }

  const modules = getAllModules()
  return NextResponse.json(modules)
}

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const id = createModule({
      code: body.code,
      name: body.name,
      level: body.level,
      term: body.term,
      load: body.load || 0,
      ects: body.ects ?? null,
      notes: body.notes || null
    })

    return NextResponse.json({ id }, { status: 201 })
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
