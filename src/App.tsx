import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DocumentList } from './components/DocumentList'
import { DocumentViewer } from './components/DocumentViewer'
import { FilterPanel } from './components/FilterPanel'
import { UploadDialog } from './components/UploadDialog'
import { useDocuments } from './hooks/useDocuments'

const LIST_COLLAPSED_KEY = 'documents-portal.list-collapsed'

function readListCollapsed() {
  try {
    return localStorage.getItem(LIST_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const library = useDocuments()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [listCollapsed, setListCollapsed] = useState(readListCollapsed)

  function toggleListCollapsed() {
    setListCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(LIST_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // Preference is optional when storage is unavailable.
      }
      return next
    })
  }

  return (
    <div className="app">
      <AppHeader mode={library.mode} onUpload={() => setUploadOpen(true)} />
      {library.error && (
        <div className="banner" role="alert">
          <span>{library.error}</span>
          <button type="button" onClick={library.dismissError}>Закрыть</button>
        </div>
      )}
      <div className={listCollapsed ? 'workspace is-list-collapsed' : 'workspace'}>
        <FilterPanel
          catalogs={library.catalogs}
          documents={library.documents}
          filters={library.filters}
          onChange={library.setFilters}
        />
        <DocumentList
          documents={library.filtered}
          totalCount={library.documents.length}
          selectedId={library.selected?.id ?? null}
          query={library.filters.query}
          loading={library.loading}
          sampleBusy={library.sampleBusy}
          collapsed={listCollapsed}
          onToggleCollapsed={toggleListCollapsed}
          onQueryChange={(query) => library.setFilters({ ...library.filters, query })}
          onSelect={library.select}
          onUpload={() => setUploadOpen(true)}
          onAddSample={() => void library.addSample()}
        />
        <DocumentViewer
          document={library.selected}
          downloading={library.downloadingId === library.selected?.id}
          onOpenFile={library.openFile}
          onDownload={(document, file) => void library.download(document, file)}
          onDelete={(document) => void library.remove(document)}
        />
      </div>
      <UploadDialog
        open={uploadOpen}
        catalogs={library.catalogs}
        busy={library.uploading}
        onClose={() => {
          if (!library.uploading) setUploadOpen(false)
        }}
        onSubmit={async (input) => {
          await library.upload(input)
          setUploadOpen(false)
        }}
      />
    </div>
  )
}
