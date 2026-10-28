import { MAX_PDF_BYTES } from '../catalogs'
import { isPdfFile } from '../lib/format'
import type { FileRole, UploadDocumentInput } from '../types'

export type PreparedFile = {
  role: 'brand' | 'materials'
  pageCount: number
  file: File
}

export type PreparedUpload = {
  title: string
  brand: string
  materials: string[]
  documentType: string
  files: PreparedFile[]
}

async function prepareFile(file: File, role: 'brand' | 'materials', readPageCount: (data: ArrayBuffer) => Promise<number>): Promise<PreparedFile> {
  if (!isPdfFile(file)) throw new Error('Нужен файл PDF.')
  if (file.size > MAX_PDF_BYTES) throw new Error('Файл больше 32 МБ.')
  return {
    role,
    pageCount: await readPageCount(await file.arrayBuffer()),
    file,
  }
}

export async function prepareUpload(input: UploadDocumentInput): Promise<PreparedUpload> {
  const brand = input.brand.trim()
  const materials = [...new Set(input.materials.map((item) => item.trim()).filter(Boolean))]
  const documentType = input.documentType.trim()
  if (!documentType) throw new Error('Укажите тип документа.')
  if (!brand && materials.length === 0) throw new Error('Выберите бренд или материалы.')
  if (!input.brandFile && !input.materialsFile) throw new Error('Добавьте PDF.')
  if ((brand && !input.brandFile) || (materials.length > 0 && !input.materialsFile)) {
    throw new Error('Добавьте PDF.')
  }

  const { readPdfPageCount } = await import('../lib/pdfjs')
  const files: PreparedFile[] = []
  if (input.brandFile) files.push(await prepareFile(input.brandFile, 'brand', readPdfPageCount))
  if (input.materialsFile) files.push(await prepareFile(input.materialsFile, 'materials', readPdfPageCount))

  return {
    title: input.title.trim() || files[0].file.name.replace(/\.pdf$/i, ''),
    brand,
    materials,
    documentType,
    files,
  }
}

export function storedFiles(files: PreparedFile[]) {
  return files.map((item) => ({
    role: item.role satisfies FileRole,
    fileName: item.file.name,
    mimeType: item.file.type || 'application/pdf',
    size: item.file.size,
    pageCount: item.pageCount,
  }))
}
