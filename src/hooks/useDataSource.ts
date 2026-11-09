import { useEffect, useState } from 'react'
import { readSource, rememberSource, writeSourceSearch, type DataSource } from '../source'

export function useDataSource() {
  const [source, setSource] = useState<DataSource>(readSource)

  useEffect(() => {
    rememberSource(source)
    writeSourceSearch(source)
  }, [source])

  return [source, setSource] as const
}
