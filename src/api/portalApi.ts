import type {
  PortalCatalog,
  PortalCatalogItem,
  PortalDocumentDetail,
  PortalDocumentSummary,
  PortalDocumentsPage,
  PortalField,
  PortalFile,
  PortalFilterOption,
  PortalFilters,
  PortalMaterialFilterOption,
  PortalQuery,
} from '../portalTypes'

export function portalApiBase(): string {
  const explicit = import.meta.env.VITE_PORTAL_API_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return '/api/v2/portal'
}

export function resolvePortalUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const base = portalApiBase()
  if (/^https?:\/\//i.test(base)) {
    const origin = new URL(base).origin
    if (path.startsWith('/')) return `${origin}${path}`
    return `${base}/${path}`
  }
  if (path.startsWith('/')) return path
  return `${base}/${path}`
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export class PortalApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PortalApiError'
    this.status = status
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function queryString(query: PortalQuery, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  if (query.globalCategoryId != null) params.set('global_category_id', String(query.globalCategoryId))
  if (query.brandId != null) params.set('brand_id', String(query.brandId))
  if (query.modelId != null) params.set('model_id', String(query.modelId))
  if (query.materialId != null) params.set('material_id', String(query.materialId))
  if (query.docType) params.set('doc_type', query.docType)
  if (query.q.trim()) params.set('q', query.q.trim())
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value)
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

async function portalError(response: Response, fallback: string): Promise<PortalApiError> {
  let message = ''
  try {
    const payload = asRecord(await response.json())
    message = payload ? asString(payload.error) ?? '' : ''
  } catch {
    // Тело ошибки может быть пустым.
  }
  if (!message) {
    if (response.status === 404) message = fallback
    else if (response.status === 422) message = 'Некорректные параметры запроса.'
    else if (response.status >= 500) message = 'Внутренняя ошибка сервера.'
    else message = `Ошибка API (${response.status}).`
  }
  return new PortalApiError(response.status, message)
}

async function fetchData(path: string, signal: AbortSignal | undefined, notFound: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new Error('Не удалось связаться с порталом.')
  }
  if (!response.ok) throw await portalError(response, notFound)
  const payload = asRecord(await response.json())
  if (!payload || !('data' in payload)) throw new Error('Некорректный ответ API.')
  return payload.data
}

function parseFilterOption(value: unknown): PortalFilterOption | null {
  const record = asRecord(value)
  if (!record) return null
  const id = asNumber(record.id)
  const code = asString(record.code)
  const name = asString(record.name)
  if (id == null || !code || !name) return null
  return {
    id,
    code,
    name,
    documentsCount: asNumber(record.documents_count) ?? 0,
    filesCount: asNumber(record.files_count) ?? 0,
  }
}

function parseMaterialOption(value: unknown): PortalMaterialFilterOption | null {
  const option = parseFilterOption(value)
  if (!option) return null
  const record = asRecord(value)
  const modelId = record ? asNumber(record.model_id) : null
  return modelId == null ? option : { ...option, modelId }
}

function parseOptions(value: unknown): PortalFilterOption[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const option = parseFilterOption(item)
    return option ? [option] : []
  })
}

export function parsePortalFilters(value: unknown): PortalFilters {
  const record = asRecord(value) ?? {}
  const documentTypes = Array.isArray(record.document_types)
    ? record.document_types.flatMap((item) => {
        const entry = asRecord(item)
        if (!entry) return []
        const code = asString(entry.code)
        const name = asString(entry.name)
        if (!code || !name) return []
        return [{
          code,
          name,
          documentsCount: asNumber(entry.documents_count) ?? 0,
          filesCount: asNumber(entry.files_count) ?? 0,
        }]
      })
    : []
  const materials = Array.isArray(record.materials)
    ? record.materials.flatMap((item) => {
        const option = parseMaterialOption(item)
        return option ? [option] : []
      })
    : []
  return {
    globalCategories: parseOptions(record.global_categories),
    brands: parseOptions(record.brands),
    models: parseOptions(record.models),
    materials,
    documentTypes,
  }
}

function parseFile(value: unknown): PortalFile | null {
  const record = asRecord(value)
  if (!record) return null
  const id = asString(record.id)
  const filename = asString(record.filename)
  const viewUrl = asString(record.view_url)
  const downloadUrl = asString(record.download_url)
  const fieldCode = asString(record.field_code)
  if (!id || !filename || !viewUrl || !downloadUrl || !fieldCode) return null
  return {
    id,
    fieldCode,
    fieldName: asString(record.field_name) ?? undefined,
    filename,
    mimeType: asString(record.mime_type) ?? 'application/octet-stream',
    size: asNumber(record.size) ?? 0,
    viewUrl,
    downloadUrl,
  }
}

function parseSummary(value: unknown): PortalDocumentSummary | null {
  const record = asRecord(value)
  if (!record) return null
  const groupId = asString(record.group_id)
  const title = asString(record.title)
  const publishedAt = asString(record.published_at)
  const documentType = asRecord(record.document_type)
  const typeCode = documentType ? asString(documentType.code) : null
  const typeName = documentType ? asString(documentType.name) : null
  if (!groupId || !title || !publishedAt || !typeCode || !typeName) return null
  const files = Array.isArray(record.files)
    ? record.files.flatMap((item) => {
        const file = parseFile(item)
        return file ? [file] : []
      })
    : []
  return {
    groupId,
    title,
    documentType: { code: typeCode, name: typeName },
    verifiedAt: asString(record.verified_at) ?? undefined,
    publishedAt,
    filesCount: asNumber(record.files_count) ?? files.length,
    files,
  }
}

function parseCatalogItems(value: unknown): PortalCatalogItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const record = asRecord(item)
    if (!record) return []
    const id = asNumber(record.id)
    const code = asString(record.code)
    const name = asString(record.name)
    if (id == null || !code || !name) return []
    const modelId = asNumber(record.model_id)
    return [{
      id,
      code,
      name,
      ...(modelId == null ? {} : { modelId }),
    }]
  })
}

function parseCatalog(value: unknown): PortalCatalog {
  const record = asRecord(value) ?? {}
  return {
    globalCategories: parseCatalogItems(record.global_categories),
    brands: parseCatalogItems(record.brands),
    models: parseCatalogItems(record.models),
    materials: parseCatalogItems(record.materials),
  }
}

function parseFields(value: unknown): PortalField[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const record = asRecord(item)
    if (!record) return []
    const code = asString(record.code)
    const name = asString(record.name)
    const type = asString(record.type)
    if (!code || !name || !type) return []
    return [{ code, name, type, value: record.value }]
  })
}

export function parsePortalPage(value: unknown): PortalDocumentsPage {
  const record = asRecord(value)
  if (!record || !Array.isArray(record.items)) {
    throw new Error('Список документов пришёл в неожиданном формате.')
  }
  const pagination = asRecord(record.pagination) ?? {}
  return {
    items: record.items.flatMap((item) => {
      const summary = parseSummary(item)
      return summary ? [summary] : []
    }),
    nextCursor: asString(pagination.next_cursor) ?? undefined,
    hasMore: pagination.has_more === true,
  }
}

export function parsePortalDetail(value: unknown): PortalDocumentDetail {
  const summary = parseSummary(value)
  if (!summary) throw new Error('Документ пришёл в неожиданном формате.')
  const record = asRecord(value) ?? {}
  return {
    ...summary,
    fields: parseFields(record.fields),
    catalog: parseCatalog(record.catalog),
  }
}

export async function fetchPortalFilters(query: PortalQuery, signal?: AbortSignal): Promise<PortalFilters> {
  const data = await fetchData(
    `${portalApiBase()}/filters${queryString(query)}`,
    signal,
    'Фильтры портала недоступны.',
  )
  return parsePortalFilters(data)
}

export async function fetchPortalDocuments(
  query: PortalQuery,
  cursor?: string,
  signal?: AbortSignal,
): Promise<PortalDocumentsPage> {
  const data = await fetchData(
    `${portalApiBase()}/documents${queryString(query, {
      limit: '20',
      sort: 'published_at_desc',
      cursor,
    })}`,
    signal,
    'Список документов портала недоступен.',
  )
  return parsePortalPage(data)
}

export async function fetchPortalDocument(groupId: string, signal?: AbortSignal): Promise<PortalDocumentDetail> {
  const data = await fetchData(
    `${portalApiBase()}/documents/${encodeURIComponent(groupId)}`,
    signal,
    'Документ больше недоступен.',
  )
  return parsePortalDetail(data)
}
