import { NextRequest, NextResponse } from 'next/server'
import {
  getStaffWorkloadReport,
  getModulesWithAllocations,
  getAllServiceRoles,
  getCurrentAcademicYear,
} from '@/lib/queries'
import { getUGYear } from '@/lib/module-utils'
import type { ModuleWithAllocations, ServiceRoleWithStaff } from '@/types'

type ReportType = 'teaching' | 'service' | 'modules'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') as ReportType

  if (!type || !['teaching', 'service', 'modules'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid report type. Use: teaching, service, or modules' },
      { status: 400 }
    )
  }

  const currentYear = getCurrentAcademicYear()
  const versionDate = new Date().toISOString().split('T')[0]

  let content: string
  let filename: string

  switch (type) {
    case 'teaching':
      content = generateTeachingReport(versionDate)
      filename = `Teaching_Allocations_Report_${currentYear?.year_label || 'unknown'}.txt`
      break
    case 'service':
      content = generateServiceReport(versionDate)
      filename = `Service_Allocations_Report_${currentYear?.year_label || 'unknown'}.txt`
      break
    case 'modules':
      content = generateModuleReport(versionDate)
      filename = `Module_Offering_Report_${currentYear?.year_label || 'unknown'}.txt`
      break
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function generateTeachingReport(versionDate: string): string {
  const workloadReport = getStaffWorkloadReport()
  const lines: string[] = []

  lines.push(`Teaching Allocations Report (Version: ${versionDate})`)
  lines.push('='.repeat(50))
  lines.push('')

  // Sort staff alphabetically by name
  const sortedStaff = [...workloadReport].sort((a, b) =>
    a.staff.name.localeCompare(b.staff.name)
  )

  for (const report of sortedStaff) {
    const { staff, teachingLoad, serviceRoles, allocations } = report

    // Calculate term breakdown
    let htLoad = 0
    let mtLoad = 0
    let otherLoad = 0

    for (const alloc of allocations) {
      if (alloc.module_term === 'MT') {
        mtLoad += alloc.load_hours
      } else if (alloc.module_term === 'HT') {
        htLoad += alloc.load_hours
      } else if (alloc.module_term === 'FullYear') {
        // Split full year evenly
        mtLoad += alloc.load_hours / 2
        htLoad += alloc.load_hours / 2
      } else {
        otherLoad += alloc.load_hours
      }
    }

    // Staff header with load breakdown
    const loadBreakdown = `Total Load: ${teachingLoad}, HT: ${htLoad}, MT: ${mtLoad}, Other: ${otherLoad}`
    lines.push(`${staff.name} (${loadBreakdown})`)
    lines.push('-'.repeat(staff.name.length))

    // LOA and availability status
    if (staff.loa === 1 || staff.mt_available === 0 || staff.ht_available === 0) {
      const statusParts: string[] = []
      if (staff.loa === 1) statusParts.push('Leave of Absence')
      if (staff.mt_available === 0) statusParts.push('Not available MT')
      if (staff.ht_available === 0) statusParts.push('Not available HT')
      lines.push(`  ${statusParts.join(', ')}`)
      lines.push('')
    }

    // Teaching allocations
    lines.push('  Teaching:')
    if (allocations.length === 0) {
      lines.push('    • No teaching assignments')
    } else {
      // Sort allocations by module code
      const sortedAllocations = [...allocations].sort((a, b) =>
        a.module_code.localeCompare(b.module_code)
      )
      for (const alloc of sortedAllocations) {
        lines.push(
          `    • ${alloc.module_code} - ${alloc.module_name} (Level ${alloc.module_level || 'N/A'}, Term ${alloc.module_term}, Load: ${alloc.load_hours})`
        )
      }
    }
    lines.push('')

    // Service roles
    lines.push('  Service Roles:')
    if (serviceRoles.length === 0) {
      lines.push('    • No Dept or School service role')
    } else {
      for (const role of serviceRoles) {
        lines.push(`    • ${role.name} - ${role.category}`)
      }
    }
    lines.push('')
    lines.push('')
  }

  return lines.join('\n')
}

function generateServiceReport(versionDate: string): string {
  const workloadReport = getStaffWorkloadReport()
  const lines: string[] = []

  lines.push(`Service Allocations Report (Version: ${versionDate})`)
  lines.push('='.repeat(50))
  lines.push('')

  // Sort staff alphabetically by name
  const sortedStaff = [...workloadReport].sort((a, b) =>
    a.staff.name.localeCompare(b.staff.name)
  )

  for (const report of sortedStaff) {
    const { staff, serviceRoles } = report

    lines.push(staff.name)
    lines.push('-'.repeat(staff.name.length))

    // LOA status
    if (staff.loa === 1) {
      lines.push('  Leave of Absence')
      lines.push('')
    }

    // Service roles
    if (serviceRoles.length === 0) {
      lines.push('  • No Dept or School service role')
    } else {
      for (const role of serviceRoles) {
        lines.push(`  • ${role.name} - ${role.category}`)
      }
    }
    lines.push('')
    lines.push('')
  }

  return lines.join('\n')
}

function generateModuleReport(versionDate: string): string {
  const allModules = getModulesWithAllocations()
  const lines: string[] = []

  lines.push(`Module Offering Report (Version: ${versionDate})`)
  lines.push('='.repeat(60))
  lines.push('')

  // Filter out unassigned modules and group by level
  const assignedModules = allModules.filter(m => m.allocations.length > 0)
  const ugModules = assignedModules.filter(m => m.level === 'UG')
  const mscModules = assignedModules.filter(m => m.level === 'MSc IP')
  const asdsModules = assignedModules.filter(m => m.level === 'ASDS')
  const phdModules = assignedModules.filter(m => m.level === 'PhD')

  // UG Modules - organized by year, then term
  if (ugModules.length > 0) {
    const mtCount = ugModules.filter(m => m.term === 'MT').length
    const htCount = ugModules.filter(m => m.term === 'HT').length

    lines.push('UG Modules')
    lines.push('-'.repeat(10))
    lines.push(`Total Modules in MT: ${mtCount}, HT: ${htCount}`)
    lines.push('')

    // Group by year (1-4)
    const byYear = new Map<number, ModuleWithAllocations[]>()
    const noYear: ModuleWithAllocations[] = []

    for (const module of ugModules) {
      const year = getUGYear(module.code)
      if (year !== null) {
        if (!byYear.has(year)) {
          byYear.set(year, [])
        }
        byYear.get(year)!.push(module)
      } else {
        noYear.push(module)
      }
    }

    // Sort years and output
    const years = Array.from(byYear.keys()).sort()
    for (const year of years) {
      const yearModules = byYear.get(year)!
      const yearLabels: Record<number, string> = {
        1: '1st Year (JF)',
        2: '2nd Year (SF)',
        3: '3rd Year (JS)',
        4: '4th Year (SS)',
      }

      lines.push(`  ${yearLabels[year] || `Year ${year}`}`)
      lines.push(`  ${'-'.repeat((yearLabels[year] || `Year ${year}`).length)}`)

      // Group by term within year
      outputModulesByTerm(yearModules, lines, '    ')
      lines.push('')
    }

    // Output modules without recognized year codes
    if (noYear.length > 0) {
      lines.push('  Other UG Modules')
      lines.push('  ' + '-'.repeat(16))
      outputModulesByTerm(noYear, lines, '    ')
      lines.push('')
    }
  }

  // MSc IP Modules
  if (mscModules.length > 0) {
    const mtCount = mscModules.filter(m => m.term === 'MT').length
    const htCount = mscModules.filter(m => m.term === 'HT').length

    lines.push('MSc IP Modules')
    lines.push('-'.repeat(14))
    lines.push(`Total Modules in MT: ${mtCount}, HT: ${htCount}`)
    lines.push('')
    outputModulesByTerm(mscModules, lines, '  ')
    lines.push('')
  }

  // ASDS Modules
  if (asdsModules.length > 0) {
    const mtCount = asdsModules.filter(m => m.term === 'MT').length
    const htCount = asdsModules.filter(m => m.term === 'HT').length

    lines.push('ASDS Modules')
    lines.push('-'.repeat(12))
    lines.push(`Total Modules in MT: ${mtCount}, HT: ${htCount}`)
    lines.push('')
    outputModulesByTerm(asdsModules, lines, '  ')
    lines.push('')
  }

  // PhD Modules
  if (phdModules.length > 0) {
    lines.push('PhD Modules')
    lines.push('-'.repeat(11))
    lines.push(`Total Modules: ${phdModules.length}`)
    lines.push('')

    // Sort by code and output all
    const sorted = [...phdModules].sort((a, b) => a.code.localeCompare(b.code))
    for (const module of sorted) {
      const instructors = module.allocations.map(a => a.staff_name).join(', ')
      lines.push(
        `  • ${module.code} - ${module.name} (Term: ${module.term}, Load: ${module.load}, Instructor: ${instructors})`
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

function outputModulesByTerm(
  modules: ModuleWithAllocations[],
  lines: string[],
  indent: string
): void {
  // Group by term
  const mtModules = modules.filter(m => m.term === 'MT')
  const htModules = modules.filter(m => m.term === 'HT')
  const fyModules = modules.filter(m => m.term === 'FullYear')
  const ttModules = modules.filter(m => m.term === 'TT')

  if (mtModules.length > 0) {
    lines.push(`${indent}MT Term (${mtModules.length} modules)`)
    lines.push(`${indent}${'-'.repeat(20)}`)
    outputModuleList(mtModules, lines, indent + '  ')
    lines.push('')
  }

  if (htModules.length > 0) {
    lines.push(`${indent}HT Term (${htModules.length} modules)`)
    lines.push(`${indent}${'-'.repeat(20)}`)
    outputModuleList(htModules, lines, indent + '  ')
    lines.push('')
  }

  if (fyModules.length > 0) {
    lines.push(`${indent}Full Year (${fyModules.length} modules)`)
    lines.push(`${indent}${'-'.repeat(24)}`)
    outputModuleList(fyModules, lines, indent + '  ')
    lines.push('')
  }

  if (ttModules.length > 0) {
    lines.push(`${indent}TT Term (${ttModules.length} modules)`)
    lines.push(`${indent}${'-'.repeat(20)}`)
    outputModuleList(ttModules, lines, indent + '  ')
    lines.push('')
  }
}

function outputModuleList(
  modules: ModuleWithAllocations[],
  lines: string[],
  indent: string
): void {
  // Sort by code
  const sorted = [...modules].sort((a, b) => a.code.localeCompare(b.code))

  for (const module of sorted) {
    const instructors = module.allocations.map(a => a.staff_name).join(', ')
    lines.push(
      `${indent}• ${module.code} - ${module.name} (Term: ${module.term}, Load: ${module.load}, Instructor: ${instructors})`
    )
  }
}
