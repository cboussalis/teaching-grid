import { NextResponse } from 'next/server'
import { getAllStaff, getAllModules, getAllAllocations, getAllServiceRoles } from '@/lib/queries'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  switch (type) {
    case 'staff': {
      const staff = getAllStaff()
      const csv = generateCSV(staff, ['id', 'name', 'abbrev', 'loa', 'mt_available', 'ht_available', 'expected_load', 'notes'])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="staff_export.csv"'
        }
      })
    }

    case 'modules': {
      const modules = getAllModules()
      const csv = generateCSV(modules, ['id', 'code', 'name', 'level', 'term', 'load', 'notes'])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="modules_export.csv"'
        }
      })
    }

    case 'allocations': {
      const allocations = getAllAllocations()
      const csv = generateCSV(allocations, ['id', 'module_code', 'module_name', 'staff_abbrev', 'staff_name', 'load_hours'])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="allocations_export.csv"'
        }
      })
    }

    case 'services': {
      const roles = getAllServiceRoles()
      const csv = generateCSV(roles, ['id', 'name', 'category', 'staff_name', 'staff_abbrev', 'term'])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="service_roles_export.csv"'
        }
      })
    }

    case 'all': {
      // Export all data as JSON for backup
      const data = {
        staff: getAllStaff(),
        modules: getAllModules(),
        allocations: getAllAllocations(),
        serviceRoles: getAllServiceRoles(),
        exportDate: new Date().toISOString()
      }
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="teaching_grid_backup.json"'
        }
      })
    }

    default:
      return NextResponse.json({ error: 'Invalid export type. Use: staff, modules, allocations, services, or all' }, { status: 400 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCSV(data: any[], columns: string[]): string {
  const headers = columns.join(',')
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col]
      if (value === null || value === undefined) return ''
      const str = String(value)
      // Escape quotes and wrap in quotes if contains comma or quote
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  return [headers, ...rows].join('\n')
}
