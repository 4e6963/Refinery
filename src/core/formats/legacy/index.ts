import type { StatementFormat } from '../types'
import type { StatementKind } from '../../model'
import { legacyText, spacedTitle } from './text'
import { parseRevenue } from './revenue'
import { parseJib } from './jib'
import { parseAr } from './ar'

const TITLES: [RegExp, StatementKind][] = [
  [spacedTitle('REVENUE SUMMARY STATEMENT'), 'revenue'],
  [spacedTitle('JOINT INTEREST BILLING INVOICE'), 'expenses'],
  [spacedTitle('ACCOUNTS RECEIVABLE SUMMARY STATEMENT'), 'receivables'],
]

/** Fixed-width statements with letter-spaced report titles. */
export const legacyFormat: StatementFormat = {
  id: 'legacy',
  label: 'Legacy',
  detect(pages) {
    const head = legacyText(pages.slice(0, 1)).header.slice(0, 5).join('\n')
    return TITLES.find(([title]) => title.test(head))?.[1]
  },
  parse(pages, kind) {
    const text = legacyText(pages)
    if (kind === 'revenue') return parseRevenue(text)
    if (kind === 'expenses') return parseJib(text)
    return parseAr(text)
  },
}
