import type { StatementKind } from '../core/model'

const number = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatAmount(hundredths: number): string {
  return number.format(hundredths / 100)
}

export const KIND_LABELS: Record<StatementKind, string> = {
  revenue: 'Erlöse (Revenue)',
  expenses: 'Kosten (JIB)',
  receivables: 'Forderungen (AR)',
}

const monthNames = new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return monthNames.format(new Date(Date.UTC(y, m - 1, 1)))
}
