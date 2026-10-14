// Fold layout (landscape 11" × 8.5"):
//  [left foot ~1"] | [back face ~4.5"] | [front face ~4.5"] | [right foot ~1"]
// Fold marks at 9.09% (1"), 50%, 90.91% (10")
// Back face content is rotated 180° so it reads correctly from behind the tent.

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

function faceHTML(name, strengths) {
  const rows = strengths.map(s =>
    `<div style="font-size:20pt;font-weight:800;color:${DOMAIN_COLOR[s] || '#374151'};margin:3px 0;letter-spacing:-0.01em;">${esc(s)}</div>`
  ).join('')
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;">
      <div style="display:flex;flex-direction:column;align-items:center;">${rows}</div>
      <div style="font-size:44pt;font-weight:900;color:#111827;text-align:center;line-height:1.05;letter-spacing:-0.03em;">${esc(name)}</div>
    </div>`
}

function buildTentPage(name, strengths) {
  const face = faceHTML(name, strengths)
  return `
    <div class="page">
      <div class="fold-row">
        <div class="tick" style="left:9.09%"></div>
        <div class="tick" style="left:50%"></div>
        <div class="tick" style="left:90.91%"></div>
      </div>
      <div class="panels">
        <!-- left foot -->
        <div style="flex:0 0 9.09%;"></div>
        <!-- back face: same content, rotated 180° so it reads correctly from behind -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;transform:rotate(180deg);border-right:1px solid #d1d5db;">
          ${face}
        </div>
        <!-- front face: upright, faces the audience -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;border-right:1px solid #d1d5db;">
          ${face}
        </div>
        <!-- right foot -->
        <div style="flex:0 0 9.09%;"></div>
      </div>
      <div class="fold-row">
        <div class="tick" style="left:9.09%"></div>
        <div class="tick" style="left:50%"></div>
        <div class="tick" style="left:90.91%"></div>
      </div>
    </div>`
}

export function printNameTents(people) {
  // people: array of { name, top5 }
  const pages = people.map(p => {
    const strengths = (p.top5 ?? []).filter(Boolean)
    return buildTentPage(p.name, strengths)
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: landscape; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: white; }
  .page { width: 100vw; height: 100vh; display: flex; flex-direction: column; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .fold-row { height: 12px; position: relative; flex-shrink: 0; }
  .tick { position: absolute; top: 0; bottom: 0; width: 1px; background: #555; transform: translateX(-50%); }
  .panels { flex: 1; display: flex; }
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
