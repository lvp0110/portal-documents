import { formatDate } from './format'
import type { PortalField } from '../portalTypes'

function named(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const name = (value as { name?: unknown }).name
  return typeof name === 'string' && name.trim() ? name : null
}

function plain(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export function formatPortalField(field: PortalField): { text: string; preserveBreaks: boolean } {
  const { type, value } = field
  if (type === 'text' || type === 'text_area' || type === 'quarter') {
    return { text: plain(value), preserveBreaks: type === 'text_area' }
  }
  if (type === 'number') return { text: plain(value), preserveBreaks: false }
  if (type === 'date') {
    return { text: typeof value === 'string' ? formatDate(value) : '', preserveBreaks: false }
  }
  if (type === 'list') return { text: named(value) ?? '', preserveBreaks: false }
  if (type === 'multiple_list' && Array.isArray(value)) {
    return {
      text: value.map((item) => named(item) ?? plain(item)).filter(Boolean).join(', '),
      preserveBreaks: false,
    }
  }
  if (Array.isArray(value)) {
    return {
      text: value.map((item) => named(item) ?? plain(item)).filter(Boolean).join(', '),
      preserveBreaks: false,
    }
  }
  return { text: named(value) ?? plain(value), preserveBreaks: false }
}
