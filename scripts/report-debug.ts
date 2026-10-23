// Debug helper: parses all fixtures of a format and prints warnings and
// differences against the reference values (codes and numbers only).
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildReport } from '../src/core/calc/aggregate'
import type { WellRow } from '../src/core/model'
import { fixtureDir, parseFixtureDir } from '../tests/helpers/pdf'

const [format = 'legacy'] = process.argv.slice(2)
const columns: [string, keyof WellRow][] = [
  ['C', 'gasVolume'],
  ['D', 'gasIncome'],
  ['E', 'gasTax'],
  ['F', 'oilVolume'],
  ['G', 'oilIncome'],
  ['H', 'oilTax'],
  ['I', 'leaseEquipment'],
  ['J', 'operatingExpenses'],
]
const files = await parseFixtureDir(format)
for (const f of files) if (f.error) console.log('ERROR', f.fileName, f.error)
const report = buildReport(files)
for (const w of report.warnings) console.log('WARN', w.month, w.fileName ?? '', w.message)
const expected = JSON.parse(await readFile(join(fixtureDir(format), 'expected.json'), 'utf8'))
for (const [sheet, wells] of Object.entries<Record<string, Record<string, number>>>(expected)) {
  const month = report.months.find((m) => m.month.endsWith(`-${sheet}`))!
  for (const [code, values] of Object.entries(wells)) {
    const row = month.rows.find((r) => r.wellCode === code)
    for (const [col, key] of columns) {
      const want = values[col] ?? 0
      const got = row ? (row[key] as number) / 100 : 0
      if (Math.abs(want - got) > 0.005) console.log('DIFF', sheet, code, col, got, want)
    }
  }
  for (const row of month.rows) {
    if ((row.hasRevenue || row.hasExpenses) && !wells[row.wellCode]) {
      console.log('EXTRA', sheet, row.wellCode)
    }
  }
}
