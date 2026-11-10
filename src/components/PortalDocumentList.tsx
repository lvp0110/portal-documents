import { documentsLabel, filesLabel, formatDate } from '../lib/format'
import type { PortalDocumentSummary, PortalQuery } from '../portalTypes'

type PortalDocumentListProps = {
  documents: PortalDocumentSummary[]
  filters: PortalQuery
  query: string
  selectedId: string | null
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  failed: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onQueryChange: (value: string) => void
  onSelect: (groupId: string) => void
  onLoadMore: () => void
}

function CollapseIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M10 3.5 5.5 8 10 12.5' : 'M6 3.5 10.5 8 6 12.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function isNarrowed(filters: PortalQuery): boolean {
  return filters.globalCategoryId != null
    || filters.brandId != null
    || filters.modelId != null
    || filters.materialId != null
    || Boolean(filters.docType)
    || Boolean(filters.q.trim())
}

export function PortalDocumentList({
  documents,
  filters,
  query,
  selectedId,
  loading,
  loadingMore,
  hasMore,
  failed,
  collapsed,
  onToggleCollapsed,
  onQueryChange,
  onSelect,
  onLoadMore,
}: PortalDocumentListProps) {
  const toggleLabel = collapsed ? 'Показать список' : 'Свернуть список'
  const empty = !loading && documents.length === 0

  return (
    <section
      className={collapsed ? 'list-pane is-collapsed' : 'list-pane'}
      aria-label="Список документов портала"
    >
      {collapsed ? (
        <button
          type="button"
          className="pane-toggle"
          aria-expanded={false}
          title={toggleLabel}
          onClick={onToggleCollapsed}
        >
          <CollapseIcon direction="right" />
          <span className="sr-only">{toggleLabel}</span>
        </button>
      ) : (
        <div className="list-toolbar">
          <div className="list-meta">
            <p className="list-count">
              {loading ? 'Загрузка…' : documentsLabel(documents.length)}
              {!loading && hasMore ? ' · есть ещё' : ''}
            </p>
            <button
              type="button"
              className="pane-toggle"
              aria-expanded
              aria-controls="portal-document-list"
              title={toggleLabel}
              onClick={onToggleCollapsed}
            >
              <CollapseIcon direction="left" />
              <span className="sr-only">{toggleLabel}</span>
            </button>
          </div>
          <label className="search">
            <span className="sr-only">Поиск по документам</span>
            <input
              type="search"
              value={query}
              placeholder="Поиск"
              onChange={(event) => onQueryChange(event.target.value)}
              data-testid="portal-search"
            />
          </label>
        </div>
      )}

      {!collapsed && (empty ? (
        <div className="empty-state">
          <h2>{failed ? 'Список не загрузился' : isNarrowed(filters) ? 'Ничего не найдено' : 'Пока нет документов'}</h2>
          <p>
            {failed
              ? 'Повторите запрос. Если портал недоступен, можно переключиться на локальные файлы.'
              : isNarrowed(filters)
                ? 'Измените фильтры или строку поиска.'
                : 'Здесь появятся опубликованные документы портала.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="doc-list" id="portal-document-list">
            {documents.map((document) => {
              const selected = document.groupId === selectedId
              return (
                <li key={document.groupId}>
                  <button
                    type="button"
                    className={selected ? 'doc-card is-selected' : 'doc-card'}
                    onClick={() => onSelect(document.groupId)}
                    aria-current={selected ? 'true' : undefined}
                  >
                    <strong>{document.title}</strong>
                    <span>{document.documentType.name}</span>
                    <small>
                      {formatDate(document.publishedAt)}
                      {' · '}
                      {filesLabel(document.filesCount)}
                    </small>
                  </button>
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <div className="load-more">
              <button
                type="button"
                className="button button-secondary"
                onClick={onLoadMore}
                disabled={loadingMore}
                data-testid="portal-load-more"
              >
                {loadingMore ? 'Загрузка…' : 'Показать еще'}
              </button>
            </div>
          )}
        </>
      ))}
    </section>
  )
}
