import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LocalDocumentsApi } from '../api/localDocumentsApi'
import { catalogsFromDocuments } from '../catalogs'
import { buildSamplePdf } from '../lib/samplePdf'
import { downloadBlob } from '../lib/download'
import { errorMessage } from '../lib/format'
import { matchesDocument } from '../lib/filters'
import { EMPTY_FILTERS, type Catalogs, type DocumentFile, type DocumentFilters, type DocumentMeta, type FileRole, type LocalFilter, type UploadDocumentInput } from '../types'

export function useDocuments() {
  const api = useMemo(() => new LocalDocumentsApi(), [])
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [catalogs, setCatalogs] = useState<Catalogs>(() => catalogsFromDocuments([]))
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS)
  const [localFilters, setLocalFilters] = useState<LocalFilter[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const documentsRef = useRef(documents)
  const customTypesRef = useRef<string[]>([])
  const localFiltersRef = useRef<LocalFilter[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [nextDocuments, types, storedFilters] = await Promise.all([
          api.list(),
          api.savedDocumentTypes(),
          api.localFilters(),
        ])
        if (cancelled) return
        const merged = [...types]
        for (const type of customTypesRef.current) {
          if (!merged.some((item) => item.toLowerCase() === type.toLowerCase())) merged.push(type)
        }
        const filtersMerged = [...storedFilters]
        for (const filter of localFiltersRef.current) {
          if (!filtersMerged.some((item) => item.id === filter.id)) filtersMerged.push(filter)
        }
        documentsRef.current = nextDocuments
        customTypesRef.current = merged
        localFiltersRef.current = filtersMerged
        setDocuments(nextDocuments)
        setLocalFilters(filtersMerged)
        setCatalogs(catalogsFromDocuments(nextDocuments, merged))
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

  useEffect(() => {
    if (!selectedId) return
    if (filtered.some((document) => document.id === selectedId)) return
    setSelectedId(null)
  }, [filtered, selectedId])

  const remember = (created: DocumentMeta) => {
    const next = [created, ...documentsRef.current.filter((document) => document.id !== created.id)]
    documentsRef.current = next
    setDocuments(next)
    setCatalogs(catalogsFromDocuments(next, customTypesRef.current))
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
      const sample = buildSamplePdf()
      remember(await api.upload({
        title: 'Knauf Moisture Board',
        brand: '',
        materials: [],
        constructions: [],
        documentType: 'Технический лист',
        attributes: [],
        expiresAt: null,
        fireHazard: null,
        brandFile: null,
        materialsFile: null,
        constructionsFile: null,
        documentFile: sample,
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
      setCatalogs(catalogsFromDocuments(next, customTypesRef.current))
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
    select: setSelectedId,
    loading,
    uploading,
    sampleBusy,
    downloadingId,
    error,
    dismissError: () => setError(null),
    openFile: useCallback((id: string, role: FileRole) => api.getFile(id, role), [api]),
    upload,
    addDocumentType: async (name: string) => {
      const saved = await api.addDocumentType(name)
      if (!customTypesRef.current.some((item) => item.toLowerCase() === saved.toLowerCase())) {
        customTypesRef.current = [...customTypesRef.current, saved]
      }
      setCatalogs(catalogsFromDocuments(documentsRef.current, customTypesRef.current))
      return saved
    },
    localFilters,
    addFilter: async (name: string) => {
      const saved = await api.addFilter(name)
      const next = localFiltersRef.current.some((item) => item.id === saved.id)
        ? localFiltersRef.current.map((item) => (item.id === saved.id ? saved : item))
        : [...localFiltersRef.current, saved].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      localFiltersRef.current = next
      setLocalFilters(next)
      return saved
    },
    removeFilter: async (id: string) => {
      await api.removeFilter(id)
      const next = localFiltersRef.current.filter((item) => item.id !== id)
      localFiltersRef.current = next
      setLocalFilters(next)
      setFilters((current) => {
        if (!(id in current.attributes)) return current
        const attributes = { ...current.attributes }
        delete attributes[id]
        return { ...current, attributes }
      })
    },
    addFilterValue: async (id: string, value: string) => {
      const saved = await api.addFilterValue(id, value)
      const next = localFiltersRef.current.map((item) => {
        if (item.id !== id) return item
        if (item.values.some((entry) => entry.toLowerCase() === saved.toLowerCase())) return item
        return { ...item, values: [...item.values, saved] }
      })
      localFiltersRef.current = next
      setLocalFilters(next)
      return saved
    },
    addSample,
    download,
    remove,
  }
}
