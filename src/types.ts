export type FileRole = 'brand' | 'materials' | 'document'

export type DocumentFile = {
  role: FileRole
  fileName: string
  mimeType: string
  size: number
  pageCount: number
}

export type DocumentMeta = {
  id: string
  title: string
  fileName: string
  mimeType: string
  size: number
  brand: string
  materials: string[]
  documentType: string
  uploadedAt: string
  pageCount: number
  files: DocumentFile[]
}

export type DocumentFilters = {
  brands: string[]
  materials: string[]
  documentTypes: string[]
  query: string
}

export type Catalogs = {
  brands: string[]
  materials: string[]
  documentTypes: string[]
}

export type UploadDocumentInput = {
  title: string
  brand: string
  materials: string[]
  documentType: string
  brandFile: File | null
  materialsFile: File | null
}

export const EMPTY_FILTERS: DocumentFilters = {
  brands: [],
  materials: [],
  documentTypes: [],
  query: '',
}
