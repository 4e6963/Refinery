import type { ParsedFile } from './model'
import type { PdfDocumentLike } from './pdf/extract'
import { extractPages } from './pdf/extract'
import { formats } from './formats/registry'
import { monthFromFileName } from './calc/month'

/** Detects the format of one PDF and parses it into a statement. Never throws. */
export async function parsePdf(
  fileName: string,
  doc: PdfDocumentLike,
  onPage?: (done: number, total: number) => void,
): Promise<ParsedFile> {
  const result: ParsedFile = { fileName }
  try {
    const pages = await extractPages(doc, onPage)
    for (const format of formats) {
      const kind = format.detect(pages)
      if (!kind) continue
      const statement = format.parse(pages, kind)
      const fileMonth = monthFromFileName(fileName)
      return {
        fileName,
        formatId: format.id,
        kind,
        statement,
        month: fileMonth ?? statement.statementMonth,
        monthSource: fileMonth ? 'filename' : statement.statementMonth ? 'content' : undefined,
      }
    }
    result.error = 'Unknown document format'
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }
  return result
}
