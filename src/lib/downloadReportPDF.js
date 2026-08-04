import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PERSONAL_INSIGHTS, ROWS } from '../data/personalInsights'
import { BRING_NEED } from '../data/bringNeed'
import { getStrengthColors } from './strengthColors'

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

async function loadLogoDataUrl() {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => resolve(null)
    img.src = '/logo.png'
  })
}

// Returns the number of visual lines text will occupy at the current doc font
// settings inside the given inner width, accounting for \n line breaks.
function countLines(doc, text, innerW) {
  if (!text) return 1
  let total = 0
  for (const para of String(text).split('\n')) {
    total += doc.splitTextToSize(para || ' ', innerW).length
  }
  return total
}

async function buildReportPDF(reportName, personName, strengths, rowLabels, getCell) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── Header: logo left, "Report for Name" right ───────────────────────────
  let headerBottom = 20
  const logo = await loadLogoDataUrl()
  const logoH = 44
  if (logo) {
    const logoW = (logo.width / logo.height) * logoH
    doc.addImage(logo.dataUrl, 'PNG', 20, 12, logoW, logoH)
    headerBottom = 12 + logoH + 6
  }

  // Title lives in the header bar — baseline vertically centered with the logo
  const titleY = 12 + logoH / 2 + 6
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(`${reportName} for ${personName}`, pageWidth - 20, titleY, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.line(20, headerBottom, pageWidth - 20, headerBottom)

  // Table starts just below the divider — no extra title block needed
  const startY = headerBottom + 8
  const usableWidth = pageWidth - 40
  const col0Width = 118  // narrower fixed label column, matches benchmark proportion
  const contentColWidth = (usableWidth - col0Width) / strengths.length
  const cellPadding = 4
  const innerW = contentColWidth - 2 * cellPadding  // used for content-column text measurement

  // ── Single-page fit + fill ─────────────────────────────────────────────────
  const footerReserved = 30
  const availableH = pageHeight - startY - footerReserved
  const numRows = rowLabels.length

  const tableBody = rowLabels.map((label, ri) => [
    label,
    ...strengths.map((_, ci) => getCell(ri, ci)),
  ])

  // Head row at 14pt, 5pt padding each side
  const headFontSize = 14
  doc.setFontSize(headFontSize)
  const headRowH = headFontSize * doc.getLineHeightFactor() + 10
  const maxBodyH = availableH - headRowH

  // Col 0: 12pt bold, wraps freely — compute how tall each label is
  const col0FS = 12
  doc.setFontSize(col0FS)
  doc.setFont('helvetica', 'bold')
  const col0LH = col0FS * doc.getLineHeightFactor()
  const col0InnerW = col0Width - 2 * cellPadding
  const col0Heights = tableBody.map(row =>
    countLines(doc, row[0], col0InnerW) * col0LH + 2 * cellPadding
  )

  // Per-row font sizes for content columns: start at 12pt and reduce only the
  // tallest rows until the total body height fits on one page. This keeps most
  // rows at 12pt (readable) while shrinking only content-dense rows as needed.
  const rowFontSizes = new Array(numRows).fill(12)

  function rowContentH(ri, fs) {
    doc.setFontSize(fs)
    doc.setFont('helvetica', 'normal')
    const lh = fs * doc.getLineHeightFactor()
    const cells = tableBody[ri].slice(1)
    const maxLines = cells.some(c => c) ? Math.max(1, ...cells.map(c => countLines(doc, c, innerW))) : 1
    return Math.max(col0Heights[ri], maxLines * lh + 2 * cellPadding)
  }

  let rowNeededH = rowFontSizes.map((fs, ri) => rowContentH(ri, fs))

  for (let iter = 0; iter < 80; iter++) {
    if (rowNeededH.reduce((s, h) => s + h, 0) <= maxBodyH) break
    let worstRI = -1, worstH = 0
    for (let ri = 0; ri < numRows; ri++) {
      if (rowFontSizes[ri] > 7 && rowNeededH[ri] > worstH) { worstRI = ri; worstH = rowNeededH[ri] }
    }
    if (worstRI === -1) break
    rowFontSizes[worstRI]--
    rowNeededH[worstRI] = rowContentH(worstRI, rowFontSizes[worstRI])
  }

  // Distribute any leftover vertical space evenly to fill the page
  const totalNeededH = rowNeededH.reduce((s, h) => s + h, 0)
  const extraPerRow = Math.max(0, maxBodyH - totalNeededH) / numRows
  const rowMinHeights = rowNeededH.map(h => h + extraPerRow)

  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s)?.headerBg ?? '#3b5bdb'))

  const columnStyles = { 0: { cellWidth: col0Width } }
  for (let i = 1; i <= strengths.length; i++) {
    columnStyles[i] = { cellWidth: contentColWidth }
  }
  Object.assign(columnStyles[0], {
    fontStyle: 'bold',
    fillColor: [248, 249, 250],
    textColor: [50, 50, 50],
    fontSize: col0FS,
    overflow: 'linebreak',
  })

  autoTable(doc, {
    head: [['', ...strengths]],
    body: tableBody,
    startY,
    tableWidth: usableWidth,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 12, cellPadding, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: headFontSize, halign: 'center', cellPadding: 5 },
    columnStyles,
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didParseCell(data) {
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.fillColor = headerColors[data.column.index - 1] ?? [59, 91, 219]
        data.cell.styles.textColor = [255, 255, 255]
      }
      if (data.section === 'body') {
        data.cell.styles.minCellHeight = rowMinHeights[data.row.index]
        if (data.column.index > 0) {
          data.cell.styles.fontSize = rowFontSizes[data.row.index]
        }
      }
    },
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(170, 170, 170)
    doc.setDrawColor(210, 210, 210)
    doc.line(20, pageHeight - 22, pageWidth - 20, pageHeight - 22)
    doc.text(
      'Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.',
      pageWidth / 2, pageHeight - 12, { align: 'center' }
    )
  }

  return doc
}

export async function downloadPersonalInsightsPDF(person) {
  const strengths = (person.top5 ?? []).filter(s => PERSONAL_INSIGHTS[s])
  const rowLabels = ROWS.map((row, i) => i === 0 ? person.name : row.label)

  const doc = await buildReportPDF(
    'Personal Insights',
    person.name,
    strengths,
    rowLabels,
    (ri, ci) => PERSONAL_INSIGHTS[strengths[ci]]?.[ROWS[ri].key] ?? '',
  )

  doc.save(safeName(`${person.name} - Personal Insights.pdf`))
}

export async function downloadCustomReportPDF(reportName, person, rows, insights) {
  const strengths = (person.top5 ?? []).filter(Boolean)
  const rowLabels = rows.map(r => r.label)

  const doc = await buildReportPDF(
    reportName,
    person.name,
    strengths,
    rowLabels,
    (ri, ci) => insights?.[strengths[ci]]?.[rows[ri].id] ?? '',
  )

  doc.save(safeName(`${person.name} - ${reportName}.pdf`))
}

// Bring - Need lays strengths down the side (one row per theme) with two
// columns — "I Bring" and "I Need" — instead of strengths across the top.
export async function downloadBringNeedPDF(person) {
  const strengths = (person.top5 ?? []).filter(s => BRING_NEED[s])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  let headerBottom = 20
  const logo = await loadLogoDataUrl()
  const logoH = 40
  if (logo) {
    const logoW = (logo.width / logo.height) * logoH
    doc.addImage(logo.dataUrl, 'PNG', 20, 12, logoW, logoH)
    headerBottom = 12 + logoH + 6
  }

  const titleY = 12 + logoH / 2 + 6
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(`Bring - Need for ${person.name}`, pageWidth - 20, titleY, { align: 'right' })

  doc.setDrawColor(220, 220, 220)
  doc.line(20, headerBottom, pageWidth - 20, headerBottom)

  const startY = headerBottom + 8
  const usableWidth = pageWidth - 40
  const themeColWidth = 90
  const textColWidth = (usableWidth - themeColWidth) / 2

  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s)?.headerBg ?? '#3b5bdb'))

  // ── Single-page fit + fill ─────────────────────────────────────────────────
  const cellPadding = 6
  const innerTextW = textColWidth - 2 * cellPadding
  const footerReserved = 30
  const availableH = pageHeight - startY - footerReserved
  const numRows = strengths.length

  const tableBody = strengths.map(s => [s, BRING_NEED[s]?.bring ?? '', BRING_NEED[s]?.need ?? ''])

  // Phase 1: find largest font size (max 12) using conservative head height.
  const searchHeadRowH = 32
  const searchMinCellH = Math.max(24, (availableH - searchHeadRowH) / numRows)

  let fontSize = 12
  for (let fs = 12; fs >= 7; fs--) {
    doc.setFontSize(fs)
    doc.setFont('helvetica', 'normal')
    const lh = fs * doc.getLineHeightFactor()
    const fits = tableBody.every(row => {
      const maxLines = Math.max(
        countLines(doc, row[1], innerTextW),
        countLines(doc, row[2], innerTextW),
      )
      return maxLines * lh + 2 * cellPadding <= searchMinCellH
    })
    if (fits) { fontSize = fs; break }
    if (fs === 7) fontSize = 7
  }

  // Phase 2: accurate minCellH now that fontSize is known.
  const headFontSize = fontSize + 2
  doc.setFontSize(headFontSize)
  const headRowH = headFontSize * doc.getLineHeightFactor() + 12
  const minCellH = Math.max(24, (availableH - headRowH) / numRows)

  const col0FontSize = Math.min(fontSize + 2, 14)

  autoTable(doc, {
    head: [['Theme', 'I Bring', 'I Need']],
    body: tableBody,
    startY,
    tableWidth: usableWidth,
    margin: { left: 20, right: 20 },
    styles: { fontSize, cellPadding, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: headFontSize, halign: 'center', cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: themeColWidth, fontStyle: 'bold', fontSize: col0FontSize },
      1: { cellWidth: textColWidth },
      2: { cellWidth: textColWidth },
    },
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = headerColors[data.row.index] ?? [59, 91, 219]
        data.cell.styles.textColor = [255, 255, 255]
      }
      if (data.section === 'body') {
        data.cell.styles.minCellHeight = minCellH
      }
    },
  })

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(170, 170, 170)
    doc.setDrawColor(210, 210, 210)
    doc.line(20, pageHeight - 22, pageWidth - 20, pageHeight - 22)
    doc.text(
      'Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.',
      pageWidth / 2, pageHeight - 12, { align: 'center' }
    )
  }

  doc.save(safeName(`${person.name} - Bring - Need.pdf`))
}
