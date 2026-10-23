import type { ExpenseInvoice, ExpenseSection, ExpenseStatement } from '../../model'
import { parseHundredths, sum } from '../../calc/money'
import { addMonths } from '../../calc/month'
import { categorizeExpenseSection } from '../categories'
import { AMOUNT, monthFromName } from './text'

const EXPENSES_THROUGH = /Expenses through (.+?\d{4})/
const SUMMARY_SECTION = new RegExp(String.raw`^\s{10,}([A-Z][A-Z &/,'-]+?)\s{2,}(${AMOUNT})\s+(${AMOUNT})\s*$`)
/** Invoice, cost center, optional AFE, well name, gross, net, invoiced. */
const SUMMARY_ROW = new RegExp(
  String.raw`^\s*(\d{6,})\s+(\d{9})\s+(?:(\d{5,})\s+)?(.+?)\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s*$`,
)
const INVOICE = /^INV NO\. (\d+) - CC (\d+) - (?:AFE (\S+) - )?(.+)$/
const SECTION = /^[A-Z][A-Z &/,'-]+$/
const ITEM = new RegExp(
  String.raw`^\s+(?:\d\d/\d\d/\d\d\s+)?(.+?)\s+\d+\.\d{8}\s+(${AMOUNT})\s+(${AMOUNT})\s*$`,
)

/** Invoices are issued two months after the expense period ends. */
const STATEMENT_MONTH_OFFSET = 2

/** JIB statement with an invoice summary table followed by detail lines per invoice. */
export function parseJib(lines: string[]): ExpenseStatement {
  const statement: ExpenseStatement = { kind: 'expenses', invoices: [], sectionTotals: {} }
  const byNumber = new Map<string, ExpenseInvoice>()
  // An invoice number can be split into a regular part and one part per AFE.
  const invoiceFor = (number: string, afe: string | undefined, wellCode: string, wellName: string) => {
    const key = afe ? `${number} AFE ${afe}` : number
    let invoice = byNumber.get(key)
    if (!invoice) {
      invoice = { invoiceNumber: key, wellCode, wellName, sections: [] }
      byNumber.set(key, invoice)
      statement.invoices.push(invoice)
    }
    return invoice
  }
  let invoice: ExpenseInvoice | undefined
  let section: ExpenseSection | undefined

  for (const line of lines) {
    const through = line.match(EXPENSES_THROUGH)
    if (through && !statement.statementMonth) {
      const period = monthFromName(through[1])
      if (period) statement.statementMonth = addMonths(period, STATEMENT_MONTH_OFFSET)
    }
    const row = line.match(SUMMARY_ROW)
    if (row) {
      // Net value per invoice; the well name is taken from the detail header.
      invoiceFor(row[1], row[3], row[2], '').netAmount = parseHundredths(row[6])
      continue
    }
    const summarySection = line.match(SUMMARY_SECTION)
    // Section totals are only printed in the summary before the first detail invoice.
    if (summarySection && !invoice) {
      statement.sectionTotals![summarySection[1].trim()] = parseHundredths(summarySection[3])
      continue
    }

    const header = line.match(INVOICE)
    if (header) {
      const next = invoiceFor(header[1], header[3], header[2], header[4].trim())
      next.wellName = header[4].trim()
      if (next !== invoice) section = undefined
      invoice = next
      continue
    }
    if (!invoice) continue

    if (SECTION.test(line)) {
      const name = line.trim()
      // Page breaks repeat the invoice and section captions.
      const existing = invoice.sections.find((s) => s.name === name)
      section = existing ?? { name, category: categorizeExpenseSection(name), items: [] }
      if (!existing) invoice.sections.push(section)
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

  // This layout prints no per-section totals; derive them from the lines.
  for (const inv of statement.invoices) {
    for (const s of inv.sections) {
      s.totalGross = sum(s.items.map((i) => i.gross))
      s.totalShare = sum(s.items.map((i) => i.share))
    }
  }
  return statement
}
