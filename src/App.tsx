import { useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { PortalDocumentList } from './components/PortalDocumentList'
import { PortalDocumentViewer } from './components/PortalDocumentViewer'
import { PortalFilterPanel } from './components/PortalFilterPanel'
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
  const portal = usePortalLibrary()
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
      <AppHeader />
      {portal.error && (
        <div className="banner" role="alert">
          <span>{portal.error}</span>
          <button type="button" onClick={portal.retry}>Повторить</button>
        </div>
      )}
      <div className={listCollapsed ? 'workspace is-list-collapsed' : 'workspace'}>
        <PortalFilterPanel
          filters={portal.filters}
          options={portal.options}
          loading={portal.loading}
          onChange={portal.setFilters}
          onReset={portal.resetFilters}
        />
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
        <PortalDocumentViewer
          key={portal.selectedId ?? 'none'}
          summary={portal.selected}
          detail={portal.detail}
          loading={portal.detailLoading}
          error={portal.detailError}
          status={portal.detailStatus}
        />
      </div>
    </div>
  )
}
