// Debug helper: prints the reconstructed fixed-width text of a PDF.
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { extractPages } from '../src/core/pdf/extract'
import { pagesToText } from '../src/core/pdf/lines'

const [file, from = '1', to = from] = process.argv.slice(2)
const doc = await getDocument({ data: new Uint8Array(await readFile(file)), verbosity: 0 }).promise
const pages = await extractPages(doc)
pagesToText(pages).forEach((lines, i) => {
  if (i + 1 < +from || i + 1 > +to) return
  console.log(`===== page ${i + 1}`)
  for (const l of lines) console.log(l)
})
