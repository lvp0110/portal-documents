import { useEffect, useState } from 'react'
import { formatFireHazard } from '../catalogs'
import { errorMessage, formatBytes, formatDate } from '../lib/format'
import type { DocumentMeta, FileRole } from '../types'
import { OriginalPdfView } from './OriginalPdfView'

function fileRoleLabel(role: FileRole): string {
  if (role === 'brand') return 'Файл бренда'
  if (role === 'materials') return 'Файл материалов'
  if (role === 'constructions') return 'Файл конструкций'
  return 'Оригинал'
}

type DocumentViewerProps = {
  document: DocumentMeta | null
  hiddenByFilters: boolean
  downloading: boolean
  onOpenFile: (id: string, role: FileRole) => Promise<Blob>
  onDownload: (document: DocumentMeta, file: DocumentMeta['files'][number]) => void
  onDelete: (document: DocumentMeta) => void
}

export function DocumentViewer({
  document,
  hiddenByFilters,
  downloading,
  onOpenFile,
  onDownload,
  onDelete,
}: DocumentViewerProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const confirmingDelete = document !== null && confirmingId === document.id
  const files = document?.files ?? []
  const activeFile = files[0]
  const requestKey = document && activeFile ? `${document.id}:${activeFile.role}` : null
  const [opened, setOpened] = useState<{ key: string; file: Blob } | null>(null)
  const [openError, setOpenError] = useState<{ key: string; message: string } | null>(null)

  useEffect(() => {
    if (!document || !activeFile || !requestKey) return
    let cancelled = false
    const role = activeFile.role
    void onOpenFile(document.id, role)
      .then((file) => {
        if (!cancelled) {
          setOpened({ key: requestKey, file })
          setOpenError(null)
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setOpenError({
            key: requestKey,
            message: errorMessage(loadError, 'Не удалось открыть документ.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [document, activeFile, requestKey, onOpenFile])

  const file = opened?.key === requestKey ? opened.file : null
  const visibleError = openError?.key === requestKey ? openError.message : null

  if (!document) {
    return (
      <section className="viewer viewer-empty">
        <div>
          <h2>Выберите документ</h2>
          <p>Здесь откроется сам файл, страница за страницей. Скачивание отдаст тот же PDF.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="viewer" aria-label="Просмотр документа">
      <header className="viewer-bar">
        <div>
          <h3>{document.title}</h3>
          <p>
            {activeFile ? activeFile.fileName : document.fileName}
            {' · '}
            {formatBytes(activeFile?.size ?? document.size)}
            {' · '}
            {formatDate(document.uploadedAt)}
            {(activeFile?.pageCount ?? 0) > 0 ? ` · ${activeFile?.pageCount} стр.` : ''}
          </p>
          {hiddenByFilters && <p className="viewer-hint">Документ не попадает в текущий список.</p>}
        </div>
        <div className="viewer-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => activeFile && onDownload(document, activeFile)}
            disabled={downloading || !activeFile}
            data-testid="download-original"
          >
            {downloading
              ? 'Скачивание…'
              : `Скачать ${activeFile ? fileRoleLabel(activeFile.role).toLowerCase() : 'файл'} · ${formatBytes(activeFile?.size ?? document.size)}`}
          </button>
          {confirmingDelete ? (
            <>
              <button type="button" className="button button-danger" onClick={() => onDelete(document)}>
                Подтвердить удаление
              </button>
              <button type="button" className="button button-secondary" onClick={() => setConfirmingId(null)}>
                Отмена
              </button>
            </>
          ) : (
            <button type="button" className="button button-secondary" onClick={() => setConfirmingId(document.id)}>
              Удалить
            </button>
          )}
        </div>
      </header>
      <div className="chip-row">
        <span className="chip chip-type">{document.documentType}</span>
        {document.brand && <span className="chip chip-brand">{document.brand}</span>}
        {document.materials.map((material) => (
          <span className="chip chip-material" key={material}>{material}</span>
        ))}
        {document.constructions.map((construction) => (
          <span className="chip" key={construction}>{construction}</span>
        ))}
        {document.expiresAt && <span className="chip">Истекает {formatDate(document.expiresAt)}</span>}
        {formatFireHazard(document.fireHazard) && (
          <span className="chip">{formatFireHazard(document.fireHazard)}</span>
        )}
      </div>
      {visibleError && <p className="pdf-status">{visibleError}</p>}
      {!visibleError && !file && <p className="pdf-status">Открываем оригинал…</p>}
      {file && activeFile && <OriginalPdfView key={`${document.id}:${activeFile.role}`} file={file} />}
    </section>
  )
}
