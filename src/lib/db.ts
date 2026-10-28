import type { DocumentMeta, FileRole } from '../types'

const DB_NAME = 'documents-portal'
const DB_VERSION = 1

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
    }
    request.onsuccess = () => resolve(request.result)
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

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb()
  const transaction = db.transaction(['documents', 'files'], 'readwrite')
  const fileStore = transaction.objectStore('files')
  transaction.objectStore('documents').delete(id)
  fileStore.delete(id)
  fileStore.delete(fileKey(id, 'brand'))
  fileStore.delete(fileKey(id, 'materials'))
  await transactionDone(transaction)
}
