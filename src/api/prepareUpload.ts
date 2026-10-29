import { isCertificateType, isEngineeringAlbumType, MAX_PDF_BYTES, normalizeFireHazard } from '../catalogs'
import { isIsoDate, isPdfFile } from '../lib/format'
import type { FileRole, FireHazardIndicators, UploadDocumentInput } from '../types'

export type PreparedFile = {
  role: FileRole
  pageCount: number
  file: File
}

export type PreparedUpload = {
  title: string
  brand: string
  materials: string[]
  constructions: string[]
  documentType: string
  expiresAt: string | null
  fireHazard: FireHazardIndicators | null
  files: PreparedFile[]
}

async function prepareFile(file: File, role: FileRole, readPageCount: (data: ArrayBuffer) => Promise<number>): Promise<PreparedFile> {
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
  const constructions = [...new Set(input.constructions.map((item) => item.trim()).filter(Boolean))]
  const documentType = input.documentType.trim()
  if (!documentType) throw new Error('Укажите тип документа.')
  const certificate = isCertificateType(documentType)
  const expiresAt = certificate ? input.expiresAt?.trim() ?? '' : ''
  const fireHazard = certificate ? normalizeFireHazard(input.fireHazard) : null
  if (certificate && !expiresAt) throw new Error('Укажите срок действия.')
  if (expiresAt && !isIsoDate(expiresAt)) throw new Error('Укажите корректный срок действия.')
  const withoutTargets = isEngineeringAlbumType(documentType) && !brand && materials.length === 0 && constructions.length === 0
  if (!withoutTargets && !brand && materials.length === 0 && constructions.length === 0) {
    throw new Error('Выберите бренд, материалы или конструкции.')
  }
  if (withoutTargets) {
    if (!input.documentFile) throw new Error('Добавьте PDF.')
  } else if (!input.brandFile && !input.materialsFile && !input.constructionsFile) {
    throw new Error('Добавьте PDF.')
  } else if (
    (brand && !input.brandFile) ||
    (materials.length > 0 && !input.materialsFile) ||
    (constructions.length > 0 && !input.constructionsFile)
  ) {
    throw new Error('Добавьте PDF.')
  }

  const { readPdfPageCount } = await import('../lib/pdfjs')
  const files: PreparedFile[] = []
  if (withoutTargets && input.documentFile) {
    files.push(await prepareFile(input.documentFile, 'document', readPdfPageCount))
  }
  if (input.brandFile) files.push(await prepareFile(input.brandFile, 'brand', readPdfPageCount))
  if (input.materialsFile) files.push(await prepareFile(input.materialsFile, 'materials', readPdfPageCount))
  if (input.constructionsFile) files.push(await prepareFile(input.constructionsFile, 'constructions', readPdfPageCount))

  return {
    title: input.title.trim() || files[0].file.name.replace(/\.pdf$/i, ''),
    brand,
    materials,
    constructions,
    documentType,
    expiresAt: expiresAt || null,
    fireHazard,
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
