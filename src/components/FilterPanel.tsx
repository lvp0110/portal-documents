import { useMemo, useState } from 'react'
import { materialsForBrands } from '../catalogs'
import { facetValues, hasActiveFacets, matchesDocument, type FacetKey } from '../lib/filters'
import { EMPTY_FILTERS, type Catalogs, type DocumentFilters, type DocumentMeta } from '../types'

const FACETS: FacetKey[] = ['documentTypes', 'brands', 'materials', 'constructions']

const GROUPS: { key: FacetKey; title: string; catalog: keyof Catalogs }[] = [
  { key: 'brands', title: 'Бренды', catalog: 'brands' },
  { key: 'materials', title: 'Материалы', catalog: 'materials' },
  { key: 'constructions', title: 'Конструкции', catalog: 'constructions' },
]

type FilterMode = 'documents' | 'materials'

type FilterPanelProps = {
  catalogs: Catalogs
  documents: DocumentMeta[]
  filters: DocumentFilters
  onChange: (filters: DocumentFilters) => void
}

function OptionList({
  facet,
  options,
  counts,
  selected,
  onToggle,
}: {
  facet: FacetKey
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
        const empty = count === 0 && facet !== 'documentTypes'
        return (
          <li key={option}>
            <label className={empty ? 'filter-option is-empty' : 'filter-option'}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                data-testid={`filter-${facet}-${option}`}
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

export function FilterPanel({ catalogs, documents, filters, onChange }: FilterPanelProps) {
  const [mode, setMode] = useState<FilterMode>('documents')
  const [materialQuery, setMaterialQuery] = useState('')

  const counts = useMemo(() => {
    const next: Record<FacetKey, Map<string, number>> = {
      brands: new Map(),
      materials: new Map(),
      constructions: new Map(),
      documentTypes: new Map(),
    }

    for (const key of FACETS) {
      for (const document of documents) {
        if (!matchesDocument(document, filters, key)) continue
        for (const value of facetValues(document, key)) {
          if (!value) continue
          next[key].set(value, (next[key].get(value) ?? 0) + 1)
        }
      }
    }

    return next
  }, [documents, filters])

  const materialsWithDocuments = useMemo(() => {
    const names = new Set<string>()
    for (const document of documents) {
      for (const name of document.materials) {
        if (name) names.add(name)
      }
    }
    return names
  }, [documents])

  const materialOptions = useMemo(() => {
    const query = materialQuery.trim().toLowerCase()
    const names = catalogs.materials.filter((name) => (
      materialsWithDocuments.has(name) || filters.materials.includes(name)
    ))
    for (const name of filters.materials) {
      if (name && !names.includes(name)) names.push(name)
    }
    if (!query) return names
    return names.filter((name) => name.toLowerCase().includes(query))
  }, [catalogs.materials, filters.materials, materialQuery, materialsWithDocuments])

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
      <section className={mode === 'documents' ? 'filter-group has-divider' : 'filter-group'}>
        <div className="filter-switch" role="tablist" aria-label="Раздел фильтра">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'documents'}
            className={mode === 'documents' ? 'filter-switch-button is-active' : 'filter-switch-button'}
            onClick={() => setMode('documents')}
          >
            Документы
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'materials'}
            className={mode === 'materials' ? 'filter-switch-button is-active' : 'filter-switch-button'}
            onClick={() => setMode('materials')}
          >
            Материалы
          </button>
        </div>
        {mode === 'documents' ? (
          <OptionList
            facet="documentTypes"
            options={catalogs.documentTypes}
            counts={counts.documentTypes}
            selected={filters.documentTypes}
            onToggle={(value) => toggle('documentTypes', value)}
          />
        ) : (
          <>
            <label className="filter-search">
              <span className="sr-only">Поиск по названию материала</span>
              <input
                type="search"
                value={materialQuery}
                placeholder="Поиск по названию материала"
                onChange={(event) => setMaterialQuery(event.target.value)}
              />
            </label>
            <OptionList
              facet="materials"
              options={materialOptions}
              counts={counts.materials}
              selected={filters.materials}
              onToggle={(value) => toggle('materials', value)}
            />
          </>
        )}
      </section>
      {mode === 'documents' && GROUPS.map((group) => {
        const catalogOptions = group.key === 'materials'
          ? materialsForBrands(filters.brands, catalogs.materials, filters.materials)
          : catalogs[group.catalog]
        const options = catalogOptions.filter((option) => {
          const checked = filters[group.key].includes(option)
          if (checked) return true
          if (!documentTypeSelected) return false
          return (counts[group.key].get(option) ?? 0) > 0
        })

        return (
          <section key={group.key} className="filter-group">
            <h3>{group.title}</h3>
            <OptionList
              facet={group.key}
              options={options}
              counts={counts[group.key]}
              selected={filters[group.key]}
              onToggle={(value) => toggle(group.key, value)}
            />
          </section>
        )
      })}
    </aside>
  )
}
