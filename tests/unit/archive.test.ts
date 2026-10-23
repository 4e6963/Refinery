import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { extractPdfs } from '../../src/core/archive'
import { isPdf, isZip } from '../../src/core/fileTypes'

const pdf = (text: string) => strToU8(`%PDF-1.4 ${text}`)

describe('archive', () => {
  it('recognises file types', () => {
    expect(isPdf('a.PDF')).toBe(true)
    expect(isZip('statements.Zip')).toBe(true)
    expect(isPdf('a.zip')).toBe(false)
  })

  it('extracts PDFs from folders and nested archives', () => {
    const inner = zipSync({ 'nested.pdf': pdf('nested') })
    const archive = zipSync({
      'b.pdf': pdf('b'),
      'year/2025-01 REV.pdf': pdf('rev'),
      'year/notes.txt': strToU8('ignore me'),
      '__MACOSX/year/._2025-01 REV.pdf': strToU8('resource fork'),
      'more.zip': inner,
    })
    const entries = extractPdfs(archive)
    expect(entries.map((e) => e.name)).toEqual(['2025-01 REV.pdf', 'b.pdf', 'nested.pdf'])
    expect(new TextDecoder().decode(entries[0].data)).toBe('%PDF-1.4 rev')
  })

  it('returns nothing for archives without PDFs', () => {
    expect(extractPdfs(zipSync({ 'a.txt': strToU8('x') }))).toEqual([])
  })

  it('rejects files that are not ZIP archives', () => {
    expect(() => extractPdfs(strToU8('not a zip'))).toThrow()
  })
})
