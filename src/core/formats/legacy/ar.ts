import type { ReceivableStatement } from '../../model'
import { parseHundredths } from '../../calc/money'
import { monthFromUsDate } from '../../calc/month'
import { AMOUNT, type LegacyText } from './text'

const STATEMENT_DATE = /Date:\s*(\d\d\/\d\d\/\d\d)/
const NEW_INVOICES = /-New Invoices This Statement-/
const PREVIOUS_INVOICES = /-Invoices From Previous Statements-/
const INVOICE = new RegExp(
  String.raw`^\s*(\d{7})\s+(\d{9})\s+\d\d/\d\d/\d\d\s+(.*?)\s+JIB(?:\s*(${AMOUNT}))?$`,
)
const BALANCE_DUE = new RegExp(String.raw`Balance Due This Statement\s*(${AMOUNT})`)

export function parseAr({ header, body }: LegacyText): ReceivableStatement {
  const statement: ReceivableStatement = { kind: 'receivables', invoices: [] }
  const date = header.join('\n').match(STATEMENT_DATE)
  if (date) statement.statementMonth = monthFromUsDate(date[1])
  let previous = false
  for (const line of body) {
    if (NEW_INVOICES.test(line)) previous = false
    else if (PREVIOUS_INVOICES.test(line)) previous = true

    const invoice = line.match(INVOICE)
    if (invoice) {
      statement.invoices.push({
        invoiceNumber: invoice[1],
        wellCode: invoice[2],
        wellName: invoice[3].trim(),
        amount: invoice[4] ? parseHundredths(invoice[4]) : undefined,
        previous,
      })
      continue
    }
    const balance = line.match(BALANCE_DUE)
    if (balance) statement.balanceDue = parseHundredths(balance[1])
  }
  return statement
}
