import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from 'react'
import type { Catalogs, DocumentAttribute, FireHazardIndicators, LocalFilter, UploadDocumentInput } from '../types'
import { errorMessage, isIsoDate, isPdfFile } from '../lib/format'
import { isCertificateType, MAX_PDF_BYTES, normalizeFireHazard } from '../catalogs'
import { OptionMenu } from './OptionMenu'

const EMPTY_FIRE_HAZARD: FireHazardIndicators = { g: '', v: '', rp: '', d: '', t: '' }

const FIRE_HAZARD_FIELDS = [
  { key: 'g', placeholder: 'Г' },
  { key: 'v', placeholder: 'В' },
  { key: 'rp', placeholder: 'РП' },
  { key: 'd', placeholder: 'Д' },
  { key: 't', placeholder: 'Т' },
] as const satisfies ReadonlyArray<{ key: keyof FireHazardIndicators; placeholder: string }>

type OpenMenu = string | null

function fileTarget(filters: LocalFilter[], selected: Record<string, string[]>): string {
  const names = filters
    .filter((filter) => (selected[filter.id] ?? []).length > 0)
    .map((filter) => filter.name)
  if (names.length === 0) return 'Файл сохранится с выбранным типом документа.'
  if (names.length === 1) return `Файл сохранится с фильтром «${names[0]}».`
  return `Файл сохранится с фильтрами: ${names.join(', ')}.`
}

type UploadDialogProps = {
  open: boolean
  catalogs: Catalogs
  localFilters: LocalFilter[]
  busy: boolean
  onClose: () => void
  onAddDocumentType: (name: string) => Promise<string>
  onAddFilter: (name: string) => Promise<LocalFilter>
  onAddFilterValue: (id: string, value: string) => Promise<string>
  onSubmit: (input: UploadDocumentInput) => Promise<void>
}

export function UploadDialog({
  open,
  catalogs,
  localFilters,
  busy,
  onClose,
  onAddDocumentType,
  onAddFilter,
  onAddFilterValue,
  onSubmit,
}: UploadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const titleId = useId()

  const [title, setTitle] = useState('')
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [documentType, setDocumentType] = useState('')
  const [newType, setNewType] = useState('')
  const [addingType, setAddingType] = useState(false)
  const [newFilter, setNewFilter] = useState('')
  const [addingFilter, setAddingFilter] = useState(false)
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
      setSelections({})
      setDocumentType('')
      setNewType('')
      setAddingType(false)
      setNewFilter('')
      setAddingFilter(false)
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

  const applyType = (type: string) => {
    setDocumentType(type)
    if (!isCertificateType(type)) {
      setExpiresAt('')
      setFireHazard(EMPTY_FIRE_HAZARD)
    }
    setFormError(null)
  }

  const chooseType = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      setFormError('Укажите название типа.')
      return
    }
    const known = catalogs.documentTypes.find((item) => item.toLowerCase() === trimmed.toLowerCase())
    if (known) {
      applyType(known)
      setNewType('')
      return
    }
    setAddingType(true)
    try {
      applyType(await onAddDocumentType(trimmed))
      setNewType('')
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось добавить тип.'))
    } finally {
      setAddingType(false)
    }
  }

  const applyFilterValues = async (filter: LocalFilter, next: string[]) => {
    const resolved: string[] = []
    for (const value of next) {
      const known = filter.values.find((item) => item.toLowerCase() === value.trim().toLowerCase())
      if (known) {
        if (!resolved.includes(known)) resolved.push(known)
        continue
      }
      resolved.push(await onAddFilterValue(filter.id, value))
    }
    setSelections((current) => ({ ...current, [filter.id]: resolved }))
    setFormError(null)
  }

  const addFilter = async () => {
    const name = newFilter.trim()
    if (!name) {
      setFormError('Укажите название фильтра.')
      return
    }
    setAddingFilter(true)
    try {
      await onAddFilter(name)
      setNewFilter('')
      setFormError(null)
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось добавить фильтр.'))
    } finally {
      setAddingFilter(false)
    }
  }

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
    if (!file) {
      setFormError('Добавьте PDF.')
      return
    }
    if (!documentType.trim()) {
      setFormError('Укажите тип документа.')
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
    const attributes: DocumentAttribute[] = localFilters.flatMap((filter) => {
      const values = selections[filter.id] ?? []
      return values.length > 0 ? [{ filterId: filter.id, name: filter.name, values }] : []
    })
    setFormError(null)
    try {
      await onSubmit({
        title,
        brand: '',
        materials: [],
        constructions: [],
        documentType,
        attributes,
        expiresAt: expiresAtValue || null,
        fireHazard: fireHazardValue,
        brandFile: null,
        materialsFile: null,
        constructionsFile: null,
        documentFile: file,
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
          <p>Один PDF. Его можно связать с добавленными фильтрами.</p>
        </header>

        <OptionMenu
          label="Тип документа"
          placeholder="Выберите тип"
          searchPlaceholder="Найти тип"
          options={catalogs.documentTypes}
          selected={documentType ? [documentType] : []}
          allowCustom
          customVerb="Добавить тип"
          open={openMenu === 'type'}
          onOpenChange={(next) => setOpenMenu(next ? 'type' : null)}
          onChange={(next) => {
            void chooseType(next[0] ?? '')
          }}
        />
        <div className="add-type-row">
          <input
            value={newType}
            placeholder="Новый тип"
            aria-label="Новый тип документа"
            disabled={busy || addingType}
            onChange={(event) => {
              setNewType(event.target.value)
              setFormError(null)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              void chooseType(newType)
            }}
          />
          <button
            type="button"
            className="button button-secondary"
            disabled={busy || addingType || !newType.trim()}
            onClick={() => void chooseType(newType)}
          >
            {addingType ? 'Добавляем…' : 'Добавить тип'}
          </button>
        </div>
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
          <span>{fileTarget(localFilters, selections)}</span>
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
        <div className="add-type-row">
          <input
            value={newFilter}
            placeholder="Новый фильтр"
            aria-label="Новый фильтр"
            disabled={busy || addingFilter}
            onChange={(event) => {
              setNewFilter(event.target.value)
              setFormError(null)
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              void addFilter()
            }}
          />
          <button
            type="button"
            className="button button-secondary"
            disabled={busy || addingFilter || !newFilter.trim()}
            onClick={() => void addFilter()}
          >
            {addingFilter ? 'Добавляем…' : 'Добавить фильтр'}
          </button>
        </div>
        {localFilters.map((filter) => (
          <OptionMenu
            key={filter.id}
            label={filter.name}
            placeholder={`Выберите ${filter.name.toLowerCase()}`}
            searchPlaceholder={`Найти ${filter.name.toLowerCase()}`}
            options={filter.values}
            selected={selections[filter.id] ?? []}
            multiple
            allowCustom
            customVerb="Добавить"
            open={openMenu === filter.id}
            onOpenChange={(next) => setOpenMenu(next ? filter.id : null)}
            onChange={(next) => {
              void applyFilterValues(filter, next).catch((error: unknown) => {
                setFormError(errorMessage(error, 'Не удалось добавить значение.'))
              })
            }}
          />
        ))}
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
