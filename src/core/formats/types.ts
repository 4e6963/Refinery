import type { PdfPage } from '../pdf/extract'
import type { Statement, StatementKind } from '../model'

/** One supported statement layout. Formats are plug-ins listed in registry.ts. */
export interface StatementFormat {
  id: string
  label: string
  /** Returns the statement kind if this format recognises the document. */
  detect(pages: PdfPage[]): StatementKind | undefined
  parse(pages: PdfPage[], kind: StatementKind): Statement
}
