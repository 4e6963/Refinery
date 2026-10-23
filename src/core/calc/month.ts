import type { YearMonth } from '../model'

export function yearMonth(year: number, month: number): YearMonth {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function addMonths(month: YearMonth, delta: number): YearMonth {
  const [y, m] = month.split('-').map(Number)
  return yearMonth(y, m + delta)
}

/** Reads a leading/embedded `YYYY-MM` from a file name. */
export function monthFromFileName(fileName: string): YearMonth | undefined {
  const match = fileName.match(/(?:^|\D)(20\d{2})[-_ .](0[1-9]|1[0-2])(?:\D|$)/)
  return match ? `${match[1]}-${match[2]}` : undefined
}

/** `MM/DD/YY` → `YYYY-MM` (two-digit years are 20xx). */
export function monthFromUsDate(date: string): YearMonth | undefined {
  const match = date.match(/(\d{1,2})\/\d{1,2}\/(\d{2}|\d{4})/)
  if (!match) return undefined
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2])
  return yearMonth(year, Number(match[1]))
}

export function isYearMonth(value: string): value is YearMonth {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}
