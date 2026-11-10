import type { DocumentFilters, DocumentMeta } from '../types'

export type FacetKey = 'brands' | 'materials' | 'constructions' | 'documentTypes'

export function facetValues(document: DocumentMeta, key: FacetKey): string[] {
  if (key === 'materials') return document.materials
  if (key === 'constructions') return document.constructions ?? []
  if (key === 'brands') return [document.brand]
  return [document.documentType]
}

export function matchesDocument(
  document: DocumentMeta,
  filters: DocumentFilters,
  ignore?: FacetKey,
): boolean {
  const query = filters.query.trim().toLowerCase()
  if (query) {
    const haystack = `${document.title} ${document.fileName}`.toLowerCase()
    if (!haystack.includes(query)) return false
  }

  for (const key of ['brands', 'materials', 'constructions', 'documentTypes'] as const) {
    if (key === ignore) continue
    const selected = filters[key]
    if (selected.length === 0) continue
    const values = facetValues(document, key)
    if (!selected.some((item) => values.includes(item))) return false
  }

  return true
}

export function hasActiveFacets(filters: DocumentFilters): boolean {
  return (
    filters.brands.length > 0 ||
    filters.materials.length > 0 ||
    filters.constructions.length > 0 ||
    filters.documentTypes.length > 0
  )
}
