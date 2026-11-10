import type { DataSource } from '../source'

type AppHeaderProps = {
  source: DataSource
  onSourceChange: (source: DataSource) => void
  onUpload: () => void
}

export function AppHeader({ source, onSourceChange, onUpload }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="33" height="33">
            <path
              d="M16 9.2C13.6 7.6 10.6 6.8 7.5 6.8H5.8v16.2h1.7c3.1 0 6.1.8 8.5 2.4 2.4-1.6 5.4-2.4 8.5-2.4h1.7V6.8H24.5c-3.1 0-6.1.8-8.5 2.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M16 9.2v16.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span>
          <strong>Документы портала</strong>
          <small>{source === 'portal' ? 'Опубликованные документы' : 'Локальные файлы'}</small>
        </span>
      </div>
      <div className="topbar-actions">
        <div className="source-switch" role="tablist" aria-label="Источник документов">
          <button
            type="button"
            role="tab"
            aria-selected={source === 'portal'}
            className={source === 'portal' ? 'is-active' : undefined}
            onClick={() => onSourceChange('portal')}
            data-testid="source-portal"
          >
            Портал
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={source === 'local'}
            className={source === 'local' ? 'is-active' : undefined}
            onClick={() => onSourceChange('local')}
            data-testid="source-local"
          >
            Локальные
          </button>
        </div>
        {source === 'local' && (
          <button type="button" className="button button-primary" onClick={onUpload} data-testid="upload-open">
            Загрузить PDF
          </button>
        )}
      </div>
    </header>
  )
}
