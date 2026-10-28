function pdfString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function textLine(size: number, x: number, y: number, text: string): string {
  return [
    'BT',
    `/F1 ${size} Tf`,
    `1 0 0 1 ${x} ${y} Tm`,
    `(${pdfString(text)}) Tj`,
    'ET',
  ].join('\n')
}

export function buildSamplePdf(): File {
  const content = [
    textLine(22, 72, 740, 'Knauf Moisture Board'),
    textLine(12, 72, 700, 'Technical data sheet for wet-area gypsum board.'),
    textLine(16, 72, 650, 'Description'),
    textLine(12, 72, 624, 'Board for bathrooms, kitchens and other wet rooms.'),
    textLine(16, 72, 576, 'Properties'),
    textLine(12, 86, 550, '- Thickness 12.5 mm'),
    textLine(12, 86, 532, '- Reaction to fire A2-s1, d0'),
    textLine(12, 86, 514, '- Edge type AK'),
    textLine(16, 72, 470, 'Application'),
    textLine(12, 72, 444, 'Fix the board to a metal frame, then prime before tiling.'),
  ].join('\n')

  const chunks: string[] = ['%PDF-1.4\n']
  const offsets: number[] = []

  const addObject = (id: number, body: string) => {
    offsets[id] = chunks.join('').length
    chunks.push(`${id} 0 obj\n${body}\nendobj\n`)
  }

  addObject(1, '<< /Type /Catalog /Pages 2 0 R >>')
  addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  addObject(
    3,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  )
  addObject(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  addObject(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  const xrefStart = chunks.join('').length
  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (let id = 1; id <= 5; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  const pdf = chunks.join('') + xref + trailer

  return new File([pdf], 'knauf-moisture-board.pdf', { type: 'application/pdf' })
}
