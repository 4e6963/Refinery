import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import ExcelJS from 'exceljs'
import { strToU8, zipSync } from 'fflate'
import { expect, test, type Page } from '@playwright/test'
import { fixtureDir, hasFixtures } from '../helpers/pdf'

const input = (name: string) => join(fixtureDir('legacy'), 'input', name)
const JANUARY = ['2025-01 REV.pdf', '2025-01 JIB.pdf', '2025-01 AR.pdf'].map(input)

async function upload(page: Page, files: string[]) {
  await page.getByTestId('dropzone').locator('input[type=file]').setInputFiles(files)
  await expect(page.getByTestId('file-list').getByText('✓ read')).toHaveCount(files.length, { timeout: 60_000 })
}

test('shows the empty start page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Refinery' })).toBeVisible()
  await expect(page.getByTestId('dropzone')).toBeVisible()
})

test('reports ZIP archives without PDFs', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('dropzone').locator('input[type=file]').setInputFiles({
    name: 'empty.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'notes.txt': strToU8('no statements here') })),
  })
  await expect(page.getByTestId('archive-error')).toHaveText('empty.zip: no PDF files found')
})

test.describe('with real fixtures', () => {
  test.skip(!hasFixtures('legacy'), 'real statements are not part of the repository')

  test('reads PDFs from a ZIP archive', async ({ page }) => {
    const files: Record<string, Uint8Array> = {}
    for (const path of JANUARY) files[`statements/${basename(path)}`] = new Uint8Array(await readFile(path))
    await page.goto('/')
    await page.getByTestId('dropzone').locator('input[type=file]').setInputFiles({
      name: 'january.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from(zipSync(files)),
    })
    await expect(page.getByTestId('file-list').getByText('✓ read')).toHaveCount(3, { timeout: 60_000 })
    await expect(page.getByTestId('file-list').getByText('january.zip')).toHaveCount(3)
    await expect(page.getByTestId('no-warnings')).toBeVisible()
  })

  test('reads a month and downloads the workbook', async ({ page }) => {
    await page.goto('/')
    await upload(page, JANUARY)
    await expect(page.getByTestId('no-warnings')).toBeVisible()
    await expect(page.getByTestId('preview-table').locator('tbody tr').first()).toBeVisible()

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
    expect(download.suggestedFilename()).toBe('Year End Summary 2025.xlsx')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(await download.path())
    expect(wb.worksheets.map((w) => w.name)).toEqual(['01', 'Total'])
    // Compare every well against the local reference values (not part of the repository).
    const expected: Record<string, Record<string, number>> = JSON.parse(
      await readFile(join(fixtureDir('legacy'), 'expected.json'), 'utf8'),
    )['01']
    const sheet = wb.getWorksheet('01')!
    const differences: string[] = []
    for (const [code, values] of Object.entries(expected)) {
      const row = sheet.getRows(3, sheet.rowCount)!.find((r) => String(r.getCell('A').value) === code)
      for (const col of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
        const got = Number(row?.getCell(col).value ?? 0)
        if (Math.abs(got - (values[col] ?? 0)) > 0.005) differences.push(`${code} ${col}`)
      }
    }
    expect(Object.keys(expected).length).toBeGreaterThan(0)
    expect(differences).toEqual([])
  })

  test('lets the user correct the month of a file', async ({ page }) => {
    await page.goto('/')
    await upload(page, JANUARY.slice(0, 2))
    await page.getByLabel('Month for 2025-01 JIB.pdf').fill('2025-02')
    await expect(page.getByTestId('warnings')).toContainText('JIB statement missing')
    await expect(page.getByRole('tab', { name: /Feb/ })).toBeVisible()
  })

  test('works offline after the first visit', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve))
      }
    })
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Refinery' })).toBeVisible()
    await expect(page.getByText('available offline')).toBeVisible()
    await upload(page, JANUARY.slice(0, 1))
    await context.setOffline(false)
  })
})

test.describe('with real fixtures in the current format', () => {
  test.skip(!hasFixtures('current', false), 'real statements are not part of the repository')

  test('reads all files and downloads the workbook', async ({ page }) => {
    const dir = join(fixtureDir('current'), 'input')
    const files = (await readdir(dir)).filter((f) => f.endsWith('.pdf')).map((f) => join(dir, f))
    await page.goto('/')
    await upload(page, files)
    await expect(page.getByTestId('file-list').getByRole('cell', { name: 'current', exact: true })).toHaveCount(files.length)
    await expect(page.getByTestId('no-warnings')).toBeVisible()
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download').click()])
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(await download.path())
    expect(wb.worksheets.length).toBe(new Set(files.map((f) => basename(f).slice(0, 7))).size + 1)
  })
})
