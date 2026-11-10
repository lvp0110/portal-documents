import type { PortalFilters, PortalQuery } from '../portalTypes'

type PortalFilterPanelProps = {
  filters: PortalQuery
  options: PortalFilters | null
  loading: boolean
  onChange: (filters: PortalQuery) => void
  onReset: () => void
}

function toggleValue<T extends string | number>(current: T | null, value: T): T | null {
  return current === value ? null : value
}

function OptionList({
  name,
  options,
  selected,
  onToggle,
}: {
  name: string
  options: { key: string; label: string; count: number; filesCount: number }[]
  selected: string | null
  onToggle: (key: string) => void
}) {
  if (options.length === 0) return null
  return (
    <ul>
      {options.map((option) => {
        const checked = option.key === selected
        return (
          <li key={option.key}>
            <label className={option.count === 0 ? 'filter-option is-empty' : 'filter-option'}>
              <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={() => onToggle(option.key)}
                data-testid={`portal-filter-${name}-${option.key}`}
              />
              <span>{option.label}</span>
              <em title={`${option.filesCount} файлов`}>{option.count}</em>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

export function PortalFilterPanel({
  filters,
  options,
  loading,
  onChange,
  onReset,
}: PortalFilterPanelProps) {
  const narrowed = filters.globalCategoryId != null
    || filters.brandId != null
    || filters.modelId != null
    || filters.materialId != null
    || Boolean(filters.docType)

  const chooseCategory = (key: string) => {
    const next = toggleValue(filters.globalCategoryId, Number(key))
    onChange({
      ...filters,
      globalCategoryId: next,
      brandId: null,
      modelId: null,
      materialId: null,
    })
  }

  const chooseBrand = (key: string) => {
    onChange({
      ...filters,
      brandId: toggleValue(filters.brandId, Number(key)),
      modelId: null,
      materialId: null,
    })
  }

  const chooseModel = (key: string) => {
    onChange({
      ...filters,
      modelId: toggleValue(filters.modelId, Number(key)),
      materialId: null,
    })
  }

  return (
    <aside className="filters" aria-label="Фильтры портала">
      {narrowed && (
        <div className="filters-head">
          <button type="button" className="text-button" onClick={onReset}>
            Сбросить
          </button>
        </div>
      )}
      {!options && loading && <p className="filter-note">Загрузка фильтров…</p>}
      {options && (
        <>
          {options.documentTypes.length > 0 && (
            <section className="filter-group has-divider">
              <h3>Тип документа</h3>
              <OptionList
                name="doc-type"
                selected={filters.docType}
                onToggle={(key) => onChange({ ...filters, docType: toggleValue(filters.docType, key) })}
                options={options.documentTypes.map((option) => ({
                  key: option.code,
                  label: option.name,
                  count: option.documentsCount,
                  filesCount: option.filesCount,
                }))}
              />
            </section>
          )}
          {options.globalCategories.length > 0 && (
            <section className="filter-group">
              <h3>Категория</h3>
              <OptionList
                name="category"
                selected={filters.globalCategoryId == null ? null : String(filters.globalCategoryId)}
                onToggle={chooseCategory}
                options={options.globalCategories.map((option) => ({
                  key: String(option.id),
                  label: option.name,
                  count: option.documentsCount,
                  filesCount: option.filesCount,
                }))}
              />
            </section>
          )}
          {options.brands.length > 0 && (
            <section className="filter-group">
              <h3>Бренд</h3>
              <OptionList
                name="brand"
                selected={filters.brandId == null ? null : String(filters.brandId)}
                onToggle={chooseBrand}
                options={options.brands.map((option) => ({
                  key: String(option.id),
                  label: option.name,
                  count: option.documentsCount,
                  filesCount: option.filesCount,
                }))}
              />
            </section>
          )}
          {options.models.length > 0 && (
            <section className="filter-group">
              <h3>Модель</h3>
              <OptionList
                name="model"
                selected={filters.modelId == null ? null : String(filters.modelId)}
                onToggle={chooseModel}
                options={options.models.map((option) => ({
                  key: String(option.id),
                  label: option.name,
                  count: option.documentsCount,
                  filesCount: option.filesCount,
                }))}
              />
            </section>
          )}
          {options.materials.length > 0 && (
            <section className="filter-group">
              <h3>Материал</h3>
              <OptionList
                name="material"
                selected={filters.materialId == null ? null : String(filters.materialId)}
                onToggle={(key) => onChange({
                  ...filters,
                  materialId: toggleValue(filters.materialId, Number(key)),
                })}
                options={options.materials.map((option) => ({
                  key: String(option.id),
                  label: option.name,
                  count: option.documentsCount,
                  filesCount: option.filesCount,
                }))}
              />
            </section>
          )}
        </>
      )}
    </aside>
  )
}
