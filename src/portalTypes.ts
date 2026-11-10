export type PortalQuery = {
  globalCategoryId: number | null
  brandId: number | null
  modelId: number | null
  materialId: number | null
  docType: string | null
  q: string
}

export const EMPTY_PORTAL_QUERY: PortalQuery = {
  globalCategoryId: null,
  brandId: null,
  modelId: null,
  materialId: null,
  docType: null,
  q: '',
}

export type PortalFilterOption = {
  id: number
  code: string
  name: string
  documentsCount: number
  filesCount: number
}

export type PortalMaterialFilterOption = PortalFilterOption & {
  modelId?: number
}

export type PortalDocumentTypeOption = {
  code: string
  name: string
  documentsCount: number
  filesCount: number
}

export type PortalFilters = {
  globalCategories: PortalFilterOption[]
  brands: PortalFilterOption[]
  models: PortalFilterOption[]
  materials: PortalMaterialFilterOption[]
  documentTypes: PortalDocumentTypeOption[]
}

export type PortalFile = {
  id: string
  fieldCode: string
  fieldName?: string
  filename: string
  mimeType: string
  size: number
  viewUrl: string
  downloadUrl: string
}

export type PortalDocumentSummary = {
  groupId: string
  title: string
  documentType: { code: string; name: string }
  verifiedAt?: string
  publishedAt: string
  filesCount: number
  files: PortalFile[]
}

export type PortalField = {
  code: string
  name: string
  type: string
  value: unknown
}

export type PortalCatalogItem = {
  id: number
  code: string
  name: string
  modelId?: number
}

export type PortalCatalog = {
  globalCategories: PortalCatalogItem[]
  brands: PortalCatalogItem[]
  models: PortalCatalogItem[]
  materials: PortalCatalogItem[]
}

export type PortalDocumentDetail = PortalDocumentSummary & {
  fields: PortalField[]
  catalog: PortalCatalog
}

export type PortalDocumentsPage = {
  items: PortalDocumentSummary[]
  nextCursor?: string
  hasMore: boolean
}

export const PORTAL_QUERY_KEYS = [
  'global_category_id',
  'brand_id',
  'model_id',
  'material_id',
  'doc_type',
  'q',
] as const
