import { describe, expect, it } from 'vitest'
import { extractPages, type TextItem } from '../../src/core/pdf/extract'
import { estimateCharWidth, groupLines, pagesToText, toFixedWidth } from '../../src/core/pdf/lines'

const CHAR = 6
const item = (str: string, col: number, y: number): TextItem => ({
  str,
  x: 20 + col * CHAR,
  y,
  width: str.length * CHAR,
  height: 10,
})

describe('lines', () => {
  const items = [
    item('$1.00', 30, 700.4),
    item('TOTAL', 0, 700),
    item('NEXT', 2, 688),
    item('$2.00', 10, 688.9),
  ]

  it('groups by y and sorts by x', () => {
    const lines = groupLines(items)
    expect(lines.map((l) => l.items.map((i) => i.str))).toEqual([
      ['TOTAL', '$1.00'],
      ['NEXT', '$2.00'],
    ])
  })

  it('rebuilds fixed-width columns', () => {
    expect(estimateCharWidth(items)).toBe(CHAR)
    const [first, second] = groupLines(items)
    expect(toFixedWidth(first, CHAR, 20)).toBe('TOTAL' + ' '.repeat(25) + '$1.00')
    expect(toFixedWidth(second, CHAR, 20)).toBe('  NEXT    $2.00')
  })

  it('keeps a gap between touching items', () => {
    const line = { y: 0, items: [item('ABC', 0, 0), item('DEF', 2, 0)] }
    expect(toFixedWidth(line, CHAR, 20)).toBe('ABC DEF')
  })

  it('converts pages', () => {
    expect(pagesToText([{ pageNumber: 1, items }])).toEqual([
      ['TOTAL' + ' '.repeat(25) + '$1.00', '  NEXT    $2.00'],
    ])
  })
})

describe('extract', () => {
  it('reads positioned items from a pdf.js-like document', async () => {
    const doc = {
      numPages: 2,
      getPage: async (n: number) => ({
        getTextContent: async () => ({
          items: [
            { str: `page ${n}`, transform: [1, 0, 0, 1, 10, 700], width: 36, height: 10 },
            { str: '', transform: [1, 0, 0, 1, 0, 0], width: 0, height: 0 },
            { type: 'beginMarkedContent' },
          ],
        }),
      }),
    }
    const progress: number[] = []
    const pages = await extractPages(doc, (done) => progress.push(done))
    expect(pages).toEqual([
      { pageNumber: 1, items: [{ str: 'page 1', x: 10, y: 700, width: 36, height: 10 }] },
      { pageNumber: 2, items: [{ str: 'page 2', x: 10, y: 700, width: 36, height: 10 }] },
    ])
    expect(progress).toEqual([1, 2])
  })
})
