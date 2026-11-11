// Canvas drawing for the labs: the 2D grid through a matplotlib colour map, the 3D scatter (rotatable), a population
// sparkline, and PNG export. Colour tables come from /api/colormaps (matplotlib's own values).
import { displayIndices } from './growth_engine.js';
import { download } from './core.js';

export function lutRGB(hex) {
  const out = new Uint8Array(hex.length * 3);
  hex.forEach((h, i) => { for (let k = 0; k < 3; k++) out[i * 3 + k] = parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16); });
  return out;
}

export const rampCSS = hex => `linear-gradient(90deg, ${[0, 64, 128, 192, 255].map(i => hex[i]).join(', ')})`;

// Draw the 2D grid one pixel per cell (CSS scales it up, pixelated), as visualize() maps it.
export function draw2d(canvas, gen, lut) {
  const { width: w, height: h } = gen;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, idx = displayIndices(gen.grid);
  for (let i = 0; i < idx.length; i++) {
    const c = idx[i] * 3;
    d[i * 4] = lut[c]; d[i * 4 + 1] = lut[c + 1]; d[i * 4 + 2] = lut[c + 2]; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

// Save a canvas as PNG, upscaled with nearest-neighbour to at least `min` px on the short side.
export function exportPNG(canvas, name, min = 800) {
  const k = Math.max(1, Math.ceil(min / Math.min(canvas.width, canvas.height)));
  const c = document.createElement('canvas');
  c.width = canvas.width * k; c.height = canvas.height * k;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  c.toBlob(b => download(name, b), 'image/png');
}

export function sparkline(canvas, values, color = '#9cff57') {
  const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  canvas.width = Math.max(10, Math.round(r.width * dpr)); canvas.height = Math.max(10, Math.round(r.height * dpr));
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, pad = 6 * dpr;
  ctx.clearRect(0, 0, W, H);
  if (values.length < 2) return;
  const hi = Math.max(1, ...values);
  ctx.strokeStyle = color; ctx.lineWidth = 1.5 * dpr; ctx.beginPath();
  values.forEach((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - 2 * pad), y = H - pad - (v / hi) * (H - 2 * pad);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#94a3c6'; ctx.font = `${10 * dpr}px ui-monospace, monospace`;
  ctx.fillText(`max ${hi}`, pad, pad + 8 * dpr);
}

// 3D scatter of active cells, as visualize_3d() plots them: colour c = z / depth, autoscaled over the shown points
// onto the pattern's colour map, alpha 0.6. view = { az, el } in radians.
export function draw3d(canvas, gen, grid, lut, view, title = '') {
  const dpr = devicePixelRatio || 1, r = canvas.getBoundingClientRect();
  const S = Math.max(200, Math.round(r.width * dpr));
  if (canvas.width !== S || canvas.height !== S) { canvas.width = S; canvas.height = S; }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#04060b'; ctx.fillRect(0, 0, S, S);
  const { width: w, height: h, depth: d } = gen, span = Math.max(w, h, d);
  const ca = Math.cos(view.az), sa = Math.sin(view.az), ce = Math.cos(view.el), se = Math.sin(view.el);
  const scale = (S * 0.44) / span;
  // world: x right, y back, z up (matplotlib's 3D axes); centre the box at the origin
  const proj = (x, y, z) => {
    const X = x - w / 2, Y = y - h / 2, Z = z - d / 2;
    const rx = X * ca - Y * sa, ry = X * sa + Y * ca;
    return [S / 2 + rx * scale, S / 2 - (Z * ce - ry * se) * scale, ry * ce + Z * se];
  };
  // bounding box
  ctx.strokeStyle = 'rgba(148,163,198,.35)'; ctx.lineWidth = dpr;
  const corners = [];
  for (const x of [0, w]) for (const y of [0, h]) for (const z of [0, d]) corners.push(proj(x, y, z));
  [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => {
    ctx.beginPath(); ctx.moveTo(corners[a][0], corners[a][1]); ctx.lineTo(corners[b][0], corners[b][1]); ctx.stroke();
  });
  const { xs, ys, zs } = gen.activeCoords(0.5, grid);
  if (xs.length) {
    let lo = Infinity, hi = -Infinity;
    for (const z of zs) { const c = z / Math.max(d, 1); lo = Math.min(lo, c); hi = Math.max(hi, c); }
    const pts = xs.map((x, i) => {
      const p = proj(x + 0.5, ys[i] + 0.5, zs[i] + 0.5), c = zs[i] / Math.max(d, 1);
      return [p[0], p[1], p[2], hi > lo ? Math.min(255, Math.floor(((c - lo) / (hi - lo)) * 256)) : 0];
    });
    pts.sort((a, b) => b[2] - a[2]);            // far first
    const size = Math.max(2, scale * 0.8);
    ctx.globalAlpha = 0.6;
    for (const [px, py, , k] of pts) {
      ctx.fillStyle = `rgb(${lut[k * 3]},${lut[k * 3 + 1]},${lut[k * 3 + 2]})`;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#c6d4ee'; ctx.font = `${12 * dpr}px ui-monospace, monospace`;
  [['X', proj(w + 2, 0, 0)], ['Y', proj(0, h + 2, 0)], ['Z', proj(0, 0, d + 2)]].forEach(([t, p]) => ctx.fillText(t, p[0], p[1]));
  if (title) { ctx.fillStyle = '#e8f1ff'; ctx.font = `${14 * dpr}px -apple-system, sans-serif`; ctx.fillText(title, 12 * dpr, 22 * dpr); }
}
