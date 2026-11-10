import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { DocumentList } from './components/DocumentList'
import { DocumentViewer } from './components/DocumentViewer'
import { FilterPanel } from './components/FilterPanel'
import { PortalDocumentList } from './components/PortalDocumentList'
import { PortalDocumentViewer } from './components/PortalDocumentViewer'
import { PortalFilterPanel } from './components/PortalFilterPanel'
import { UploadDialog } from './components/UploadDialog'
import { useDataSource } from './hooks/useDataSource'
import { useDocuments } from './hooks/useDocuments'
import { usePortalLibrary } from './hooks/usePortalLibrary'

const LIST_COLLAPSED_KEY = 'documents-portal.list-collapsed'

function readListCollapsed() {
  try {
    return localStorage.getItem(LIST_COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const [source, setSource] = useDataSource()
  const portal = usePortalLibrary(source === 'portal')
  const library = useDocuments()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [listCollapsed, setListCollapsed] = useState(readListCollapsed)
  const portalMode = source === 'portal'
  const error = portalMode ? portal.error : library.error

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
      <AppHeader
        source={source}
        onSourceChange={setSource}
        onUpload={() => setUploadOpen(true)}
      />
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          {portalMode ? (
            <button type="button" onClick={portal.retry}>Повторить</button>
          ) : (
            <button type="button" onClick={library.dismissError}>Закрыть</button>
          )}
        </div>
      )}
      <div className={listCollapsed ? 'workspace is-list-collapsed' : 'workspace'}>
        {portalMode ? (
          <PortalFilterPanel
            filters={portal.filters}
            options={portal.options}
            loading={portal.loading}
            onChange={portal.setFilters}
            onReset={portal.resetFilters}
          />
        ) : (
          <FilterPanel
            catalogs={library.catalogs}
            documents={library.documents}
            filters={library.filters}
            onChange={library.setFilters}
          />
        )}
        {portalMode ? (
          <PortalDocumentList
            documents={portal.items}
            filters={portal.filters}
            query={portal.query}
            selectedId={portal.selectedId}
            loading={portal.loading}
            loadingMore={portal.loadingMore}
            hasMore={portal.hasMore}
            failed={Boolean(portal.error)}
            collapsed={listCollapsed}
            onToggleCollapsed={toggleListCollapsed}
            onQueryChange={portal.setQuery}
            onSelect={portal.select}
            onLoadMore={() => void portal.loadMore()}
          />
        ) : (
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
        )}
        {portalMode ? (
          <PortalDocumentViewer
            key={portal.selectedId ?? 'none'}
            summary={portal.selected}
            detail={portal.detail}
            loading={portal.detailLoading}
            error={portal.detailError}
            status={portal.detailStatus}
          />
        ) : (
          <DocumentViewer
            document={library.selected}
            downloading={library.downloadingId === library.selected?.id}
            onOpenFile={library.openFile}
            onDownload={(document, file) => void library.download(document, file)}
            onDelete={(document) => void library.remove(document)}
          />
        )}
      </div>
      {!portalMode && (
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
      )}
    </div>
  )
}
