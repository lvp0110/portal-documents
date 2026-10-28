import type { Catalogs, DocumentMeta, FileRole, UploadDocumentInput } from '../types'
import { HttpDocumentsApi } from './httpDocumentsApi'
import { LocalDocumentsApi } from './localDocumentsApi'

export type DocumentsApi = {
  readonly mode: 'local' | 'remote'
  list(): Promise<DocumentMeta[]>
  catalogs(): Promise<Catalogs>
  upload(input: UploadDocumentInput): Promise<DocumentMeta>
  getFile(id: string, role?: FileRole): Promise<Blob>
  remove(id: string): Promise<void>
}

export function createDocumentsApi(): DocumentsApi {
  const baseUrl = import.meta.env.VITE_DOCUMENTS_API_URL?.trim()
  if (baseUrl) return new HttpDocumentsApi(baseUrl.replace(/\/$/, ''))
  return new LocalDocumentsApi()
}
