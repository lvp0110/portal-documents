import type { DocumentFilters, DocumentMeta } from '../types'

export function attributeValues(document: DocumentMeta, filterId: string): string[] {
  return document.attributes?.find((item) => item.filterId === filterId)?.values ?? []
}

export function matchesDocument(
  document: DocumentMeta,
  filters: DocumentFilters,
  ignore?: string,
): boolean {
  const query = filters.query.trim().toLowerCase()
  if (query) {
    const haystack = `${document.title} ${document.fileName}`.toLowerCase()
    if (!haystack.includes(query)) return false
  }

  if (ignore !== 'documentTypes' && filters.documentTypes.length > 0) {
    if (!filters.documentTypes.includes(document.documentType)) return false
  }

  for (const [filterId, selected] of Object.entries(filters.attributes)) {
    if (filterId === ignore || selected.length === 0) continue
    const values = attributeValues(document, filterId)
    if (!selected.some((item) => values.includes(item))) return false
  }

  return true
}

export function hasActiveFacets(filters: DocumentFilters): boolean {
  return (
    filters.documentTypes.length > 0
    || Object.values(filters.attributes).some((selected) => selected.length > 0)
  )
}
