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

// Core PDF builder — returns a jsPDF blob
async function buildWorksheetPDF(participant, session, responses) {
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

  if (submittedAt) {
    doc.setTextColor(100, 100, 100)
    doc.text(`Submitted ${submittedAt}`, pageWidth - 20, infoY + 14, { align: 'right' })
  } else {
    doc.setTextColor(180, 120, 0)
    doc.text('In Progress', pageWidth - 20, infoY + 14, { align: 'right' })
  }

  // ── Table ──────────────────────────────────────────────────────────────────
  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s).headerBg))

  autoTable(doc, {
    head: [['', ...strengths]],
    body: prompts.map((prompt, pi) => [
      prompt,
      ...strengths.map((_, si) => cellMap[`${pi}_${si}`] ?? ''),
    ]),
    startY: infoY + 28,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 9, cellPadding: 6, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 8 },
    columnStyles: { 0: { cellWidth: 130, fontStyle: 'bold', fillColor: [248, 249, 250], textColor: [50, 50, 50], fontSize: 9 } },
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didParseCell(data) {
      if (data.section === 'head') {
        data.cell.styles.fillColor = data.column.index === 0
          ? [255, 255, 255]
          : (headerColors[data.column.index - 1] ?? [59, 91, 219])
      }
    },
    willDrawCell(data) {
      if (data.section === 'body' && data.column.index > 0) data.cell.styles.minCellHeight = 50
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
      doc.internal.pageSize.getHeight() - 12,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

// Single download
export async function downloadWorksheetPDF(participant, session, responses) {
  const blob = await buildWorksheetPDF(participant, session, responses)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = safeName(`${participant.name} - ${session.title}.pdf`)
  a.click()
  URL.revokeObjectURL(url)
}

// Batch download — all participants with any responses, bundled as a ZIP
export async function downloadSessionPDFs(session, participants, fetchResponses, onProgress) {
  logoCache = null // reset so we get a fresh load
  const zip = new JSZip()
  const eligible = participants.filter(p => p.responses?.length > 0)

  for (let i = 0; i < eligible.length; i++) {
    const participant = eligible[i]
    onProgress?.({ current: i + 1, total: eligible.length, name: participant.name })
    const responses = await fetchResponses(participant.id)
    const blob = await buildWorksheetPDF(participant, session, responses)
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
