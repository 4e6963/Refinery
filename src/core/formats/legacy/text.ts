import type { PdfPage } from '../../pdf/extract'
import { pagesToText } from '../../pdf/lines'

/** Signed dollar amount, e.g. `$1,234.56`, `-$0.50`. */
export const AMOUNT = String.raw`-?\$[\d,]*\.\d{2}`
/** Signed plain number with two decimals, e.g. `1,943.26`, `-0.35`. */
export const NUMBER = String.raw`-?[\d,]*\.\d{2}`

/** Underline below the column captions, e.g. `---- ----- ------ ...`. */
const COLUMN_RULE = /^\s*-+( +-+){2,}\s*$/
/** Section caption inside the page header, e.g. `-----New Revenue This Statement-----`. */
const SECTION_CAPTION = /^\s*-{5,}[A-Za-z ]+-{5,}\s*$/
const HEADER_MAX_LINES = 20

export interface LegacyText {
  /** Page header lines (title, addresses, dates) of all pages. */
  header: string[]
  /** Body lines of all pages, with repeated page headers removed. */
  body: string[]
}

/**
 * The legacy reports are fixed-width; parsers work on reconstructed text lines.
 * Every page repeats a header block, which would otherwise interrupt records
 * that continue across a page break.
 */
export function legacyText(pages: PdfPage[]): LegacyText {
  const text: LegacyText = { header: [], body: [] }
  for (const lines of pagesToText(pages)) {
    const rule = lines.slice(0, HEADER_MAX_LINES).findIndex((l) => COLUMN_RULE.test(l))
    const header = rule >= 0 ? lines.slice(0, rule + 1) : []
    text.header.push(...header)
    text.body.push(...header.filter((l) => SECTION_CAPTION.test(l)), ...lines.slice(header.length))
  }
  return text
}

/** Report titles are printed with spaced letters, e.g. "R E V E N U E". */
export function spacedTitle(title: string): RegExp {
  const pattern = title
    .split(' ')
    .map((word) => word.split('').join(' '))
    .join(String.raw`\s+`)
  return new RegExp(pattern)
}
