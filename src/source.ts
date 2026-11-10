import { PORTAL_QUERY_KEYS, type PortalQuery } from './portalTypes'

export type DataSource = 'portal' | 'local'

const SOURCE_KEY = 'documents-portal.source'

function intParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (!raw || !/^\d+$/.test(raw)) return null
  return Number(raw)
}

export function readSource(): DataSource {
  const params = new URLSearchParams(window.location.search)
  const param = params.get('source')
  if (param === 'local' || param === 'portal') return param
  if (PORTAL_QUERY_KEYS.some((key) => params.has(key))) return 'portal'
  try {
    const stored = localStorage.getItem(SOURCE_KEY)
    if (stored === 'local' || stored === 'portal') return stored
  } catch {
    // Предпочтение необязательно, если хранилище недоступно.
  }
  return 'portal'
}

export function readPortalQuery(): PortalQuery {
  const params = new URLSearchParams(window.location.search)
  return {
    globalCategoryId: intParam(params, 'global_category_id'),
    brandId: intParam(params, 'brand_id'),
    modelId: intParam(params, 'model_id'),
    materialId: intParam(params, 'material_id'),
    docType: params.get('doc_type'),
    q: params.get('q') ?? '',
  }
}

export function rememberSource(source: DataSource) {
  try {
    localStorage.setItem(SOURCE_KEY, source)
  } catch {
    // Предпочтение необязательно, если хранилище недоступно.
  }
}

export function writeSourceSearch(source: DataSource) {
  const params = new URLSearchParams(window.location.search)
  params.set('source', source)
  if (source === 'local') {
    for (const key of PORTAL_QUERY_KEYS) params.delete(key)
  }
  const query = params.toString()
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.replaceState(null, '', next)
}

export function writePortalSearch(query: PortalQuery) {
  const params = new URLSearchParams(window.location.search)
  params.set('source', 'portal')
  const entries: [string, string | null][] = [
    ['global_category_id', query.globalCategoryId == null ? null : String(query.globalCategoryId)],
    ['brand_id', query.brandId == null ? null : String(query.brandId)],
    ['model_id', query.modelId == null ? null : String(query.modelId)],
    ['material_id', query.materialId == null ? null : String(query.materialId)],
    ['doc_type', query.docType],
    ['q', query.q.trim() ? query.q.trim() : null],
  ]
  for (const [key, value] of entries) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const text = params.toString()
  window.history.replaceState(null, '', text ? `${window.location.pathname}?${text}` : window.location.pathname)
}
