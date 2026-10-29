import { useMemo } from 'react'
import { materialsForBrands } from '../catalogs'
import { facetValues, hasActiveFacets, matchesDocument, type FacetKey } from '../lib/filters'
import { EMPTY_FILTERS, type Catalogs, type DocumentFilters, type DocumentMeta } from '../types'

const GROUPS: { key: FacetKey; title: string; catalog: keyof Catalogs }[] = [
  { key: 'documentTypes', title: 'Тип документа', catalog: 'documentTypes' },
  { key: 'brands', title: 'Бренды', catalog: 'brands' },
  { key: 'materials', title: 'Материалы', catalog: 'materials' },
  { key: 'constructions', title: 'Конструкции', catalog: 'constructions' },
]

type FilterPanelProps = {
  catalogs: Catalogs
  documents: DocumentMeta[]
  filters: DocumentFilters
  onChange: (filters: DocumentFilters) => void
}

export function FilterPanel({ catalogs, documents, filters, onChange }: FilterPanelProps) {
  const counts = useMemo(() => {
    const next: Record<FacetKey, Map<string, number>> = {
      brands: new Map(),
      materials: new Map(),
      constructions: new Map(),
      documentTypes: new Map(),
    }

    for (const group of GROUPS) {
      for (const document of documents) {
        if (!matchesDocument(document, filters, group.key)) continue
        const values = facetValues(document, group.key)
        for (const value of values) {
          if (!value) continue
          next[group.key].set(value, (next[group.key].get(value) ?? 0) + 1)
        }
      }
    }

    return next
  }, [documents, filters])

  const documentTypeSelected = filters.documentTypes.length > 0

  const toggle = (key: FacetKey, value: string) => {
    const selected = filters[key]
    const nextValues = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange({ ...filters, [key]: nextValues })
  }

  return (
    <aside className="filters">
      <div className="filters-head">
        <h2>Фильтры</h2>
        {hasActiveFacets(filters) && (
          <button
            type="button"
            className="text-button"
            onClick={() => onChange({ ...filters, ...EMPTY_FILTERS, query: filters.query })}
          >
            Сбросить
          </button>
        )}
      </div>
      {GROUPS.map((group) => {
        const catalogOptions = group.key === 'materials'
          ? materialsForBrands(filters.brands, catalogs.materials, filters.materials)
          : catalogs[group.catalog]
        const options = catalogOptions.filter((option) => {
          if (group.key === 'documentTypes') return true
          const checked = filters[group.key].includes(option)
          if (checked) return true
          if (!documentTypeSelected) return false
          return (counts[group.key].get(option) ?? 0) > 0
        })

        return (
          <section key={group.key} className="filter-group">
            <h3>{group.title}</h3>
            {options.length > 0 && (
              <ul>
                {options.map((option) => {
                  const count = counts[group.key].get(option) ?? 0
                  const checked = filters[group.key].includes(option)
                  return (
                    <li key={option}>
                      <label className={count === 0 && group.key !== 'documentTypes' ? 'filter-option is-empty' : 'filter-option'}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(group.key, option)}
                          data-testid={`filter-${group.key}-${option}`}
                        />
                        <span>{option}</span>
                        <em>{count}</em>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </aside>
  )
}
