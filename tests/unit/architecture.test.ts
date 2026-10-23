import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
  )
}

const source = files('src').map((f) => relative('.', f).replaceAll('\\', '/'))

describe('architecture', () => {
  it('references format implementations only through the registry', () => {
    const offenders = source.filter(
      (f) =>
        !f.startsWith('src/core/formats/') &&
        /from ['"][^'"]*formats\/(?!registry|types)[^'"]*['"]/.test(readFileSync(f, 'utf8')),
    )
    expect(offenders).toEqual([])
    const registryImports = readFileSync('src/core/formats/registry.ts', 'utf8').match(/from '\.\/[^']+'/g)
    expect(registryImports).toEqual(["from './types'", "from './legacy'", "from './current'"])
    // Formats must not depend on each other, so each can be removed on its own.
    for (const format of ['legacy', 'current']) {
      const other = format === 'legacy' ? 'current' : 'legacy'
      const offending = source.filter(
        (f) => f.startsWith(`src/core/formats/${format}/`) && readFileSync(f, 'utf8').includes(`/${other}`),
      )
      expect(offending).toEqual([])
    }
  })

  it('keeps core free of browser APIs', () => {
    const browserGlobals = /\b(window|document|navigator|self|localStorage|sessionStorage)\.|\bnew (Blob|FileReader|Worker)\b|\bHTMLElement\b/
    const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    const offenders = source.filter((f) => f.startsWith('src/core/') && browserGlobals.test(code(f)))
    expect(offenders).toEqual([])
  })
})
