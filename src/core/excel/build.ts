import ExcelJS from 'exceljs'
import type { Report, RowValues, SheetReport, WellRow } from '../model'
import { toNumber } from '../calc/money'

export { workbookFileName } from './fileName'

type Group = 'revenue' | 'expenses' | 'derived'

interface Column {
  header: string
  key: keyof RowValues
  group: Group
  format: string
  width: number
}

const MONEY = '#,##0.00;[Red]-#,##0.00'
const VOLUME = '#,##0.00'

const COLUMNS: Column[] = [
  { header: 'Mcf Gas Sold', key: 'gasVolume', group: 'revenue', format: VOLUME, width: 12 },
  { header: 'Gas Income', key: 'gasIncome', group: 'revenue', format: MONEY, width: 12 },
  { header: 'Gas Tax', key: 'gasTax', group: 'revenue', format: MONEY, width: 10 },
  { header: 'BO Sold', key: 'oilVolume', group: 'revenue', format: VOLUME, width: 10 },
  { header: 'Oil Income', key: 'oilIncome', group: 'revenue', format: MONEY, width: 12 },
  { header: 'Oil Tax', key: 'oilTax', group: 'revenue', format: MONEY, width: 11 },
  { header: 'Lease Equip.', key: 'leaseEquipment', group: 'expenses', format: MONEY, width: 12 },
  { header: 'L.O.E.', key: 'operatingExpenses', group: 'expenses', format: MONEY, width: 12 },
  { header: 'Int. Drilling Cost', key: 'drillingCost', group: 'expenses', format: MONEY, width: 12 },
  { header: 'Total Expen.', key: 'totalExpenses', group: 'derived', format: MONEY, width: 12 },
  { header: 'R. O. I. in $', key: 'roi', group: 'derived', format: MONEY, width: 13 },
  { header: 'Net Income', key: 'netIncome', group: 'derived', format: MONEY, width: 13 },
]

export const SHEET_HEADERS = ['Well Code', 'Lease Name', ...COLUMNS.map((c) => c.header)]

function shown(row: WellRow, group: Group): boolean {
  if (group === 'revenue') return row.hasRevenue
  if (group === 'expenses') return row.hasExpenses
  return true
}

function addSheet(wb: ExcelJS.Workbook, name: string, title: [string, string], data: SheetReport) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 2, ySplit: 2 }] })
  ws.columns = [
    { width: 12 },
    { width: 30 },
    ...COLUMNS.map((c) => ({ width: c.width, style: { numFmt: c.format } })),
  ]
  ws.getRow(1).values = title
  ws.getRow(1).font = { bold: true }
  const header = ws.getRow(2)
  header.values = SHEET_HEADERS
  header.font = { bold: true }
  header.alignment = { wrapText: true, vertical: 'middle' }
  header.border = { bottom: { style: 'thin' } }

  for (const row of data.rows) {
    ws.addRow([
      Number(row.wellCode),
      row.wellName,
      ...COLUMNS.map((c) => (shown(row, c.group) ? toNumber(row[c.key]) : null)),
    ])
  }
  const totals = ws.addRow(['', 'Total', ...COLUMNS.map((c) => toNumber(data.totals[c.key]))])
  totals.font = { bold: true }
  totals.border = { top: { style: 'thin' } }
}

/** Sheet name per month: two-digit month, with year suffix when the report spans years. */
function sheetName(month: string, multiYear: boolean): string {
  const [year, mm] = month.split('-')
  return multiYear ? `${year}-${mm}` : mm
}

export async function buildWorkbook(report: Report): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Refinery'
  const years = new Set(report.months.map((m) => m.month.slice(0, 4)))
  for (const month of report.months) {
    const [year, mm] = month.month.split('-')
    addSheet(wb, sheetName(month.month, years.size > 1), ['Payment Month:', `${mm}/${year}`], month)
  }
  addSheet(wb, 'Total', ['TOTAL', report.year ? String(report.year) : ''], report.total)
  const buffer = await wb.xlsx.writeBuffer()
  return new Uint8Array(buffer as ArrayBuffer)
}
