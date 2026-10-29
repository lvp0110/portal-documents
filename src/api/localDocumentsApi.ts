import { catalogsFromDocuments, readDocumentFiles, readExpiresAt, readFireHazard, readMaterials } from '../catalogs'
import { deleteDocument, readAllDocuments, readFile, saveDocument } from '../lib/db'
import type { Catalogs, DocumentMeta, UploadDocumentInput } from '../types'
import type { DocumentsApi } from './documentsApi'
import { prepareUpload, storedFiles } from './prepareUpload'

export class LocalDocumentsApi implements DocumentsApi {
  readonly mode = 'local' as const

  async list(): Promise<DocumentMeta[]> {
    const documents = (await readAllDocuments()).map((document) => ({
      ...document,
      materials: readMaterials(document),
      files: readDocumentFiles(document),
      expiresAt: readExpiresAt(document),
      fireHazard: readFireHazard(document),
    }))
    return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async catalogs(): Promise<Catalogs> {
    return catalogsFromDocuments(await this.list())
  }

  async upload(input: UploadDocumentInput): Promise<DocumentMeta> {
    const prepared = await prepareUpload(input)
    const files = storedFiles(prepared.files)
    const meta: DocumentMeta = {
      id: crypto.randomUUID(),
      title: prepared.title,
      fileName: files.map((file) => file.fileName).join(', '),
      mimeType: files[0].mimeType,
      size: files.reduce((sum, file) => sum + file.size, 0),
      brand: prepared.brand,
      materials: prepared.materials,
      documentType: prepared.documentType,
      expiresAt: prepared.expiresAt,
      fireHazard: prepared.fireHazard,
      uploadedAt: new Date().toISOString(),
      pageCount: files.reduce((sum, file) => sum + file.pageCount, 0),
      files,
    }
    await saveDocument(meta, prepared.files.map((file) => ({ role: file.role, blob: file.file })))
    return meta
  }

  async getFile(id: string, role: DocumentMeta['files'][number]['role'] = 'document'): Promise<Blob> {
    const file = await readFile(id, role)
    if (!file) throw new Error('Файл не найден в локальном хранилище.')
    return file
  }

  async remove(id: string): Promise<void> {
    await deleteDocument(id)
  }
}
