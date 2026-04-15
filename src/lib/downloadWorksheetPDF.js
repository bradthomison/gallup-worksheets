import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getStrengthColors } from './strengthColors'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

async function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = reject
    img.src = src
  })
}

export async function downloadWorksheetPDF(participant, session, responses) {
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
  // Try to embed the logo; fall back to text if it fails
  let logoBottom = 20
  try {
    const { dataUrl, width, height } = await loadImageAsDataUrl('/logo.png')
    const logoH = 48
    const logoW = (width / height) * logoH
    doc.addImage(dataUrl, 'PNG', 20, 14, logoW, logoH)
    logoBottom = 14 + logoH + 6
  } catch {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Gallup Strengths', 20, 30)
    logoBottom = 38
  }

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.line(20, logoBottom, pageWidth - 20, logoBottom)

  // Session title + participant info
  const infoY = logoBottom + 14
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(session.title, 20, infoY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`${participant.name} · ${participant.email}`, 20, infoY + 14)

  if (submittedAt) {
    doc.setTextColor(100, 100, 100)
    doc.text(`Submitted ${submittedAt}`, pageWidth - 20, infoY + 14, { align: 'right' })
  } else {
    doc.setTextColor(180, 120, 0)
    doc.text('In Progress', pageWidth - 20, infoY + 14, { align: 'right' })
  }

  const tableStartY = infoY + 28

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
    startY: tableStartY,
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
