import type { StatementFormat } from '../types'
import { currentLines } from './text'
import { parseRevenue } from './revenue'
import { parseJib } from './jib'

/** Check-style revenue statements and JIB invoices with summary tables. */
export const currentFormat: StatementFormat = {
  id: 'current',
  label: 'Current',
  detect(pages) {
    const head = currentLines(pages.slice(0, 2)).join('\n')
    if (/Product Codes/.test(head) && /Check Date/.test(head)) return 'revenue'
    if (/Joint Interest Billing Invoice - Expenses through/.test(head)) return 'expenses'
    return undefined
  },
  parse(pages, kind) {
    const lines = currentLines(pages)
    if (kind === 'revenue') return parseRevenue(lines)
    if (kind === 'expenses') return parseJib(lines)
    throw new Error('Receivables statements are not supported in this format')
  },
}
