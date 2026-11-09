import { useEffect, useRef, useState } from 'react'
import {
  PortalApiError,
  fetchPortalDocument,
  fetchPortalDocuments,
  fetchPortalFilters,
  isAbortError,
} from '../api/portalApi'
import { errorMessage } from '../lib/format'
import {
  EMPTY_PORTAL_QUERY,
  type PortalDocumentDetail,
  type PortalDocumentSummary,
  type PortalFilters,
  type PortalQuery,
} from '../portalTypes'
import { readPortalQuery, writePortalSearch } from '../source'

const SEARCH_DELAY = 400

type PageState = {
  key: string
  items: PortalDocumentSummary[]
  nextCursor?: string
  hasMore: boolean
  error: string | null
}

type DetailState = {
  id: string
  detail: PortalDocumentDetail | null
  error: string | null
  status: number | null
}

function queryKey(query: PortalQuery): string {
  return JSON.stringify([
    query.globalCategoryId,
    query.brandId,
    query.modelId,
    query.materialId,
    query.docType,
    query.q,
  ])
}

const EMPTY_PAGE: PageState = {
  key: '',
  items: [],
  hasMore: false,
  error: null,
}

export function usePortalLibrary(enabled: boolean) {
  const [filters, setFilters] = useState<PortalQuery>(readPortalQuery)
  const [query, setQuery] = useState(() => readPortalQuery().q)
  const [options, setOptions] = useState<PortalFilters | null>(null)
  const [page, setPage] = useState<PageState>(EMPTY_PAGE)
  const [reloadToken, setReloadToken] = useState(0)
  const [selection, setSelection] = useState<{ key: string; id: string | null }>({ key: '', id: null })
  const [detailState, setDetailState] = useState<DetailState | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const generation = useRef(0)
  const filterKey = queryKey(filters)
  const pageReady = page.key === filterKey
  const items = pageReady ? page.items : []
  const hasMore = pageReady && page.hasMore && Boolean(page.nextCursor)
  const nextCursor = pageReady ? page.nextCursor : undefined
  const error = pageReady ? page.error : null
  const loading = enabled && !pageReady
  const selectedId = selection.key === filterKey ? selection.id : null

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim()
      setFilters((current) => (current.q === next ? current : { ...current, q: next }))
    }, SEARCH_DELAY)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!enabled) return
    writePortalSearch(filters)
  }, [enabled, filters])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const request = ++generation.current
    const key = filterKey

    void (async () => {
      try {
        const [nextOptions, nextPage] = await Promise.all([
          fetchPortalFilters(filters, controller.signal),
          fetchPortalDocuments(filters, undefined, controller.signal),
        ])
        if (request !== generation.current) return
        setOptions(nextOptions)
        setPage({
          key,
          items: nextPage.items,
          nextCursor: nextPage.nextCursor,
          hasMore: nextPage.hasMore,
          error: null,
        })
        setLoadingMore(false)
      } catch (loadError) {
        if (request !== generation.current || isAbortError(loadError)) return
        setPage({
          key,
          items: [],
          hasMore: false,
          error: errorMessage(loadError, 'Не удалось загрузить документы портала.'),
        })
        setLoadingMore(false)
      }
    })()

    return () => controller.abort()
  }, [enabled, filters, filterKey, reloadToken])

  useEffect(() => {
    if (!enabled || !selectedId) return
    const controller = new AbortController()
    const groupId = selectedId
    void fetchPortalDocument(groupId, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return
        setDetailState({ id: groupId, detail: next, error: null, status: null })
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted || isAbortError(loadError)) return
        setDetailState({
          id: groupId,
          detail: null,
          error: errorMessage(loadError, 'Не удалось открыть документ.'),
          status: loadError instanceof PortalApiError ? loadError.status : null,
        })
      })
    return () => controller.abort()
  }, [enabled, selectedId])

  const loadMore = async () => {
    const cursor = nextCursor
    if (!enabled || !cursor || loading || loadingMore) return
    const request = generation.current
    const key = filterKey
    const queryAtStart = filters
    setLoadingMore(true)
    try {
      const nextPage = await fetchPortalDocuments(queryAtStart, cursor)
      if (request !== generation.current) return
      setPage((current) => {
        if (current.key !== key) return current
        const seen = new Set(current.items.map((item) => item.groupId))
        return {
          key,
          items: [...current.items, ...nextPage.items.filter((item) => !seen.has(item.groupId))],
          nextCursor: nextPage.nextCursor,
          hasMore: nextPage.hasMore,
          error: null,
        }
      })
    } catch (loadError) {
      if (request !== generation.current || isAbortError(loadError)) return
      setPage((current) => (
        current.key === key
          ? { ...current, error: errorMessage(loadError, 'Не удалось загрузить следующую порцию.') }
          : current
      ))
    } finally {
      if (request === generation.current) setLoadingMore(false)
    }
  }

  return {
    filters,
    setFilters,
    query,
    setQuery,
    options,
    items,
    hasMore,
    selectedId,
    select: (id: string) => setSelection({ key: filterKey, id }),
    selected: items.find((item) => item.groupId === selectedId) ?? null,
    detail: detailState?.id === selectedId ? detailState.detail : null,
    loading,
    loadingMore,
    detailLoading: Boolean(selectedId) && detailState?.id !== selectedId,
    error,
    detailError: detailState?.id === selectedId ? detailState.error : null,
    detailStatus: detailState?.id === selectedId ? detailState.status : null,
    loadMore,
    retry: () => {
      setPage(EMPTY_PAGE)
      setReloadToken((current) => current + 1)
    },
    resetFilters: () => setFilters({ ...EMPTY_PORTAL_QUERY, q: filters.q }),
  }
}
