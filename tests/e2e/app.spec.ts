import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { expect, test, type Page } from '@playwright/test'
import { fixtureDir, hasFixtures } from '../helpers/pdf'

const input = (name: string) => join(fixtureDir('legacy'), 'input', name)
const JANUARY = ['2025-01 REV.pdf', '2025-01 JIB.pdf', '2025-01 AR.pdf'].map(input)

async function upload(page: Page, files: string[]) {
  await page.getByTestId('dropzone').locator('input[type=file]').setInputFiles(files)
  await expect(page.getByTestId('file-list').getByText('✓ gelesen')).toHaveCount(files.length, { timeout: 60_000 })
}

test('shows the empty start page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Refinery' })).toBeVisible()
  await expect(page.getByTestId('dropzone')).toBeVisible()
})

test.describe('with real fixtures', () => {
  test.skip(!hasFixtures('legacy'), 'real statements are not part of the repository')

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
    const sheet = wb.getWorksheet('01')!
    const row = sheet.getRows(3, sheet.rowCount)!.find((r) => r.getCell('A').value === 100020000)!
    expect(row.getCell('F').value).toBe(52.22)
    expect(row.getCell('G').value).toBe(3838.45)
    expect(row.getCell('J').value).toBe(441.94)
  })

  test('lets the user correct the month of a file', async ({ page }) => {
    await page.goto('/')
    await upload(page, JANUARY.slice(0, 2))
    await page.getByLabel('Monat für 2025-01 JIB.pdf').fill('2025-02')
    await expect(page.getByTestId('warnings')).toContainText('JIB-Abrechnung fehlt')
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
    await expect(page.getByText('offline verfügbar')).toBeVisible()
    await upload(page, JANUARY.slice(0, 1))
    await context.setOffline(false)
  })
})
