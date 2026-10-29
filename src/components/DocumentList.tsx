import { formatFireHazard } from '../catalogs'
import { formatBytes, formatDate } from '../lib/format'
import type { DocumentMeta } from '../types'

type DocumentListProps = {
  documents: DocumentMeta[]
  totalCount: number
  selectedId: string | null
  query: string
  loading: boolean
  sampleBusy: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  onQueryChange: (value: string) => void
  onSelect: (id: string) => void
  onUpload: () => void
  onAddSample: () => void
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

export function DocumentList({
  documents,
  totalCount,
  selectedId,
  query,
  loading,
  sampleBusy,
  collapsed,
  onToggleCollapsed,
  onQueryChange,
  onSelect,
  onUpload,
  onAddSample,
}: DocumentListProps) {
  const libraryEmpty = !loading && totalCount === 0

  const toggleLabel = collapsed ? 'Показать список' : 'Свернуть список'

  return (
    <section
      className={collapsed ? 'list-pane is-collapsed' : 'list-pane'}
      aria-label="Список документов"
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
              {loading ? 'Загрузка…' : `${documents.length} из ${totalCount}`}
            </p>
            <button
              type="button"
              className="pane-toggle"
              aria-expanded
              aria-controls="document-list"
              title={toggleLabel}
              onClick={onToggleCollapsed}
            >
              <CollapseIcon direction="left" />
              <span className="sr-only">{toggleLabel}</span>
            </button>
          </div>
          <label className="search">
            <span className="sr-only">Поиск по названию</span>
            <input
              type="search"
              value={query}
              placeholder="Поиск по названию"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
        </div>
      )}

      {!collapsed && (libraryEmpty ? (
        <div className="empty-state">
          <h2>Пока нет документов</h2>
          <p>Перетащите PDF в форму. Файл сохранится для выбранного бренда, материалов или для обоих.</p>
          <div className="empty-actions">
            <button type="button" className="button button-primary" onClick={onUpload}>
              Загрузить PDF
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={onAddSample}
              disabled={sampleBusy}
              data-testid="add-sample"
            >
              {sampleBusy ? 'Готовим пример…' : 'Добавить пример'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="doc-list" id="document-list">
          {documents.length === 0 && !loading && (
            <li className="empty-inline">Ничего не найдено. Измените фильтры или поиск.</li>
          )}
          {documents.map((document) => {
            const selected = document.id === selectedId
            const fireHazard = formatFireHazard(document.fireHazard)
            return (
              <li key={document.id}>
                <button
                  type="button"
                  className={selected ? 'doc-card is-selected' : 'doc-card'}
                  onClick={() => onSelect(document.id)}
                  aria-current={selected ? 'true' : undefined}
                >
                  <strong>{document.title}</strong>
                  <span>{[document.brand, ...document.materials].filter(Boolean).join(' · ')}</span>
                  <span>
                    {document.documentType}
                    {fireHazard ? ` · ${fireHazard}` : ''}
                  </span>
                  <small>
                    {formatDate(document.uploadedAt)}
                    {document.expiresAt ? ` · истекает ${formatDate(document.expiresAt)}` : ''}
                    {' · '}
                    {formatBytes(document.size)}
                    {document.pageCount > 0 ? ` · ${document.pageCount} стр.` : ''}
                    {(document.files?.length ?? 0) > 1 ? ` · ${document.files.length} файла` : ''}
                  </small>
                </button>
              </li>
            )
          })}
        </ul>
      ))}
    </section>
  )
}
