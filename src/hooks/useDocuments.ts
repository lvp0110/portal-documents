import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createDocumentsApi } from '../api/documentsApi'
import { catalogsFromDocuments } from '../catalogs'
import { buildSamplePdf } from '../lib/samplePdf'
import { downloadBlob } from '../lib/download'
import { errorMessage } from '../lib/format'
import { matchesDocument } from '../lib/filters'
import { EMPTY_FILTERS, type Catalogs, type DocumentFile, type DocumentFilters, type DocumentMeta, type FileRole, type UploadDocumentInput } from '../types'

export function useDocuments() {
  const api = useMemo(() => createDocumentsApi(), [])
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [catalogs, setCatalogs] = useState<Catalogs>(() => catalogsFromDocuments([]))
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const documentsRef = useRef(documents)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [nextDocuments, nextCatalogs] = await Promise.all([api.list(), api.catalogs()])
        if (cancelled) return
        documentsRef.current = nextDocuments
        setDocuments(nextDocuments)
        setCatalogs(nextCatalogs)
        setError(null)
      } catch (loadError) {
        if (cancelled) return
        setError(errorMessage(loadError, 'Не удалось загрузить документы.'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api])

  const filtered = useMemo(
    () => documents.filter((document) => matchesDocument(document, filters)),
    [documents, filters],
  )

  const selected = documents.find((document) => document.id === selectedId) ?? null
  const selectedHidden = Boolean(selected && !filtered.some((document) => document.id === selected.id))

  const remember = (created: DocumentMeta) => {
    const next = [created, ...documentsRef.current.filter((document) => document.id !== created.id)]
    documentsRef.current = next
    setDocuments(next)
    setCatalogs(catalogsFromDocuments(next))
    setSelectedId(created.id)
    setError(null)
  }

  const upload = async (input: UploadDocumentInput) => {
    setUploading(true)
    try {
      remember(await api.upload(input))
    } finally {
      setUploading(false)
    }
  }

  const addSample = async () => {
    setSampleBusy(true)
    setError(null)
    try {
      remember(await api.upload({
        title: 'Knauf Moisture Board',
        brand: 'Knauf',
        materials: ['Гипсокартон'],
        documentType: 'Технический паспорт',
        expiresAt: null,
        fireHazard: null,
        brandFile: null,
        materialsFile: buildSamplePdf(),
        documentFile: null,
      }))
    } catch (sampleError) {
      setError(errorMessage(sampleError, 'Не удалось добавить пример.'))
    } finally {
      setSampleBusy(false)
    }
  }

  const download = async (document: DocumentMeta, file: DocumentFile) => {
    setDownloadingId(document.id)
    setError(null)
    try {
      const blob = await api.getFile(document.id, file.role)
      const typed = blob.type ? blob : new Blob([blob], { type: file.mimeType })
      downloadBlob(typed, file.fileName)
    } catch (downloadError) {
      setError(errorMessage(downloadError, 'Не удалось скачать файл.'))
    } finally {
      setDownloadingId(null)
    }
  }

  const remove = async (document: DocumentMeta) => {
    setError(null)
    try {
      await api.remove(document.id)
      const next = documentsRef.current.filter((item) => item.id !== document.id)
      documentsRef.current = next
      setDocuments(next)
      setCatalogs(catalogsFromDocuments(next))
      if (selectedId === document.id) setSelectedId(null)
    } catch (removeError) {
      setError(errorMessage(removeError, 'Не удалось удалить документ.'))
    }
  }

  return {
    mode: api.mode,
    documents,
    filtered,
    catalogs,
    filters,
    setFilters,
    selected,
    selectedHidden,
    select: setSelectedId,
    loading,
    uploading,
    sampleBusy,
    downloadingId,
    error,
    dismissError: () => setError(null),
    openFile: useCallback((id: string, role: FileRole) => api.getFile(id, role), [api]),
    upload,
    addSample,
    download,
    remove,
  }
}
