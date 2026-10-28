import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { Catalogs, UploadDocumentInput } from '../types'
import { errorMessage, isPdfFile } from '../lib/format'
import { MAX_PDF_BYTES } from '../catalogs'
import { OptionMenu } from './OptionMenu'

type OpenMenu = 'brand' | 'materials' | 'type' | null

function fileTarget(brand: string, materials: string[]): string {
  const hasBrand = Boolean(brand.trim())
  const hasMaterials = materials.length > 0
  if (hasBrand && hasMaterials) return 'Файл добавится к бренду и к материалам.'
  if (hasBrand) return 'Файл добавится к бренду.'
  if (hasMaterials) return 'Файл добавится к материалам.'
  return 'Выберите бренд, материалы или оба — файл добавится к выбранному.'
}

type UploadDialogProps = {
  open: boolean
  catalogs: Catalogs
  busy: boolean
  onClose: () => void
  onSubmit: (input: UploadDocumentInput) => Promise<void>
}

export function UploadDialog({ open, catalogs, busy, onClose, onSubmit }: UploadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [materials, setMaterials] = useState<string[]>([])
  const [documentType, setDocumentType] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [over, setOver] = useState(false)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle('')
      setBrand('')
      setMaterials([])
      setDocumentType('')
      setFile(null)
      setOver(false)
      setOpenMenu(null)
      setFormError(null)
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const acceptFile = (next: File | null) => {
    if (!next) {
      setFile(null)
      return
    }
    if (!isPdfFile(next)) {
      setFormError('Нужен файл PDF.')
      return
    }
    if (next.size > MAX_PDF_BYTES) {
      setFormError('Файл больше 32 МБ.')
      return
    }
    setFormError(null)
    setFile(next)
    setTitle((current) => current || next.name.replace(/\.pdf$/i, ''))
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    acceptFile(event.dataTransfer.files?.[0] ?? null)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const hasBrand = Boolean(brand.trim())
    const hasMaterials = materials.length > 0
    if (!file) {
      setFormError('Добавьте PDF.')
      return
    }
    if (!hasBrand && !hasMaterials) {
      setFormError('Выберите бренд или материалы.')
      return
    }
    if (!documentType.trim()) {
      setFormError('Укажите тип документа.')
      return
    }
    setFormError(null)
    try {
      await onSubmit({
        title,
        brand,
        materials,
        documentType,
        brandFile: hasBrand ? file : null,
        materialsFile: hasMaterials ? file : null,
      })
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось сохранить документ.'))
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={openMenu ? 'upload-dialog menu-open' : 'upload-dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (busy || openMenu) event.preventDefault()
        if (openMenu) setOpenMenu(null)
      }}
    >
      <form onSubmit={(event) => void submit(event)}>
        <header>
          <h2 id={titleId}>Новый документ</h2>
          <p>Один PDF. Куда он сохранится, зависит от выбранных бренда и материалов.</p>
        </header>

        <div
          className={over ? 'dropzone is-over' : 'dropzone'}
          onDragEnter={(event) => {
            event.preventDefault()
            setOver(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setOver(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setOver(false)
          }}
          onDrop={onDrop}
        >
          <strong>{file ? file.name : 'Перетащите PDF сюда'}</strong>
          <span>{fileTarget(brand, materials)}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              acceptFile(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />
          <div className="dropzone-actions">
            <button type="button" className="button button-secondary" onClick={() => fileInputRef.current?.click()}>
              Выбрать файл
            </button>
            {file && (
              <button type="button" className="button button-secondary" onClick={() => setFile(null)}>
                Убрать
              </button>
            )}
          </div>
        </div>

        <label>
          Название
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Если пусто, возьмём имя файла" />
        </label>
        <OptionMenu
          label="Бренд"
          placeholder="Выберите бренд"
          searchPlaceholder="Найти бренд"
          options={catalogs.brands}
          selected={brand ? [brand] : []}
          allowCustom
          open={openMenu === 'brand'}
          onOpenChange={(next) => setOpenMenu(next ? 'brand' : null)}
          onChange={(next) => {
            setBrand(next[0] ?? '')
            setFormError(null)
          }}
        />
        <OptionMenu
          label="Материалы"
          placeholder="Выберите материалы"
          searchPlaceholder="Найти материал"
          options={catalogs.materials}
          selected={materials}
          multiple
          open={openMenu === 'materials'}
          onOpenChange={(next) => setOpenMenu(next ? 'materials' : null)}
          onChange={(next) => {
            setMaterials(next)
            setFormError(null)
          }}
        />
        <OptionMenu
          label="Тип документа"
          placeholder="Выберите тип"
          searchPlaceholder="Найти тип"
          options={catalogs.documentTypes}
          selected={documentType ? [documentType] : []}
          allowCustom
          open={openMenu === 'type'}
          onOpenChange={(next) => setOpenMenu(next ? 'type' : null)}
          onChange={(next) => {
            setDocumentType(next[0] ?? '')
            setFormError(null)
          }}
        />

        {formError && <p className="form-error" role="alert">{formError}</p>}

        <footer>
          <button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? 'Читаем PDF…' : 'Сохранить'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
