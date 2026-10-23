import type { PdfPage, TextItem } from './extract'

export interface Line {
  y: number
  items: TextItem[]
}

/** Groups text items into visual lines (top to bottom), items sorted left to right. */
export function groupLines(items: TextItem[], yTolerance = 2): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Line[] = []
  for (const item of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - item.y) <= yTolerance) last.items.push(item)
    else lines.push({ y: item.y, items: [item] })
  }
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)
  return lines
}

/** Median advance width of a single character, for monospaced reports. */
export function estimateCharWidth(items: TextItem[]): number {
  const widths = items
    .filter((i) => i.str.trim().length > 0 && i.width > 0)
    .map((i) => i.width / i.str.length)
    .sort((a, b) => a - b)
  if (widths.length === 0) return 1
  return widths[Math.floor(widths.length / 2)]
}

/**
 * Rebuilds a fixed-width text line from item x positions, so that column
 * offsets are stable regardless of how the PDF split the text into items.
 */
export function toFixedWidth(line: Line, charWidth: number, originX = 0): string {
  let out = ''
  for (const item of line.items) {
    const col = Math.max(0, Math.round((item.x - originX) / charWidth))
    if (col > out.length) out += ' '.repeat(col - out.length)
    else if (out.length > 0 && col < out.length && !out.endsWith(' ')) out += ' '
    out += item.str
  }
  return out.replace(/\s+$/, '')
}

/** All lines of a document as fixed-width text, page by page. */
export function pagesToText(pages: PdfPage[]): string[][] {
  const all = pages.flatMap((p) => p.items)
  const charWidth = estimateCharWidth(all)
  const originX = all.length ? Math.min(...all.map((i) => i.x)) : 0
  return pages.map((p) => groupLines(p.items).map((l) => toFixedWidth(l, charWidth, originX)))
}
