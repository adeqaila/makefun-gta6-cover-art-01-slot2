// Little Vice Cover Club — cover painting engine.
// Draws the whole cover (panels, pastel grade, title band, speech bubble,
// badge, cute hearts, deterministic confetti, grain, vignette) onto any
// 2D canvas at any size. No network, no clock, no Math.random here: every
// decorative element comes from a fixed seed, so the same state paints
// the same pixels on every load.

export const GRADES = {
  bubblegum: {
    label: 'Bubblegum', card: '#ffe3ef', bg: '#ffd1e3', top: '#ff9ec7',
    bottom: '#ffb3d9', ink: '#7a2d52', accent: '#ff5da2', wash: '#ff8fbf',
  },
  lemonade: {
    label: 'Lemonade', card: '#fff6d6', bg: '#ffedb0', top: '#ffd95e',
    bottom: '#ffe9a3', ink: '#6d4d00', accent: '#f2a900', wash: '#ffcf4d',
  },
  mint: {
    label: 'Mint', card: '#dcf7e8', bg: '#bdeed3', top: '#7adfae',
    bottom: '#a9e8c8', ink: '#14532d', accent: '#22a06b', wash: '#6fd3a5',
  },
  berry: {
    label: 'Berry', card: '#eadcff', bg: '#dcc2ff', top: '#b78cff',
    bottom: '#d3aaff', ink: '#3d1a6e', accent: '#8b46e8', wash: '#a978f0',
  },
};

export const LAYOUTS = ['sticker', 'comic', 'hero3', 'grid4', 'full', 'strip'];
export const TITLE_STYLES = ['anton', 'script', 'outline'];
export const EXPORT_SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
  { label: '1080 x 1920', w: 1080, h: 1920 },
];

// Fixed seed for every decorative random choice in the app.
export const CONFETTI_SEED = 20261120;

export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function defaultState() {
  return {
    layout: 'sticker',
    grade: 'bubblegum',
    title: 'LITTLE STARS',
    titleStyle: 'anton',
    tagline: 'Little Vice',
    badge: 'CUTE',
    cute: 5,
    grain: true,
    vignette: true,
    halftone: true,
    confetti: true,
    // One slot per panel; each slot names a sample or holds an uploaded data URL.
    slots: [
      { src: 'samples/icecream.jpg', zoom: 1, panX: 0, panY: 0, fx: 0.62, fy: 0.24 },
      { src: 'samples/kite.jpg', zoom: 1, panX: 0, panY: 0, fx: 0.36, fy: 0.30 },
      { src: 'samples/puppy.jpg', zoom: 1, panX: 0, panY: 0, fx: 0.44, fy: 0.30 },
      { src: 'samples/balloons.jpg', zoom: 1, panX: 0, panY: 0, fx: 0.52, fy: 0.36 },
    ],
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

// Panel rectangles for a layout, in canvas pixels. Each panel names the
// slot index it shows and an optional tilt in degrees (sticker sheet).
export function layoutPanels(layout, W, H) {
  const titleH = Math.round(H * (H >= W ? 0.24 : 0.235));
  const card = { x: Math.round(W * 0.022), y: Math.round(H * 0.03),
    w: Math.round(W * 0.956), h: H - titleH - Math.round(H * 0.055) };
  const gap = Math.max(10, Math.round(W * 0.014));
  const inner = { x: card.x + gap, y: card.y + gap,
    w: card.w - gap * 2, h: card.h - gap * 2 };
  const panels = [];
  if (layout === 'sticker') {
    if (H > W) {
      // Portrait: 2 x 2 grid, so each panel stays wide enough for a face.
      const pw = (inner.w - gap) / 2;
      const ph = (inner.h - gap) / 2;
      const tilt = [-3, 3, -3, 3];
      for (let i = 0; i < 4; i++) {
        panels.push({ slot: i, x: inner.x + (i % 2) * (pw + gap),
          y: inner.y + Math.floor(i / 2) * (ph + gap), w: pw, h: ph, rot: tilt[i] });
      }
    } else {
      const pw = (inner.w - gap * 3) / 4;
      const tilt = [-4, 3, -3.5, 4];
      for (let i = 0; i < 4; i++) {
        panels.push({ slot: i, x: inner.x + i * (pw + gap), y: inner.y,
          w: pw, h: inner.h, rot: tilt[i] });
      }
    }
  } else if (layout === 'comic') {
    const bh = (inner.h - gap * 2) / 3;
    const use = [1, 2, 3]; // kite, puppy, balloons: faces survive the wide bands best
    for (let i = 0; i < 3; i++) {
      panels.push({ slot: use[i], x: inner.x, y: inner.y + i * (bh + gap),
        w: inner.w, h: bh, rot: 0, round: Math.round(W * 0.02) });
    }
  } else if (layout === 'hero3') {
    const heroW = inner.w * 0.58;
    panels.push({ slot: 3, x: inner.x, y: inner.y, w: heroW, h: inner.h, rot: 0 });
    const sideW = inner.w - heroW - gap;
    const sh = (inner.h - gap * 2) / 3;
    for (let i = 0; i < 3; i++) {
      panels.push({ slot: i, x: inner.x + heroW + gap, y: inner.y + i * (sh + gap),
        w: sideW, h: sh, rot: 0 });
    }
  } else if (layout === 'grid4') {
    const pw = (inner.w - gap) / 2;
    const ph = (inner.h - gap) / 2;
    for (let i = 0; i < 4; i++) {
      panels.push({ slot: i, x: inner.x + (i % 2) * (pw + gap),
        y: inner.y + Math.floor(i / 2) * (ph + gap), w: pw, h: ph, rot: 0 });
    }
  } else if (layout === 'full') {
    panels.push({ slot: 3, x: inner.x, y: inner.y, w: inner.w, h: inner.h, rot: 0 });
  } else { // strip: four vertical strips
    const pw = (inner.w - gap * 3) / 4;
    for (let i = 0; i < 4; i++) {
      panels.push({ slot: i, x: inner.x + i * (pw + gap), y: inner.y,
        w: pw, h: inner.h, rot: 0 });
    }
  }
  return { card, titleH, panels };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPhotoCover(ctx, img, slot, px, py, pw, ph) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = slot.zoom || 1;
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Put the slot's focus point (a face) at the panel centre, then pan.
  let dx = px + pw / 2 - (slot.fx ?? 0.5) * dw + (slot.panX || 0);
  let dy = py + ph / 2 - (slot.fy ?? 0.5) * dh + (slot.panY || 0);
  if (dw > pw) dx = Math.min(0, Math.max(px + pw - dw, dx));
  else dx = px + (pw - dw) / 2;
  if (dh > ph) dy = Math.min(0, Math.max(py + ph - dh, dy));
  else dy = py + (ph - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function gradeTint(ctx, grade, x, y, w, h) {
  const g = GRADES[grade];
  const grad = ctx.createLinearGradient(x, y, x + w * 0.25, y + h);
  grad.addColorStop(0, g.top);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = g.wash;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawHeart(ctx, x, y, size, fill, stroke) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.bezierCurveTo(-52, -6, -38, -52, 0, -24);
  ctx.bezierCurveTo(38, -52, 52, -6, 0, 32);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 6; ctx.stroke(); }
  ctx.restore();
}

function drawConfetti(ctx, W, H, grade) {
  const g = GRADES[grade];
  const rand = seededRandom(CONFETTI_SEED);
  const colors = [g.accent, '#ffd95e', '#7adfae', '#ffffff', g.wash, '#b78cff'];
  const n = 46;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.82;
    const s = 4 + rand() * 9;
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.55 + rand() * 0.35;
    if (i % 3 === 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.restore();
    } else if (i % 3 === 1) {
      ctx.beginPath();
      ctx.arc(x, y, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawHeart(ctx, x, y, s * 1.4, colors[i % colors.length], null);
    }
  }
  ctx.restore();
}

let grainTile = null;
function drawGrain(ctx, W, H) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = 128;
    grainTile.height = 128;
    const gctx = grainTile.getContext('2d');
    const img = gctx.createImageData(128, 128);
    const rand = seededRandom(987654321);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rand() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    gctx.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(60,20,40,0)');
  grad.addColorStop(1, 'rgba(60,20,40,0.20)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawSpeechBubble(ctx, text, x, y, w, h, grade) {
  const g = GRADES[grade];
  const r = h * 0.45;
  ctx.save();
  ctx.shadowColor = 'rgba(90,30,60,0.25)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  // Tail pointing down-left, kept short so it never reaches the badge row.
  ctx.beginPath();
  ctx.moveTo(x + w * 0.18, y + h - 2);
  ctx.lineTo(x + w * 0.10, y + h + h * 0.30);
  ctx.lineTo(x + w * 0.34, y + h - 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = g.ink;
  ctx.font = `${Math.round(h * 0.52)}px Pacifico, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + h * 0.04);
}

function fitTitleFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 4;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function drawTitleBand(ctx, state, images, W, H, titleY, titleH) {
  const g = GRADES[state.grade];
  const pad = Math.round(W * 0.03);
  // Halftone dots along the top edge of the band.
  if (state.halftone) {
    ctx.save();
    ctx.fillStyle = g.accent;
    const step = Math.max(12, Math.round(W * 0.011));
    for (let x = pad; x < W - pad; x += step) {
      const r = (Math.floor(x / step) % 2 === 0 ? 3.2 : 2.0) * (W / 1280);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x, titleY + Math.round(H * 0.012), Math.max(1.5, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const textTop = titleY + Math.round(H * 0.045);
  const textH = titleH - Math.round(H * 0.06);
  // Big title, left; speech bubble + badge + hearts, right.
  const bubbleW = Math.min(Math.round(W * 0.30), 330 * (W / 1280));
  const titleMaxW = W - pad * 2 - bubbleW - Math.round(W * 0.03);
  ctx.textBaseline = 'alphabetic';
  if (state.titleStyle === 'script') {
    const px = fitTitleFont(ctx, state.title, titleMaxW, Math.round(textH * 0.62),
      'Pacifico, cursive', '');
    ctx.fillStyle = g.accent;
    ctx.textAlign = 'left';
    ctx.fillText(state.title, pad, textTop + textH * 0.62);
    void px;
  } else if (state.titleStyle === 'outline') {
    const px = fitTitleFont(ctx, state.title, titleMaxW, Math.round(textH * 0.66),
      'Anton, sans-serif', '');
    ctx.strokeStyle = g.ink;
    ctx.lineWidth = Math.max(2, px * 0.06);
    ctx.textAlign = 'left';
    ctx.strokeText(state.title, pad, textTop + textH * 0.66);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.title, pad, textTop + textH * 0.66);
    void px;
  } else {
    const px = fitTitleFont(ctx, state.title, titleMaxW, Math.round(textH * 0.68),
      'Anton, sans-serif', '');
    ctx.save();
    ctx.shadowColor = 'rgba(90,30,60,0.35)';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = Math.max(2, px * 0.05);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = g.ink;
    ctx.lineWidth = Math.max(2, px * 0.045);
    ctx.textAlign = 'left';
    ctx.strokeText(state.title, pad, textTop + textH * 0.68);
    ctx.fillText(state.title, pad, textTop + textH * 0.68);
    ctx.restore();
    void px;
  }
  // Speech bubble with the tagline, top right.
  const bubbleH = Math.round(textH * 0.42);
  const bubbleX = W - pad - bubbleW;
  drawSpeechBubble(ctx, state.tagline, bubbleX, textTop + Math.round(textH * 0.02),
    bubbleW, bubbleH, state.grade);
  // Badge pill + cute hearts under the bubble. Hearts shrink to fit the
  // bubble width so they can never overlap the pill (portrait covers).
  const rowY = textTop + bubbleH + Math.round(textH * 0.20);
  const pillW = Math.round(bubbleW * 0.42);
  const pillH = Math.round(textH * 0.30);
  ctx.save();
  ctx.fillStyle = g.accent;
  roundRectPath(ctx, bubbleX, rowY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(pillH * 0.52)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.badge, bubbleX + pillW / 2, rowY + pillH / 2 + 1);
  ctx.restore();
  const heartSize = Math.max(10, Math.min(Math.round(textH * 0.26),
    Math.floor((bubbleW - pillW - 14) / 5) - 4));
  const heartsW = state.cute * (heartSize + 4);
  let hx = bubbleX + bubbleW - heartsW;
  const hy = rowY + pillH / 2;
  for (let i = 0; i < 5; i++) {
    const filled = i < state.cute;
    drawHeart(ctx, hx + heartSize / 2, hy, heartSize,
      filled ? '#ff4d88' : null, filled ? null : '#c98aa8');
    hx += heartSize + 4;
  }
}

// Paint one cover. `images` maps slot src -> loaded HTMLImageElement.
// Returns the panel rectangles (canvas pixels) for hit-testing.
export function drawCover(ctx, state, images, W, H) {
  const g = GRADES[state.grade];
  const { card, titleH, panels } = layoutPanels(state.layout, W, H);
  const titleY = H - titleH;
  // Backdrop + pastel card.
  ctx.clearRect(0, 0, W, H);
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, g.bg);
  bgGrad.addColorStop(1, g.card);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = 'rgba(90,30,60,0.18)';
  ctx.shadowBlur = Math.round(W * 0.02);
  ctx.shadowOffsetY = Math.round(H * 0.012);
  ctx.fillStyle = g.card;
  roundRectPath(ctx, card.x, card.y, card.w, card.h, Math.round(W * 0.02));
  ctx.fill();
  ctx.restore();
  // Panels.
  const hit = [];
  for (const p of panels) {
    const slot = state.slots[p.slot];
    const img = slot ? images[slot.src] : null;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.rot) ctx.rotate((p.rot * Math.PI) / 180);
    ctx.translate(-p.w / 2, -p.h / 2);
    const border = Math.max(6, Math.round(W * 0.008));
    ctx.shadowColor = 'rgba(60,20,40,0.28)';
    ctx.shadowBlur = Math.round(W * 0.014);
    ctx.shadowOffsetY = Math.round(H * 0.01);
    ctx.fillStyle = '#ffffff';
    const rr = p.round ?? Math.round(W * 0.012);
    roundRectPath(ctx, -border, -border, p.w + border * 2, p.h + border * 2, rr + border);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.save();
    roundRectPath(ctx, 0, 0, p.w, p.h, rr);
    ctx.clip();
    if (img) {
      drawPhotoCover(ctx, img, slot, 0, 0, p.w, p.h);
      gradeTint(ctx, state.grade, 0, 0, p.w, p.h);
    } else {
      ctx.fillStyle = '#f3d9e6';
      ctx.fillRect(0, 0, p.w, p.h);
    }
    ctx.restore();
    ctx.restore();
    hit.push({ slot: p.slot, x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rot || 0 });
  }
  if (state.confetti) drawConfetti(ctx, W, H, state.grade);
  drawTitleBand(ctx, state, images, W, H, titleY, titleH);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
  return hit;
}

// Which panel (slot index) is at canvas point (x, y)? -1 when none.
export function panelAt(hit, x, y) {
  for (let i = hit.length - 1; i >= 0; i--) {
    const p = hit[i];
    if (x >= p.x - 8 && x <= p.x + p.w + 8 && y >= p.y - 8 && y <= p.y + p.h + 8) {
      return p.slot;
    }
  }
  return -1;
}
