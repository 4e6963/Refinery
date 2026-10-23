/**
 * Amounts and volumes are stored as integer hundredths to avoid floating
 * point drift when summing thousands of statement lines.
 */

/** Parses "$1,234.56", "-$0.50", "1,943.26" or "-0.35" into hundredths. */
export function parseHundredths(text: string): number {
  const cleaned = text.replace(/[$,\s*]/g, '')
  const negative = cleaned.startsWith('-') || /^\(.*\)$/.test(cleaned)
  const digits = cleaned.replace(/[-()]/g, '')
  if (!/^\d*\.?\d*$/.test(digits) || digits === '' || digits === '.') {
    throw new Error(`Not a number: "${text}"`)
  }
  const [whole, frac = ''] = digits.split('.')
  if (frac.length > 2) throw new Error(`More than two decimals: "${text}"`)
  const value = Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'))
  return negative ? -value : value
}

export function toNumber(hundredths: number): number {
  return hundredths / 100
}

export function formatHundredths(hundredths: number): string {
  return (hundredths / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function sum(values: Iterable<number>): number {
  let total = 0
  for (const v of values) total += v
  return total
}
