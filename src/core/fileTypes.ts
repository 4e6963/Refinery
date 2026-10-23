export function isZip(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.zip')
}

export function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf')
}
