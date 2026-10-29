import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { Catalogs, FireHazardIndicators, UploadDocumentInput } from '../types'
import { errorMessage, isIsoDate, isPdfFile } from '../lib/format'
import { isCertificateType, isEngineeringAlbumType, MAX_PDF_BYTES, normalizeFireHazard } from '../catalogs'
import { OptionMenu } from './OptionMenu'

const EMPTY_FIRE_HAZARD: FireHazardIndicators = { g: '', v: '', rp: '', d: '', t: '' }

const FIRE_HAZARD_FIELDS = [
  { key: 'g', placeholder: 'Г' },
  { key: 'v', placeholder: 'В' },
  { key: 'rp', placeholder: 'РП' },
  { key: 'd', placeholder: 'Д' },
  { key: 't', placeholder: 'Т' },
] as const satisfies ReadonlyArray<{ key: keyof FireHazardIndicators; placeholder: string }>

type OpenMenu = 'brand' | 'materials' | 'constructions' | 'type' | null

function fileTarget(brand: string, materials: string[], constructions: string[], documentType: string): string {
  const parts: string[] = []
  if (brand.trim()) parts.push('бренду')
  if (materials.length > 0) parts.push('материалам')
  if (constructions.length > 0) parts.push('конструкциям')
  if (parts.length === 0) {
    if (isEngineeringAlbumType(documentType)) return 'Файл сохранится без бренда, материалов и конструкций.'
    return 'Выберите бренд, материалы или конструкции — файл добавится к выбранному.'
  }
  if (parts.length === 1) return `Файл добавится к ${parts[0]}.`
  const last = parts[parts.length - 1]
  return `Файл добавится к ${parts.slice(0, -1).join(', к ')} и к ${last}.`
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
  const [constructions, setConstructions] = useState<string[]>([])
  const [documentType, setDocumentType] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [fireHazard, setFireHazard] = useState<FireHazardIndicators>(EMPTY_FIRE_HAZARD)
  const hazardLabelId = useId()
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
      setConstructions([])
      setDocumentType('')
      setExpiresAt('')
      setFireHazard(EMPTY_FIRE_HAZARD)
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
    const hasConstructions = constructions.length > 0
    if (!file) {
      setFormError('Добавьте PDF.')
      return
    }
    if (!documentType.trim()) {
      setFormError('Укажите тип документа.')
      return
    }
    const withoutTargets = isEngineeringAlbumType(documentType) && !hasBrand && !hasMaterials && !hasConstructions
    if (!hasBrand && !hasMaterials && !hasConstructions && !withoutTargets) {
      setFormError('Выберите бренд, материалы или конструкции.')
      return
    }
    const certificate = isCertificateType(documentType)
    const expiresAtValue = certificate ? expiresAt.trim() : ''
    const fireHazardValue = certificate ? normalizeFireHazard(fireHazard) : null
    if (certificate && !expiresAtValue) {
      setFormError('Укажите срок действия.')
      return
    }
    if (expiresAtValue && !isIsoDate(expiresAtValue)) {
      setFormError('Укажите корректный срок действия.')
      return
    }
    setFormError(null)
    try {
      await onSubmit({
        title,
        brand,
        materials,
        constructions,
        documentType,
        expiresAt: expiresAtValue || null,
        fireHazard: fireHazardValue,
        brandFile: hasBrand ? file : null,
        materialsFile: hasMaterials ? file : null,
        constructionsFile: hasConstructions ? file : null,
        documentFile: withoutTargets ? file : null,
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
          <p>Один PDF. Куда он сохранится, зависит от выбранных бренда, материалов и конструкций.</p>
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
          <span>{fileTarget(brand, materials, constructions, documentType)}</span>
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
          label="Конструкции"
          placeholder="Выберите конструкции"
          searchPlaceholder="Найти конструкцию"
          options={catalogs.constructions}
          selected={constructions}
          multiple
          open={openMenu === 'constructions'}
          onOpenChange={(next) => setOpenMenu(next ? 'constructions' : null)}
          onChange={(next) => {
            setConstructions(next)
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
            const type = next[0] ?? ''
            setDocumentType(type)
            if (!isCertificateType(type)) {
              setExpiresAt('')
              setFireHazard(EMPTY_FIRE_HAZARD)
            }
            setFormError(null)
          }}
        />
        {isCertificateType(documentType) && (
          <label>
            Срок действия
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => {
                setExpiresAt(event.target.value)
                setFormError(null)
              }}
            />
          </label>
        )}
        {isCertificateType(documentType) && (
          <div className="field fire-hazard">
            <span id={hazardLabelId}>Показатели пожарной опасности</span>
            <div className="fire-hazard-row" role="group" aria-labelledby={hazardLabelId}>
              {FIRE_HAZARD_FIELDS.map((field) => (
                <input
                  key={field.key}
                  aria-label={field.placeholder}
                  placeholder={field.placeholder}
                  maxLength={3}
                  autoComplete="off"
                  spellCheck={false}
                  value={fireHazard[field.key]}
                  onChange={(event) => {
                    const next = event.target.value.slice(0, 3)
                    setFireHazard((current) => ({ ...current, [field.key]: next }))
                    setFormError(null)
                  }}
                />
              ))}
            </div>
          </div>
        )}

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
