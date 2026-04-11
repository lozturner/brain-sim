import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import regionData from './regionData.json';

// ─── PRESETS ────────────────────────────────────────────────
const PRESETS = {
  'See an Object': {
    desc: 'Visual processing: eyes to recognition to understanding',
    chain: ['lateral_occipital_L', 'lateral_occipital_R', 'lingual_gyrus_L', 'fusiform_gyrus_L', 'fusiform_gyrus_R', 'inferior_temporal_L', 'inferior_parietal_L', 'middle_frontal_L']
  },
  'Hear Speech': {
    desc: "Sound to language comprehension",
    chain: ['superior_temporal_L', 'superior_temporal_R', 'middle_temporal_L', 'inferior_frontal_L', 'middle_frontal_L', 'insula_L']
  },
  'Speak a Word': {
    desc: "Language production pathway",
    chain: ['middle_frontal_L', 'inferior_frontal_L', 'insula_L', 'precentral_gyrus_L', 'precentral_gyrus_R', 'cerebellum_L', 'cerebellum_R']
  },
  'Fight or Flight': {
    desc: 'Threat → amygdala → full body response',
    chain: ['lateral_occipital_L', 'superior_temporal_R', 'insula_L', 'insula_R', 'anterior_cingulate_L', 'anterior_cingulate_R', 'orbitofrontal_L', 'precentral_gyrus_L', 'precentral_gyrus_R']
  },
  'Form a Memory': {
    desc: 'Experience → hippocampus → long-term storage',
    chain: ['frontal_pole', 'anterior_cingulate_L', 'temporal_pole_L', 'fusiform_gyrus_L', 'posterior_cingulate_L', 'posterior_cingulate_R', 'middle_temporal_L']
  },
  'Move Your Hand': {
    desc: 'Motor planning → execution → coordination',
    chain: ['middle_frontal_R', 'superior_frontal_R', 'precentral_gyrus_L', 'postcentral_gyrus_L', 'superior_parietal_L', 'cerebellum_R', 'cerebellum_L']
  },
  'Read Text': {
    desc: 'Visual word form → comprehension → meaning',
    chain: ['lateral_occipital_L', 'fusiform_gyrus_L', 'middle_temporal_L', 'superior_temporal_L', 'inferior_frontal_L', 'middle_frontal_L', 'anterior_cingulate_L']
  },
  'Feel Pain': {
    desc: 'Somatosensory → emotional processing → response',
    chain: ['postcentral_gyrus_R', 'postcentral_gyrus_L', 'insula_L', 'insula_R', 'anterior_cingulate_L', 'anterior_cingulate_R', 'orbitofrontal_L', 'frontal_pole']
  },
  'Face Recognition': {
    desc: 'Fusiform face area → social cognition',
    chain: ['lateral_occipital_R', 'fusiform_gyrus_R', 'fusiform_gyrus_L', 'superior_temporal_R', 'temporal_pole_R', 'orbitofrontal_R', 'frontal_pole']
  },
  'Daydreaming': {
    desc: 'Default mode network activation',
    chain: ['frontal_pole', 'anterior_cingulate_L', 'anterior_cingulate_R', 'posterior_cingulate_L', 'posterior_cingulate_R', 'inferior_parietal_L', 'inferior_parietal_R', 'temporal_pole_L', 'temporal_pole_R']
  },
  'Full Brain Storm': {
    desc: 'Global activation cascade',
    chain: Object.keys(regionData)
  }
};

const LOBE_COLORS_HEX = {
  'Frontal': '#4488ff',
  'Parietal': '#44cc88',
  'Temporal': '#eeaa33',
  'Occipital': '#cc44aa',
  'Limbic': '#ff7744',
  'Cerebellum': '#55ddaa',
};

// ─── SCENE SETUP ────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060610, 0.06);

const camera = new THREE.PerspectiveCamera(50, (window.innerWidth - 320) / window.innerHeight, 0.1, 100);
camera.position.set(0, 1, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth - 320, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
container.appendChild(renderer.domElement);

// ─── LIGHTING ───────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0x1a2244, 0.8));
const keyLight = new THREE.DirectionalLight(0x6688cc, 1.0);
keyLight.position.set(3, 5, 4);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x4466aa, 0.5);
rimLight.position.set(-3, 2, -4);
scene.add(rimLight);
const fillLight = new THREE.DirectionalLight(0x223355, 0.4);
fillLight.position.set(0, -3, 2);
scene.add(fillLight);
const innerGlow = new THREE.PointLight(0x3355aa, 0.5, 6);
scene.add(innerGlow);

// ─── BRAIN GROUP ────────────────────────────────────────────
const brainGroup = new THREE.Group();
scene.add(brainGroup);

// ─── STATE ──────────────────────────────────────────────────
const regionMeshes = {};
const regionStates = {};
const pathwayLines = [];
let hoveredRegion = null;
let speed = 1.0;
let regionOpacity = 0.5;
let showConnections = true;
let autoRotate = true;
let rotateSpeed = 0.002;
let regionsLoaded = 0;
const totalRegions = Object.keys(regionData).length;

// ─── LOAD ALL REGION OBJs ───────────────────────────────────
const loader = new OBJLoader();

for (const [id, r] of Object.entries(regionData)) {
  const color = new THREE.Color(r.color);

  regionStates[id] = { activation: 0, active: false, targetActivation: 0 };

  loader.load(`/models/${r.file}`, (obj) => {
    let mesh = null;
    obj.traverse((child) => {
      if (child.isMesh) mesh = child;
    });
    if (!mesh) return;

    mesh.material = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color.clone(),
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: regionOpacity,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    mesh.userData = { regionId: id };
    mesh.renderOrder = 1;
    brainGroup.add(mesh);
    regionMeshes[id] = mesh;

    regionsLoaded++;
    if (regionsLoaded === totalRegions) {
      console.log(`All ${totalRegions} brain regions loaded`);
    }
  }, undefined, (err) => {
    console.warn(`Failed to load ${r.file}:`, err);
  });
}

// ─── BUILD PATHWAYS ─────────────────────────────────────────
const pathwayGroup = new THREE.Group();
brainGroup.add(pathwayGroup);

const builtPaths = new Set();
for (const [id, r] of Object.entries(regionData)) {
  for (const targetId of r.connects) {
    if (!regionData[targetId]) continue;
    const key = [id, targetId].sort().join('--');
    if (builtPaths.has(key)) continue;
    builtPaths.add(key);

    const from = new THREE.Vector3(...r.centroid);
    const to = new THREE.Vector3(...regionData[targetId].centroid);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0));
    if (dir.length() > 0.001) dir.normalize().multiplyScalar(0.08);
    mid.add(dir);

    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const points = curve.getPoints(20);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x223366, transparent: true, opacity: 0.08 });
    const line = new THREE.Line(geo, mat);
    line.userData = { fromId: id, toId: targetId };
    line.renderOrder = 2;
    pathwayGroup.add(line);
    pathwayLines.push(line);
  }
}

// ─── SIGNAL PARTICLES ───────────────────────────────────────
const particlePool = [];
const MAX_PARTICLES = 600;
const particleGeo = new THREE.SphereGeometry(0.025, 6, 6);

function spawnSignal(fromId, toId) {
  const r1 = regionData[fromId], r2 = regionData[toId];
  if (!r1 || !r2) return;
  const from = new THREE.Vector3(...r1.centroid);
  const to = new THREE.Vector3(...r2.centroid);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0));
  if (dir.length() > 0.001) dir.normalize().multiplyScalar(0.08);
  mid.add(dir);
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);

  let p = particlePool.find(p => !p.userData.alive);
  if (!p && particlePool.length < MAX_PARTICLES) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.9 });
    p = new THREE.Mesh(particleGeo, mat);
    p.userData = { alive: false };
    p.renderOrder = 3;
    brainGroup.add(p);
    particlePool.push(p);
  }
  if (!p) return;

  p.visible = true;
  p.userData = { alive: true, curve, t: 0, speed: (0.4 + Math.random() * 0.5) * speed };
  p.material.color.set(regionData[fromId].color);
}

// ─── ACTIVITY PROPAGATION ───────────────────────────────────
const pendingActivations = [];

function activateRegion(id, propagate = true) {
  if (!regionStates[id]) return;
  regionStates[id].active = true;
  regionStates[id].targetActivation = 1.0;

  if (propagate) {
    const r = regionData[id];
    r.connects.forEach((targetId, i) => {
      if (!regionData[targetId]) return;
      const delay = (200 + i * 100) / speed;
      pendingActivations.push({ regionId: targetId, time: performance.now() + delay });
      setTimeout(() => spawnSignal(id, targetId), (40 + i * 60) / speed);
    });
  }
}

function deactivateRegion(id) {
  if (!regionStates[id]) return;
  regionStates[id].active = false;
  regionStates[id].targetActivation = 0;
}

function deactivateAll() {
  for (const id of Object.keys(regionStates)) deactivateRegion(id);
  pendingActivations.length = 0;
}

function runPreset(name) {
  deactivateAll();
  const preset = PRESETS[name];
  if (!preset) return;
  preset.chain.forEach((id, i) => {
    setTimeout(() => activateRegion(id, false), i * (300 / speed));
    if (i > 0) setTimeout(() => spawnSignal(preset.chain[i - 1], id), i * (300 / speed));
  });
}

// ─── ORBIT CONTROLS ─────────────────────────────────────────
let isDragging = false, prevMouse = { x: 0, y: 0 };
let rotY = 0, rotX = 0.15, targetRotY = 0, targetRotX = 0.15;
let zoom = 6, targetZoom = 6;

renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true; prevMouse = { x: e.clientX, y: e.clientY };
  autoRotate = false;
  document.getElementById('rotate-toggle')?.classList.remove('active');
});
renderer.domElement.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  targetRotY += (e.clientX - prevMouse.x) * 0.005;
  targetRotX += (e.clientY - prevMouse.y) * 0.005;
  targetRotX = Math.max(-1.3, Math.min(1.3, targetRotX));
  prevMouse = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('mouseup', () => isDragging = false);
renderer.domElement.addEventListener('mouseleave', () => isDragging = false);
renderer.domElement.addEventListener('wheel', (e) => {
  targetZoom = Math.max(2.5, Math.min(12, targetZoom + e.deltaY * 0.003));
});

// ─── RAYCASTER ──────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
const regionInfo = document.getElementById('region-info');

renderer.domElement.addEventListener('mousemove', (e) => {
  const w = window.innerWidth - 320;
  mouse.x = (e.clientX / w) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = Object.values(regionMeshes);
  const hits = raycaster.intersectObjects(meshes);

  if (hits.length > 0) {
    const id = hits[0].object.userData.regionId;
    const r = regionData[id];
    hoveredRegion = id;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
    tooltip.innerHTML = `<strong>${r.name}</strong><br><span style="color:#6a8aba;font-size:10px">${r.lobe} &middot; ${r.connects.length} connections &middot; ${r.vertexCount} vertices</span><br>${r.desc}`;
    regionInfo.textContent = `${r.name} (${r.lobe}) — ${r.connects.length} connections`;
    document.body.style.cursor = 'pointer';
  } else {
    hoveredRegion = null;
    tooltip.style.display = 'none';
    regionInfo.textContent = 'Hover over a brain region to inspect';
    document.body.style.cursor = 'default';
  }
});

renderer.domElement.addEventListener('click', () => {
  if (hoveredRegion) {
    if (regionStates[hoveredRegion].active) deactivateRegion(hoveredRegion);
    else activateRegion(hoveredRegion);
  }
});

// ─── BUILD UI ───────────────────────────────────────────────
function buildUI() {
  const panel = document.getElementById('ui-panel');
  let html = `<h1>Brain Simulator</h1>
    <div class="subtitle">${totalRegions} real anatomical regions &middot; Parsed from FreeSurfer atlas &middot; Click to activate</div>`;

  html += `<div class="section-title">Controls</div>`;
  html += `<div class="slider-row"><label>Signal Speed</label>
    <input type="range" min="0.2" max="3" step="0.1" value="1" id="speed-slider"></div>`;
  html += `<div class="slider-row"><label>Region Opacity</label>
    <input type="range" min="0.1" max="1" step="0.05" value="0.5" id="opacity-slider"></div>`;
  html += `<div class="switch-row" id="toggle-connections">
    <span class="switch-label">Show Pathways</span>
    <div class="toggle active" id="conn-toggle"></div></div>`;
  html += `<div class="switch-row" id="toggle-rotate">
    <span class="switch-label">Auto Rotate</span>
    <div class="toggle active" id="rotate-toggle"></div></div>`;
  html += `<button class="preset-btn" id="btn-deactivate" style="border-color:rgba(255,80,80,0.3);color:#ff8888;">
    Reset All<div class="desc">Deactivate everything</div></button>`;

  html += `<div class="section-title">Activity Presets</div>`;
  for (const [name, preset] of Object.entries(PRESETS)) {
    html += `<button class="preset-btn" data-preset="${name}">
      ${name}<div class="desc">${preset.desc}</div></button>`;
  }

  const byLobe = {};
  for (const [id, r] of Object.entries(regionData)) {
    if (!byLobe[r.lobe]) byLobe[r.lobe] = [];
    byLobe[r.lobe].push({ id, ...r });
  }
  for (const [lobe, regions] of Object.entries(byLobe)) {
    const col = LOBE_COLORS_HEX[lobe] || '#888';
    html += `<div class="section-title" style="color:${col};border-color:${col}40">${lobe} (${regions.length})</div>`;
    for (const r of regions) {
      html += `<div class="switch-row" data-region="${r.id}">
        <span class="switch-label">${r.name}</span>
        <div class="toggle" id="sw-${r.id}"></div></div>`;
    }
  }

  panel.innerHTML = html;

  document.getElementById('speed-slider').addEventListener('input', (e) => speed = parseFloat(e.target.value));
  document.getElementById('opacity-slider').addEventListener('input', (e) => {
    regionOpacity = parseFloat(e.target.value);
    for (const mesh of Object.values(regionMeshes)) {
      if (!regionStates[mesh.userData.regionId]?.active) {
        mesh.material.opacity = regionOpacity;
      }
    }
  });
  document.getElementById('toggle-connections').addEventListener('click', () => {
    showConnections = !showConnections;
    document.getElementById('conn-toggle').classList.toggle('active', showConnections);
    pathwayGroup.visible = showConnections;
  });
  document.getElementById('toggle-rotate').addEventListener('click', () => {
    autoRotate = !autoRotate;
    document.getElementById('rotate-toggle').classList.toggle('active', autoRotate);
  });
  document.getElementById('btn-deactivate').addEventListener('click', deactivateAll);
  panel.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => runPreset(btn.dataset.preset));
  });
  panel.querySelectorAll('[data-region]').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.region;
      if (regionStates[id].active) deactivateRegion(id);
      else activateRegion(id);
    });
  });
}

buildUI();

// ─── DOM OVERLAY (reads hardcoded divs from index.html) ─────
// The region divs are stamped into index.html by generate_dom.cjs
// Here we just grab references to them for live state updates.
const overlayElements = {};
document.querySelectorAll('#dom-overlay .brain-region').forEach(el => {
  const id = el.getAttribute('data-region-id');
  if (id) overlayElements[id] = el;
});
console.log(`DOM overlay: found ${Object.keys(overlayElements).length} hardcoded region divs`);

// Project 3D point to 2D screen coordinates
const _vec3 = new THREE.Vector3();
function projectToScreen(centroid) {
  _vec3.set(centroid[0], centroid[1], centroid[2]);
  _vec3.project(camera);
  const w = window.innerWidth - 320;
  const h = window.innerHeight;
  return {
    x: ( _vec3.x + 1) * 0.5 * w,
    y: (-_vec3.y + 1) * 0.5 * h,
    visible: _vec3.z < 1 // in front of camera
  };
}

function updateDOMOverlay() {
  for (const [id, el] of Object.entries(overlayElements)) {
    const r = regionData[id];
    const state = regionStates[id];

    // Project centroid and bbox corners to get screen rect
    const centre = projectToScreen(r.centroid);
    const min2d = projectToScreen(r.bboxMin);
    const max2d = projectToScreen(r.bboxMax);

    if (!centre.visible) {
      el.style.display = 'none';
      continue;
    }
    el.style.display = '';

    // Compute screen-space bounding rect
    const left = Math.min(min2d.x, max2d.x, centre.x - 15);
    const top = Math.min(min2d.y, max2d.y, centre.y - 15);
    const right = Math.max(min2d.x, max2d.x, centre.x + 15);
    const bottom = Math.max(min2d.y, max2d.y, centre.y + 15);

    const w = Math.max(right - left, 10);
    const h = Math.max(bottom - top, 10);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    // Update live state attributes
    el.setAttribute('data-active', state?.active ? 'true' : 'false');
    el.setAttribute('data-hovered', id === hoveredRegion ? 'true' : 'false');
    el.setAttribute('data-activation', (state?.activation || 0).toFixed(2));
  }
}

// ─── STARFIELD ──────────────────────────────────────────────
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(600 * 3);
for (let i = 0; i < 600 * 3; i++) starPos[i] = (Math.random() - 0.5) * 30;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x334466, size: 0.02, transparent: true, opacity: 0.4 })));

// ─── ANIMATION LOOP ─────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const now = performance.now();

  // Pending activations
  for (let i = pendingActivations.length - 1; i >= 0; i--) {
    const pa = pendingActivations[i];
    if (now >= pa.time) {
      if (!regionStates[pa.regionId]?.active) {
        if (regionStates[pa.regionId]) {
          regionStates[pa.regionId].active = true;
          regionStates[pa.regionId].targetActivation = 0.6;
        }
      }
      pendingActivations.splice(i, 1);
    }
  }

  // Update regions
  let activeCount = 0;
  for (const [id, state] of Object.entries(regionStates)) {
    const mesh = regionMeshes[id];
    if (!mesh) continue;

    state.activation += (state.targetActivation - state.activation) * dt * 5;

    const pulse = state.active ? Math.sin(now * 0.005 * speed) * 0.15 + 0.85 : 0;
    const intensity = state.activation * 0.8 + pulse * state.activation * 0.4;

    mesh.material.emissiveIntensity = 0.1 + intensity * 2.5;
    mesh.material.opacity = regionOpacity * 0.7 + state.activation * (1 - regionOpacity) * 0.8;

    // Hover highlight
    if (id === hoveredRegion && !state.active) {
      mesh.material.emissiveIntensity = 0.5;
      mesh.material.opacity = regionOpacity * 1.2;
    }

    const sw = document.getElementById(`sw-${id}`);
    if (sw) sw.classList.toggle('active', state.active);
    if (state.active) activeCount++;

    // Auto-decay
    if (state.active && state.targetActivation > 0) {
      state.targetActivation -= dt * 0.1 * speed;
      if (state.targetActivation <= 0.05) {
        state.active = false;
        state.targetActivation = 0;
      }
    }
  }

  document.getElementById('activity-info').textContent = `Active regions: ${activeCount} / ${regionsLoaded} loaded`;

  // Pathways
  for (const line of pathwayLines) {
    const fromA = regionStates[line.userData.fromId]?.activation || 0;
    const toA = regionStates[line.userData.toId]?.activation || 0;
    const activity = Math.max(fromA, toA);
    line.material.opacity = 0.05 + activity * 0.7;
    line.material.color.setHSL(0.58 + activity * 0.12, 0.5 + activity * 0.3, 0.2 + activity * 0.5);
  }

  // Particles
  for (const p of particlePool) {
    if (!p.userData.alive) continue;
    p.userData.t += dt * p.userData.speed;
    if (p.userData.t >= 1) { p.userData.alive = false; p.visible = false; continue; }
    p.position.copy(p.userData.curve.getPoint(p.userData.t));
    p.material.opacity = Math.sin(p.userData.t * Math.PI) * 0.9;
    p.scale.setScalar(0.6 + Math.sin(p.userData.t * Math.PI) * 0.6);
  }

  // Inner glow
  innerGlow.intensity = 0.3 + activeCount * 0.04;

  // Camera
  if (autoRotate) targetRotY += rotateSpeed;
  rotY += (targetRotY - rotY) * 0.08;
  rotX += (targetRotX - rotX) * 0.08;
  zoom += (targetZoom - zoom) * 0.08;
  camera.position.x = Math.sin(rotY) * Math.cos(rotX) * zoom;
  camera.position.y = Math.sin(rotX) * zoom;
  camera.position.z = Math.cos(rotY) * Math.cos(rotX) * zoom;
  camera.lookAt(0, 0, 0);

  // Update DOM overlay positions (throttled to every 3 frames for perf)
  if (animate._frame === undefined) animate._frame = 0;
  animate._frame++;
  if (animate._frame % 3 === 0) updateDOMOverlay();

  renderer.render(scene, camera);
}

animate();

// ─── RESIZE ─────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth - 320, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
