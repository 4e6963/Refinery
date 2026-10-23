import * as Comlink from 'comlink'
import { getDocument } from 'pdfjs-dist'
import * as pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs'
import { parsePdf } from '../core/analyze'
import { extractPdfs, type ArchiveEntry } from '../core/archive'
import { buildReport } from '../core/calc/aggregate'
import { buildWorkbook } from '../core/excel/build'
import type { ParsedFile, Report } from '../core/model'

// We already run off the main thread: let pdf.js process documents in this
// worker instead of spawning a nested one (also keeps it simple offline).
;(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker

const api = {
  async parse(
    fileName: string,
    data: ArrayBuffer,
    onProgress?: (done: number, total: number) => void,
  ): Promise<ParsedFile> {
    const task = getDocument({
      data: new Uint8Array(data),
      verbosity: 0,
      disableFontFace: true,
    })
    try {
      const doc = await task.promise
      return await parsePdf(fileName, doc, onProgress)
    } catch (err) {
      return { fileName, error: err instanceof Error ? err.message : String(err) }
    } finally {
      await task.destroy()
    }
  },

  unzip(data: ArrayBuffer): ArchiveEntry[] {
    const entries = extractPdfs(new Uint8Array(data)).map((e) => ({
      name: e.name,
      // Own buffers so they can be transferred without copying.
      data: e.data.byteLength === e.data.buffer.byteLength ? e.data : e.data.slice(),
    }))
    return Comlink.transfer(
      entries,
      entries.map((e) => e.data.buffer as ArrayBuffer),
    )
  },

  buildReport(files: ParsedFile[]): Report {
    return buildReport(files)
  },

  async exportXlsx(report: Report): Promise<Uint8Array> {
    const bytes = await buildWorkbook(report)
    return Comlink.transfer(bytes, [bytes.buffer as ArrayBuffer])
  },
}

export type WorkerApi = typeof api

Comlink.expose(api)
