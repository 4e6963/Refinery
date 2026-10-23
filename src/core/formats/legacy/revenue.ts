import type {
  Product,
  RevenueControl,
  RevenueEntry,
  RevenueSection,
  RevenueStatement,
} from '../../model'
import { parseHundredths } from '../../calc/money'
import { monthFromUsDate } from '../../calc/month'
import { AMOUNT, NUMBER, type LegacyText } from './text'

const WELL = /^\*\*\* Well: (\d+) (.*?),[^,]*County.*\*\*\*/
const SECTION_CURRENT = /-New Revenue This Statement-/
const SECTION_PRIOR = /-Revenue from Prior Statements-/
const STATEMENT_DATE = /Date:\s*(\d\d\/\d\d\/\d\d)/
const PRODUCT_LINE = new RegExp(
  String.raw`^\s*[A-Z]\s+(\d\d/\d\d)\s+${AMOUNT}\s+[\d.]+\s+${NUMBER}\s+${AMOUNT}(?:\s+(.*?)\s+(${AMOUNT}))?`,
)
const NET_LINE = new RegExp(
  String.raw`^([A-Z]{3})\s+\w+\s+(${NUMBER})\s+(${AMOUNT})\s+\(Net\)(?:\s+(${AMOUNT}))?`,
)
const DEDUCTION_LINE = new RegExp(String.raw`^\s+([A-Z][A-Z ]*[A-Z])\s+(${AMOUNT})(\s|$)`)
const DEDUCTION_NET_LINE = new RegExp(String.raw`^\s+\(Net\)\s+(${AMOUNT})`)
const WELL_TOTALS = /Totals:/
const CONTROL_TOTALS = /^(New|Prior|Overall) Revenue Totals:/
const CONTROL_NET = new RegExp(
  String.raw`^\s+NET\s+(${NUMBER})\s+(${AMOUNT})\s+\(Net\)\s+(${AMOUNT})`,
)
const CONTROL_DESCRIPTION = new RegExp(
  String.raw`(?:^\s+|${AMOUNT} )([A-Z][A-Z ]*[A-Z])\s+(${AMOUNT})`,
)
const CONTROL_DEDUCTION_NET = new RegExp(String.raw`\(Net\)\s+(${AMOUNT})`)
const CONTROL_PRODUCT = new RegExp(String.raw`^\s+(OIL|GAS) 8/8\s+${NUMBER}`)
const CONTROL_PRODUCT_NET = new RegExp(String.raw`^\s+NET\s+(${NUMBER})$`)

const PRODUCTS: Record<string, Product> = { GAS: 'gas', OIL: 'oil' }

type State = 'idle' | 'product' | 'afterNet' | 'wellTotals' | 'control'

interface ControlCursor {
  control: RevenueControl
  description?: string
  product?: Product
}

export function parseRevenue({ header, body }: LegacyText): RevenueStatement {
  const statement: RevenueStatement = { kind: 'revenue', entries: [], controls: [] }
  const date = header.join('\n').match(STATEMENT_DATE)
  if (date) statement.statementMonth = monthFromUsDate(date[1])
  let section: RevenueSection = 'current'
  let well: { code: string; name: string } | undefined
  let pending: { productionMonth: string; taxDescription: string } | undefined
  let lastEntry: RevenueEntry | undefined
  let pendingDeduction: string | undefined
  let cursor: ControlCursor | undefined
  let state: State = 'idle'

  for (const line of body) {
    if (SECTION_CURRENT.test(line) || SECTION_PRIOR.test(line)) {
      // The caption is repeated on every page; only a change starts a new section.
      const next = SECTION_PRIOR.test(line) ? 'prior' : 'current'
      if (next !== section) state = 'idle'
      section = next
      continue
    }
    const controlStart = line.match(CONTROL_TOTALS)
    if (controlStart) {
      const label = controlStart[1]
      const control: RevenueControl = {
        section: label === 'New' ? 'current' : label === 'Prior' ? 'prior' : 'overall',
        deductions: {},
        productNetVolume: {},
      }
      statement.controls.push(control)
      cursor = { control }
      state = 'control'
      continue
    }
    const wellMatch = line.match(WELL)
    if (wellMatch) {
      // A record continued on the next page keeps its state.
      if (/\(Continued\)/.test(line) && well?.code === wellMatch[1]) continue
      well = { code: wellMatch[1], name: wellMatch[2].trim() }
      state = 'idle'
      continue
    }
    if (WELL_TOTALS.test(line)) {
      state = 'wellTotals'
      continue
    }

    if (state === 'control' && cursor) {
      parseControlLine(line, cursor)
      continue
    }
    if (state === 'wellTotals') continue

    const product = line.match(PRODUCT_LINE)
    if (product) {
      pending = { productionMonth: product[1], taxDescription: product[2] ?? '' }
      state = 'product'
      continue
    }
    const net = line.match(NET_LINE)
    if (net && state === 'product' && pending && well) {
      const productCode = PRODUCTS[net[1]]
      if (!productCode) throw new Error(`Unknown product "${net[1]}" for well ${well.code}`)
      lastEntry = {
        wellCode: well.code,
        wellName: well.name,
        product: productCode,
        productionMonth: pending.productionMonth,
        section,
        netVolume: parseHundredths(net[2]),
        netValue: parseHundredths(net[3]),
        netTax: net[4] ? parseHundredths(net[4]) : 0,
        taxDescription: pending.taxDescription,
        otherDeductions: [],
      }
      statement.entries.push(lastEntry)
      pending = undefined
      state = 'afterNet'
      continue
    }
    // Additional deductions (e.g. "OTHER FEES") follow a product as a gross/net line pair.
    if (state === 'afterNet' && lastEntry) {
      const deduction = line.match(DEDUCTION_LINE)
      if (deduction && !pendingDeduction) {
        pendingDeduction = deduction[1]
        continue
      }
      const deductionNet = line.match(DEDUCTION_NET_LINE)
      if (deductionNet && pendingDeduction) {
        lastEntry.otherDeductions.push({
          description: pendingDeduction,
          amount: parseHundredths(deductionNet[1]),
        })
        pendingDeduction = undefined
        continue
      }
    }
    pendingDeduction = undefined
    if (line.trim() !== '') state = 'idle'
  }
  return statement
}

function parseControlLine(line: string, cursor: ControlCursor): void {
  const { control } = cursor
  const productLine = line.match(CONTROL_PRODUCT)
  if (productLine) {
    cursor.product = PRODUCTS[productLine[1]]
    return
  }
  const productNet = line.match(CONTROL_PRODUCT_NET)
  if (productNet && cursor.product) {
    control.productNetVolume[cursor.product] = parseHundredths(productNet[1])
    cursor.product = undefined
    return
  }
  const net = line.match(CONTROL_NET)
  if (net) {
    control.netVolume = parseHundredths(net[1])
    control.netValue = parseHundredths(net[2])
    if (cursor.description) control.deductions[cursor.description] = parseHundredths(net[3])
    return
  }
  const deductionNet = line.match(CONTROL_DEDUCTION_NET)
  if (deductionNet && cursor.description) {
    control.deductions[cursor.description] = parseHundredths(deductionNet[1])
    return
  }
  const description = line.match(CONTROL_DESCRIPTION)
  if (description && description[1] !== 'NET') cursor.description = description[1]
}
