import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { parsePdf } from '../../src/core/analyze'
import type { ParsedFile } from '../../src/core/model'

export const fixtureDir = (format: string) => join('tests', 'fixtures', format)

/** Real statements are kept out of git; integration tests skip when they are missing. */
export function hasFixtures(format: string): boolean {
  return existsSync(join(fixtureDir(format), 'input')) && existsSync(join(fixtureDir(format), 'expected.json'))
}

export async function parseFixture(path: string): Promise<ParsedFile> {
  const data = new Uint8Array(await readFile(path))
  const task = getDocument({ data, verbosity: 0 })
  const doc = await task.promise
  try {
    return await parsePdf(basename(path), doc)
  } finally {
    await task.destroy()
  }
}

export async function parseFixtureDir(format: string, filter: (name: string) => boolean = () => true) {
  const dir = join(fixtureDir(format), 'input')
  const names = (await readdir(dir)).filter((n) => n.endsWith('.pdf') && filter(n)).sort()
  return Promise.all(names.map((n) => parseFixture(join(dir, n))))
}
