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

  // Header with logo
  let headerBottom = 20
  const logo = await loadLogoDataUrl()
  if (logo) {
    const logoH = 44
    const logoW = (logo.width / logo.height) * logoH
    doc.addImage(logo.dataUrl, 'PNG', 20, 12, logoW, logoH)
    headerBottom = 12 + logoH + 6
  }

  doc.setDrawColor(220, 220, 220)
  doc.line(20, headerBottom, pageWidth - 20, headerBottom)

  const infoY = headerBottom + 13
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(reportName, 20, infoY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(personName, 20, infoY + 13)

  const startY = infoY + 26
  const usableWidth = pageWidth - 40
  const totalCols = strengths.length + 1
  const equalColWidth = usableWidth / totalCols
  const cellPadding = 5
  const innerW = equalColWidth - 2 * cellPadding

  // ── Single-page fit + fill ─────────────────────────────────────────────────
  // Divide available vertical space evenly so rows fill the page.
  const footerReserved = 30
  const headRowH = 28   // estimated header row height
  const numRows = rowLabels.length
  const availableH = pageHeight - startY - footerReserved
  const minCellH = Math.max(20, (availableH - headRowH) / numRows)

  // Find the largest font size (max 11) where every body cell fits in minCellH.
  const tableBody = rowLabels.map((label, ri) => [
    label,
    ...strengths.map((_, ci) => getCell(ri, ci)),
  ])

  let fontSize = 11
  for (let fs = 11; fs >= 7; fs--) {
    doc.setFontSize(fs)
    doc.setFont('helvetica', 'normal')
    const lh = fs * doc.getLineHeightFactor()
    const fits = tableBody.every(row => {
      const maxLines = Math.max(...row.map(cell => countLines(doc, cell, innerW)))
      return maxLines * lh + 2 * cellPadding <= minCellH
    })
    if (fits) { fontSize = fs; break }
    if (fs === 7) fontSize = 7
  }

  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s)?.headerBg ?? '#3b5bdb'))

  const columnStyles = {}
  for (let i = 0; i < totalCols; i++) {
    columnStyles[i] = { cellWidth: equalColWidth }
  }
  Object.assign(columnStyles[0], {
    fontStyle: 'bold',
    fillColor: [248, 249, 250],
    textColor: [50, 50, 50],
    fontSize,
    overflow: 'linebreak',
  })

  autoTable(doc, {
    head: [['', ...strengths]],
    body: tableBody,
    startY,
    tableWidth: usableWidth,
    margin: { left: 20, right: 20 },
    styles: { fontSize, cellPadding, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: fontSize + 1, halign: 'center', cellPadding: 6 },
    columnStyles,
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didParseCell(data) {
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.fillColor = headerColors[data.column.index - 1] ?? [59, 91, 219]
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
    willDrawCell(data) {
      if (data.section === 'body') {
        data.cell.styles.minCellHeight = minCellH
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
  if (logo) {
    const logoH = 40
    const logoW = (logo.width / logo.height) * logoH
    doc.addImage(logo.dataUrl, 'PNG', 20, 12, logoW, logoH)
    headerBottom = 12 + logoH + 6
  }

  doc.setDrawColor(220, 220, 220)
  doc.line(20, headerBottom, pageWidth - 20, headerBottom)

  const infoY = headerBottom + 15
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('Bring - Need', 20, infoY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(person.name, 20, infoY + 14)

  const startY = infoY + 26
  const usableWidth = pageWidth - 40
  const themeColWidth = 90
  const textColWidth = (usableWidth - themeColWidth) / 2

  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s)?.headerBg ?? '#3b5bdb'))

  // ── Single-page fit + fill ─────────────────────────────────────────────────
  const cellPadding = 6
  const innerTextW = textColWidth - 2 * cellPadding
  const footerReserved = 30
  const headRowH = 30
  const numRows = strengths.length
  const availableH = pageHeight - startY - footerReserved
  const minCellH = Math.max(24, (availableH - headRowH) / numRows)

  const tableBody = strengths.map(s => [s, BRING_NEED[s]?.bring ?? '', BRING_NEED[s]?.need ?? ''])

  let fontSize = 11
  for (let fs = 11; fs >= 7; fs--) {
    doc.setFontSize(fs)
    doc.setFont('helvetica', 'normal')
    const lh = fs * doc.getLineHeightFactor()
    const fits = tableBody.every(row => {
      // columns 1 and 2 are the wide text columns; column 0 (theme name) always fits
      const maxLines = Math.max(
        countLines(doc, row[1], innerTextW),
        countLines(doc, row[2], innerTextW),
      )
      return maxLines * lh + 2 * cellPadding <= minCellH
    })
    if (fits) { fontSize = fs; break }
    if (fs === 7) fontSize = 7
  }

  autoTable(doc, {
    head: [['Theme', 'I Bring', 'I Need']],
    body: tableBody,
    startY,
    tableWidth: usableWidth,
    margin: { left: 20, right: 20 },
    styles: { fontSize, cellPadding, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: fontSize + 1, halign: 'center', cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: themeColWidth, fontStyle: 'bold', fontSize: fontSize + 1 },
      1: { cellWidth: textColWidth },
      2: { cellWidth: textColWidth },
    },
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = headerColors[data.row.index] ?? [59, 91, 219]
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
    willDrawCell(data) {
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
