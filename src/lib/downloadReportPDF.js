import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PERSONAL_INSIGHTS, ROWS } from '../data/personalInsights'
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

  const headerColors = strengths.map(s => hexToRgb(getStrengthColors(s)?.headerBg ?? '#3b5bdb'))

  const columnStyles = {}
  for (let i = 0; i < totalCols; i++) {
    columnStyles[i] = { cellWidth: equalColWidth }
  }
  Object.assign(columnStyles[0], {
    fontStyle: 'bold',
    fillColor: [248, 249, 250],
    textColor: [50, 50, 50],
    fontSize: 8,
    overflow: 'linebreak',
  })

  autoTable(doc, {
    head: [['', ...strengths]],
    body: rowLabels.map((label, ri) => [
      label,
      ...strengths.map((_, ci) => getCell(ri, ci)),
    ]),
    startY,
    tableWidth: usableWidth,
    margin: { left: 20, right: 20 },
    styles: { fontSize: 8, cellPadding: 5, valign: 'top', overflow: 'linebreak', lineColor: [220, 220, 220], lineWidth: 0.5 },
    headStyles: { fillColor: [59, 91, 219], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'center', cellPadding: 6 },
    columnStyles,
    bodyStyles: { textColor: [40, 40, 40], fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [252, 252, 253] },
    didParseCell(data) {
      if (data.section === 'head' && data.column.index > 0) {
        data.cell.styles.fillColor = headerColors[data.column.index - 1] ?? [59, 91, 219]
        data.cell.styles.textColor = [255, 255, 255]
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
