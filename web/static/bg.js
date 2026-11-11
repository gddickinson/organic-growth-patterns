// Subtle animated background: the lichen rule from the pattern registry (/api/patterns) growing on a coarse grid with
// the 2D engine, drawn in dimmed site accents. One settled frame under prefers-reduced-motion; paused when hidden.
import { api } from './core.js';
import { Generator2D, byKey } from './growth_engine.js';
import { RandomState } from './mt19937.js';

const CELL = 12, TICK_MS = 450;

export async function background(canvas) {
  if (!canvas) return;
  const pats = byKey((await api('/patterns'))['2d']);
  const ctx = canvas.getContext('2d');
  let gen = null, img = null, t = 0;
  const reset = () => {
    const w = Math.max(2, Math.min(160, Math.ceil(innerWidth / CELL))), h = Math.max(2, Math.min(100, Math.ceil(innerHeight / CELL)));
    canvas.width = w; canvas.height = h;
    gen = new Generator2D(w, h, pats, new RandomState(11));
    gen.seedRandom(0.3);
    img = ctx.createImageData(w, h);
  };
  const draw = () => {
    const d = img.data;
    for (let i = 0; i < gen.grid.length; i++) {
      const on = gen.grid[i] > 0, alt = (i + t) % 7 === 0;
      d[i * 4] = on ? (alt ? 150 : 70) : 0; d[i * 4 + 1] = on ? (alt ? 70 : 140) : 0;
      d[i * 4 + 2] = on ? (alt ? 40 : 50) : 0; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
  reset();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 12; i++) gen.grow('lichen');
    draw();
    return;
  }
  draw();
  addEventListener('resize', () => { reset(); draw(); });
  setInterval(() => {
    if (document.hidden) return;
    if (gen.grow('lichen') === 0 || ++t % 200 === 0) reset();
    draw();
  }, TICK_MS);
}
