import { useEffect, useState } from 'react'
import { resolvePortalUrl } from '../api/portalApi'
import { errorMessage, formatBytes, formatDate } from '../lib/format'
import { fieldChipLabels, isConstructionsField } from '../lib/portalFields'
import type { PortalCatalogItem, PortalDocumentDetail, PortalDocumentSummary, PortalFile, PortalQuery } from '../portalTypes'
import { OriginalPdfView } from './OriginalPdfView'

type PortalDocumentViewerProps = {
  summary: PortalDocumentSummary | null
  detail: PortalDocumentDetail | null
  filters: PortalQuery
  loading: boolean
  error: string | null
  status: number | null
}

function isPdf(file: PortalFile): boolean {
  return file.mimeType === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
}

function PortalPdfPreview({ url }: { url: string }) {
  const [file, setFile] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setFile(null)
    setError(null)
    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не удалось открыть файл.')
        const next = await response.blob()
        if (!controller.signal.aborted) setFile(next)
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return
        setError(errorMessage(loadError, 'Не удалось открыть файл.'))
      })
    return () => controller.abort()
  }, [url])

  if (error) return <p className="pdf-status">{error}</p>
  if (!file) return <p className="pdf-status">Открываем оригинал…</p>
  return <OriginalPdfView file={file} />
}

function CatalogChips({ items, selectedId }: { items: PortalCatalogItem[]; selectedId: number | null }) {
  if (items.length === 0) return null
  return items.map((item) => (
    <span className={item.id === selectedId ? 'chip chip-type' : 'chip'} key={item.id}>{item.name}</span>
  ))
}

export function PortalDocumentViewer({
  summary,
  detail,
  filters,
  loading,
  error,
  status,
}: PortalDocumentViewerProps) {
  const document = detail ?? summary
  const files = document?.files ?? []
  const [pickedId, setPickedId] = useState<string | null>(null)
  const active = files.find((file) => file.id === pickedId) ?? files[0] ?? null
  const unavailable = status === 404

  if (!summary) {
    return (
      <section className="viewer viewer-empty">
        <div>
          <h2>Выберите документ</h2>
          <p>Файл откроется здесь. Скачивание заберёт тот же файл с портала.</p>
        </div>
      </section>
    )
  }

  if (unavailable) {
    return (
      <section className="viewer viewer-empty">
        <div>
          <h2>Документ больше недоступен</h2>
          <p>{error ?? 'Его нет в публичном портале.'}</p>
        </div>
      </section>
    )
  }

  const constructions = (detail?.fields ?? [])
    .filter(isConstructionsField)
    .flatMap(fieldChipLabels)

  return (
    <section className="viewer" aria-label="Просмотр документа">
      <header className="viewer-bar">
        <h3>{document?.title ?? summary.title}</h3>
        <div className="viewer-actions">
          {active && (
            <a
              className="button button-primary"
              href={resolvePortalUrl(active.downloadUrl)}
              data-testid="portal-download"
            >
              {`Скачать · ${formatBytes(active.size)}`}
            </a>
          )}
          {active && !isPdf(active) && (
            <a
              className="button button-secondary"
              href={resolvePortalUrl(active.viewUrl)}
              target="_blank"
              rel="noopener"
            >
              Открыть
            </a>
          )}
        </div>
      </header>
      <div className="chip-row">
        <span className={filters.docType === (document ?? summary).documentType.code ? 'chip chip-type' : 'chip'}>
          {(document ?? summary).documentType.name}
        </span>
        {detail && (
          <>
            <CatalogChips items={detail.catalog.globalCategories} selectedId={filters.globalCategoryId} />
            <CatalogChips items={detail.catalog.brands} selectedId={filters.brandId} />
            <CatalogChips items={detail.catalog.models} selectedId={filters.modelId} />
            <CatalogChips items={detail.catalog.materials} selectedId={filters.materialId} />
            {constructions.map((label, index) => (
              <span className="chip" key={`${label}-${index}`}>{label}</span>
            ))}
          </>
        )}
        {(document ?? summary).verifiedAt && (
          <span className="chip">Проверен {formatDate((document ?? summary).verifiedAt ?? '')}</span>
        )}
      </div>
      {loading && !detail && <p className="pdf-status">Открываем карточку…</p>}
      {error && <p className="pdf-status">{error}</p>}
      {files.length > 1 && (
        <div className="file-switch" role="tablist" aria-label="Файлы документа">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              role="tab"
              aria-selected={file.id === active?.id}
              className={file.id === active?.id ? 'is-active' : undefined}
              onClick={() => setPickedId(file.id)}
            >
              {file.fieldName ? `${file.fieldName}: ${file.filename}` : file.filename}
            </button>
          ))}
        </div>
      )}
      {active && isPdf(active) && (
        <PortalPdfPreview key={active.id} url={resolvePortalUrl(active.downloadUrl)} />
      )}
      {active && !isPdf(active) && (
        <p className="pdf-status">Этот формат откроется по ссылке «Открыть» или скачается отдельным файлом.</p>
      )}
      {!active && <p className="pdf-status">У документа нет файла для просмотра.</p>}
    </section>
  )
}
