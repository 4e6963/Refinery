import type {
  ExpenseStatement,
  ParsedFile,
  ReceivableStatement,
  RevenueEntry,
  RevenueStatement,
  StatementKind,
  Warning,
  YearMonth,
} from '../model'
import { formatHundredths, sum } from './money'

const KIND_LABEL: Record<StatementKind, string> = {
  revenue: 'Revenue',
  expenses: 'JIB',
  receivables: 'AR',
}

function mismatch(label: string, parsed: number, printed: number): string {
  return `${label}: gelesen ${formatHundredths(parsed)}, laut Dokument ${formatHundredths(printed)}`
}

function deductionTotals(entries: RevenueEntry[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const e of entries) {
    if (e.taxDescription) totals[e.taxDescription] = (totals[e.taxDescription] ?? 0) + e.netTax
    for (const d of e.otherDeductions) {
      totals[d.description] = (totals[d.description] ?? 0) + d.amount
    }
  }
  return totals
}

export function validateRevenue(statement: RevenueStatement): string[] {
  const problems: string[] = []
  if (statement.controls.length === 0) problems.push('Keine Summenzeilen gefunden')
  for (const control of statement.controls) {
    const entries =
      control.section === 'overall'
        ? statement.entries
        : statement.entries.filter((e) => e.section === control.section)
    const label = { current: 'Neue Erlöse', prior: 'Erlöse aus Vorperioden', overall: 'Gesamt' }[
      control.section
    ]
    const value = sum(entries.map((e) => e.netValue))
    if (control.netValue !== undefined && value !== control.netValue) {
      problems.push(mismatch(`${label} Net Value`, value, control.netValue))
    }
    const volume = sum(entries.map((e) => e.netVolume))
    if (control.netVolume !== undefined && volume !== control.netVolume) {
      problems.push(mismatch(`${label} Net Volume`, volume, control.netVolume))
    }
    for (const [product, printed] of Object.entries(control.productNetVolume)) {
      const parsed = sum(entries.filter((e) => e.product === product).map((e) => e.netVolume))
      if (parsed !== printed) problems.push(mismatch(`${label} ${product} Net Volume`, parsed, printed))
    }
    const deductions = deductionTotals(entries)
    for (const [description, printed] of Object.entries(control.deductions)) {
      const parsed = deductions[description] ?? 0
      if (parsed !== printed) problems.push(mismatch(`${label} ${description}`, parsed, printed))
    }
  }
  return problems
}

export function validateExpenses(statement: ExpenseStatement): string[] {
  const problems: string[] = []
  for (const invoice of statement.invoices) {
    const where = `Rechnung ${invoice.invoiceNumber} (Well ${invoice.wellCode})`
    for (const section of invoice.sections) {
      if (section.totalShare === undefined) {
        problems.push(`${where}, ${section.name}: Summenzeile fehlt`)
        continue
      }
      const items = sum(section.items.map((i) => i.share))
      if (items !== section.totalShare) {
        problems.push(mismatch(`${where}, ${section.name}`, items, section.totalShare))
      }
    }
    if (invoice.netAmount === undefined) {
      problems.push(`${where}: Rechnungsbetrag fehlt`)
      continue
    }
    const sections = sum(invoice.sections.map((s) => s.totalShare ?? 0))
    if (sections !== invoice.netAmount) {
      problems.push(mismatch(`${where} Rechnungsbetrag`, sections, invoice.netAmount))
    }
  }
  return problems
}

/** Cross-checks the receivables statement against the JIB invoices of the same month. */
export function validateReceivables(ar: ReceivableStatement, jib: ExpenseStatement): string[] {
  const problems: string[] = []
  const invoices = new Map(jib.invoices.map((i) => [i.invoiceNumber, i]))
  const seen = new Set<string>()
  for (const entry of ar.invoices) {
    if (entry.previous) continue
    seen.add(entry.invoiceNumber)
    // Zero-amount invoices are listed without an amount.
    const amount = entry.amount ?? 0
    const invoice = invoices.get(entry.invoiceNumber)
    if (!invoice) {
      problems.push(`AR-Rechnung ${entry.invoiceNumber} (Well ${entry.wellCode}) fehlt in der JIB`)
      continue
    }
    if (invoice.wellCode !== entry.wellCode) {
      problems.push(
        `Rechnung ${entry.invoiceNumber}: Well ${entry.wellCode} in AR, ${invoice.wellCode} in JIB`,
      )
    }
    if (invoice.netAmount !== undefined && invoice.netAmount !== amount) {
      problems.push(mismatch(`Rechnung ${entry.invoiceNumber} AR vs. JIB`, amount, invoice.netAmount))
    }
  }
  for (const invoice of jib.invoices) {
    if (!seen.has(invoice.invoiceNumber)) {
      problems.push(`JIB-Rechnung ${invoice.invoiceNumber} (Well ${invoice.wellCode}) fehlt in AR`)
    }
  }
  return problems
}

export function validate(month: YearMonth, kinds: Map<StatementKind, ParsedFile>): Warning[] {
  const warnings: Warning[] = []
  const push = (file: ParsedFile | undefined, problems: string[]) => {
    for (const message of problems) {
      warnings.push({ level: 'warning', month, fileName: file?.fileName, message })
    }
  }
  for (const file of kinds.values()) {
    const content = file.statement?.statementMonth
    if (file.monthSource === 'filename' && content && content !== month) {
      push(file, [`Dateiname ${month}, Inhalt deutet auf ${content}`])
    }
  }
  const revenue = kinds.get('revenue')
  const expenses = kinds.get('expenses')
  const receivables = kinds.get('receivables')
  if (revenue?.statement?.kind === 'revenue') push(revenue, validateRevenue(revenue.statement))
  if (expenses?.statement?.kind === 'expenses') push(expenses, validateExpenses(expenses.statement))
  if (receivables?.statement?.kind === 'receivables' && expenses?.statement?.kind === 'expenses') {
    push(receivables, validateReceivables(receivables.statement, expenses.statement))
  }
  for (const kind of ['revenue', 'expenses'] as const) {
    if (!kinds.has(kind)) push(undefined, [`${KIND_LABEL[kind]}-Abrechnung fehlt`])
  }
  return warnings
}
