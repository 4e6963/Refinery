import type { ParsedFile } from '../core/model'

export type FileStatus = 'queued' | 'reading' | 'done' | 'error'

export interface FileEntry {
  id: number
  file: File
  status: FileStatus
  /** 0..1 while reading. */
  progress: number
  parsed?: ParsedFile
}
