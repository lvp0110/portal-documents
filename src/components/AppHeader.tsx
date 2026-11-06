type AppHeaderProps = {
  onUpload: () => void
}

export function AppHeader({ onUpload }: AppHeaderProps) {
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
          <small>Просмотр оригинала и скачивание</small>
        </span>
      </div>
      <div className="topbar-actions">
        <button type="button" className="button button-primary" onClick={onUpload} data-testid="upload-open">
          Загрузить PDF
        </button>
      </div>
    </header>
  )
}
