import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import {
  getModulesWithAllocations,
  getStaffWorkloadReport,
  getCurrentAcademicYear,
  getAllAllocations,
} from '@/lib/queries'
import {
  COLORS,
  COLUMN_WIDTHS,
  solidFill,
  sectionHeaderStyle,
  columnHeaderStyleWithFill,
  dataRowStyle,
  staffSummaryHeaderStyle,
  staffSummaryDataStyle,
  MODULE_COLUMNS,
  getLevelConfig,
  allBorders,
  dataFont,
  leftAlign,
  centerAlign,
  columnHeaderFont,
} from '@/lib/excel-styles'
import type { ModuleWithAllocations, AllocationWithDetails } from '@/types'

// Template row data structure for columns we want to merge
interface TemplateRowData {
  ects?: number | string
  lectureDuration?: string
  linkedModules?: string
  availableSchool?: string
  availableNonSchool?: string
  visitingNotes?: string
  timetableSets?: string
  roomCapacity?: number | string
}

// Section order for module levels
const LEVEL_ORDER = ['UG', 'MSc IP', 'ASDS', 'PhD'] as const

// Row tracking for SUMIFS formulas
interface RowRanges {
  ugStartRow: number
  ugEndRow: number
  pgStartRow: number
  pgEndRow: number
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body for template data
    const body = await request.json().catch(() => ({}))
    console.log('[Excel API] Received request body keys:', Object.keys(body))

    const templateDataObj: Record<string, TemplateRowData> | null = body.templateData || null
    console.log('[Excel API] templateDataObj is:', templateDataObj ? `Object with ${Object.keys(templateDataObj).length} keys` : 'null')

    // Convert object back to Map for internal use
    const templateData: Map<string, TemplateRowData> | null = templateDataObj
      ? new Map(Object.entries(templateDataObj))
      : null

    console.log('[Excel API] templateData Map is:', templateData ? `Map with ${templateData.size} entries` : 'null')
    if (templateData && templateData.size > 0) {
      const keys = Array.from(templateData.keys())
      console.log('[Excel API] First 5 template keys:', keys.slice(0, 5))
      keys.slice(0, 3).forEach(key => {
        console.log(`[Excel API] Template data for ${key}:`, templateData.get(key))
      })
    }

    // Fetch all data
    const allModules = getModulesWithAllocations()
    console.log('[Excel API] Total modules from DB:', allModules.length)
    console.log('[Excel API] First 5 module codes:', allModules.slice(0, 5).map(m => m.code))
    const workloadReport = getStaffWorkloadReport()
    const currentYear = getCurrentAcademicYear()
    const allAllocations = getAllAllocations()

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Teaching Grid App'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Political Science', {
      views: [{ showGridLines: true }],
    })

    // Set column widths
    setColumnWidths(worksheet)

    let currentRow = 1
    const rowRanges: RowRanges = {
      ugStartRow: 0,
      ugEndRow: 0,
      pgStartRow: 0,
      pgEndRow: 0,
    }

    // Build UG section first
    const ugModules = allModules.filter(m => m.level === 'UG')
    if (ugModules.length > 0) {
      currentRow = buildUGSection(worksheet, ugModules, currentRow, allAllocations, rowRanges, templateData)
      currentRow += 2 // Add spacing before PG section
    }

    // Build PG section (all PG levels together under one main header)
    const pgLevels = ['MSc IP', 'ASDS', 'PhD'] as const
    const pgModulesByLevel = pgLevels.map(level => ({
      level,
      modules: allModules.filter(m => m.level === level),
    })).filter(g => g.modules.length > 0)

    if (pgModulesByLevel.length > 0) {
      currentRow = buildPGSection(worksheet, pgModulesByLevel, currentRow, allAllocations, rowRanges, templateData)
      currentRow += 2 // Add spacing before staff summary
    }

    // Build staff summary section with formulas
    currentRow = buildStaffSummary(worksheet, workloadReport, currentRow, rowRanges)

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Create filename with year
    const yearLabel = currentYear?.year_label?.replace('-', '') || '2627'
    const filename = `Teaching_Plan_${yearLabel}_Political_Science.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Excel export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}

function setColumnWidths(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [
    { width: COLUMN_WIDTHS.CODE },
    { width: COLUMN_WIDTHS.TITLE },
    { width: COLUMN_WIDTHS.ECTS },
    { width: COLUMN_WIDTHS.MT },
    { width: COLUMN_WIDTHS.HT },
    { width: COLUMN_WIDTHS.FY },
    { width: COLUMN_WIDTHS.LECTURE_DURATION },
    { width: COLUMN_WIDTHS.TEACHING_VALUE },
    { width: COLUMN_WIDTHS.LINKED_MODULES },
    { width: COLUMN_WIDTHS.AVAILABLE_SCHOOL },
    { width: COLUMN_WIDTHS.AVAILABLE_NON_SCHOOL },
    { width: COLUMN_WIDTHS.VISITING_NOTES },
    { width: COLUMN_WIDTHS.TIMETABLE_TA },
    { width: COLUMN_WIDTHS.ROOM_CAPACITY },
  ]
}

function buildUGSection(
  worksheet: ExcelJS.Worksheet,
  modules: ModuleWithAllocations[],
  startRow: number,
  allAllocations: AllocationWithDetails[],
  rowRanges: RowRanges,
  templateData: Map<string, TemplateRowData> | null
): number {
  const config = getLevelConfig('UG')
  let currentRow = startRow

  // Section header (merged across all columns)
  const headerRow = worksheet.getRow(currentRow)
  worksheet.mergeCells(currentRow, 1, currentRow, 14)
  const headerCell = headerRow.getCell(1)
  headerCell.value = config.title
  Object.assign(headerCell, sectionHeaderStyle(config.headerLevel))
  headerRow.height = 25
  currentRow++

  // Column headers with fill color
  const columnHeaderRow = worksheet.getRow(currentRow)
  MODULE_COLUMNS.forEach((col, idx) => {
    const cell = columnHeaderRow.getCell(idx + 1)
    cell.value = col
    Object.assign(cell, columnHeaderStyleWithFill('UG'))
  })
  columnHeaderRow.height = 20
  currentRow++

  // Track where data starts
  rowRanges.ugStartRow = currentRow

  // Build module rows (one row per staff allocation)
  currentRow = buildModuleDataRows(worksheet, modules, 'UG', currentRow, allAllocations, templateData)

  // Track where data ends
  rowRanges.ugEndRow = currentRow - 1

  return currentRow
}

function buildPGSection(
  worksheet: ExcelJS.Worksheet,
  pgModulesByLevel: { level: string; modules: ModuleWithAllocations[] }[],
  startRow: number,
  allAllocations: AllocationWithDetails[],
  rowRanges: RowRanges,
  templateData: Map<string, TemplateRowData> | null
): number {
  let currentRow = startRow

  // Main PG header (merged across all columns)
  const mainHeaderRow = worksheet.getRow(currentRow)
  worksheet.mergeCells(currentRow, 1, currentRow, 14)
  const mainHeaderCell = mainHeaderRow.getCell(1)
  mainHeaderCell.value = 'POLITICAL SCIENCE - POSTGRADUATE'
  Object.assign(mainHeaderCell, sectionHeaderStyle('PG'))
  mainHeaderRow.height = 25
  currentRow++

  // Track where PG data starts (will be set on first sub-section)
  let pgDataStarted = false

  // Build each PG sub-section
  for (const { level, modules } of pgModulesByLevel) {
    const config = getLevelConfig(level)

    // Sub-header row (merged across all columns)
    const subHeaderRow = worksheet.getRow(currentRow)
    worksheet.mergeCells(currentRow, 1, currentRow, 14)
    const subHeaderCell = subHeaderRow.getCell(1)
    subHeaderCell.value = config.title
    // Sub-headers have fill but are slightly different styling
    subHeaderCell.fill = solidFill(COLORS.PG_HEADER)
    subHeaderCell.font = { bold: true, size: 11 }
    subHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' }
    subHeaderCell.border = allBorders as ExcelJS.Style['border']
    subHeaderRow.height = 20
    currentRow++

    // Column headers with fill color
    const columnHeaderRow = worksheet.getRow(currentRow)
    MODULE_COLUMNS.forEach((col, idx) => {
      const cell = columnHeaderRow.getCell(idx + 1)
      cell.value = col
      Object.assign(cell, columnHeaderStyleWithFill('PG'))
    })
    columnHeaderRow.height = 20
    currentRow++

    // Track PG start on first sub-section
    if (!pgDataStarted) {
      rowRanges.pgStartRow = currentRow
      pgDataStarted = true
    }

    // Build module rows
    currentRow = buildModuleDataRows(worksheet, modules, 'PG', currentRow, allAllocations, templateData)
  }

  // Track where PG data ends
  rowRanges.pgEndRow = currentRow - 1

  return currentRow
}

function buildModuleDataRows(
  worksheet: ExcelJS.Worksheet,
  modules: ModuleWithAllocations[],
  headerLevel: 'UG' | 'PG',
  startRow: number,
  allAllocations: AllocationWithDetails[],
  templateData: Map<string, TemplateRowData> | null
): number {
  let currentRow = startRow
  console.log(`[Excel API] buildModuleDataRows called for ${headerLevel} with ${modules.length} modules`)
  console.log(`[Excel API] Template data available: ${templateData !== null}, size: ${templateData?.size ?? 0}`)

  // Sort modules by code
  const sortedModules = [...modules].sort((a, b) => a.code.localeCompare(b.code))

  // Track row number within section for alternating colors
  let moduleIndex = 0
  let templateMatchCount = 0

  for (const module of sortedModules) {
    // Get allocations for this module
    const moduleAllocations = module.allocations || []

    // Skip modules with no staff allocations
    if (moduleAllocations.length === 0) continue

    // Get template data for this module if available
    const templateRow = templateData?.get(module.code)
    if (templateRow) {
      templateMatchCount++
      if (templateMatchCount <= 3) {
        console.log(`[Excel API] Found template match for ${module.code}:`, templateRow)
      }
    }

    const rowsToCreate = moduleAllocations.length
    const moduleStartRow = currentRow

    for (let i = 0; i < rowsToCreate; i++) {
      const row = worksheet.getRow(currentRow)
      const isOdd = moduleIndex % 2 === 0 // Even index = odd row in display
      const style = dataRowStyle(headerLevel, isOdd)
      const allocation = moduleAllocations[i]

      // Determine which term column this allocation belongs to
      let termColumn: 'MT' | 'HT' | 'FY' | null = null
      if (allocation) {
        if (module.term === 'MT') termColumn = 'MT'
        else if (module.term === 'HT') termColumn = 'HT'
        else if (module.term === 'FullYear') termColumn = 'FY'
      }

      // Column A: Code (only on first row, will be merged)
      const cellA = row.getCell(1)
      cellA.value = i === 0 ? module.code : ''
      Object.assign(cellA, style)

      // Column B: Title (only on first row, will be merged)
      const cellB = row.getCell(2)
      cellB.value = i === 0 ? module.name : ''
      Object.assign(cellB, style)

      // Column C: ECTS (only on first row, will be merged)
      // Priority: 1. Database ECTS, 2. Template ECTS, 3. module.load as fallback
      const cellC = row.getCell(3)
      if (i === 0) {
        if (module.ects !== null && module.ects !== undefined) {
          cellC.value = module.ects
        } else if (templateRow?.ects !== undefined) {
          cellC.value = templateRow.ects
        } else {
          cellC.value = module.load
        }
      } else {
        cellC.value = ''
      }
      Object.assign(cellC, style)

      // Column D: MT - staff name if MT allocation
      const cellD = row.getCell(4)
      cellD.value = termColumn === 'MT' && allocation ? allocation.staff_name : ''
      Object.assign(cellD, style)

      // Column E: HT - staff name if HT allocation
      const cellE = row.getCell(5)
      cellE.value = termColumn === 'HT' && allocation ? allocation.staff_name : ''
      Object.assign(cellE, style)

      // Column F: FY - staff name if FY allocation
      const cellF = row.getCell(6)
      cellF.value = termColumn === 'FY' && allocation ? allocation.staff_name : ''
      Object.assign(cellF, style)

      // Column G: Lecture Duration - from template if available
      const cellG = row.getCell(7)
      cellG.value = i === 0 && templateRow?.lectureDuration ? templateRow.lectureDuration : ''
      Object.assign(cellG, style)

      // Column H: Teaching value (allocation hours)
      const cellH = row.getCell(8)
      cellH.value = allocation ? allocation.load_hours : ''
      Object.assign(cellH, style)

      // Column I: Linked Modules (use template if available, otherwise notes)
      const cellI = row.getCell(9)
      if (i === 0) {
        cellI.value = templateRow?.linkedModules !== undefined ? templateRow.linkedModules : (module.notes || '')
      } else {
        cellI.value = ''
      }
      Object.assign(cellI, style)

      // Column J: Available to (School) - from template
      const cellJ = row.getCell(10)
      cellJ.value = i === 0 && templateRow?.availableSchool ? templateRow.availableSchool : ''
      Object.assign(cellJ, style)

      // Column K: Available to (non-School) - from template
      const cellK = row.getCell(11)
      cellK.value = i === 0 && templateRow?.availableNonSchool ? templateRow.availableNonSchool : ''
      Object.assign(cellK, style)

      // Column L: Visiting/Notes - from template
      const cellL = row.getCell(12)
      cellL.value = i === 0 && templateRow?.visitingNotes ? templateRow.visitingNotes : ''
      Object.assign(cellL, style)

      // Column M: Timetable Sets - from template
      const cellM = row.getCell(13)
      cellM.value = i === 0 && templateRow?.timetableSets ? templateRow.timetableSets : ''
      Object.assign(cellM, style)

      // Column N: Room capacity - from template
      const cellN = row.getCell(14)
      cellN.value = i === 0 && templateRow?.roomCapacity !== undefined ? templateRow.roomCapacity : ''
      Object.assign(cellN, style)

      currentRow++
    }

    // Merge cells for Code, Title, ECTS, and template columns if multiple rows
    if (rowsToCreate > 1) {
      worksheet.mergeCells(moduleStartRow, 1, moduleStartRow + rowsToCreate - 1, 1) // Code
      worksheet.mergeCells(moduleStartRow, 2, moduleStartRow + rowsToCreate - 1, 2) // Title
      worksheet.mergeCells(moduleStartRow, 3, moduleStartRow + rowsToCreate - 1, 3) // ECTS
      worksheet.mergeCells(moduleStartRow, 7, moduleStartRow + rowsToCreate - 1, 7) // Lecture Duration
      worksheet.mergeCells(moduleStartRow, 9, moduleStartRow + rowsToCreate - 1, 9) // Linked Modules
      worksheet.mergeCells(moduleStartRow, 10, moduleStartRow + rowsToCreate - 1, 10) // Available School
      worksheet.mergeCells(moduleStartRow, 11, moduleStartRow + rowsToCreate - 1, 11) // Available non-School
      worksheet.mergeCells(moduleStartRow, 12, moduleStartRow + rowsToCreate - 1, 12) // Visiting/Notes
      worksheet.mergeCells(moduleStartRow, 13, moduleStartRow + rowsToCreate - 1, 13) // Timetable Sets
      worksheet.mergeCells(moduleStartRow, 14, moduleStartRow + rowsToCreate - 1, 14) // Room capacity
    }

    moduleIndex++
  }

  console.log(`[Excel API] ${headerLevel} section: processed ${moduleIndex} modules, ${templateMatchCount} had template data`)
  return currentRow
}

function buildStaffSummary(
  worksheet: ExcelJS.Worksheet,
  workloadReport: { staff: { id: number; name: string; abbrev: string; notes?: string | null }; teachingLoad: number; allocations: AllocationWithDetails[] }[],
  startRow: number,
  rowRanges: RowRanges
): number {
  let currentRow = startRow

  // Row 1: Main title "Teaching Political Science..." (merged B:M)
  // Note: We start from column B (index 2) as per template
  const titleRow = worksheet.getRow(currentRow)
  worksheet.mergeCells(currentRow, 2, currentRow, 13)
  const titleCell = titleRow.getCell(2)
  titleCell.value = 'Teaching Political Science 2026-27'
  titleCell.fill = solidFill(COLORS.STAFF_HEADER)
  titleCell.font = { bold: true, size: 12 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.border = allBorders as ExcelJS.Style['border']
  titleRow.height = 25
  currentRow++

  // Row 2-3: Two-row column headers with vertical merges
  const headerRow1 = currentRow
  const headerRow2 = currentRow + 1

  // B: "Lecturers" (merged B117:B118)
  worksheet.mergeCells(headerRow1, 2, headerRow2, 2)
  const lecturerCell = worksheet.getCell(headerRow1, 2)
  lecturerCell.value = 'Lecturers'
  Object.assign(lecturerCell, staffSummaryHeaderStyle('OTHER'))
  lecturerCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // C:D "MT" (merged C117:D117)
  worksheet.mergeCells(headerRow1, 3, headerRow1, 4)
  const mtHeaderCell = worksheet.getCell(headerRow1, 3)
  mtHeaderCell.value = 'MT'
  Object.assign(mtHeaderCell, staffSummaryHeaderStyle('MT'))

  // E:F "HT" (merged E117:F117)
  worksheet.mergeCells(headerRow1, 5, headerRow1, 6)
  const htHeaderCell = worksheet.getCell(headerRow1, 5)
  htHeaderCell.value = 'HT'
  Object.assign(htHeaderCell, staffSummaryHeaderStyle('HT'))

  // G:H "FY" (merged G117:H117)
  worksheet.mergeCells(headerRow1, 7, headerRow1, 8)
  const fyHeaderCell = worksheet.getCell(headerRow1, 7)
  fyHeaderCell.value = 'FY'
  Object.assign(fyHeaderCell, staffSummaryHeaderStyle('FY'))

  // I:J "Teaching Split" (merged I117:J117)
  worksheet.mergeCells(headerRow1, 9, headerRow1, 10)
  const splitHeaderCell = worksheet.getCell(headerRow1, 9)
  splitHeaderCell.value = 'Teaching Split'
  Object.assign(splitHeaderCell, staffSummaryHeaderStyle('SPLIT'))

  // K: "Total" (single cell, will be merged vertically)
  worksheet.mergeCells(headerRow1, 11, headerRow2, 11)
  const totalHeaderCell = worksheet.getCell(headerRow1, 11)
  totalHeaderCell.value = 'Total'
  Object.assign(totalHeaderCell, staffSummaryHeaderStyle('OTHER'))
  totalHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // L: "Notes" (merged vertically)
  worksheet.mergeCells(headerRow1, 12, headerRow2, 12)
  const notesHeaderCell = worksheet.getCell(headerRow1, 12)
  notesHeaderCell.value = 'Notes'
  Object.assign(notesHeaderCell, staffSummaryHeaderStyle('OTHER'))
  notesHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // M: "TA Duties" (merged vertically)
  worksheet.mergeCells(headerRow1, 13, headerRow2, 13)
  const taHeaderCell = worksheet.getCell(headerRow1, 13)
  taHeaderCell.value = 'TA Duties'
  Object.assign(taHeaderCell, staffSummaryHeaderStyle('OTHER'))
  taHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 2: Sub-headers (UG/PG, MT/HT for splits)
  const subHeaderRow = worksheet.getRow(headerRow2)

  // C: UG (under MT)
  const mtUgCell = subHeaderRow.getCell(3)
  mtUgCell.value = 'UG'
  Object.assign(mtUgCell, staffSummaryHeaderStyle('MT'))

  // D: PG (under MT)
  const mtPgCell = subHeaderRow.getCell(4)
  mtPgCell.value = 'PG'
  Object.assign(mtPgCell, staffSummaryHeaderStyle('MT'))

  // E: UG (under HT)
  const htUgCell = subHeaderRow.getCell(5)
  htUgCell.value = 'UG'
  Object.assign(htUgCell, staffSummaryHeaderStyle('HT'))

  // F: PG (under HT)
  const htPgCell = subHeaderRow.getCell(6)
  htPgCell.value = 'PG'
  Object.assign(htPgCell, staffSummaryHeaderStyle('HT'))

  // G: UG (under FY)
  const fyUgCell = subHeaderRow.getCell(7)
  fyUgCell.value = 'UG'
  Object.assign(fyUgCell, staffSummaryHeaderStyle('FY'))

  // H: PG (under FY)
  const fyPgCell = subHeaderRow.getCell(8)
  fyPgCell.value = 'PG'
  Object.assign(fyPgCell, staffSummaryHeaderStyle('FY'))

  // I: MT (under Teaching Split)
  const splitMtCell = subHeaderRow.getCell(9)
  splitMtCell.value = 'MT'
  Object.assign(splitMtCell, staffSummaryHeaderStyle('SPLIT'))

  // J: HT (under Teaching Split)
  const splitHtCell = subHeaderRow.getCell(10)
  splitHtCell.value = 'HT'
  Object.assign(splitHtCell, staffSummaryHeaderStyle('SPLIT'))

  worksheet.getRow(headerRow1).height = 20
  worksheet.getRow(headerRow2).height = 20

  currentRow = headerRow2 + 1

  // Sort staff by name, exclude "Other" staff member
  const sortedWorkload = [...workloadReport]
    .filter(r => r.staff.name.toLowerCase() !== 'other')
    .sort((a, b) => a.staff.name.localeCompare(b.staff.name))

  // Data rows with SUMIFS formulas
  for (const report of sortedWorkload) {
    const row = worksheet.getRow(currentRow)
    const staffName = report.staff.name

    // Column B: Lecturer name
    const cellB = row.getCell(2)
    cellB.value = staffName
    Object.assign(cellB, staffSummaryDataStyle('LECTURER'))

    // Column C: MT UG - SUMIFS formula
    const cellC = row.getCell(3)
    if (rowRanges.ugStartRow > 0 && rowRanges.ugEndRow > 0) {
      cellC.value = {
        formula: `SUMIFS(H${rowRanges.ugStartRow}:H${rowRanges.ugEndRow},D${rowRanges.ugStartRow}:D${rowRanges.ugEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellC, staffSummaryDataStyle('MT'))
    cellC.alignment = centerAlign

    // Column D: MT PG - SUMIFS formula
    const cellD = row.getCell(4)
    if (rowRanges.pgStartRow > 0 && rowRanges.pgEndRow > 0) {
      cellD.value = {
        formula: `SUMIFS(H${rowRanges.pgStartRow}:H${rowRanges.pgEndRow},D${rowRanges.pgStartRow}:D${rowRanges.pgEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellD, staffSummaryDataStyle('MT'))
    cellD.alignment = centerAlign

    // Column E: HT UG - SUMIFS formula
    const cellE = row.getCell(5)
    if (rowRanges.ugStartRow > 0 && rowRanges.ugEndRow > 0) {
      cellE.value = {
        formula: `SUMIFS(H${rowRanges.ugStartRow}:H${rowRanges.ugEndRow},E${rowRanges.ugStartRow}:E${rowRanges.ugEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellE, staffSummaryDataStyle('HT'))
    cellE.alignment = centerAlign

    // Column F: HT PG - SUMIFS formula
    const cellF = row.getCell(6)
    if (rowRanges.pgStartRow > 0 && rowRanges.pgEndRow > 0) {
      cellF.value = {
        formula: `SUMIFS(H${rowRanges.pgStartRow}:H${rowRanges.pgEndRow},E${rowRanges.pgStartRow}:E${rowRanges.pgEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellF, staffSummaryDataStyle('HT'))
    cellF.alignment = centerAlign

    // Column G: FY UG - SUMIFS formula
    const cellG = row.getCell(7)
    if (rowRanges.ugStartRow > 0 && rowRanges.ugEndRow > 0) {
      cellG.value = {
        formula: `SUMIFS(H${rowRanges.ugStartRow}:H${rowRanges.ugEndRow},F${rowRanges.ugStartRow}:F${rowRanges.ugEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellG, staffSummaryDataStyle('FY'))
    cellG.alignment = centerAlign

    // Column H: FY PG - SUMIFS formula
    const cellH = row.getCell(8)
    if (rowRanges.pgStartRow > 0 && rowRanges.pgEndRow > 0) {
      cellH.value = {
        formula: `SUMIFS(H${rowRanges.pgStartRow}:H${rowRanges.pgEndRow},F${rowRanges.pgStartRow}:F${rowRanges.pgEndRow},B${currentRow})`,
      }
    }
    Object.assign(cellH, staffSummaryDataStyle('FY'))
    cellH.alignment = centerAlign

    // Column I: Teaching Split MT = (MT_UG + MT_PG + FY/2) / Total as percentage
    // Formula: (C+D+(G+H)/2)/K - with IFERROR to handle divide by zero
    const cellI = row.getCell(9)
    cellI.value = {
      formula: `IFERROR((C${currentRow}+D${currentRow}+(G${currentRow}+H${currentRow})/2)/K${currentRow},0)`,
    }
    Object.assign(cellI, staffSummaryDataStyle('OTHER'))
    cellI.alignment = centerAlign
    cellI.numFmt = '0%'

    // Column J: Teaching Split HT = (HT_UG + HT_PG + FY/2) / Total as percentage
    // Formula: (E+F+(G+H)/2)/K - with IFERROR to handle divide by zero
    const cellJ = row.getCell(10)
    cellJ.value = {
      formula: `IFERROR((E${currentRow}+F${currentRow}+(G${currentRow}+H${currentRow})/2)/K${currentRow},0)`,
    }
    Object.assign(cellJ, staffSummaryDataStyle('OTHER'))
    cellJ.alignment = centerAlign
    cellJ.numFmt = '0%'

    // Column K: Total = SUM(C:H)
    const cellK = row.getCell(11)
    cellK.value = {
      formula: `SUM(C${currentRow}:H${currentRow})`,
    }
    Object.assign(cellK, staffSummaryDataStyle('OTHER'))
    cellK.alignment = centerAlign

    // Column L: Notes
    const cellL = row.getCell(12)
    cellL.value = report.staff.notes || ''
    Object.assign(cellL, staffSummaryDataStyle('OTHER'))

    // Column M: TA Duties (not in current data)
    const cellM = row.getCell(13)
    cellM.value = ''
    Object.assign(cellM, staffSummaryDataStyle('OTHER'))

    currentRow++
  }

  return currentRow
}
