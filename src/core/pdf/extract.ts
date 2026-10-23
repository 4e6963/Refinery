/** A positioned piece of text on a PDF page (PDF user space, origin bottom-left). */
export interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

export interface PdfPage {
  pageNumber: number
  items: TextItem[]
}

/**
 * Minimal structural subset of a pdf.js `PDFDocumentProxy`. The concrete pdf.js
 * build is injected by the caller so this module stays free of DOM/worker setup.
 */
export interface PdfDocumentLike {
  numPages: number
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>
    cleanup?(): unknown
  }>
  destroy?(): unknown
}

interface RawTextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

function isRawTextItem(item: unknown): item is RawTextItem {
  return typeof item === 'object' && item !== null && 'str' in item && 'transform' in item
}

export async function extractPages(
  doc: PdfDocumentLike,
  onPage?: (done: number, total: number) => void,
): Promise<PdfPage[]> {
  const pages: PdfPage[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const content = await page.getTextContent()
    const items: TextItem[] = []
    for (const raw of content.items) {
      if (!isRawTextItem(raw) || raw.str.length === 0) continue
      items.push({
        str: raw.str,
        x: raw.transform[4],
        y: raw.transform[5],
        width: raw.width,
        height: raw.height,
      })
    }
    pages.push({ pageNumber: n, items })
    page.cleanup?.()
    onPage?.(n, doc.numPages)
  }
  return pages
}
