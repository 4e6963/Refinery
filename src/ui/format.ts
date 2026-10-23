import type { StatementKind } from '../core/model'

const number = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatAmount(hundredths: number): string {
  return number.format(hundredths / 100)
}

export const KIND_LABELS: Record<StatementKind, string> = {
  revenue: 'Revenue',
  expenses: 'Expenses (JIB)',
  receivables: 'Receivables (AR)',
}

const monthNames = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return monthNames.format(new Date(Date.UTC(y, m - 1, 1)))
}
