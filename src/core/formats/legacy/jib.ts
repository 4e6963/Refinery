import type {
  ExpenseInvoice,
  ExpenseSection,
  ExpenseStatement,
} from '../../model'
import { parseHundredths } from '../../calc/money'
import { addMonths, monthFromUsDate } from '../../calc/month'
import { categorizeExpenseSection } from '../categories'
import { AMOUNT, type LegacyText } from './text'

const EXPENSES_THRU = /Expenses Thru:\s*(\d\d\/\d\d\/\d\d)/
const WELL = /Well Code: (\d+) (.*?)\s+Inv#: (\d+)/
const SECTION = /^\*\*\* (.+?)\s*\*\*\*/
const TOTAL = new RegExp(String.raw`^\s+Total:\s*(${AMOUNT})\s*(${AMOUNT})$`)
const NET_INVOICE = new RegExp(String.raw`Net Invoice# (\d+) Amount for .*?(${AMOUNT})\*\*`)
const ITEM = new RegExp(String.raw`^(\s*\S.*?)\s*(${AMOUNT})\s*(${AMOUNT})$`)

/** Invoices are issued two months after the expense period ends. */
const STATEMENT_MONTH_OFFSET = 2

export function parseJib({ header, body }: LegacyText): ExpenseStatement {
  const statement: ExpenseStatement = { kind: 'expenses', invoices: [] }
  const thru = header.join('\n').match(EXPENSES_THRU)
  const period = thru ? monthFromUsDate(thru[1]) : undefined
  if (period) statement.statementMonth = addMonths(period, STATEMENT_MONTH_OFFSET)
  const byNumber = new Map<string, ExpenseInvoice>()
  let invoice: ExpenseInvoice | undefined
  let section: ExpenseSection | undefined

  for (const line of body) {
    const well = line.match(WELL)
    if (well) {
      const existing = byNumber.get(well[3])
      if (existing) {
        invoice = existing
      } else {
        invoice = {
          invoiceNumber: well[3],
          wellCode: well[1],
          wellName: well[2].trim(),
          sections: [],
        }
        byNumber.set(invoice.invoiceNumber, invoice)
        statement.invoices.push(invoice)
        section = undefined
      }
      continue
    }
    if (!invoice) continue

    const sectionMatch = line.match(SECTION)
    if (sectionMatch) {
      const name = sectionMatch[1].trim()
      const current = invoice.sections[invoice.sections.length - 1]
      if (/\(Continued\)/.test(line) && current?.name === name) {
        section = current
      } else {
        section = { name, category: categorizeExpenseSection(name), items: [] }
        invoice.sections.push(section)
      }
      continue
    }
    const net = line.match(NET_INVOICE)
    if (net) {
      invoice.netAmount = parseHundredths(net[2])
      section = undefined
      continue
    }
    const total = line.match(TOTAL)
    if (total) {
      if (section) {
        section.totalGross = parseHundredths(total[1])
        section.totalShare = parseHundredths(total[2])
      }
      continue
    }
    const item = line.match(ITEM)
    if (item && section) {
      section.items.push({
        description: item[1].trim(),
        gross: parseHundredths(item[2]),
        share: parseHundredths(item[3]),
      })
    }
  }
  return statement
}
