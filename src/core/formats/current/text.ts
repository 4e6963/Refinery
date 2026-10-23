import type { PdfPage } from '../../pdf/extract'
import { pagesToText } from '../../pdf/lines'
import { yearMonth } from '../../calc/month'
import type { YearMonth } from '../../model'

/** Amount with two decimals; negative values are printed in parentheses, e.g. `(1,234.56)`. */
export const AMOUNT = String.raw`\(?-?\$?[\d,]*\.\d{2}\)?`

export function currentLines(pages: PdfPage[]): string[] {
  return pagesToText(pages).flat()
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** `Jul 2026` or `Jul 31, 2026` → `2026-07`. */
export function monthFromName(text: string): YearMonth | undefined {
  const match = text.match(/\b([A-Z][a-z]{2})[a-z]*\.?\s+(?:\d{1,2},\s*)?(\d{4})\b/)
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) : -1
  return match && month >= 0 ? yearMonth(Number(match[2]), month + 1) : undefined
}

/** Parses legend lines like `Product Codes   101 – Oil  901 – Joint Interest Billing`. */
export function parseLegend(line: string, caption: string): Map<string, string> | undefined {
  const match = line.match(new RegExp(String.raw`^\s*${caption}\s+(.*)$`))
  if (!match) return undefined
  const legend = new Map<string, string>()
  for (const [, code, name] of match[1].matchAll(/(\S+)\s+[–-]\s+(.+?)(?=\s{2,}\S+\s+[–-]\s|\s*$)/g)) {
    legend.set(code, name.trim())
  }
  return legend
}
