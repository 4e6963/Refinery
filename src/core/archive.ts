import { unzipSync } from 'fflate'
import { isPdf, isZip } from './fileTypes'

export interface ArchiveEntry {
  /** File name without folders. */
  name: string
  data: Uint8Array
}

const MAX_DEPTH = 3

/** Extracts all PDFs from a ZIP archive, including PDFs inside nested archives. */
export function extractPdfs(data: Uint8Array, depth = 0): ArchiveEntry[] {
  const files = unzipSync(data, {
    // Skip folders and macOS resource forks before decompressing.
    filter: (f) => !f.name.endsWith('/') && !f.name.split('/').some((p) => p === '__MACOSX' || p.startsWith('._')),
  })
  const pdfs: ArchiveEntry[] = []
  for (const [path, content] of Object.entries(files)) {
    const name = path.split('/').pop()!
    if (isPdf(name)) pdfs.push({ name, data: content })
    else if (isZip(name) && depth < MAX_DEPTH) pdfs.push(...extractPdfs(content, depth + 1))
  }
  return pdfs.sort((a, b) => a.name.localeCompare(b.name))
}
