import type {
  ExpenseCategory,
  ExpenseStatement,
  MonthReport,
  ParsedFile,
  Report,
  RevenueStatement,
  RowValues,
  SheetReport,
  StatementKind,
  WellRow,
  Warning,
  YearMonth,
} from '../model'
import { sum } from './money'
import { validate } from './validate'

/**
 * Expense categories per export column. Following the reference workbook,
 * intangible drilling costs are booked with the operating expenses and the
 * "Int. Drilling Cost" column stays empty.
 */
const EXPENSE_COLUMN: Record<ExpenseCategory, 'leaseEquipment' | 'operatingExpenses'> = {
  operating: 'operatingExpenses',
  drilling: 'operatingExpenses',
  equipment: 'leaseEquipment',
  income: 'leaseEquipment',
  other: 'leaseEquipment',
}

const VALUE_KEYS = [
  'gasVolume',
  'gasIncome',
  'gasTax',
  'oilVolume',
  'oilIncome',
  'oilTax',
  'leaseEquipment',
  'operatingExpenses',
  'drillingCost',
  'totalExpenses',
  'roi',
  'netIncome',
] as const satisfies readonly (keyof RowValues)[]

export function emptyValues(): RowValues {
  return Object.fromEntries(VALUE_KEYS.map((k) => [k, 0])) as RowValues
}

function emptyRow(wellCode: string, wellName: string): WellRow {
  return { wellCode, wellName, hasRevenue: false, hasExpenses: false, ...emptyValues() }
}

function derive(row: RowValues): void {
  row.totalExpenses = row.leaseEquipment + row.operatingExpenses + row.drillingCost
  row.netIncome = row.gasIncome + row.oilIncome - row.gasTax - row.oilTax
  row.roi = row.netIncome - row.totalExpenses
}

function addRevenue(rows: Map<string, WellRow>, statement: RevenueStatement): void {
  for (const e of statement.entries) {
    const row = rows.get(e.wellCode) ?? emptyRow(e.wellCode, e.wellName)
    rows.set(e.wellCode, row)
    row.hasRevenue = true
    // Revenue statements carry the more descriptive lease names.
    row.wellName = e.wellName
    if (e.product === 'gas') {
      row.gasVolume += e.netVolume
      row.gasIncome += e.netValue
      row.gasTax += e.netTax
    } else {
      row.oilVolume += e.netVolume
      row.oilIncome += e.netValue
      row.oilTax += e.netTax
    }
  }
}

function addExpenses(rows: Map<string, WellRow>, statement: ExpenseStatement): void {
  for (const invoice of statement.invoices) {
    const row = rows.get(invoice.wellCode) ?? emptyRow(invoice.wellCode, invoice.wellName)
    rows.set(invoice.wellCode, row)
    row.hasExpenses = true
    for (const section of invoice.sections) {
      const amount = section.totalShare ?? sum(section.items.map((i) => i.share))
      row[EXPENSE_COLUMN[section.category]] += amount
    }
  }
}

function totalsOf(rows: WellRow[]): RowValues {
  const totals = emptyValues()
  for (const row of rows) for (const k of VALUE_KEYS) totals[k] += row[k]
  return totals
}

function byWellCode(a: { wellCode: string }, b: { wellCode: string }): number {
  return a.wellCode.localeCompare(b.wellCode, undefined, { numeric: true })
}

/** Picks the statement of each kind per month; duplicates are reported and ignored. */
function groupByMonth(files: ParsedFile[], warnings: Warning[]) {
  const months = new Map<YearMonth, Map<StatementKind, ParsedFile>>()
  for (const file of files) {
    if (!file.statement || !file.kind) continue
    if (!file.month) {
      warnings.push({
        level: 'error',
        fileName: file.fileName,
        message: 'Monat unbekannt – Datei wird nicht berücksichtigt',
      })
      continue
    }
    const kinds = months.get(file.month) ?? new Map<StatementKind, ParsedFile>()
    months.set(file.month, kinds)
    const existing = kinds.get(file.kind)
    if (existing) {
      warnings.push({
        level: 'error',
        month: file.month,
        fileName: file.fileName,
        message: `Doppelte Abrechnung für ${file.month}, bereits geladen: ${existing.fileName} – ignoriert`,
      })
      continue
    }
    kinds.set(file.kind, file)
  }
  return new Map([...months].sort(([a], [b]) => a.localeCompare(b)))
}

export function buildReport(files: ParsedFile[]): Report {
  const warnings: Warning[] = []
  const grouped = groupByMonth(files, warnings)
  const names = new Map<string, { name: string; fromRevenue: boolean }>()
  const monthRows = new Map<YearMonth, Map<string, WellRow>>()

  for (const [month, kinds] of grouped) {
    warnings.push(...validate(month, kinds))
    const rows = new Map<string, WellRow>()
    const revenue = kinds.get('revenue')?.statement
    const expenses = kinds.get('expenses')?.statement
    if (expenses?.kind === 'expenses') addExpenses(rows, expenses)
    if (revenue?.kind === 'revenue') addRevenue(rows, revenue)
    for (const row of rows.values()) {
      derive(row)
      const known = names.get(row.wellCode)
      if (!known || row.hasRevenue || !known.fromRevenue) {
        names.set(row.wellCode, { name: row.wellName, fromRevenue: row.hasRevenue })
      }
    }
    monthRows.set(month, rows)
  }

  const wellCodes = [...names.keys()].sort((a, b) => byWellCode({ wellCode: a }, { wellCode: b }))
  const nameOf = (code: string) => names.get(code)?.name ?? ''

  const months: MonthReport[] = [...monthRows].map(([month, rows]) => {
    const all = wellCodes.map((code) => {
      const row = rows.get(code) ?? emptyRow(code, nameOf(code))
      return { ...row, wellName: nameOf(code) }
    })
    return { month, rows: all, totals: totalsOf(all) }
  })

  const totalRows = wellCodes.map((code) => {
    const row = emptyRow(code, nameOf(code))
    for (const m of months) {
      const r = m.rows.find((x) => x.wellCode === code)
      if (!r) continue
      row.hasRevenue ||= r.hasRevenue
      row.hasExpenses ||= r.hasExpenses
      for (const k of VALUE_KEYS) row[k] += r[k]
    }
    return row
  })
  const total: SheetReport = { rows: totalRows, totals: totalsOf(totalRows) }

  return { year: dominantYear(months.map((m) => m.month)), months, total, warnings }
}

function dominantYear(months: YearMonth[]): number | undefined {
  const counts = new Map<number, number>()
  for (const m of months) {
    const y = Number(m.slice(0, 4))
    counts.set(y, (counts.get(y) ?? 0) + 1)
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0]
}
