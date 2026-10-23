// Synthetic statements in the current layout. All codes, names and amounts are invented.
import { describe, expect, it } from 'vitest'
import { currentFormat } from '../../src/core/formats/current'
import { parseJib } from '../../src/core/formats/current/jib'
import { parseRevenue } from '../../src/core/formats/current/revenue'
import { currentLines, monthFromName, parseLegend } from '../../src/core/formats/current/text'
import { validateExpenses, validateRevenue } from '../../src/core/calc/validate'
import type { PdfPage } from '../../src/core/pdf/extract'

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

const REV_PAGES = [
  [
    ' SAMPLE OPERATOR',
    '   Check Date                Check Number                  Owner Number                  Owner Name        Check Amount',
    '   03/10/2027                000001                        000001                        Sample Owner            $100.00',
    'Product Codes   101 – Oil  201 – Gas  401 – Plant Products  901 – Joint Interest Billing',
    'Interest Codes  WI – Working',
    'Tax Codes       PR – Production Tax  SV – Severance Tax',
    'Deduct Codes    19 – JIB Netting',
    'Sale Date  Prd.    Int.    Ded.        BTU            Volume             Price          Value      Interest          Volume             Value',
    '900000001 TEST LEASE A (X1) SAMPLE, TX',
    'Jan 2027   101     WI                0.0000            100.00           70.00        7,000.00   0.10000000             10.00           700.00',
    'Jan 2027   101             PR                                                         (322.00)                                         (32.20)',
    'Jan 2027   201     WI                1.0500            200.00            2.50          500.00   0.10000000             20.00            50.00',
    '                                                                                                                        Total          717.80',
  ],
  [
    'Check Number: 000001                                                                     Owner Number: 000001',
    'Sale Date  Prd.    Int.    Ded.        BTU            Volume             Price          Value      Interest          Volume             Value',
    '900000001 TEST LEASE A (X1) SAMPLE, TX',
    'Jan 2027   201             PR                                                          (30.00)                                          (3.00)',
    'Jan 2027   201             SV                                                          (10.00)                                          (1.00)',
    'Dec 2026   101     WI                0.0000            (10.00)          70.00         (700.00)   0.10000000            (1.00)           (70.00)',
    'Dec 2026   101             PR                                                           32.20                                            3.22',
    'Jan 2027   401     WI                0.0000             50.00           0.50            25.00   0.10000000              5.00             2.50',
    'Jan 2027   901             19                                                            0.00   1.00000000                           (600.00)',
    '                                                                                                                   Owner Net            49.08',
    'CHECK TOTAL',
    'Gross                               Taxes                               Deductions                          Net Amount',
    '                           680.00                              (32.98)                            (600.00)                         $47.02',
  ],
]

const JIB_PAGES = [
  [
    '                            Joint Interest Billing Invoice - Expenses through Jan 31, 2027',
    '                                                                         Gross Value        Net Value',
    '                                      INCOME                                 (100.00)          (10.00)',
    '                                      LEASE OPERATING EXPENSES             1,500.00           150.00',
    '                                      Net Expenses                                             140.00',
    ' Invoice No.       Cost Center         AFE          Well Name                         Gross Value         Net Value               Invoiced',
    ' 3000001           900000001                        TEST LEASE A (X1)                      400.00             40.00                  40.00',
    ' 3000001           900000001           777001       TEST LEASE A (X1)                    1,000.00            100.00                 100.00',
  ],
  [
    ' Date                   Description                                        Partner %                       Gross                      Net',
    'INV NO. 3000001 - CC 900000001 - TEST LEASE A (X1)',
    'INCOME',
    ' 01/31/27                  JUNK EQUIPMENT SALES                            10.00000000                     (100.00)                   (10.00)',
    'LEASE OPERATING EXPENSES',
    ' 01/31/27                  SALT WATER DISPOSAL                             10.00000000                      300.00                     30.00',
  ],
  [
    ' Date                   Description                                        Partner %                       Gross                      Net',
    'INV NO. 3000001 - CC 900000001 - TEST LEASE A (X1)',
    'LEASE OPERATING EXPENSES',
    ' 01/31/27                  INSURANCE                                       10.00000000                      200.00                     20.00',
    '                                                                               Total                   $400.0                    $40.0',
    '                                                                                                           0                        0',
    'INV NO. 3000001 - CC 900000001 - AFE 777001 - TEST LEASE A (X1)',
    'LEASE OPERATING EXPENSES',
    ' 01/14/27                  PLUG & ABANDONMENT                              10.00000000                    1,000.00                    100.00',
    '                                                                               Total                 $1,000.00                  $100.00',
    '                                                                     3',
  ],
]

const revenuePages = REV_PAGES.map((lines, i) => page(i + 1, lines))
const jibPages = JIB_PAGES.map((lines, i) => page(i + 1, lines))

describe('current format', () => {
  it('detects statement kinds', () => {
    expect(currentFormat.detect(revenuePages)).toBe('revenue')
    expect(currentFormat.detect(jibPages)).toBe('expenses')
    expect(currentFormat.detect([page(1, ['R E V E N U E   S U M M A R Y'])])).toBeUndefined()
  })

  it('parses legends and month names', () => {
    expect([...parseLegend('Tax Codes       PR – Production Tax  SV – Severance Tax', 'Tax Codes')!]).toEqual([
      ['PR', 'Production Tax'],
      ['SV', 'Severance Tax'],
    ])
    expect(monthFromName('Jul 31, 2026')).toBe('2026-07')
    expect(monthFromName('Dec 2026')).toBe('2026-12')
  })

  describe('revenue', () => {
    const statement = parseRevenue(currentLines(revenuePages))

    it('reads sales with taxes, also across page breaks', () => {
      expect(statement.statementMonth).toBe('2027-03')
      expect(
        statement.entries.map((e) => [e.wellCode, e.product, e.productionMonth, e.netVolume, e.netValue, e.netTax]),
      ).toEqual([
        ['900000001', 'oil', '2027-01', 1000, 70000, 3220],
        ['900000001', 'gas', '2027-01', 2000, 5000, 400],
        ['900000001', 'oil', '2026-12', -100, -7000, -322],
      ])
      expect(statement.entries[0].wellName).toBe('TEST LEASE A (X1)')
    })

    it('reports unsupported products and checks the check total', () => {
      expect(validateRevenue(statement)).toEqual(['Well 900000001: unsupported product "Plant Products" ignored'])
      const broken = structuredClone(statement)
      broken.entries[1].netTax += 1
      expect(validateRevenue(broken)).toContain('Overall taxes: parsed 32.99, document says 32.98')
    })
  })

  describe('joint interest billing', () => {
    const statement = parseJib(currentLines(jibPages))

    it('reads invoices, AFE parts and sections across pages', () => {
      expect(statement.statementMonth).toBe('2027-03')
      expect(
        statement.invoices.map((i) => [
          i.invoiceNumber,
          i.wellName,
          i.netAmount,
          i.sections.map((s) => [s.category, s.totalShare, s.items.length]),
        ]),
      ).toEqual([
        ['3000001', 'TEST LEASE A (X1)', 4000, [['income', -1000, 1], ['operating', 5000, 2]]],
        ['3000001 AFE 777001', 'TEST LEASE A (X1)', 10000, [['operating', 10000, 1]]],
      ])
      expect(statement.sectionTotals).toEqual({ INCOME: -1000, 'LEASE OPERATING EXPENSES': 15000 })
    })

    it('validates against the summary tables', () => {
      expect(validateExpenses(statement)).toEqual([])
      const broken = structuredClone(statement)
      broken.invoices[0].sections[1].items[0].share += 1
      broken.invoices[0].sections[1].totalShare! += 1
      expect(validateExpenses(broken)).toEqual([
        'Invoice 3000001 (well 900000001) invoice amount: parsed 40.01, document says 40.00',
        'Total LEASE OPERATING EXPENSES: parsed 150.01, document says 150.00',
      ])
    })
  })
})
