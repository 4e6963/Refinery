// Synthetic statements in the legacy layout. All codes, names and amounts are invented.
import { describe, expect, it } from 'vitest'
import { legacyFormat } from '../../src/core/formats/legacy'
import { parseAr } from '../../src/core/formats/legacy/ar'
import { parseJib } from '../../src/core/formats/legacy/jib'
import { parseRevenue } from '../../src/core/formats/legacy/revenue'
import { legacyText } from '../../src/core/formats/legacy/text'
import { validateExpenses, validateReceivables, validateRevenue } from '../../src/core/calc/validate'
import type { PdfPage } from '../../src/core/pdf/extract'

/** Lays out text lines as monospaced PDF items, one item per word group. */
function page(pageNumber: number, lines: string[]): PdfPage {
  const items = lines.flatMap((line, row) =>
    [...line.matchAll(/\S+(?: \S+)*/g)].map((m) => ({
      str: m[0],
      x: m.index! * 6,
      y: 800 - row * 12,
      width: m[0].length * 6,
      height: 10,
    })),
  )
  return { pageNumber, items }
}

const REV_HEADER = [
  '                     R E V E N U E   S U M M A R Y   S T A T E M E N T',
  '                     Owner Code:000001                 Date:03/10/25',
  '--------------------New Revenue This Statement--------------------',
  'Prod Prod.  Unit     Decimal     Gross Vol.  Gross Val.',
  '---- ----- ------ ------------ ------------ ------------',
]

const REV_PAGE_1 = [
  ...REV_HEADER,
  '*** Well: 900000001 TEST LEASE A (X1),SAMPLE County,TX  API#:N/A ***',
  ' G   01/25  $2.00 0.1000000000       100.00      $200.00 GAS TAX          $15.00        $0.00',
  'GAS                WI                 10.00       $20.00 (Net)             $1.50        $0.00       $18.50        $0.00        $0.00',
  ' O   12/24 $70.00 0.1000000000        10.00      $700.00 OIL PROD TAX     $32.00        $0.00',
  'OIL                WI                  1.00       $70.00 (Net)             $3.20        $0.00       $66.80        $0.00        $0.00',
  ' O   01/25 $70.00 0.1000000000        20.00    $1,400.00 OIL PROD TAX     $64.00        $0.00',
]

const REV_PAGE_2 = [
  ...REV_HEADER,
  '*** Well: 900000001 TEST LEASE A (X1),SAMPLE County,TX  API#:N/A *** (Continued)',
  'OIL                WI                  2.00      $140.00 (Net)             $6.40        $0.00      $133.60        $0.00        $0.00',
  '                                                         OTHER FEES      $100.00        $0.00',
  '                                                         (Net)            $10.00        $0.00      $123.60        $0.00        $0.00',
  'TEST LEASE A (X1)              Totals:----- ------------ -----------------------',
  '                           8/8       130.00    $2,300.00 GAS TAX          $15.00',
  '                           NET        13.00      $230.00 (Net)             $1.50',
  '                                                         OIL PROD TAX     $96.00        $0.00',
  '                                                         (Net)             $9.60        $0.00      $208.90        $0.00        $0.00',
  '*** Well: 900000002 TEST LEASE B,SAMPLE County,TX  API#:N/A ***',
  ' O   01/25 $70.00 0.0500000000        10.00      $700.00 OIL PROD TAX     $32.00        $0.00',
  'OIL                WI                  0.50       $35.00 (Net)             $1.60        $0.00       $33.40        $0.00        $0.00',
  '--------------------Revenue from Prior Statements--------------------',
  '*** Well: 900000002 TEST LEASE B,SAMPLE County,TX  API#:N/A ***',
  ' O   11/24 $70.00 0.0500000000        -2.00     -$140.00 OIL PROD TAX     -$6.40        $0.00',
  'OIL                WI                 -0.10       -$7.00 (Net)            -$0.32        $0.00       -$6.68        $0.00       -$6.68',
  'New Revenue Totals:            ------------ ------------ -----------------------',
  '                           8/8       140.00    $3,000.00 GAS TAX          $15.00',
  '                           NET        13.50      $265.00 (Net)             $1.50',
  '                                                         OIL PROD TAX    $128.00        $0.00',
  '                                                         (Net)            $11.20        $0.00',
  '                                                         OTHER FEES      $100.00        $0.00',
  '                                                         (Net)            $10.00        $0.00      $242.30        $0.00        $0.00',
  '                               ------------ ------------ -----------------------',
  '                       OIL 8/8        40.00',
  '                           NET         3.50',
  '                       GAS 8/8       100.00',
  '                           NET        10.00',
]

const JIB_PAGES = [
  [
    '                   J O I N T   I N T E R E S T   B I L L I N G   I N V O I C E',
    '                        Expenses Thru:01/31/25      Owner:000001      Page:   1',
    '------------------------------------------------------------------------------',
    '         Expense Description       Voucher  Inv.Number  Dec.Interest       Gross             Your',
    '---------------------------------- ------- ------------ ------------ ---------------- ----------------',
    '    Well Code: 900000001 TEST LEASE A (X1)                 Inv#: 1000001',
    '    Legal Description:',
    '*** LEASE & WELL EQUIPMENT         ***',
    '    TEST LEASE A 1-PUMP            1000 INV-1      .1000000000        $1,000.00          $100.00',
    '    SAMPLE VENDOR LLC                    01/02/25     ACP',
    '                                                                     ---------------- ----------------',
    '                                      Total:                                $1,000.00          $100.00',
    '*** LEASE OPERATING EXPENSES       ***',
    'SALT WATER DISPOSAL                                                           $500.00           $50.00',
  ],
  [
    '                   J O I N T   I N T E R E S T   B I L L I N G   I N V O I C E',
    '                        Expenses Thru:01/31/25      Owner:000001      Page:   2',
    '------------------------------------------------------------------------------',
    '         Expense Description       Voucher  Inv.Number  Dec.Interest       Gross             Your',
    '---------------------------------- ------- ------------ ------------ ---------------- ----------------',
    '    Well Code: 900000001 TEST LEASE A (X1)                 Inv#: 1000001  (Continued)',
    '    Legal Description:',
    '*** LEASE OPERATING EXPENSES       *** (Continued)',
    'INSURANCE                                                                      $20.00            $2.00',
    '                                      Total:                                  $520.00           $52.00',
    '*** INCOME                         ***',
    '    SALVAGE                        1001 INV-2      .1000000000          -$300.00          -$30.00',
    '                                      Total:                                 -$300.00          -$30.00',
    '*** INTANGIBLE DRILLING COSTS-ACP  ***',
    '    TEST LEASE A 1-TEST            1002 INV-3      .1000000000           $10.00            $1.00',
    '                                      Total:                                   $10.00            $1.00',
    '        Net Invoice# 1000001 Amount for TEST LEASE A (X1)                                      $123.00**',
    '******************************************************************************************************',
    '    Well Code: 900000003 TEST LEASE C                     Inv#: 1000002',
    '*** LEASE OPERATING EXPENSES       ***',
    'INSURANCE                                                                      $10.00            $1.00',
    '                                      Total:                                   $10.00            $1.00',
    '        Net Invoice# 1000002 Amount for TEST LEASE C                                             $1.00**',
  ],
]

const AR_LINES = [
  '             A C C O U N T S   R E C E I V A B L E   S U M M A R Y   S T A T E M E N T',
  '    Owner Code:000001                              Date: 03/10/25',
  '        -------------------------New Invoices This Statement---------------------------',
  '        Invoice    Well     Trans.           Transaction           Tran     Amount',
  '       -------- ---------- -------- ------------------------------ ---- ---------------',
  '        1000001  900000001 01/31/25 TEST LEASE A (X1)              JIB          $123.00',
  '                           03/10/25 Netted Against Revenue: 01/25  Net         -$123.00',
  '        1000002  900000003 01/31/25 TEST LEASE C                   JIB',
  '        ----------------------Invoices From Previous Statements------------------------',
  '        0999999  900000003 12/31/24 TEST LEASE C                   JIB           $99.00',
  '                                              Balance Due This Statement           $0.00**',
]

const revenuePages = [page(1, REV_PAGE_1), page(2, REV_PAGE_2)]
const jibPages = JIB_PAGES.map((lines, i) => page(i + 1, lines))
const arPages = [page(1, AR_LINES)]

describe('legacy format', () => {
  it('detects statement kinds from the letter-spaced titles', () => {
    expect(legacyFormat.detect(revenuePages)).toBe('revenue')
    expect(legacyFormat.detect(jibPages)).toBe('expenses')
    expect(legacyFormat.detect(arPages)).toBe('receivables')
    expect(legacyFormat.detect([page(1, ['REVENUE SUMMARY STATEMENT'])])).toBeUndefined()
  })

  it('removes repeated page headers', () => {
    const text = legacyText(revenuePages)
    expect(text.body.filter((l) => l.includes('R E V E N U E'))).toEqual([])
    expect(text.header.filter((l) => l.includes('Date:'))).toHaveLength(2)
  })

  describe('revenue', () => {
    const statement = parseRevenue(legacyText(revenuePages))

    it('reads the statement month', () => {
      expect(statement.statementMonth).toBe('2025-03')
    })

    it('reads product lines, also across page breaks', () => {
      expect(
        statement.entries.map((e) => [e.wellCode, e.product, e.section, e.netVolume, e.netValue, e.netTax]),
      ).toEqual([
        ['900000001', 'gas', 'current', 1000, 2000, 150],
        ['900000001', 'oil', 'current', 100, 7000, 320],
        ['900000001', 'oil', 'current', 200, 14000, 640],
        ['900000002', 'oil', 'current', 50, 3500, 160],
        ['900000002', 'oil', 'prior', -10, -700, -32],
      ])
      expect(statement.entries[0].wellName).toBe('TEST LEASE A (X1)')
      expect(statement.entries[2].productionMonth).toBe('01/25')
    })

    it('attaches additional deductions to the preceding product', () => {
      expect(statement.entries[2].otherDeductions).toEqual([{ description: 'OTHER FEES', amount: 1000 }])
    })

    it('reads control totals', () => {
      expect(statement.controls).toEqual([
        {
          section: 'current',
          netVolume: 1350,
          netValue: 26500,
          deductions: { 'GAS TAX': 150, 'OIL PROD TAX': 1120, 'OTHER FEES': 1000 },
          productNetVolume: { oil: 350, gas: 1000 },
        },
      ])
    })

    it('validates against the control totals', () => {
      expect(validateRevenue(statement)).toEqual([])
      const broken = structuredClone(statement)
      broken.entries[0].netValue += 1
      expect(validateRevenue(broken)).toEqual([
        'New revenue Net Value: parsed 265.01, document says 265.00',
      ])
    })
  })

  describe('joint interest billing', () => {
    const statement = parseJib(legacyText(jibPages))

    it('derives the statement month from the expense period', () => {
      expect(statement.statementMonth).toBe('2025-03')
    })

    it('reads invoices and sections, also across page breaks', () => {
      expect(statement.invoices).toHaveLength(2)
      const [first] = statement.invoices
      expect(first).toMatchObject({ invoiceNumber: '1000001', wellCode: '900000001', netAmount: 12300 })
      expect(first.sections.map((s) => [s.category, s.totalShare, s.items.length])).toEqual([
        ['equipment', 10000, 1],
        ['operating', 5200, 2],
        ['income', -3000, 1],
        ['drilling', 100, 1],
      ])
      expect(validateExpenses(statement)).toEqual([])
    })
  })

  describe('accounts receivable', () => {
    const statement = parseAr(legacyText(arPages))

    it('reads new and previous invoices', () => {
      expect(statement.statementMonth).toBe('2025-03')
      expect(statement.invoices.map((i) => [i.invoiceNumber, i.amount, i.previous])).toEqual([
        ['1000001', 12300, false],
        ['1000002', undefined, false],
        ['0999999', 9900, true],
      ])
      expect(statement.balanceDue).toBe(0)
    })

    it('cross-checks the invoices against the JIB', () => {
      const jib = parseJib(legacyText(jibPages))
      expect(validateReceivables(statement, jib)).toEqual([
        'Invoice 1000002 AR vs. JIB: parsed 0.00, document says 1.00',
      ])
    })
  })
})
