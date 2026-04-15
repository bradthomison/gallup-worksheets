import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getStrengthColors } from './strengthColors'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

export function downloadWorksheetPDF(participant, session, responses) {
  const prompts = session.prompts ?? []
  const strengths = participant.top5 ?? []

  const cellMap = {}
  ;(responses ?? []).forEach(r => {
    cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
  })

  const isSubmitted = (responses ?? []).some(r => r.submitted_at)
  const submittedAt = isSubmitted
    ? new Date((responses ?? []).find(r => r.submitted_at)?.submitted_at)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Header ──────────────────────────────────────────────────────────────────
  // Brand bar
  doc.setFillColor(59, 91, 219)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('GALLUP STRENGTHS', 20, 15)

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(session.title, 20, 31)

  // Participant info
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(participant.name, 20, 58)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(participant.email, 20, 70)

  if (submittedAt) {
    doc.text(`Submitted ${submittedAt}`, pageWidth - 20, 70, { align: 'right' })
  } else {
    doc.setTextColor(180, 120, 0)
    doc.text('In Progress', pageWidth - 20, 70, { align: 'right' })
  }

  // ── Table ────────────────────────────────────────────────────────────────────
  const head = [['Prompt', ...strengths]]
  const body = prompts.map((prompt, pi) => [
    prompt,
    ...strengths.map((_, si) => cellMap[`${pi}_${si}`] ?? ''),
  ])

  // Pre-compute header colors
  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s).headerBg))

  autoTable(doc, {
    head,
    body,
    startY: 82,
    margin: { left: 20, right: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      valign: 'top',
      overflow: 'linebreak',
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [59, 91, 219], // default, overridden per cell below
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      cellPadding: 8,
    },
    columnStyles: {
      0: {
        cellWidth: 130,
        fontStyle: 'bold',
        fillColor: [248, 249, 250],
        textColor: [50, 50, 50],
        fontSize: 9,
      },
    },
    bodyStyles: {
      textColor: [40, 40, 40],
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    didParseCell(data) {
      // Color each strength column header with its domain color
      if (data.section === 'head' && data.column.index > 0) {
        const color = headerColors[data.column.index - 1]
        if (color) data.cell.styles.fillColor = color
      }
    },
    // Wrap long cell text
    willDrawCell(data) {
      if (data.section === 'body' && data.column.index > 0) {
        data.cell.styles.minCellHeight = 50
      }
    },
  })

  // ── Footer ───────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${participant.name} · ${session.title} · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 12,
      { align: 'center' }
    )
  }

  const filename = `${participant.name} - ${session.title}.pdf`
    .replace(/[/\\?%*:|"<>]/g, '-')
  doc.save(filename)
}
