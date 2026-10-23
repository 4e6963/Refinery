import type { Report } from '../model'

export function workbookFileName(report: Report): string {
  return `Year End Summary${report.year ? ` ${report.year}` : ''}.xlsx`
}
