// Name tent layout — letter landscape (11" × 8.5"):
//
//  ┌──────┬──────────────────┬──────────────────┬──────┐
//  │ foot │    left face     │   right face     │ foot │
//  │  1"  │      4.5"        │      4.5"        │  1"  │
//  └──────┴──────────────────┴──────────────────┴──────┘
//   x=1"           x=5.5" (center fold)           x=10"
//
// When folded at center, the center fold becomes the TOP of the tent.
// Each face is 4.5" wide × 8.5" tall on the flat page.
// The text content (8.5" × 4.5") is placed inside the face panel and
// rotated 90° so that it reads correctly when the tent is standing:
//   - Right face: rotate(90deg)  — top of text points LEFT  (toward fold)
//   - Left face:  rotate(-90deg) — top of text points RIGHT (toward fold)

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

// Build one face panel (4.5" × 8.5" on flat page).
// Content is a 8.5" × 4.5" box rotated into place so it reads correctly when standing.
// rotation: 90 for right face, -90 for left face.
function buildFace(name, strengths, rotation) {
  const strengthRows = strengths.map(s =>
    `<div style="font-size:18pt;font-weight:800;color:${DOMAIN_COLOR[s] || '#374151'};margin:2px 0;">${esc(s)}</div>`
  ).join('')

  return `
    <div style="position:relative;width:4.5in;height:8.5in;flex-shrink:0;overflow:hidden;">
      <div style="
        position:absolute;
        width:8.5in;
        height:4.5in;
        top:50%;
        left:50%;
        margin-top:-2.25in;
        margin-left:-4.25in;
        transform:rotate(${rotation}deg);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:6px;
        padding:0.25in;
      ">
        <div style="font-size:40pt;font-weight:900;color:#111827;text-align:center;line-height:1.05;letter-spacing:-0.03em;">${esc(name)}</div>
        <div style="display:flex;flex-direction:column;align-items:center;margin-top:8px;">
          ${strengthRows}
        </div>
      </div>
    </div>`
}

function buildTentPage(name, strengths) {
  // Tick marks at top and bottom edges at each fold line position
  const tick = (left) => `
    <div style="position:absolute;left:${left};top:0;height:0.2in;width:1px;background:#555;"></div>
    <div style="position:absolute;left:${left};bottom:0;height:0.2in;width:1px;background:#555;"></div>`

  return `
    <div style="position:relative;width:11in;height:8.5in;display:flex;flex-direction:row;page-break-after:always;background:white;">
      ${tick('1in')}
      ${tick('5.5in')}
      ${tick('10in')}
      <!-- left foot -->
      <div style="width:1in;flex-shrink:0;"></div>
      <!-- left face: +90deg -->
      ${buildFace(name, strengths, 90)}
      <!-- right face: -90deg -->
      ${buildFace(name, strengths, -90)}
      <!-- right foot -->
      <div style="width:1in;flex-shrink:0;"></div>
    </div>`
}

export function printNameTents(people) {
  const pages = people.map(p => {
    const strengths = (p.top5 ?? []).filter(Boolean)
    return buildTentPage(p.name, strengths)
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: letter landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: white; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
