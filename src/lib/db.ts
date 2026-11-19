import type { DocumentMeta, FileRole, LocalFilter } from '../types'

const DB_NAME = 'documents-portal'
const DB_VERSION = 3

let dbPromise: Promise<IDBDatabase> | null = null

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Ошибка хранилища'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Ошибка хранилища'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Операция хранилища прервана'))
  })
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Локальное хранилище недоступно в этом браузере.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files')
      }
      if (!db.objectStoreNames.contains('documentTypes')) {
        db.createObjectStore('documentTypes', { keyPath: 'name' })
      }
      if (!db.objectStoreNames.contains('filters')) {
        db.createObjectStore('filters', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('Не удалось открыть хранилище'))
  })
}

export function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDb().catch((error: unknown) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

export async function readAllDocuments(): Promise<DocumentMeta[]> {
  const db = await getDb()
  const transaction = db.transaction('documents', 'readonly')
  const rows = await requestToPromise(transaction.objectStore('documents').getAll())
  return rows as DocumentMeta[]
}

export function fileKey(id: string, role: FileRole): string {
  return role === 'document' ? id : `${id}:${role}`
}

export async function readFile(id: string, role: FileRole = 'document'): Promise<Blob | undefined> {
  const db = await getDb()
  const transaction = db.transaction('files', 'readonly')
  return requestToPromise(transaction.objectStore('files').get(fileKey(id, role)))
}

export async function saveDocument(
  meta: DocumentMeta,
  files: { role: FileRole; blob: Blob }[],
): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(['documents', 'files'], 'readwrite')
  const fileStore = transaction.objectStore('files')
  transaction.objectStore('documents').put(meta)
  for (const file of files) fileStore.put(file.blob, fileKey(meta.id, file.role))
  await transactionDone(transaction)
}

export async function readDocumentTypes(): Promise<string[]> {
  const db = await getDb()
  const transaction = db.transaction('documentTypes', 'readonly')
  const rows = await requestToPromise(transaction.objectStore('documentTypes').getAll())
  return (rows as { name?: unknown }[]).flatMap((row) => {
    if (typeof row?.name !== 'string') return []
    const name = row.name.trim()
    return name ? [name] : []
  })
}

export async function saveDocumentType(name: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction('documentTypes', 'readwrite')
  transaction.objectStore('documentTypes').put({ name })
  await transactionDone(transaction)
}

function readFilterRow(value: unknown): LocalFilter | null {
  if (!value || typeof value !== 'object') return null
  const record = value as { id?: unknown; name?: unknown; values?: unknown }
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  if (!id || !name) return null
  const values = Array.isArray(record.values)
    ? record.values.flatMap((item) => (typeof item === 'string' && item.trim() ? [item.trim()] : []))
    : []
  return { id, name, values: [...new Set(values)] }
}

export async function readLocalFilters(): Promise<LocalFilter[]> {
  const db = await getDb()
  const transaction = db.transaction('filters', 'readonly')
  const rows = await requestToPromise(transaction.objectStore('filters').getAll())
  return (rows as unknown[]).flatMap((row) => {
    const filter = readFilterRow(row)
    return filter ? [filter] : []
  })
}

export async function saveLocalFilter(filter: LocalFilter): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction('filters', 'readwrite')
  transaction.objectStore('filters').put(filter)
  await transactionDone(transaction)
}

export async function deleteLocalFilter(id: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction('filters', 'readwrite')
  transaction.objectStore('filters').delete(id)
  await transactionDone(transaction)
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(['documents', 'files'], 'readwrite')
  const fileStore = transaction.objectStore('files')
  transaction.objectStore('documents').delete(id)
  fileStore.delete(id)
  fileStore.delete(fileKey(id, 'brand'))
  fileStore.delete(fileKey(id, 'materials'))
  fileStore.delete(fileKey(id, 'constructions'))
  await transactionDone(transaction)
}
