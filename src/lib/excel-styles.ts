// Excel style definitions for Teaching Plan export
// Matches the 2025-26 template format exactly

import type { Style, Fill, Font, Border, Alignment } from 'exceljs'

// Color palette from template
export const COLORS = {
  // Section headers
  UG_HEADER: 'E97132',        // Orange for UG section
  PG_HEADER: 'FFC000',        // Gold for PG sections (MSc IP, ASDS, PhD)
  STAFF_HEADER: 'FFEB9C',     // Light yellow for staff summary header

  // Alternating row colors
  UG_ROW_ODD: 'FBE3D6',       // Light peach for UG odd rows
  PG_ROW_ODD: 'FFF2CC',       // Light yellow for PG odd rows

  // Staff summary column headers
  MT_COLUMN: 'A6A6A6',        // Gray for MT columns
  HT_COLUMN: 'F2AA84',        // Orange for HT columns
  FY_COLUMN: '8ED973',        // Green for FY columns
  TEACHING_SPLIT: '00B0F0',   // Blue for Teaching Split columns

  // Staff summary data row colors
  STAFF_DATA_LECTURER: 'FFF2CC',  // Light yellow for lecturer column
  STAFF_DATA_MT: 'E8E8E8',        // Light gray for MT columns
  STAFF_DATA_HT: 'FBE3D6',        // Light peach for HT columns
  STAFF_DATA_FY: 'D9F2D0',        // Light green for FY columns

  // Special highlights
  NEW_PENDING: 'FFFF00',      // Yellow for new/pending items

  // Standard colors
  WHITE: 'FFFFFF',
  BLACK: '000000',
  BORDER_GRAY: 'D0D0D0',
} as const

// Column widths from template (in Excel units)
export const COLUMN_WIDTHS = {
  CODE: 10.25,
  TITLE: 37.26,
  ECTS: 8.76,
  MT: 22.37,
  HT: 20.87,
  FY: 15.74,
  LECTURE_DURATION: 15.63,
  TEACHING_VALUE: 15.63,
  LINKED_MODULES: 19.74,
  AVAILABLE_SCHOOL: 20.76,
  AVAILABLE_NON_SCHOOL: 12.13,
  VISITING_NOTES: 24.63,
  TIMETABLE_TA: 15.63,
  ROOM_CAPACITY: 30.63,
} as const

// Staff summary column widths
export const STAFF_COLUMN_WIDTHS = {
  LECTURER: 25,
  MT_UG: 8,
  MT_PG: 8,
  HT_UG: 8,
  HT_PG: 8,
  FY_UG: 8,
  FY_PG: 8,
  SPLIT_MT: 10,
  SPLIT_HT: 10,
  TOTAL: 10,
  NOTES: 30,
  TA_DUTIES: 20,
} as const

// Border style
export const thinBorder: Partial<Border> = {
  style: 'thin',
  color: { argb: COLORS.BORDER_GRAY }
}

export const allBorders: Partial<Borders> = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
}

interface Borders {
  top?: Partial<Border>
  left?: Partial<Border>
  bottom?: Partial<Border>
  right?: Partial<Border>
}

// Fill styles
export function solidFill(color: string): Fill {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: color }
  }
}

// Font styles
export const headerFont: Partial<Font> = {
  bold: true,
  size: 11,
  color: { argb: COLORS.WHITE }
}

export const sectionTitleFont: Partial<Font> = {
  bold: true,
  size: 11,
  color: { argb: COLORS.WHITE }
}

export const columnHeaderFont: Partial<Font> = {
  bold: true,
  size: 10,
}

export const dataFont: Partial<Font> = {
  size: 10,
}

// Alignment styles
export const centerAlign: Partial<Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
}

export const leftAlign: Partial<Alignment> = {
  horizontal: 'left',
  vertical: 'middle',
}

// Complete style objects for different cell types
export function sectionHeaderStyle(level: 'UG' | 'PG'): Partial<Style> {
  return {
    fill: solidFill(level === 'UG' ? COLORS.UG_HEADER : COLORS.PG_HEADER),
    font: sectionTitleFont,
    alignment: centerAlign,
    border: allBorders as Style['border'],
  }
}

export function columnHeaderStyle(): Partial<Style> {
  return {
    font: columnHeaderFont,
    alignment: centerAlign,
    border: allBorders as Style['border'],
  }
}

export function columnHeaderStyleWithFill(level: 'UG' | 'PG'): Partial<Style> {
  return {
    fill: solidFill(level === 'UG' ? COLORS.UG_HEADER : COLORS.PG_HEADER),
    font: { ...columnHeaderFont, color: { argb: COLORS.WHITE } },
    alignment: centerAlign,
    border: allBorders as Style['border'],
  }
}

export function dataRowStyle(level: 'UG' | 'PG', isOdd: boolean): Partial<Style> {
  const style: Partial<Style> = {
    font: dataFont,
    alignment: leftAlign,
    border: allBorders as Style['border'],
  }

  if (isOdd) {
    style.fill = solidFill(level === 'UG' ? COLORS.UG_ROW_ODD : COLORS.PG_ROW_ODD)
  }

  return style
}

export function staffSummaryHeaderStyle(columnType: 'MT' | 'HT' | 'FY' | 'SPLIT' | 'OTHER'): Partial<Style> {
  const colorMap = {
    MT: COLORS.MT_COLUMN,
    HT: COLORS.HT_COLUMN,
    FY: COLORS.FY_COLUMN,
    SPLIT: COLORS.TEACHING_SPLIT,
    OTHER: COLORS.STAFF_HEADER,
  }

  return {
    fill: solidFill(colorMap[columnType]),
    font: columnHeaderFont,
    alignment: centerAlign,
    border: allBorders as Style['border'],
  }
}

export type StaffDataColumnType = 'LECTURER' | 'MT' | 'HT' | 'FY' | 'OTHER'

export function staffSummaryDataStyle(columnType: StaffDataColumnType): Partial<Style> {
  const colorMap: Record<StaffDataColumnType, string> = {
    LECTURER: COLORS.STAFF_DATA_LECTURER,
    MT: COLORS.STAFF_DATA_MT,
    HT: COLORS.STAFF_DATA_HT,
    FY: COLORS.STAFF_DATA_FY,
    OTHER: COLORS.STAFF_DATA_LECTURER,  // Notes, Total, TA use same as lecturer
  }

  return {
    fill: solidFill(colorMap[columnType]),
    font: dataFont,
    alignment: leftAlign,
    border: allBorders as Style['border'],
  }
}

// Module table column headers
export const MODULE_COLUMNS = [
  'Code',
  'Title',
  'ECTS',
  'Michaelmas Term',
  'Hilary Term',
  'Full Year',
  'Lecture Duration',
  'Teaching value',
  'Linked Modules',
  'Available to (School)',
  'Available to (non-School)',
  'Visiting/Notes',
  'Timetable Sets',
  'Room capacity',
] as const

// Staff summary column headers
export const STAFF_SUMMARY_COLUMNS = [
  'Lecturers',
  'MT UG',
  'MT PG',
  'HT UG',
  'HT PG',
  'FY UG',
  'FY PG',
  'MT',
  'HT',
  'Total',
  'Notes',
  'TA Duties',
] as const

// Section titles
export const SECTION_TITLES = {
  UG: 'POLITICAL SCIENCE - UNDERGRADUATE',
  MSC_IP: 'MSc International Politics',
  ASDS: 'Postgraduate Diploma in Applied Social Data Science',
  PHD: 'PhD Political Science',
  STAFF_SUMMARY: 'Staff Summary',
} as const

// Level to section mapping
export function getLevelConfig(level: string): {
  title: string;
  headerLevel: 'UG' | 'PG';
} {
  switch (level) {
    case 'UG':
      return { title: SECTION_TITLES.UG, headerLevel: 'UG' }
    case 'MSc IP':
      return { title: SECTION_TITLES.MSC_IP, headerLevel: 'PG' }
    case 'ASDS':
      return { title: SECTION_TITLES.ASDS, headerLevel: 'PG' }
    case 'PhD':
      return { title: SECTION_TITLES.PHD, headerLevel: 'PG' }
    default:
      return { title: level, headerLevel: 'PG' }
  }
}
