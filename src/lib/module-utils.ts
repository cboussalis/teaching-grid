/**
 * Utility functions for module code parsing
 *
 * Module code patterns:
 * - POU = Undergrad Political Science
 * - PIU = Undergrad Philosophy (integrated modules)
 * - First digit after prefix indicates UG year (1-4)
 *   - Year 1: Junior Freshman
 *   - Year 2: Senior Freshman
 *   - Year 3: Junior Sophister
 *   - Year 4: Senior Sophister
 * - POX codes are placeholders
 */

/**
 * Extract the UG year (1-4) from a module code
 * Returns null if not a UG module or pattern doesn't match
 * Supports both POU (Political Science) and PIU (Philosophy) prefixes
 */
export function getUGYear(code: string): number | null {
  // Match POU or PIU followed by a digit 1-4
  const match = code.match(/^P[OI]U(\d)/)
  if (match) {
    const year = parseInt(match[1], 10)
    if (year >= 1 && year <= 4) {
      return year
    }
  }
  return null
}

/**
 * Get the year label for display
 */
export function getYearLabel(year: number): string {
  const labels: Record<number, string> = {
    1: 'Year 1 (JF)',
    2: 'Year 2 (SF)',
    3: 'Year 3 (JS)',
    4: 'Year 4 (SS)',
  }
  return labels[year] || `Year ${year}`
}

/**
 * Get short year label
 */
export function getYearLabelShort(year: number): string {
  const labels: Record<number, string> = {
    1: 'JF',
    2: 'SF',
    3: 'JS',
    4: 'SS',
  }
  return labels[year] || `Y${year}`
}

/**
 * Check if a module code is a placeholder (POX)
 */
export function isPlaceholderModule(code: string): boolean {
  return code.startsWith('POX')
}

/**
 * Check if a module is UG Political Science (POU prefix)
 */
export function isUGPoliticalScience(code: string): boolean {
  return code.startsWith('POU')
}

/**
 * Check if a module is UG Philosophy (PIU prefix)
 */
export function isUGPhilosophy(code: string): boolean {
  return code.startsWith('PIU')
}

/**
 * Check if a module is a recognized UG module (POU or PIU)
 */
export function isRecognizedUGModule(code: string): boolean {
  return code.startsWith('POU') || code.startsWith('PIU')
}
