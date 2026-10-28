import { useEffect, useRef, useState } from 'react'
import { getDocument } from '../lib/pdfjs'

type LoadedPdf = Awaited<ReturnType<typeof getDocument>['promise']>

function previewError(error: unknown): string {
  if (error instanceof Error && error.name === 'RenderingCancelledException') return ''
  if (error instanceof Error && error.name === 'PasswordException') {
    return 'PDF защищён паролем и не может быть показан.'
  }
  if (error instanceof Error && error.name === 'InvalidPDFException') {
    return 'Файл не похож на корректный PDF.'
  }
  return 'Не удалось открыть документ.'
}

export function OriginalPdfView({ file }: { file: Blob }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<LoadedPdf | null>(null)
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([])
  const [pageCount, setPageCount] = useState(0)
  const [width, setWidth] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0)
      setWidth((current) => (current === next ? current : next))
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    let loadingTask: ReturnType<typeof getDocument> | null = null

    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (cancelled) return
        loadingTask = getDocument({ data: bytes })
        const pdf = await loadingTask.promise
        if (cancelled) {
          await pdf.destroy()
          return
        }
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
      } catch (loadError) {
        if (!cancelled) setError(previewError(loadError))
      }
    })()

    return () => {
      cancelled = true
      void loadingTask?.destroy()
      const pdf = pdfRef.current
      pdfRef.current = null
      void pdf?.destroy()
    }
  }, [file])

  useEffect(() => {
    const pdf = pdfRef.current
    if (!pdf || pageCount === 0 || width < 40) return
    let cancelled = false
    const tasks: Array<{ cancel: () => void }> = []

    void (async () => {
      try {
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let index = 0; index < pageCount; index += 1) {
          if (cancelled) return
          const canvas = canvasRefs.current[index]
          if (!canvas) return
          const page = await pdf.getPage(index + 1)
          const base = page.getViewport({ scale: 1 })
          const fit = width / base.width
          const viewport = page.getViewport({ scale: fit * ratio })
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const context = canvas.getContext('2d', { alpha: false })
          if (!context) continue
          const task = page.render({ canvas, canvasContext: context, viewport })
          tasks.push(task)
          await task.promise
          page.cleanup()
        }
      } catch (renderError) {
        const message = previewError(renderError)
        if (!cancelled && message) setError(message)
      }
    })()

    return () => {
      cancelled = true
      for (const task of tasks) task.cancel()
    }
  }, [pageCount, width])

  return (
    <div className="pdf-frame" ref={frameRef}>
      {error && <p className="pdf-status">{error}</p>}
      {!error && pageCount === 0 && <p className="pdf-status">Открываем оригинал…</p>}
      <div className="pdf-pages">
        {Array.from({ length: pageCount }, (_, index) => (
          <div className="pdf-page" key={index}>
            <canvas
              ref={(node) => {
                canvasRefs.current[index] = node
              }}
              aria-label={`Страница ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
