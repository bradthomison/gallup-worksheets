// Name tent layout — letter landscape (11" × 8.5"):
//
//  ┌──────┬──────────────────┬──────────────────┬──────┐
//  │ foot │    left face     │   right face     │ foot │
//  │  1"  │      4.5"        │      4.5"        │  1"  │
//  └──────┴──────────────────┴──────────────────┴──────┘
//   x=1"           x=5.5" (center fold)           x=10"
//
// When folded at center, the center fold becomes the TOP of the tent.
// Content boxes are 8.5"×4.5" (wider than tall), placed with absolute positioning
// at the center of each face area, then rotated so text runs toward the ridge:
//   - Left face center: x=3.25", y=4.25" — rotate(90deg) puts name toward x=5.5" (fold)
//   - Right face center: x=7.75", y=4.25" — rotate(-90deg) puts name toward x=5.5" (fold)

const DOMAIN_COLOR = {
  Analytical: '#16a34a', Context: '#16a34a', Futuristic: '#16a34a', Ideation: '#16a34a',
  Input: '#16a34a', Intellection: '#16a34a', Learner: '#16a34a', Strategic: '#16a34a',
  Activator: '#ea580c', Command: '#ea580c', Communication: '#ea580c', Competition: '#ea580c',
  Maximizer: '#ea580c', 'Self-Assurance': '#ea580c', Significance: '#ea580c', Woo: '#ea580c',
  Adaptability: '#2563eb', Connectedness: '#2563eb', Developer: '#2563eb', Empathy: '#2563eb',
  Harmony: '#2563eb', Includer: '#2563eb', Individualization: '#2563eb', Positivity: '#2563eb', Relator: '#2563eb',
  Achiever: '#7c3aed', Arranger: '#7c3aed', Belief: '#7c3aed', Consistency: '#7c3aed',
  Deliberative: '#7c3aed', Discipline: '#7c3aed', Focus: '#7c3aed', Responsibility: '#7c3aed', Restorative: '#7c3aed',
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Build a rotated face block centered at (cx, cy) on the page.
// The content box is 8.5"×4.5" laid out normally (name top, strengths below),
// then rotated so "top" points toward the center fold ridge.
// rotation 90: name goes RIGHT (for left face, fold is on the right)
// rotation -90: name goes LEFT (for right face, fold is on the left)
function buildFace(name, strengths, cx, cy, rotation) {
  const strengthRows = strengths.map(s =>
    `<div style="font-size:18pt;font-weight:800;color:${DOMAIN_COLOR[s] || '#374151'};margin:2px 0;">${esc(s)}</div>`
  ).join('')

  return `
    <div style="
      position:absolute;
      width:8.5in;
      height:4.5in;
      left:${cx};
      top:${cy};
      transform-origin:center center;
      transform:translate(-50%,-50%) rotate(${rotation}deg);
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:6px;
      padding:0.3in;
    ">
      <div style="font-size:40pt;font-weight:900;color:#111827;text-align:center;line-height:1.05;letter-spacing:-0.03em;">${esc(name)}</div>
      <div style="display:flex;flex-direction:column;align-items:center;margin-top:8px;">
        ${strengthRows}
      </div>
    </div>`
}

function buildTentPage(name, strengths, breakAfter) {
  const tick = (left) => `
    <div style="position:absolute;left:${left};top:0;height:0.2in;width:1px;background:#555;"></div>
    <div style="position:absolute;left:${left};bottom:0;height:0.2in;width:1px;background:#555;"></div>`

  return `
    <div style="position:relative;width:100vw;height:100vh;overflow:hidden;${breakAfter ? 'page-break-after:always;' : ''}background:white;">
      ${tick('1in')}
      ${tick('5.5in')}
      ${tick('10in')}
      ${buildFace(name, strengths, '3.25in', '4.25in', 90)}
      ${buildFace(name, strengths, '7.75in', '4.25in', -90)}
    </div>`
}

export function printNameTents(people) {
  const pages = people.map((p, i) => {
    const strengths = (p.top5 ?? []).filter(Boolean)
    return buildTentPage(p.name, strengths, i < people.length - 1)
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: letter landscape; margin: 0; }
  html, body { margin: 0; padding: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; background: white; }
  * { box-sizing: border-box; }
  @media print {
    html, body { overflow: hidden; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${pages}
<script>window.addEventListener('load', function() { window.print(); });</script>
</body>
</html>`

  const win = window.open('', '_blank')
  win.document.open()
  win.document.write(html)
  win.document.close()
}
