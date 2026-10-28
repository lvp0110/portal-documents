import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DocumentList } from './components/DocumentList'
import { DocumentViewer } from './components/DocumentViewer'
import { FilterPanel } from './components/FilterPanel'
import { UploadDialog } from './components/UploadDialog'
import { useDocuments } from './hooks/useDocuments'

export default function App() {
  const library = useDocuments()
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="app">
      <AppHeader mode={library.mode} onUpload={() => setUploadOpen(true)} />
      {library.error && (
        <div className="banner" role="alert">
          <span>{library.error}</span>
          <button type="button" onClick={library.dismissError}>Закрыть</button>
        </div>
      )}
      <div className="workspace">
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
          onQueryChange={(query) => library.setFilters({ ...library.filters, query })}
          onSelect={library.select}
          onUpload={() => setUploadOpen(true)}
          onAddSample={() => void library.addSample()}
        />
        <DocumentViewer
          document={library.selected}
          hiddenByFilters={library.selectedHidden}
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
