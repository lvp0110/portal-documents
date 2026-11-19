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

function itemLabel(value: unknown): string {
  return named(value) ?? plain(value).trim()
}

export function isConstructionsField(field: PortalField): boolean {
  const name = field.name.trim().toLocaleLowerCase('ru')
  const code = field.code.trim().toLowerCase()
  return name === 'конструкции' || code === 'constructions' || code === 'construction'
}

export function fieldChipLabels(field: PortalField): string[] {
  if (Array.isArray(field.value)) {
    return field.value.map(itemLabel).filter(Boolean)
  }
  const label = itemLabel(field.value)
  return label ? [label] : []
}
