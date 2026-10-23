import type { Product, RevenueEntry, RevenueStatement } from '../../model'
import { parseHundredths } from '../../calc/money'
import { monthFromUsDate } from '../../calc/month'
import { AMOUNT, monthFromName, parseLegend } from './text'

const CHECK_DATE = /^\s*(\d\d\/\d\d\/\d{4})\s+\d+\s+\d+\s/
const WELL = /^(\d{9}) (.*) (\S+), ([A-Z]{2})$/
const DETAIL = /^([A-Z][a-z]{2} \d{4})\s+(\S+)\s+(.*)$/
const NUMBER_TOKEN = new RegExp(`^${AMOUNT}$|^-?\\d*\\.\\d+$`)
const CHECK_TOTAL = /^CHECK TOTAL/
const CHECK_TOTAL_VALUES = new RegExp(
  String.raw`^\s*(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s+(${AMOUNT})\s*$`,
)

function productOf(name: string): Product | undefined {
  if (/gas/i.test(name)) return 'gas'
  if (/oil|condensate/i.test(name)) return 'oil'
  return undefined
}

interface Legends {
  products: Map<string, string>
  interests: Map<string, string>
  taxes: Map<string, string>
  deducts: Map<string, string>
}

/** Check-style owner revenue statement with code legends and one line per sale. */
export function parseRevenue(lines: string[]): RevenueStatement {
  const statement: RevenueStatement = { kind: 'revenue', entries: [], controls: [], notes: [] }
  const legends: Legends = { products: new Map(), interests: new Map(), taxes: new Map(), deducts: new Map() }
  let well: { code: string; name: string } | undefined
  const lastSale = new Map<string, RevenueEntry>()
  let inCheckTotal = false

  for (const line of lines) {
    for (const [key, caption] of [
      ['products', 'Product Codes'],
      ['interests', 'Interest Codes'],
      ['taxes', 'Tax Codes'],
      ['deducts', 'Deduct Codes'],
    ] as const) {
      const legend = parseLegend(line, caption)
      if (legend) for (const [code, name] of legend) legends[key].set(code, name)
    }
    const date = line.match(CHECK_DATE)
    if (date && !statement.statementMonth) statement.statementMonth = monthFromUsDate(date[1])

    if (CHECK_TOTAL.test(line)) {
      inCheckTotal = true
      continue
    }
    if (inCheckTotal) {
      const totals = line.match(CHECK_TOTAL_VALUES)
      if (totals) {
        statement.controls.push({
          section: 'overall',
          netValue: parseHundredths(totals[1]),
          netTax: -parseHundredths(totals[2]),
          deductions: {},
          productNetVolume: {},
        })
        inCheckTotal = false
      }
      continue
    }

    const wellMatch = line.match(WELL)
    if (wellMatch) {
      if (well?.code !== wellMatch[1]) lastSale.clear()
      well = { code: wellMatch[1], name: wellMatch[2].trim() }
      continue
    }
    const detail = line.match(DETAIL)
    if (!detail || !well) continue

    const [, saleMonth, productCode, rest] = detail
    const tokens = rest.trim().split(/\s+/)
    const codes = tokens.filter((t) => !NUMBER_TOKEN.test(t))
    const numbers = tokens.filter((t) => NUMBER_TOKEN.test(t)).map(parseHundredthsLoose)
    const productName = legends.products.get(productCode) ?? productCode
    const productionMonth = monthFromName(saleMonth) ?? saleMonth

    if (codes.some((c) => legends.deducts.has(c))) continue // netted JIB, booked via the JIB itself
    const product = productOf(productName)

    if (codes.some((c) => legends.taxes.has(c))) {
      const tax = numbers[numbers.length - 1] ?? 0
      const sale = lastSale.get(productCode)
      if (sale && product) sale.netTax -= tax
      else statement.notes!.push(`Well ${well.code}: tax line without sale (${productName}, ${saleMonth})`)
      continue
    }
    if (codes.some((c) => legends.interests.has(c)) && numbers.length >= 7) {
      if (!product) {
        statement.notes!.push(`Well ${well.code}: unsupported product "${productName}" ignored`)
        continue
      }
      const entry: RevenueEntry = {
        wellCode: well.code,
        wellName: well.name,
        product,
        productionMonth,
        section: 'current',
        netVolume: numbers[numbers.length - 2],
        netValue: numbers[numbers.length - 1],
        netTax: 0,
        taxDescription: '',
        otherDeductions: [],
      }
      statement.entries.push(entry)
      lastSale.set(productCode, entry)
      continue
    }
    statement.notes!.push(`Well ${well.code}: unrecognised line "${line.trim()}"`)
  }
  return statement
}

/** Volumes may carry more than two decimals in other columns; owner values always have two. */
function parseHundredthsLoose(token: string): number {
  const negative = /^\(.*\)$/.test(token) || token.startsWith('-')
  const value = Math.round(Number(token.replace(/[()$,-]/g, '')) * 100)
  return negative ? -value : value
}
