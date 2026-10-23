import type { StatementFormat } from './types'
import { legacyFormat } from './legacy'

/** All supported statement formats. Formats are only ever referenced through this list. */
export const formats: readonly StatementFormat[] = [legacyFormat]
