import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'

type OptionMenuProps = {
  label: string
  placeholder: string
  searchPlaceholder: string
  options: string[]
  selected: string[]
  multiple?: boolean
  allowCustom?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (selected: string[]) => void
}

export function OptionMenu({
  label,
  placeholder,
  searchPlaceholder,
  options,
  selected,
  multiple = false,
  allowCustom = false,
  open,
  onOpenChange,
  onChange,
}: OptionMenuProps) {
  const labelId = useId()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const onOpenChangeRef = useRef(onOpenChange)
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState<'down' | 'up'>('down')
  const [maxHeight, setMaxHeight] = useState(280)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChangeRef.current(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onOpenChangeRef.current(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    rootRef.current?.querySelector('input')?.focus()
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const knownOptions = [
    ...options,
    ...selected.filter((value) => value && !options.includes(value)),
  ]
  const trimmed = query.trim()
  const visible = knownOptions.filter((option) => option.toLowerCase().includes(trimmed.toLowerCase()))
  const exact = knownOptions.some((option) => option.toLowerCase() === trimmed.toLowerCase())
  const customValue = allowCustom && trimmed && !exact ? trimmed : ''

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const below = window.innerHeight - rect.bottom - 16
    const above = rect.top - 16
    const openDown = below >= 180 || below >= above
    const room = openDown ? below : above
    setDirection(openDown ? 'down' : 'up')
    setMaxHeight(Math.max(140, Math.min(280, room - 8)))
  }

  const close = () => onOpenChange(false)

  const toggle = () => {
    if (open) {
      close()
      return
    }
    setQuery('')
    place()
    onOpenChange(true)
  }

  const choose = (value: string) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
      return
    }
    onChange([value])
    setQuery('')
    close()
  }

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (visible.length === 1) choose(visible[0])
    else if (customValue && visible.length === 0) choose(customValue)
  }

  const summary = selected.join(', ')

  return (
    <div className="field" ref={rootRef}>
      <span id={labelId}>{label}</span>
      <div className={open ? 'option-menu is-open' : 'option-menu'}>
          <button
            ref={triggerRef}
            type="button"
            className="option-trigger"
            aria-expanded={open}
            aria-controls={listId}
            onClick={toggle}
          >
            <span className={summary ? undefined : 'is-placeholder'} title={summary}>
              {summary || placeholder}
            </span>
          </button>
          {open && (
            <div
              id={listId}
              className={direction === 'up' ? 'option-popover is-up' : 'option-popover'}
              style={{ maxHeight }}
            >
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoComplete="off"
              />
              {customValue && (
                <button type="button" className="option-custom" onClick={() => choose(customValue)}>
                  Использовать «{customValue}»
                </button>
              )}
              <ul role="group" aria-labelledby={labelId}>
                {visible.map((option) => (
                  <li key={option}>
                    {multiple ? (
                      <label>
                        <input
                          type="checkbox"
                          checked={selected.includes(option)}
                          onChange={() => choose(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ) : (
                      <button
                        type="button"
                        className={selected.includes(option) ? 'is-selected' : undefined}
                        onClick={() => choose(option)}
                      >
                        {option}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {visible.length === 0 && !customValue && <p>Ничего не найдено</p>}
            </div>
          )}
      </div>
    </div>
  )
}
