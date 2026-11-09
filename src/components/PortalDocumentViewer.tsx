import { useState } from 'react'
import { resolvePortalUrl } from '../api/portalApi'
import { formatBytes, formatDate } from '../lib/format'
import { formatPortalField } from '../lib/portalFields'
import type { PortalCatalogItem, PortalDocumentDetail, PortalDocumentSummary, PortalFile } from '../portalTypes'

type PortalDocumentViewerProps = {
  summary: PortalDocumentSummary | null
  detail: PortalDocumentDetail | null
  loading: boolean
  error: string | null
  status: number | null
}

function isPdf(file: PortalFile): boolean {
  return file.mimeType === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
}

function CatalogChips({ items, className }: { items: PortalCatalogItem[]; className?: string }) {
  if (items.length === 0) return null
  return items.map((item) => (
    <span className={className ? `chip ${className}` : 'chip'} key={item.id}>{item.name}</span>
  ))
}

export function PortalDocumentViewer({
  summary,
  detail,
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

  const fields = (detail?.fields ?? [])
    .map((field) => ({ field, view: formatPortalField(field) }))
    .filter((item) => item.view.text.trim())

  return (
    <section className="viewer" aria-label="Просмотр документа">
      <header className="viewer-bar">
        <div>
          <h3>{document?.title ?? summary.title}</h3>
          <p>
            {active ? active.filename : 'Нет файла'}
            {active ? ` · ${formatBytes(active.size)}` : ''}
            {' · '}
            {formatDate((document ?? summary).publishedAt)}
          </p>
        </div>
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
        <span className="chip chip-type">{(document ?? summary).documentType.name}</span>
        {detail && (
          <>
            <CatalogChips items={detail.catalog.globalCategories} />
            <CatalogChips items={detail.catalog.brands} className="chip-brand" />
            <CatalogChips items={detail.catalog.models} />
            <CatalogChips items={detail.catalog.materials} className="chip-material" />
          </>
        )}
        {(document ?? summary).verifiedAt && (
          <span className="chip">Проверен {formatDate((document ?? summary).verifiedAt ?? '')}</span>
        )}
      </div>
      {fields.length > 0 && (
        <dl className="field-list">
          {fields.map(({ field, view }) => (
            <div key={field.code}>
              <dt>{field.name}</dt>
              <dd className={view.preserveBreaks ? 'is-pre' : undefined}>{view.text}</dd>
            </div>
          ))}
        </dl>
      )}
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
        <iframe
          key={active.id}
          className="pdf-embed"
          title={active.filename}
          src={resolvePortalUrl(active.viewUrl)}
          data-testid="portal-file-frame"
        />
      )}
      {active && !isPdf(active) && (
        <p className="pdf-status">Этот формат откроется по ссылке «Открыть» или скачается отдельным файлом.</p>
      )}
      {!active && <p className="pdf-status">У документа нет файла для просмотра.</p>}
    </section>
  )
}
