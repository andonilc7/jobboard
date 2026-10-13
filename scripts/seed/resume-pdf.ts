import type { SeedSeeker } from './people.ts'

/** Builds a small, valid one-page PDF resume so recruiters have something to open. */
export function resumePdf(seeker: SeedSeeker): Buffer {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, '-')
  const wrap = (text: string, width = 90) => {
    const lines: string[] = []
    let line = ''
    for (const word of text.split(/\s+/)) {
      if ((line + ' ' + word).trim().length > width) {
        lines.push(line)
        line = word
      } else line = (line + ' ' + word).trim()
    }
    if (line) lines.push(line)
    return lines
  }

  const ops: string[] = []
  let y = 740
  const text = (s: string, size: number, font: 'F1' | 'F2' = 'F1', gap = size + 6) => {
    ops.push(`BT /${font} ${size} Tf 56 ${y} Td (${escape(s)}) Tj ET`)
    y -= gap
  }

  text('FOR TESTING ONLY - FICTIONAL RESUME', 10, 'F2', 18)
  text(seeker.fullName, 22, 'F2', 26)
  text(seeker.headline, 11)
  text(`${seeker.location}  |  ${seeker.email}`, 10, 'F1', 26)
  text('SUMMARY', 10, 'F2')
  wrap(seeker.bio).forEach((l) => text(l, 10, 'F1', 14))
  y -= 10
  text('EXPERIENCE', 10, 'F2')
  for (const exp of seeker.experiences) {
    const dates = `${exp.start.slice(0, 7)} - ${exp.end?.slice(0, 7) ?? 'Present'}`
    text(`${exp.title}, ${exp.company}   (${dates})`, 10.5, 'F2', 15)
    wrap(exp.description).forEach((l) => text(l, 10, 'F1', 14))
    y -= 6
  }
  y -= 4
  text('SKILLS', 10, 'F2')
  wrap(seeker.skills.join(', ')).forEach((l) => text(l, 10, 'F1', 14))

  const stream = ops.join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
