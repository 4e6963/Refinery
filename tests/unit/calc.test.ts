import { describe, expect, it } from 'vitest'
import { formatHundredths, parseHundredths } from '../../src/core/calc/money'
import { addMonths, monthFromFileName, monthFromUsDate } from '../../src/core/calc/month'

describe('money', () => {
  it.each([
    ['$1,234.56', 123456],
    ['-$0.50', -50],
    ['1,943.26', 194326],
    ['-0.35', -35],
    ['$1409,574.21', 140957421],
    ['$0.00', 0],
    ['(12.30)', -1230],
    ['$5', 500],
  ])('parses %s', (text, value) => {
    expect(parseHundredths(text)).toBe(value)
  })

  it('rejects garbage and excess precision', () => {
    expect(() => parseHundredths('abc')).toThrow()
    expect(() => parseHundredths('0.1761718156')).toThrow()
  })

  it('formats', () => {
    expect(formatHundredths(-123456)).toBe('-1,234.56')
  })
})

describe('month', () => {
  it('reads file names', () => {
    expect(monthFromFileName('2025-01 REV.pdf')).toBe('2025-01')
    expect(monthFromFileName('statement 2024_12.pdf')).toBe('2024-12')
    expect(monthFromFileName('REV.pdf')).toBeUndefined()
    expect(monthFromFileName('2025-13 REV.pdf')).toBeUndefined()
  })

  it('reads US dates and shifts months', () => {
    expect(monthFromUsDate('01/10/25')).toBe('2025-01')
    expect(addMonths('2024-11', 2)).toBe('2025-01')
    expect(addMonths('2025-01', -1)).toBe('2024-12')
  })
})
