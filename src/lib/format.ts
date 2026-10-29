export function formatBytes(size: number): string {
  if (size < 1024) return `${size} Б`
  if (size < 1024 * 1024) {
    const value = size / 1024
    return `${value.toFixed(value < 10 ? 1 : 0)} КБ`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function calendarDate(value: string): Date | null {
  const match = ISO_DATE.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

export function isIsoDate(value: string): boolean {
  return calendarDate(value) !== null
}

export function formatDate(iso: string): string {
  const date = calendarDate(iso) ?? new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}
