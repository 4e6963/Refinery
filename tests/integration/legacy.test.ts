import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildReport } from '../../src/core/calc/aggregate'
import type { ParsedFile, Product, Report, RevenueEntry, WellRow } from '../../src/core/model'
import { fixtureDir, hasFixtures, parseFixtureDir } from '../helpers/pdf'

type Expected = Record<string, Record<string, Partial<Record<string, number>>>>

const COLUMNS: [string, keyof WellRow, Product | undefined, keyof RevenueEntry | undefined][] = [
  ['C', 'gasVolume', 'gas', 'netVolume'],
  ['D', 'gasIncome', 'gas', 'netValue'],
  ['E', 'gasTax', 'gas', 'netTax'],
  ['F', 'oilVolume', 'oil', 'netVolume'],
  ['G', 'oilIncome', 'oil', 'netValue'],
  ['H', 'oilTax', 'oil', 'netTax'],
  ['I', 'leaseEquipment', undefined, undefined],
  ['J', 'operatingExpenses', undefined, undefined],
]

/**
 * The reference workbook drops prior-period adjustments for a well/product
 * that also has revenue in the current statement. We deliberately include
 * them, so add those adjustments to the reference value before comparing.
 */
function droppedByReference(entries: RevenueEntry[], code: string, product: Product, key: keyof RevenueEntry) {
  const own = entries.filter((e) => e.wellCode === code && e.product === product)
  if (!own.some((e) => e.section === 'current')) return 0
  return own.filter((e) => e.section === 'prior').reduce((s, e) => s + (e[key] as number), 0) / 100
}

describe.skipIf(!hasFixtures('legacy'))('legacy statements (real fixtures)', () => {
  let files: ParsedFile[]
  let report: Report
  let expected: Expected

  beforeAll(async () => {
    files = await parseFixtureDir('legacy')
    report = buildReport(files)
    expected = JSON.parse(await readFile(join(fixtureDir('legacy'), 'expected.json'), 'utf8'))
  })

  it('recognises every file', () => {
    expect(files.filter((f) => f.error)).toEqual([])
    expect(files.every((f) => f.formatId === 'legacy' && f.monthSource === 'filename')).toBe(true)
    // The month printed in the documents matches the file name.
    expect(files.filter((f) => f.statement?.statementMonth !== f.month)).toEqual([])
  })

  it('agrees with the printed control totals and the receivables statements', () => {
    expect(report.warnings).toEqual([])
  })

  it('reproduces every value of the reference workbook', () => {
    const differences: string[] = []
    let adjusted = 0
    for (const [sheet, wells] of Object.entries(expected)) {
      // The reference workbook covers one year; further fixtures are only checked for warnings.
      const month = report.months.find((m) => m.month === `${report.year}-${sheet}`)
      expect(month, `month ${sheet}`).toBeDefined()
      const revenue = files.find((f) => f.month === month!.month && f.kind === 'revenue')
      const entries = revenue?.statement?.kind === 'revenue' ? revenue.statement.entries : []
      for (const [code, values] of Object.entries(wells)) {
        const row = month!.rows.find((r) => r.wellCode === code)
        for (const [col, key, product, entryKey] of COLUMNS) {
          const correction = product && entryKey ? droppedByReference(entries, code, product, entryKey) : 0
          if (correction !== 0) adjusted++
          const want = (values[col] ?? 0) + correction
          const got = row ? (row[key] as number) / 100 : 0
          if (Math.abs(want - got) > 0.005) differences.push(`${sheet} ${code} ${col}: ${got} != ${want}`)
        }
      }
      // Wells with data that the reference does not list would be a parsing artefact.
      for (const row of month!.rows) {
        if ((row.hasRevenue || row.hasExpenses) && !wells[row.wellCode]) {
          differences.push(`${sheet} ${row.wellCode}: not in reference`)
        }
      }
    }
    expect(differences).toEqual([])
    expect(adjusted).toBeGreaterThan(0)
  })
})
