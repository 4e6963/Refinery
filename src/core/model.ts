/**
 * Format-neutral domain model. Every statement format parses into these types;
 * all money and volume values are integer hundredths (see calc/money.ts).
 */

/** Calendar month as `YYYY-MM`. */
export type YearMonth = string

export type Product = 'gas' | 'oil'

export type RevenueSection = 'current' | 'prior'

export interface RevenueEntry {
  wellCode: string
  wellName: string
  product: Product
  productionMonth: string
  section: RevenueSection
  netVolume: number
  netValue: number
  netTax: number
  taxDescription: string
  otherDeductions: { description: string; amount: number }[]
}

/** Control totals printed by the operator, used to validate the parsed entries. */
export interface RevenueControl {
  section: RevenueSection | 'overall'
  netVolume?: number
  netValue?: number
  /** Net amounts per tax/deduction description, e.g. "GAS TAX". */
  deductions: Record<string, number>
  productNetVolume: Partial<Record<Product, number>>
}

export interface RevenueStatement {
  kind: 'revenue'
  statementMonth?: YearMonth
  entries: RevenueEntry[]
  controls: RevenueControl[]
}

export type ExpenseCategory = 'operating' | 'equipment' | 'income' | 'drilling' | 'other'

export interface ExpenseItem {
  description: string
  gross: number
  share: number
}

export interface ExpenseSection {
  name: string
  category: ExpenseCategory
  items: ExpenseItem[]
  totalGross?: number
  totalShare?: number
}

export interface ExpenseInvoice {
  invoiceNumber: string
  wellCode: string
  wellName: string
  sections: ExpenseSection[]
  netAmount?: number
}

export interface ExpenseStatement {
  kind: 'expenses'
  statementMonth?: YearMonth
  invoices: ExpenseInvoice[]
}

export interface ReceivableInvoice {
  invoiceNumber: string
  wellCode: string
  wellName: string
  amount?: number
  /** Listed under invoices carried over from earlier statements. */
  previous: boolean
}

export interface ReceivableStatement {
  kind: 'receivables'
  statementMonth?: YearMonth
  invoices: ReceivableInvoice[]
  balanceDue?: number
}

export type Statement = RevenueStatement | ExpenseStatement | ReceivableStatement
export type StatementKind = Statement['kind']

export type MonthSource = 'filename' | 'content' | 'manual'

export interface ParsedFile {
  fileName: string
  formatId?: string
  kind?: StatementKind
  month?: YearMonth
  monthSource?: MonthSource
  statement?: Statement
  error?: string
}

export interface Warning {
  level: 'error' | 'warning'
  message: string
  month?: YearMonth
  fileName?: string
  wellCode?: string
}

/** One line of a month sheet. Values in hundredths; columns follow the export layout. */
export interface WellRow {
  wellCode: string
  wellName: string
  hasRevenue: boolean
  hasExpenses: boolean
  gasVolume: number
  gasIncome: number
  gasTax: number
  oilVolume: number
  oilIncome: number
  oilTax: number
  leaseEquipment: number
  operatingExpenses: number
  drillingCost: number
  totalExpenses: number
  roi: number
  netIncome: number
}

export type RowValues = Omit<WellRow, 'wellCode' | 'wellName' | 'hasRevenue' | 'hasExpenses'>

export interface SheetReport {
  rows: WellRow[]
  totals: RowValues
}

export interface MonthReport extends SheetReport {
  month: YearMonth
}

export interface Report {
  year?: number
  months: MonthReport[]
  total: SheetReport
  warnings: Warning[]
}
