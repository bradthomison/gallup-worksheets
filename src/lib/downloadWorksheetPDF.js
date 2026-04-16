import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'
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

// Cache the logo so batch downloads don't reload it for every PDF
let logoCache = null
async function getLogo() {
  if (!logoCache) {
    try { logoCache = await loadImageAsDataUrl('/logo.png') } catch { logoCache = null }
  }
  return logoCache
}

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

// ── Core PDF builder ──────────────────────────────────────────────────────────
// blank = true  →  empty cells, row heights maximized to fill one page (for printing)
// blank = false →  filled cells, standard row height
async function buildWorksheetPDF(participant, session, responses, blank = false) {
  const prompts = session.prompts ?? []
  const strengths = participant.top5 ?? []

  // Build cell map (ignored in blank mode)
  const cellMap = {}
  if (!blank) {
    ;(responses ?? []).forEach(r => {
      cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
    })
  }

  // Submission status (only relevant for filled mode)
  const isSubmitted = !blank && (responses ?? []).some(r => r.submitted_at)
  const submittedAt = isSubmitted
    ? new Date((responses ?? []).find(r => r.submitted_at)?.submitted_at)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── Header ────────────────────────────────────────────────────────────────
  let logoBottom = 20
  const logo = await getLogo()
  if (logo) {
    const logoH = 48
    const logoW = (logo.width / logo.height) * logoH
    doc.addImage(logo.dataUrl, 'PNG', 20, 14, logoW, logoH)
    logoBottom = 14 + logoH + 6
  } else {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Gallup Strengths', 20, 30)
    logoBottom = 38
  }

  doc.setDrawColor(220, 220, 220)
  doc.line(20, logoBottom, pageWidth - 20, logoBottom)

  const infoY = logoBottom + 14
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(session.title, 20, infoY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(`${participant.name} · ${participant.email}`, 20, infoY + 14)

  // Status label (right side) — omitted for blank worksheets
  if (!blank) {
    if (submittedAt) {
      doc.setTextColor(100, 100, 100)
      doc.text(`Submitted ${submittedAt}`, pageWidth - 20, infoY + 14, { align: 'right' })
    } else if ((responses ?? []).length > 0) {
      doc.setTextColor(180, 120, 0)
      doc.text('In Progress', pageWidth - 20, infoY + 14, { align: 'right' })
    }
  }

  // ── Column widths — equal for all columns in both modes ──────────────────
  // Exact division so widths sum to exactly usableWidth with nothing left for
  // autoTable to redistribute.
  const usableWidth = pageWidth - 40  // 20 pt margin each side
  const totalCols   = strengths.length + 1
  const equalColWidth = usableWidth / totalCols

  // ── Row height ────────────────────────────────────────────────────────────
  const startY = infoY + 28

  // Blank: rows fill the page at a fixed uniform height.
  // Filled: 50 pt minimum; response content can push rows taller naturally.
  let rowHeight = 50
  if (blank) {
    // Page-based: divide remaining space so rows fill one page
    // 44 pt ≈ table header row; 24 pt ≈ footer + bottom margin
    const pageBasedHeight = Math.max(60, Math.floor(
      (pageHeight - startY - 44 - 24) / Math.max(1, prompts.length)
    ))

    // Text-based: ensure the longest prompt is fully visible when wrapped.
    // Inner text width = equalColWidth minus left+right cell padding (6 pt each).
    const col0TextWidth = equalColWidth - 12
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const lineH = 8 * doc.getLineHeightFactor()
    const maxLines = prompts.reduce((max, prompt) => {
      const lines = doc.splitTextToSize(prompt, col0TextWidth)
      return Math.max(max, lines.length)
    }, 1)
    const wrapBasedHeight = Math.ceil(maxLines * lineH) + 12  // + top & bottom padding

    rowHeight = Math.max(pageBasedHeight, wrapBasedHeight)
  }

  // ── Optimal prompt font size ──────────────────────────────────────────────
  // Climb from 8 pt upward — the largest size where every prompt still fits
  // inside its cell's inner height (rowHeight − padding). Applied uniformly so
  // the longest prompt fills its box and all shorter ones match that font size.
  // Blank: constrained by the fixed rowHeight.
  // Filled: constrained by the 50 pt minimum row height.
  const innerH = rowHeight - 12   // rowHeight minus top + bottom cell padding
  const innerW = equalColWidth - 12
  let promptFontSize = 8
  for (let fs = 9; fs <= 40; fs++) {
    doc.setFontSize(fs)
    doc.setFont('helvetica', 'bold')
    const lh = fs * doc.getLineHeightFactor()
    const fits = prompts.every(p => doc.splitTextToSize(p, innerW).length * lh <= innerH)
    if (fits) { promptFontSize = fs } else { break }
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s).headerBg))

  // Equal column widths for every column; prompt column gets additional styling
  // and the computed optimal font size.
  const columnStyles = {}
  for (let i = 0; i < totalCols; i++) {
    columnStyles[i] = { cellWidth: equalColWidth }
  }
  Object.assign(columnStyles[0], {
    fontStyle: 'bold', fillColor: [248, 249, 250],
    textColor: [50, 50, 50], fontSize: promptFontSize, overflow: 'linebreak',
  })

  autoTable(doc, {
    head: [['', ...strengths]],
    body: prompts.map((prompt, pi) => [
      prompt,
      ...strengths.map((_, si) => cellMap[`${pi}_${si}`] ?? ''),
    ]),
    startY,
    tableWidth: usableWidth,  // lock exact table width in both modes
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9, cellPadding: 6, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 8 },
    columnStyles,
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: blank ? [255, 255, 255] : [252, 252, 253] },
    didParseCell(data) {
      if (data.section === 'head') {
        data.cell.styles.fillColor = data.column.index === 0
          ? [255, 255, 255]
          : (headerColors[data.column.index - 1] ?? [59, 91, 219])
      }
      // Lock every body cell to rowHeight in blank mode so all rows are equal
      if (blank && data.section === 'body') {
        data.cell.styles.minCellHeight = rowHeight
      }
    },
    willDrawCell(data) {
      if (data.section === 'body') {
        if (blank) {
          // rowHeight is pre-calculated to fit the longest wrapped prompt,
          // so minCellHeight makes every cell — including blank ones — equal height
          data.cell.styles.minCellHeight = rowHeight
        } else {
          data.cell.styles.minCellHeight = 50
        }
      }
    },
  })

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${participant.name} · ${session.title} · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}

// ── Single downloads ──────────────────────────────────────────────────────────

export async function downloadWorksheetPDF(participant, session, responses) {
  const blob = await buildWorksheetPDF(participant, session, responses, false)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName(`${participant.name} - ${session.title}.pdf`)
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadBlankWorksheetPDF(participant, session) {
  const blob = await buildWorksheetPDF(participant, session, [], true)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName(`${participant.name} - ${session.title} (Blank).pdf`)
  a.click()
  URL.revokeObjectURL(url)
}

// ── Batch downloads ───────────────────────────────────────────────────────────

// Filled — participants who have any responses, bundled as ZIP
export async function downloadSessionPDFs(session, participants, fetchResponses, onProgress) {
  logoCache = null
  const zip = new JSZip()
  const eligible = participants.filter(p => p.responses?.length > 0)

  for (let i = 0; i < eligible.length; i++) {
    const participant = eligible[i]
    onProgress?.({ current: i + 1, total: eligible.length, name: participant.name })
    const responses = await fetchResponses(participant.id)
    const blob = await buildWorksheetPDF(participant, session, responses, false)
    zip.file(safeName(`${participant.name}.pdf`), blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName(`${session.title} - Worksheets.zip`)
  a.click()
  URL.revokeObjectURL(url)
}

// Blank — all participants, formatted for printing, bundled as ZIP
export async function downloadBlankSessionPDFs(session, participants, onProgress) {
  logoCache = null
  const zip = new JSZip()

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]
    onProgress?.({ current: i + 1, total: participants.length, name: participant.name })
    const blob = await buildWorksheetPDF(participant, session, [], true)
    zip.file(safeName(`${participant.name} - ${session.title} (Blank).pdf`), blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName(`${session.title} - Blank Worksheets.zip`)
  a.click()
  URL.revokeObjectURL(url)
}
