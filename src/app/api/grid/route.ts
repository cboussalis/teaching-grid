import { NextResponse } from 'next/server'
import { getGridData, getStaffWithLoad, getAllModules } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level') || undefined
  const term = searchParams.get('term') || undefined

  const { staff, modules, allocations } = getGridData({ level, term })
  const staffWithLoad = getStaffWithLoad()
  const allModules = getAllModules()

  // Convert Map to object for JSON serialization
  const allocationsObj: Record<string, number> = {}
  allocations.forEach((value, key) => {
    allocationsObj[key] = value
  })

  // Create a map of staff id to their load info
  const staffLoadMap: Record<number, { actual_load: number; expected_load: number; load_status: string }> = {}
  staffWithLoad.forEach(s => {
    staffLoadMap[s.id] = {
      actual_load: s.actual_load,
      expected_load: s.expected_load,
      load_status: s.load_status
    }
  })

  return NextResponse.json({
    staff,
    modules,
    allModules,
    allocations: allocationsObj,
    staffLoad: staffLoadMap
  })
}
