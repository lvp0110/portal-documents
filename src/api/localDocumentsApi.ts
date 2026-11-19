import { BASE_DOCUMENT_TYPES, catalogsFromDocuments, readAttributes, readConstructions, readDocumentFiles, readExpiresAt, readFireHazard, readMaterials } from '../catalogs'
import { deleteDocument, deleteLocalFilter, readAllDocuments, readDocumentTypes, readFile, readLocalFilters, saveDocument, saveDocumentType, saveLocalFilter } from '../lib/db'
import type { Catalogs, DocumentMeta, LocalFilter, UploadDocumentInput } from '../types'
import type { DocumentsApi } from './documentsApi'
import { prepareUpload, storedFiles } from './prepareUpload'

export class LocalDocumentsApi implements DocumentsApi {
  readonly mode = 'local' as const

  async list(): Promise<DocumentMeta[]> {
    const documents = (await readAllDocuments()).map((document) => ({
      ...document,
      materials: readMaterials(document),
      constructions: readConstructions(document),
      attributes: readAttributes(document),
      files: readDocumentFiles(document),
      expiresAt: readExpiresAt(document),
      fireHazard: readFireHazard(document),
    }))
    return documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async savedDocumentTypes(): Promise<string[]> {
    return readDocumentTypes()
  }

  async catalogs(): Promise<Catalogs> {
    const [documents, types] = await Promise.all([this.list(), readDocumentTypes()])
    return catalogsFromDocuments(documents, types)
  }

  async addDocumentType(name: string): Promise<string> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Укажите тип документа.')
    const documents = await this.list()
    const known = [
      ...BASE_DOCUMENT_TYPES,
      ...documents.map((document) => document.documentType),
      ...await readDocumentTypes(),
    ]
    const existing = known.find((item) => item.trim().toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing.trim()
    await saveDocumentType(trimmed)
    return trimmed
  }

  async localFilters(): Promise<LocalFilter[]> {
    const filters = await readLocalFilters()
    return filters.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }

  async addFilter(name: string): Promise<LocalFilter> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Укажите название фильтра.')
    const filters = await readLocalFilters()
    const existing = filters.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const filter: LocalFilter = { id: crypto.randomUUID(), name: trimmed, values: [] }
    await saveLocalFilter(filter)
    return filter
  }

  async removeFilter(id: string): Promise<void> {
    await deleteLocalFilter(id)
  }

  async addFilterValue(id: string, value: string): Promise<string> {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('Укажите значение фильтра.')
    const filters = await readLocalFilters()
    const filter = filters.find((item) => item.id === id)
    if (!filter) throw new Error('Фильтр не найден.')
    const existing = filter.values.find((item) => item.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    await saveLocalFilter({ ...filter, values: [...filter.values, trimmed] })
    return trimmed
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
      constructions: prepared.constructions,
      documentType: prepared.documentType,
      attributes: prepared.attributes,
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
