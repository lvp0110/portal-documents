import { BASE_MATERIALS } from './baseMaterials'
import { isIsoDate } from './lib/format'
import type { Catalogs, DocumentFile, DocumentMeta, FireHazardIndicators } from './types'

export type { BaseMaterial } from './baseMaterials'
export { BASE_MATERIALS } from './baseMaterials'

export const CERTIFICATE_DOCUMENT_TYPE = 'Сертификат'
export const ENGINEERING_ALBUM_DOCUMENT_TYPE = 'Альбомы инжененрных решений'

export function isCertificateType(value: string): boolean {
  return value.trim() === CERTIFICATE_DOCUMENT_TYPE
}

export function isEngineeringAlbumType(value: string): boolean {
  return value.trim() === ENGINEERING_ALBUM_DOCUMENT_TYPE
}

export const BASE_BRANDS = [
  'Бонакустик (Bonacoustic)',
  'Саундборд',
  'Саундлюкс',
  'Флексакустик (Flexakustik) Studio',
  'Декустик (Decoustic)',
  'Флексакустик (Flexakustik) Studio Line (Decoustic Flex)',
  'Акуфон НГ',
  'Акуфон Скай',
  'Акуфон Пролайн',
  'Саундлайн-Акустика НГ',
  'Саундлайн-Акустика',
  'Ультраспрей',
  'Sonaspray',
  'Ecophon',
  'Флексакустик (Flexakustik)',
  'Heradesign',
  'CARA',
  'CUBE',
  'Sonacoustic',
  'Decor Acoustic',
]

for (const item of BASE_MATERIALS) {
  if (item.brand && !BASE_BRANDS.includes(item.brand)) {
    throw new Error(`Материал «${item.name}» связан с неизвестным брендом «${item.brand}».`)
  }
}

const materialBrandByName = new Map(BASE_MATERIALS.map((item) => [item.name, item.brand]))

export function baseMaterialNames(): string[] {
  return BASE_MATERIALS.map((item) => item.name)
}

export function materialBrand(name: string): string | null {
  return materialBrandByName.get(name) ?? null
}

export function materialsForBrand(brand: string, names: readonly string[]): string[] {
  const selected = brand.trim()
  return names.filter((name) => {
    const linked = materialBrand(name)
    if (!linked) return true
    return linked === selected
  })
}

export function materialsForBrands(
  brands: readonly string[],
  names: readonly string[],
  pinned: readonly string[] = [],
): string[] {
  const selected = new Set(brands.map((item) => item.trim()).filter(Boolean))
  if (selected.size === 0) return [...names]
  const keep = new Set(pinned)
  return names.filter((name) => {
    if (keep.has(name)) return true
    const linked = materialBrand(name)
    return !linked || selected.has(linked)
  })
}

export const BASE_CONSTRUCTIONS = [
  'Конструкция 1',
  'Конструкция 2',
  'Конструкция 3',
  'Конструкция 4',
  'Конструкция 5',
]

export const BASE_DOCUMENT_TYPES = [
  ENGINEERING_ALBUM_DOCUMENT_TYPE,
  'Технический лист',
  'Инструкция по монтажу',
  CERTIFICATE_DOCUMENT_TYPE,
  'Технологические карты',
  'Брошюры',
  'Протокол акустических испытаний',

]

export const MAX_PDF_BYTES = 32 * 1024 * 1024

export function readDocumentFiles(value: unknown): DocumentFile[] {
  if (!value || typeof value !== 'object') return []
  const record = value as {
    files?: unknown
    fileName?: unknown
    mimeType?: unknown
    size?: unknown
    pageCount?: unknown
  }
  if (Array.isArray(record.files)) {
    const parsed: DocumentFile[] = []
    for (const item of record.files) {
      if (!item || typeof item !== 'object') continue
      const file = item as Record<string, unknown>
      const role = file.role
      if (role !== 'brand' && role !== 'materials' && role !== 'constructions' && role !== 'document') continue
      if (typeof file.fileName !== 'string' || !file.fileName.trim()) continue
      parsed.push({
        role,
        fileName: file.fileName,
        mimeType: typeof file.mimeType === 'string' ? file.mimeType : 'application/pdf',
        size: typeof file.size === 'number' ? file.size : 0,
        pageCount: typeof file.pageCount === 'number' ? file.pageCount : 0,
      })
    }
    if (parsed.length > 0) return parsed
  }
  if (typeof record.fileName === 'string' && record.fileName.trim()) {
    return [{
      role: 'document',
      fileName: record.fileName,
      mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/pdf',
      size: typeof record.size === 'number' ? record.size : 0,
      pageCount: typeof record.pageCount === 'number' ? record.pageCount : 0,
    }]
  }
  return []
}

const FIRE_HAZARD_LIMIT = 3

function readHazardCode(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, FIRE_HAZARD_LIMIT)
}

export function normalizeFireHazard(value: FireHazardIndicators | null | undefined): FireHazardIndicators | null {
  if (!value) return null
  const next = {
    g: readHazardCode(value.g),
    v: readHazardCode(value.v),
    rp: readHazardCode(value.rp),
    d: readHazardCode(value.d),
    t: readHazardCode(value.t),
  }
  if (!next.g && !next.v && !next.rp && !next.d && !next.t) return null
  return next
}

export function formatFireHazard(value: FireHazardIndicators | null): string {
  if (!value) return ''
  return [value.g, value.v, value.rp, value.d, value.t].filter(Boolean).join(' · ')
}

export function readFireHazard(value: unknown): FireHazardIndicators | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const nested = record.fireHazard
  if (nested && typeof nested === 'object') {
    const item = nested as Record<string, unknown>
    return normalizeFireHazard({
      g: readHazardCode(item.g),
      v: readHazardCode(item.v),
      rp: readHazardCode(item.rp),
      d: readHazardCode(item.d),
      t: readHazardCode(item.t),
    })
  }
  return normalizeFireHazard({
    g: readHazardCode(record.fireHazardG),
    v: readHazardCode(record.fireHazardV),
    rp: readHazardCode(record.fireHazardRp),
    d: readHazardCode(record.fireHazardD),
    t: readHazardCode(record.fireHazardT),
  })
}

export function readExpiresAt(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const raw = (value as { expiresAt?: unknown }).expiresAt
  if (typeof raw !== 'string') return null
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim())
  if (!match || !isIsoDate(match[1])) return null
  return match[1]
}

function uniqueStrings(source: unknown[]): string[] {
  const unique: string[] = []
  for (const item of source) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed)
  }
  return unique
}

export function readMaterials(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as { materials?: unknown; material?: unknown }
  const source = Array.isArray(record.materials)
    ? record.materials
    : typeof record.material === 'string'
      ? [record.material]
      : []
  return uniqueStrings(source)
}

export function readConstructions(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as { constructions?: unknown; construction?: unknown }
  const source = Array.isArray(record.constructions)
    ? record.constructions
    : typeof record.construction === 'string'
      ? [record.construction]
      : []
  return uniqueStrings(source)
}

export function mergeOptions(defaults: string[], values: string[]): string[] {
  const unique = new Set<string>()
  for (const value of [...defaults, ...values]) {
    const trimmed = value.trim()
    if (trimmed) unique.add(trimmed)
  }
  return [...unique].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function catalogsFromDocuments(documents: DocumentMeta[]): Catalogs {
  return {
    brands: mergeOptions(BASE_BRANDS, documents.map((document) => document.brand)),
    materials: mergeOptions(baseMaterialNames(), documents.flatMap((document) => document.materials)),
    constructions: mergeOptions(
      BASE_CONSTRUCTIONS,
      documents.flatMap((document) => document.constructions ?? []),
    ),
    documentTypes: mergeOptions(
      BASE_DOCUMENT_TYPES,
      documents.map((document) => document.documentType),
    ),
  }
}
