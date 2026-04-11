/**
 * Reads regionData.json and stamps out a hardcoded HTML partial
 * with every brain region as a hand-written div — no JS generation.
 * The output goes straight into index.html.
 */
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'src', 'regionData.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Group by lobe
const byLobe = {};
for (const [id, r] of Object.entries(data)) {
  if (!byLobe[r.lobe]) byLobe[r.lobe] = [];
  byLobe[r.lobe].push({ id, ...r });
}

let html = '';
html += '    <!-- ═══════════════════════════════════════════════════════ -->\n';
html += '    <!-- BRAIN REGION DOM STRUCTURE                            -->\n';
html += '    <!-- Auto-generated from FreeSurfer atlas regionData.json  -->\n';
html += '    <!-- Each div is a real brain region with full metadata    -->\n';
html += '    <!-- ═══════════════════════════════════════════════════════ -->\n\n';

for (const [lobe, regions] of Object.entries(byLobe)) {
  const lobeSlug = lobe.toLowerCase().replace(/\s+/g, '-');
  html += `    <!-- ── ${lobe.toUpperCase()} LOBE (${regions.length} regions) ── -->\n`;
  html += `    <div class="lobe-group" id="lobe-${lobeSlug}" data-lobe="${lobe}" data-region-count="${regions.length}" aria-label="${lobe} Lobe — ${regions.length} regions">\n\n`;

  for (const r of regions) {
    html += `      <!-- ${r.name} -->\n`;
    html += `      <div class="brain-region"\n`;
    html += `           id="region-${r.id}"\n`;
    html += `           data-region-id="${r.id}"\n`;
    html += `           data-name="${r.name}"\n`;
    html += `           data-lobe="${r.lobe}"\n`;
    html += `           data-desc="${r.desc}"\n`;
    html += `           data-vertices="${r.vertexCount}"\n`;
    html += `           data-faces="${r.faceCount}"\n`;
    html += `           data-centroid="${r.centroid.join(',')}"\n`;
    html += `           data-bbox-min="${r.bboxMin.join(',')}"\n`;
    html += `           data-bbox-max="${r.bboxMax.join(',')}"\n`;
    html += `           data-color="${r.color}"\n`;
    html += `           data-active="false"\n`;
    html += `           data-hovered="false"\n`;
    html += `           data-activation="0"\n`;
    html += `           data-connection-count="${r.connects.length}"\n`;
    html += `           aria-label="${r.name} — ${r.desc}">\n`;
    html += `        <span class="region-label">${r.name}</span>\n`;
    for (const connId of r.connects) {
      const target = data[connId];
      html += `        <span class="connection-ref" data-connects-to="${connId}" data-target-name="${target?.name || connId}" data-target-lobe="${target?.lobe || ''}"></span>\n`;
    }
    html += `      </div>\n\n`;
  }

  html += `    </div>\n\n`;
}

// Now read index.html and inject
const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace the dom-overlay div contents
const startMarker = '<div id="dom-overlay" aria-label="Brain Region DOM Mirror">';
const endMarker = '</div>\n  <div id="ui-panel">';

const startIdx = indexHtml.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find dom-overlay div in index.html');
  process.exit(1);
}

const afterStart = startIdx + startMarker.length;
const endIdx = indexHtml.indexOf('</div>', afterStart);

// Find the correct closing </div> — it's the one right before ui-panel
const uiPanelIdx = indexHtml.indexOf('<div id="ui-panel">');
// Walk backwards to find the </div> before ui-panel
let closingIdx = indexHtml.lastIndexOf('</div>', uiPanelIdx);

const newHtml = indexHtml.substring(0, afterStart) + '\n' + html + '  ' + indexHtml.substring(closingIdx);

fs.writeFileSync(indexPath, newHtml, 'utf8');

console.log(`Injected ${Object.keys(data).length} region divs across ${Object.keys(byLobe).length} lobes into index.html`);
console.log('Lobes:', Object.entries(byLobe).map(([l, r]) => `${l}(${r.length})`).join(', '));
