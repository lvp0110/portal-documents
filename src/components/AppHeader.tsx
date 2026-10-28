type AppHeaderProps = {
  mode: 'local' | 'remote'
  onUpload: () => void
}

export function AppHeader({ mode, onUpload }: AppHeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <path
              d="M8 4.5h11.2L24 9.2V27.5H8v-23Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path d="M19 4.8V9.4H23.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 15h8M12 19h8M12 23h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span>
          <strong>Портал документов</strong>
          <small>Просмотр оригинала и скачивание</small>
        </span>
      </div>
      <div className="topbar-actions">
        <span className="storage-badge">
          {mode === 'local' ? 'Локальное хранилище' : 'Внешний API'}
        </span>
        <button type="button" className="button button-primary" onClick={onUpload} data-testid="upload-open">
          Загрузить PDF
        </button>
      </div>
    </header>
  )
}
