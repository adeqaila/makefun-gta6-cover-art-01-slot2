// Little Vice Cover Club — editor wiring.
// Owns the state, the live preview canvas, uploads, panel picking,
// drag-to-pan, zoom, undo/redo, export, and shot mode. The painting
// itself lives in cover.js; this file only drives it.

import { GRADES, LAYOUTS, TITLE_STYLES, EXPORT_SIZES, defaultState,
  cloneState, drawCover, panelAt } from './cover.js';
import { readShot, applyShotPreset } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const statusEl = $('status');

let state = defaultState();
let images = {};          // slot src -> HTMLImageElement
let hitPanels = [];      // last painted panel rects, for picking
let selected = 0;        // selected slot index
let past = [];           // undo stack of serialised states
let future = [];         // redo stack
const HISTORY_LIMIT = 20;

const shot = readShot();
if (shot.preset) state = applyShotPreset(state, shot.preset);
const coverOnly = !!(shot.preset && shot.preset.coverOnly);
if (coverOnly) document.body.classList.add('cover-only');

function say(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadAllPhotos() {
  const jobs = state.slots.map(async (slot) => {
    if (images[slot.src]) return;
    const img = await loadImage(slot.src);
    if (img) images[slot.src] = img;
  });
  await Promise.all(jobs);
}

function paint() {
  const w = canvas.width;
  const h = canvas.height;
  hitPanels = drawCover(ctx, state, images, w, h);
}

// Fit the preview canvas to its box (editor) or the window (cover shot).
function sizeCanvas() {
  if (coverOnly) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    const box = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(320, Math.floor(box.width));
    const h = Math.floor((w * 9) / 16);
    canvas.width = w;
    canvas.height = h;
  }
  paint();
}

function pushHistory() {
  past.push(JSON.stringify(state));
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
  syncHistoryButtons();
}

function restore(serialised) {
  state = JSON.parse(serialised);
  syncControls();
  sizeCanvas();
}

function undo() {
  if (!past.length) return;
  future.push(JSON.stringify(state));
  restore(past.pop());
  syncHistoryButtons();
  say('Undid one step.');
}

function redo() {
  if (!future.length) return;
  past.push(JSON.stringify(state));
  restore(future.pop());
  syncHistoryButtons();
  say('Redid one step.');
}

function syncHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

// ---- controls ----------------------------------------------------------

function buildSwatches() {
  const layoutBox = $('layout-picks');
  layoutBox.innerHTML = '';
  for (const name of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = name;
    b.dataset.layout = name;
    b.addEventListener('click', () => {
      if (state.layout === name) return;
      pushHistory();
      state.layout = name;
      syncControls();
      paint();
      say(`Layout: ${name}.`);
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = $('grade-picks');
  gradeBox.innerHTML = '';
  for (const key of Object.keys(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade-pick';
    b.dataset.grade = key;
    b.style.setProperty('--swatch', GRADES[key].accent);
    b.textContent = GRADES[key].label;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      syncControls();
      paint();
      say(`Grade: ${GRADES[key].label}.`);
    });
    gradeBox.appendChild(b);
  }
  const styleBox = $('style-picks');
  styleBox.innerHTML = '';
  for (const name of TITLE_STYLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = name;
    b.dataset.style = name;
    b.addEventListener('click', () => {
      if (state.titleStyle === name) return;
      pushHistory();
      state.titleStyle = name;
      syncControls();
      paint();
      say(`Title style: ${name}.`);
    });
    styleBox.appendChild(b);
  }
}

function buildSlots() {
  const box = $('slot-list');
  box.innerHTML = '';
  const names = ['Ice cream', 'Kite', 'Puppy', 'Balloons'];
  state.slots.forEach((slot, i) => {
    const row = document.createElement('div');
    row.className = 'slot-row';
    if (i === selected) row.classList.add('selected');
    const thumb = document.createElement('img');
    thumb.className = 'slot-thumb';
    thumb.alt = names[i];
    thumb.src = slot.src;
    const label = document.createElement('span');
    label.className = 'slot-name';
    label.textContent = `${i + 1}. ${names[i]}`;
    const file = document.createElement('label');
    file.className = 'slot-upload';
    file.textContent = 'Upload';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(f);
      });
      const img = await loadImage(dataUrl);
      if (!img) { say('That photo could not be read.'); return; }
      pushHistory();
      images[dataUrl] = img;
      state.slots[i] = { ...state.slots[i], src: dataUrl, zoom: 1, panX: 0, panY: 0 };
      selected = i;
      syncControls();
      buildSlots();
      paint();
      say(`Photo ${i + 1} replaced with your upload.`);
    });
    file.appendChild(input);
    const sample = document.createElement('button');
    sample.type = 'button';
    sample.className = 'slot-sample';
    sample.textContent = 'Sample';
    sample.addEventListener('click', async () => {
      const sampleSrc = defaultState().slots[i].src;
      pushHistory();
      state.slots[i] = { ...defaultState().slots[i] };
      selected = i;
      await loadAllPhotos();
      syncControls();
      buildSlots();
      paint();
      say(`Photo ${i + 1} back to its sample.`);
    });
    row.append(thumb, label, file, sample);
    row.addEventListener('click', (ev) => {
      if (ev.target.closest('label,button,input')) return;
      selected = i;
      buildSlots();
      syncControls();
      paint();
    });
    box.appendChild(row);
  });
}

function syncControls() {
  $('title').value = state.title;
  $('tagline').value = state.tagline;
  $('badge').value = state.badge;
  $('cute').value = String(state.cute);
  $('cute-out').textContent = '♥'.repeat(state.cute) + '♡'.repeat(5 - state.cute);
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('halftone').checked = state.halftone;
  $('confetti').checked = state.confetti;
  const slot = state.slots[selected];
  $('zoom').value = String(slot.zoom);
  $('zoom-out').textContent = `${Math.round(slot.zoom * 100)}%`;
  document.querySelectorAll('#layout-picks .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#grade-picks .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#style-picks .pick').forEach((b) => {
    b.classList.toggle('active', b.dataset.style === state.titleStyle);
  });
  $('selected-label').textContent = `Panel ${selected + 1} selected — drag it to pan, use zoom below.`;
}

function bindControls() {
  $('title').addEventListener('input', () => {
    state.title = $('title').value.toUpperCase();
    paint();
  });
  $('title').addEventListener('change', () => { pushHistory(); });
  $('tagline').addEventListener('input', () => {
    state.tagline = $('tagline').value;
    paint();
  });
  $('tagline').addEventListener('change', () => { pushHistory(); });
  $('badge').addEventListener('input', () => {
    state.badge = $('badge').value.toUpperCase();
    paint();
  });
  $('badge').addEventListener('change', () => { pushHistory(); });
  $('cute').addEventListener('input', () => {
    state.cute = Number($('cute').value);
    $('cute-out').textContent = '♥'.repeat(state.cute) + '♡'.repeat(5 - state.cute);
    paint();
  });
  $('cute').addEventListener('change', () => { pushHistory(); });
  $('zoom').addEventListener('input', () => {
    state.slots[selected].zoom = Number($('zoom').value);
    $('zoom-out').textContent = `${Math.round(state.slots[selected].zoom * 100)}%`;
    paint();
  });
  $('zoom').addEventListener('change', () => { pushHistory(); });
  for (const id of ['grain', 'vignette', 'halftone', 'confetti']) {
    $(id).addEventListener('change', () => {
      pushHistory();
      state[id] = $(id).checked;
      paint();
    });
  }
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && ev.key.toLowerCase() === 'z') {
      ev.preventDefault();
      undo();
    } else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y'
      || (ev.shiftKey && ev.key.toLowerCase() === 'z'))) {
      ev.preventDefault();
      redo();
    }
  });
  // Export size buttons.
  const exportBox = $('export-picks');
  exportBox.innerHTML = '';
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick export-pick';
    b.textContent = `PNG ${size.label}`;
    b.addEventListener('click', () => exportPng(size));
    exportBox.appendChild(b);
  }
  // Drag to pan on the preview, click to pick a panel.
  let dragging = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const slotIndex = panelAt(hitPanels, x, y);
    if (slotIndex < 0) return;
    selected = slotIndex;
    buildSlots();
    syncControls();
    dragging = { x, y, panX: state.slots[selected].panX, panY: state.slots[selected].panY };
    canvas.setPointerCapture(ev.pointerId);
    paint();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const slot = state.slots[selected];
    slot.panX = dragging.panX + (x - dragging.x);
    slot.panY = dragging.panY + (y - dragging.y);
    paint();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging) pushHistory();
    dragging = null;
  });
  window.addEventListener('resize', () => { if (!coverOnly) sizeCanvas(); });
}

function exportPng(size) {
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const offCtx = off.getContext('2d');
  drawCover(offCtx, state, images, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) { say('Export failed.'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `little-vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(`Exported PNG ${size.w} x ${size.h}.`);
  }, 'image/png');
}

// Exposed for shot automation and debugging: renders the current state
// at a size and hands back a PNG data URL.
window.__littleVice = {
  exportDataUrl(w, h) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), state, images, w, h);
    return off.toDataURL('image/png');
  },
  getState: () => cloneState(state),
};

async function boot() {
  buildSwatches();
  bindControls();
  buildSlots();
  syncControls();
  syncHistoryButtons();
  await document.fonts.load('16px Anton');
  await document.fonts.load('16px Pacifico');
  await document.fonts.ready;
  await loadAllPhotos();
  sizeCanvas();
  say(coverOnly ? '' : 'Pick a panel, drag to pan, then export a PNG.');
  window.__shotReady = true;
}

boot();
