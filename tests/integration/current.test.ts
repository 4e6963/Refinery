import { beforeAll, describe, expect, it } from 'vitest'
import { buildReport } from '../../src/core/calc/aggregate'
import type { ParsedFile, Report } from '../../src/core/model'
import { hasFixtures, parseFixtureDir } from '../helpers/pdf'

// No reference workbook exists for this format; values are checked against the
// control totals printed in the documents (check totals, JIB summary tables).
describe.skipIf(!hasFixtures('current', false))('current statements (real fixtures)', () => {
  let files: ParsedFile[]
  let report: Report

  beforeAll(async () => {
    files = await parseFixtureDir('current')
    report = buildReport(files)
  })

  it('recognises every file with the month printed in it', () => {
    expect(files.filter((f) => f.error)).toEqual([])
    expect(files.every((f) => f.formatId === 'current')).toBe(true)
    expect(files.filter((f) => f.statement?.statementMonth !== f.month)).toEqual([])
    expect(files.filter((f) => f.kind === 'revenue')).not.toHaveLength(0)
    expect(files.filter((f) => f.kind === 'expenses')).not.toHaveLength(0)
  })

  it('agrees with all printed control totals', () => {
    expect(report.warnings).toEqual([])
    for (const file of files) {
      const s = file.statement!
      if (s.kind === 'revenue') {
        expect(s.entries.length).toBeGreaterThan(0)
        expect(s.controls).toHaveLength(1)
      }
      if (s.kind === 'expenses') {
        expect(s.invoices.every((i) => i.netAmount !== undefined && i.sections.length > 0)).toBe(true)
        expect(Object.keys(s.sectionTotals ?? {}).length).toBeGreaterThan(0)
      }
    }
  })

  it('builds a report with revenue and expenses per month', () => {
    expect(report.months.length).toBeGreaterThan(0)
    for (const month of report.months) {
      expect(month.rows.some((r) => r.hasRevenue)).toBe(true)
      expect(month.rows.some((r) => r.hasExpenses)).toBe(true)
    }
  })
})
