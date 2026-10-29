export type FileRole = 'brand' | 'materials' | 'constructions' | 'document'

export type DocumentFile = {
  role: FileRole
  fileName: string
  mimeType: string
  size: number
  pageCount: number
}

export type FireHazardIndicators = {
  g: string
  v: string
  rp: string
  d: string
  t: string
}

export type DocumentMeta = {
  id: string
  title: string
  fileName: string
  mimeType: string
  size: number
  brand: string
  materials: string[]
  constructions: string[]
  documentType: string
  expiresAt: string | null
  fireHazard: FireHazardIndicators | null
  uploadedAt: string
  pageCount: number
  files: DocumentFile[]
}

export type DocumentFilters = {
  brands: string[]
  materials: string[]
  constructions: string[]
  documentTypes: string[]
  query: string
}

export type Catalogs = {
  brands: string[]
  materials: string[]
  constructions: string[]
  documentTypes: string[]
}

export type UploadDocumentInput = {
  title: string
  brand: string
  materials: string[]
  constructions: string[]
  documentType: string
  expiresAt: string | null
  fireHazard: FireHazardIndicators | null
  brandFile: File | null
  materialsFile: File | null
  constructionsFile: File | null
  documentFile: File | null
}

export const EMPTY_FILTERS: DocumentFilters = {
  brands: [],
  materials: [],
  constructions: [],
  documentTypes: [],
  query: '',
}
