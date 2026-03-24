import { NextResponse } from 'next/server'
import { getStaffWorkloadReport, getWarningsReport, getModulesWithAllocations } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  switch (type) {
    case 'workload':
      return NextResponse.json(getStaffWorkloadReport())
    case 'warnings':
      return NextResponse.json(getWarningsReport())
    case 'modules':
      return NextResponse.json(getModulesWithAllocations())
    default:
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
  }
}
