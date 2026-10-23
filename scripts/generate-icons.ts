// Renders public/favicon.svg into the PNG icons required by the web app manifest.
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile('public/favicon.svg', 'utf8')
const browser = await chromium.launch()
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
  )
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true })
  await page.close()
}
await browser.close()
