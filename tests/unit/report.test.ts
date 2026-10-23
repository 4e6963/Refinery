import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { buildReport } from '../../src/core/calc/aggregate'
import { buildWorkbook, SHEET_HEADERS, workbookFileName } from '../../src/core/excel/build'
import type { ExpenseStatement, ParsedFile, RevenueEntry, RevenueStatement } from '../../src/core/model'

const entry = (wellCode: string, product: 'gas' | 'oil', v: number, value: number, tax: number): RevenueEntry => ({
  wellCode,
  wellName: `LEASE ${wellCode.slice(-1)}`,
  product,
  productionMonth: '01/25',
  section: 'current',
  netVolume: v,
  netValue: value,
  netTax: tax,
  taxDescription: product === 'gas' ? 'GAS TAX' : 'OIL PROD TAX',
  otherDeductions: [],
})

function revenue(month: string, entries: RevenueEntry[]): ParsedFile {
  const sumOf = (k: 'netValue' | 'netVolume') => entries.reduce((s, e) => s + e[k], 0)
  const controls = [{ section: 'overall' as const, netValue: sumOf('netValue'), netVolume: sumOf('netVolume'), deductions: {}, productNetVolume: {} }]
  const statement: RevenueStatement = { kind: 'revenue', statementMonth: month, entries, controls }
  return { fileName: `${month} REV.pdf`, formatId: 'test', kind: 'revenue', month, monthSource: 'filename', statement }
}

function expenses(month: string, wellCode: string, operating: number, equipment: number): ParsedFile {
  const statement: ExpenseStatement = {
    kind: 'expenses',
    statementMonth: month,
    invoices: [
      {
        invoiceNumber: '1',
        wellCode,
        wellName: 'JIB NAME',
        netAmount: operating + equipment,
        sections: [
          { name: 'OPS', category: 'operating', items: [{ description: 'x', gross: 0, share: operating }], totalShare: operating },
          { name: 'EQ', category: 'equipment', items: [{ description: 'y', gross: 0, share: equipment }], totalShare: equipment },
        ],
      },
    ],
  }
  return { fileName: `${month} JIB.pdf`, formatId: 'test', kind: 'expenses', month, monthSource: 'filename', statement }
}

const files = [
  revenue('2025-01', [entry('900000002', 'gas', 1000, 2000, 150), entry('900000002', 'oil', 100, 7000, 320), entry('900000002', 'oil', 200, 14000, 640)]),
  expenses('2025-01', '900000001', 5000, 10000),
  revenue('2025-02', [entry('900000002', 'oil', 50, 3500, 160)]),
  expenses('2025-02', '900000002', 1000, 0),
]

describe('report', () => {
  const report = buildReport(files)

  it('lists every well in every month, sorted by code', () => {
    expect(report.year).toBe(2025)
    expect(report.months.map((m) => [m.month, m.rows.map((r) => r.wellCode)])).toEqual([
      ['2025-01', ['900000001', '900000002']],
      ['2025-02', ['900000001', '900000002']],
    ])
    expect(report.warnings).toEqual([])
  })

  it('aggregates and derives the columns', () => {
    const [jan, feb] = report.months
    expect(jan.rows[1]).toMatchObject({
      hasRevenue: true,
      hasExpenses: false,
      gasVolume: 1000,
      oilVolume: 300,
      oilIncome: 21000,
      oilTax: 960,
      netIncome: 2000 + 21000 - 150 - 960,
      roi: 2000 + 21000 - 150 - 960,
    })
    expect(jan.rows[0]).toMatchObject({ hasRevenue: false, hasExpenses: true, totalExpenses: 15000, roi: -15000 })
    expect(feb.rows[1]).toMatchObject({ oilIncome: 3500, operatingExpenses: 1000, roi: 3500 - 160 - 1000 })
    expect(jan.totals.roi).toBe(jan.rows[0].roi + jan.rows[1].roi)
  })

  it('prefers revenue well names and sums the year', () => {
    expect(report.total.rows[1]).toMatchObject({ wellName: 'LEASE 2', oilIncome: 24500, operatingExpenses: 1000 })
    expect(report.total.rows[0].wellName).toBe('JIB NAME')
    expect(report.total.totals.roi).toBe(report.months[0].totals.roi + report.months[1].totals.roi)
  })

  it('warns about duplicates, missing statements and unknown months', () => {
    const warnings = buildReport([
      ...files,
      { ...files[0], fileName: 'copy.pdf' },
      { ...revenue('2025-03', []), statement: { kind: 'revenue', entries: [], controls: [] } },
      { ...files[1], fileName: 'nomonth.pdf', month: undefined, monthSource: undefined },
    ]).warnings.map((w) => [w.month, w.fileName, w.message])
    expect(warnings).toEqual([
      ['2025-01', 'copy.pdf', 'Duplicate statement for 2025-01, already loaded: 2025-01 REV.pdf – ignored'],
      [undefined, 'nomonth.pdf', 'Unknown month – file is ignored'],
      ['2025-03', '2025-03 REV.pdf', 'No total lines found'],
      ['2025-03', undefined, 'JIB statement missing'],
    ])
  })
})

describe('excel export', () => {
  it('writes one sheet per month plus a total sheet with values only', async () => {
    const report = buildReport(files)
    expect(workbookFileName(report)).toBe('Year End Summary 2025.xlsx')

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load((await buildWorkbook(report)).buffer as ArrayBuffer)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['01', '02', 'Total'])

    const jan = wb.getWorksheet('01')!
    expect(jan.getRow(1).values).toEqual([, 'Payment Month:', '01/2025'])
    expect((jan.getRow(2).values as unknown[]).slice(1)).toEqual(SHEET_HEADERS)
    // Well without revenue: revenue cells stay empty, expenses and derived values are filled.
    expect((jan.getRow(3).values as unknown[]).slice(1)).toEqual([
      900000001, 'JIB NAME', , , , , , , 100, 50, 0, 150, -150, 0,
    ])
    expect(jan.getRow(4).getCell('G').value).toBe(210)
    expect(jan.getRow(4).getCell('I').value).toBeNull()
    expect(jan.getRow(5).getCell('B').value).toBe('Total')
    expect(jan.getRow(5).getCell('M').value).toBe(report.months[0].totals.roi / 100)

    const total = wb.getWorksheet('Total')!
    expect(total.getRow(1).values).toEqual([, 'TOTAL', '2025'])
    expect(total.getRow(4).getCell('G').value).toBe(245)
    let formulas = 0
    wb.eachSheet((ws) => ws.eachRow((row) => row.eachCell((c) => { if (c.formula) formulas++ })))
    expect(formulas).toBe(0)
  })
})
