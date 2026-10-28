import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export { getDocument }

function readablePdfError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === 'PasswordException') {
      return new Error('PDF защищён паролем. Снимите защиту и загрузите файл снова.')
    }
    if (error.name === 'InvalidPDFException') {
      return new Error('Файл не похож на корректный PDF.')
    }
  }
  return new Error('Не удалось прочитать PDF.')
}

export async function readPdfPageCount(data: ArrayBuffer): Promise<number> {
  const bytes = new Uint8Array(data.byteLength)
  bytes.set(new Uint8Array(data))

  try {
    const pdf = await getDocument({ data: bytes }).promise
    try {
      return pdf.numPages
    } finally {
      await pdf.destroy()
    }
  } catch (error) {
    throw readablePdfError(error)
  }
}
