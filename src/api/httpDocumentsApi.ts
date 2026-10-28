import { catalogsFromDocuments, mergeOptions, readDocumentFiles, readMaterials, BASE_BRANDS, BASE_MATERIALS, BASE_DOCUMENT_TYPES } from '../catalogs'
import type { Catalogs, DocumentMeta, FileRole, UploadDocumentInput } from '../types'
import type { DocumentsApi } from './documentsApi'
import { prepareUpload } from './prepareUpload'

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('Некорректный ответ API.')
  return value as Record<string, unknown>
}

function asString(record: Record<string, unknown>, field: string): string {
  const value = record[field]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Ответ API не содержит поле «${field}».`)
  }
  return value
}

function asNumber(record: Record<string, unknown>, field: string, fallback = 0): number {
  const value = record[field]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function parseDocument(value: unknown): DocumentMeta {
  const record = asRecord(value)
  return {
    id: asString(record, 'id'),
    title: asString(record, 'title'),
    fileName: asString(record, 'fileName'),
    mimeType: typeof record.mimeType === 'string' ? record.mimeType : 'application/pdf',
    size: asNumber(record, 'size'),
    brand: asString(record, 'brand'),
    materials: readMaterials(record),
    documentType: asString(record, 'documentType'),
    uploadedAt: asString(record, 'uploadedAt'),
    pageCount: asNumber(record, 'pageCount'),
    files: readDocumentFiles(record),
  }
}

async function apiError(response: Response): Promise<Error> {
  try {
    const payload = await response.json() as { message?: unknown }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return new Error(payload.message)
    }
  } catch {
    // Тело ошибки может быть пустым.
  }
  if (response.status === 404) return new Error('Документ не найден.')
  return new Error(`Ошибка API (${response.status}).`)
}

export class HttpDocumentsApi implements DocumentsApi {
  readonly mode = 'remote' as const
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async list(): Promise<DocumentMeta[]> {
    const response = await fetch(`${this.baseUrl}/documents`)
    if (!response.ok) throw await apiError(response)
    const payload = await response.json() as unknown
    if (!Array.isArray(payload)) throw new Error('Список документов пришёл в неожиданном формате.')
    return payload
      .map((item) => parseDocument(item))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async catalogs(): Promise<Catalogs> {
    try {
      const response = await fetch(`${this.baseUrl}/catalogs`)
      if (response.ok) {
        const payload = asRecord(await response.json())
        const strings = (value: unknown) =>
          Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
        return {
          brands: mergeOptions(BASE_BRANDS, strings(payload.brands)),
          materials: mergeOptions(BASE_MATERIALS, strings(payload.materials)),
          documentTypes: mergeOptions(BASE_DOCUMENT_TYPES, strings(payload.documentTypes)),
        }
      }
    } catch {
      // Каталог необязателен: списки соберутся из документов.
    }
    return catalogsFromDocuments(await this.list())
  }

  async upload(input: UploadDocumentInput): Promise<DocumentMeta> {
    const prepared = await prepareUpload(input)
    const form = new FormData()
    form.set('title', prepared.title)
    form.set('brand', prepared.brand)
    for (const material of prepared.materials) form.append('material', material)
    form.set('documentType', prepared.documentType)
    for (const item of prepared.files) {
      const field = item.role === 'brand' ? 'brandFile' : 'materialsFile'
      form.set(field, item.file, item.file.name)
      form.set(`${item.role}PageCount`, String(item.pageCount))
    }

    const response = await fetch(`${this.baseUrl}/documents`, { method: 'POST', body: form })
    if (!response.ok) throw await apiError(response)
    return parseDocument(await response.json())
  }

  async getFile(id: string, role: FileRole = 'document'): Promise<Blob> {
    const query = role === 'document' ? '' : `?role=${role}`
    const response = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}/file${query}`)
    if (!response.ok) throw await apiError(response)
    return response.blob()
  }

  async remove(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw await apiError(response)
  }
}
