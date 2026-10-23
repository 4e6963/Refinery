import type { ExpenseCategory } from '../model'

/** Maps an operator's JIB section caption to an expense category. */
export function categorizeExpenseSection(sectionName: string): ExpenseCategory {
  const name = sectionName.toUpperCase()
  if (name.startsWith('LEASE OPERATING')) return 'operating'
  if (name.startsWith('LEASE & WELL EQUIPMENT')) return 'equipment'
  if (name.startsWith('INCOME')) return 'income'
  if (name.startsWith('INTANGIBLE DRILLING')) return 'drilling'
  return 'other'
}
