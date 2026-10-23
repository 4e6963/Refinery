// Builds tests/fixtures/<format>/expected.json from a reference workbook.
// Only well codes and numbers are kept (no names), see .gitignore.
import { writeFile } from 'node:fs/promises'
import ExcelJS from 'exceljs'

const [format = 'legacy'] = process.argv.slice(2)
const dir = `tests/fixtures/${format}`
const columns = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(`${dir}/expected.xlsx`)

const months: Record<string, Record<string, Record<string, number>>> = {}
for (const ws of wb.worksheets) {
  if (!/^\d{2}$/.test(ws.name)) continue
  const rows: Record<string, Record<string, number>> = {}
  ws.eachRow((row, n) => {
    if (n < 3) return
    const code = row.getCell('A').value
    if (typeof code !== 'number') return
    const values: Record<string, number> = {}
    for (const c of columns) {
      const v = row.getCell(c).value
      if (typeof v === 'number') values[c] = v
    }
    if (Object.keys(values).length) rows[String(code)] = values
  })
  months[ws.name] = rows
}
await writeFile(`${dir}/expected.json`, JSON.stringify(months, null, 1))
console.log(Object.entries(months).map(([m, r]) => `${m}:${Object.keys(r).length}`).join(' '))
