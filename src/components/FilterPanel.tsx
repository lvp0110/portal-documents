import { attributeValues, hasActiveFacets, matchesDocument } from '../lib/filters'
import { EMPTY_FILTERS, type Catalogs, type DocumentFilters, type DocumentMeta, type LocalFilter } from '../types'

type FilterPanelProps = {
  catalogs: Catalogs
  documents: DocumentMeta[]
  filters: DocumentFilters
  localFilters: LocalFilter[]
  onChange: (filters: DocumentFilters) => void
}

function OptionList({
  options,
  counts,
  selected,
  onToggle,
}: {
  options: string[]
  counts: Map<string, number>
  selected: string[]
  onToggle: (value: string) => void
}) {
  if (options.length === 0) return null
  return (
    <ul>
      {options.map((option) => {
        const count = counts.get(option) ?? 0
        const checked = selected.includes(option)
        return (
          <li key={option}>
            <label className={count === 0 ? 'filter-option is-empty' : 'filter-option'}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
              />
              <span>{option}</span>
              <em>{count}</em>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

function countValues(
  documents: DocumentMeta[],
  filters: DocumentFilters,
  ignore: string | undefined,
  read: (document: DocumentMeta) => string[],
) {
  const counts = new Map<string, number>()
  for (const document of documents) {
    if (!matchesDocument(document, filters, ignore)) continue
    for (const value of read(document)) {
      if (!value) continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  return counts
}

export function FilterPanel({
  catalogs,
  documents,
  filters,
  localFilters,
  onChange,
}: FilterPanelProps) {
  const typeCounts = countValues(
    documents,
    filters,
    'documentTypes',
    (document) => [document.documentType],
  )

  const toggleType = (value: string) => {
    const selected = filters.documentTypes
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange({ ...filters, documentTypes: nextValues })
  }

  const toggleAttribute = (id: string, value: string) => {
    const selected = filters.attributes[id] ?? []
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange({ ...filters, attributes: { ...filters.attributes, [id]: nextValues } })
  }

  return (
    <aside className="filters">
      {hasActiveFacets(filters) && (
        <div className="filters-head">
          <button
            type="button"
            className="text-button"
            onClick={() => onChange({ ...EMPTY_FILTERS, query: filters.query })}
          >
            Сбросить
          </button>
        </div>
      )}
      <section className="filter-group has-divider">
        <h3>Тип документа</h3>
        <OptionList
          options={catalogs.documentTypes}
          counts={typeCounts}
          selected={filters.documentTypes}
          onToggle={toggleType}
        />
      </section>
      {localFilters.map((filter) => {
        const counts = countValues(
          documents,
          filters,
          filter.id,
          (document) => attributeValues(document, filter.id),
        )
        const options = [...filter.values]
        for (const document of documents) {
          for (const value of attributeValues(document, filter.id)) {
            if (value && !options.some((item) => item.toLowerCase() === value.toLowerCase())) options.push(value)
          }
        }
        return (
          <section key={filter.id} className="filter-group">
            <h3>{filter.name}</h3>
            <OptionList
              options={options}
              counts={counts}
              selected={filters.attributes[filter.id] ?? []}
              onToggle={(value) => toggleAttribute(filter.id, value)}
            />
          </section>
        )
      })}
    </aside>
  )
}
