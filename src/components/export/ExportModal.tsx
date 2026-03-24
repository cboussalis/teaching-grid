"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { FileSpreadsheet, Upload, Check, X, AlertCircle } from "lucide-react"

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

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (templateData: Map<string, TemplateRowData> | null) => Promise<void>
}

export function ExportModal({ open, onOpenChange, onExport }: ExportModalProps) {
  const [templateData, setTemplateData] = useState<Map<string, TemplateRowData> | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [moduleCount, setModuleCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const parseTemplate = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)

    console.log("[ExportModal] Starting to parse template file:", file.name)

    try {
      const XLSX = await import("xlsx")
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })

      // Get the first sheet
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      console.log("[ExportModal] Sheet names:", workbook.SheetNames)
      console.log("[ExportModal] Using sheet:", sheetName)

      // Convert to JSON to process rows (header: 1 returns array of arrays)
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
      console.log("[ExportModal] Total rows in sheet:", rows.length)

      // Log first 5 rows to see structure
      console.log("[ExportModal] First 5 rows sample:")
      rows.slice(0, 5).forEach((row, i) => {
        console.log(`  Row ${i}:`, row)
      })

      // Find rows with module codes (Column A)
      // Skip header rows - look for rows where column A has a module code pattern
      // Pattern: 2-4 uppercase letters followed by 4-5 digits (e.g., POU11011, CSP7001)
      const moduleCodePattern = /^[A-Z]{2,4}[\dX]{4,5}$/
      const dataMap = new Map<string, TemplateRowData>()

      let rowsChecked = 0
      let codesFound: string[] = []

      for (const row of rows) {
        if (!row || row.length === 0) continue
        rowsChecked++

        const code = String(row[0] || "").trim()
        if (!moduleCodePattern.test(code)) continue

        codesFound.push(code)

        // Extract values from specific columns (0-indexed)
        // Column C (index 2): ECTS
        // Column G (index 6): Lecture Duration
        // Column I (index 8): Linked Modules
        // Column J (index 9): Available to (School)
        // Column K (index 10): Available to (non-School)
        // Column L (index 11): Visiting/Notes
        // Column M (index 12): Timetable Sets
        // Column N (index 13): Room capacity

        const templateRow: TemplateRowData = {}

        if (row[2] !== undefined && row[2] !== "") {
          templateRow.ects = row[2] as number | string
        }
        if (row[6] !== undefined && row[6] !== "") {
          templateRow.lectureDuration = String(row[6])
        }
        if (row[8] !== undefined && row[8] !== "") {
          templateRow.linkedModules = String(row[8])
        }
        if (row[9] !== undefined && row[9] !== "") {
          templateRow.availableSchool = String(row[9])
        }
        if (row[10] !== undefined && row[10] !== "") {
          templateRow.availableNonSchool = String(row[10])
        }
        if (row[11] !== undefined && row[11] !== "") {
          templateRow.visitingNotes = String(row[11])
        }
        if (row[12] !== undefined && row[12] !== "") {
          templateRow.timetableSets = String(row[12])
        }
        if (row[13] !== undefined && row[13] !== "") {
          templateRow.roomCapacity = row[13] as number | string
        }

        // Only add if we found at least one value
        if (Object.keys(templateRow).length > 0) {
          const existing = dataMap.get(code)
          dataMap.set(code, existing ? { ...existing, ...templateRow } : templateRow)
          // Log first few entries with their data
          if (dataMap.size <= 3) {
            console.log(`[ExportModal] Module ${code} data:`, templateRow)
          }
        }
      }

      console.log("[ExportModal] Rows checked:", rowsChecked)
      console.log("[ExportModal] Module codes found:", codesFound.length, "- First 10:", codesFound.slice(0, 10))
      console.log("[ExportModal] Modules with data to merge:", dataMap.size)

      if (dataMap.size === 0) {
        console.log("[ExportModal] No modules found! Pattern used:", moduleCodePattern)
        setError("No module codes found in the spreadsheet. Make sure column A contains module codes (e.g., POU11011, CSP7001).")
        setTemplateData(null)
        setFileName("")
        setModuleCount(0)
      } else {
        console.log("[ExportModal] Successfully parsed template. Sample entries:")
        let count = 0
        dataMap.forEach((value, key) => {
          if (count < 5) {
            console.log(`  ${key}:`, value)
            count++
          }
        })
        setTemplateData(dataMap)
        setFileName(file.name)
        setModuleCount(dataMap.size)
      }
    } catch (err) {
      console.error("[ExportModal] Error parsing template:", err)
      setError("Failed to parse the spreadsheet. Please ensure it's a valid Excel file.")
      setTemplateData(null)
      setFileName("")
      setModuleCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        parseTemplate(file)
      } else {
        setError("Please drop an Excel file (.xlsx or .xls)")
      }
    }
  }, [parseTemplate])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      parseTemplate(files[0])
    }
  }, [parseTemplate])

  const handleClearTemplate = useCallback(() => {
    setTemplateData(null)
    setFileName("")
    setModuleCount(0)
    setError(null)
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    console.log("[ExportModal] Starting export...")
    console.log("[ExportModal] Template data present:", templateData !== null)
    if (templateData) {
      console.log("[ExportModal] Template data size:", templateData.size)
      console.log("[ExportModal] Template data keys (first 10):", Array.from(templateData.keys()).slice(0, 10))
    }
    try {
      await onExport(templateData)
      console.log("[ExportModal] Export completed successfully")
      onOpenChange(false)
      // Reset state after successful export
      setTemplateData(null)
      setFileName("")
      setModuleCount(0)
      setError(null)
    } catch (err) {
      console.error("[ExportModal] Export error:", err)
      setError("Failed to export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }, [templateData, onExport, onOpenChange])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    // Reset state when closing
    setTemplateData(null)
    setFileName("")
    setModuleCount(0)
    setError(null)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Teaching Plan
          </DialogTitle>
          <DialogDescription>
            Optionally import a previous year's spreadsheet to merge values for ECTS, linked modules, availability, and other fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drop zone */}
          {!templateData ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                ${isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-primary/50"}
              `}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="template-file-input"
                disabled={isLoading}
              />
              <label htmlFor="template-file-input" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  {isLoading ? "Processing..." : "Drop previous year's spreadsheet here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse (optional)
                </p>
              </label>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Found {moduleCount} module{moduleCount !== 1 ? "s" : ""} with data to merge
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearTemplate}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Info about what gets merged */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Columns merged from template (matched by module code):</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>Column C: ECTS</li>
              <li>Column G: Lecture Duration</li>
              <li>Column I: Linked Modules</li>
              <li>Columns J-K: Availability (School/non-School)</li>
              <li>Column L: Visiting/Notes</li>
              <li>Column M: Timetable Sets</li>
              <li>Column N: Room capacity</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export the type for use in other files
export type { TemplateRowData }
