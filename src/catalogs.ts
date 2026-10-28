import type { Catalogs, DocumentFile, DocumentMeta } from './types'

export const BASE_BRANDS = [
  'Knauf',
  'Ceresit',
  'Weber',
  'Tikkurila',
  'Технониколь',
  'Bergauf',
]

export const BASE_MATERIALS = [
  'Гипсокартон',
  'Штукатурка',
  'Краска',
  'Утеплитель',
  'Плиточный клей',
  'Гидроизоляция',
]

export const BASE_DOCUMENT_TYPES = [
  'Технический паспорт',
  'Инструкция',
  'Сертификат',
  'Спецификация',
  'Каталог',
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
      if (role !== 'brand' && role !== 'materials' && role !== 'document') continue
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

export function readMaterials(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as { materials?: unknown; material?: unknown }
  const source = Array.isArray(record.materials)
    ? record.materials
    : typeof record.material === 'string'
      ? [record.material]
      : []
  const unique: string[] = []
  for (const item of source) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed)
  }
  return unique
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
    materials: mergeOptions(BASE_MATERIALS, documents.flatMap((document) => document.materials)),
    documentTypes: mergeOptions(
      BASE_DOCUMENT_TYPES,
      documents.map((document) => document.documentType),
    ),
  }
}
