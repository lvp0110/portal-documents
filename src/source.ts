import type { PortalQuery } from './portalTypes'

function intParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (!raw || !/^\d+$/.test(raw)) return null
  return Number(raw)
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

export function writePortalSearch(query: PortalQuery) {
  const params = new URLSearchParams(window.location.search)
  params.delete('source')
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
