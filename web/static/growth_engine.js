// 2D growth engine: a line-for-line port of OrganicPatternGenerator (organic_patterns.py). The pattern rules (kernel,
// survive/birth ranges) are not copied here: they come from pattern_base.PATTERN_REGISTRY_2D via /api/patterns.
// Randomness goes through a numpy-compatible RandomState, so the same seed gives the same grid as Python.
import { RandomState } from './mt19937.js';

// scipy.ndimage.convolve(grid, kernel, mode='wrap') for a 2D grid of shape (h, w): correlate with the flipped kernel,
// summing only non-zero weights in C order, as ndimage does (the order matters for the last bit of float sums).
export function convolveWrap2d(grid, h, w, kernel) {
  const kh = kernel.length, kw = kernel[0].length, oy = kh >> 1, ox = kw >> 1, taps = [];
  for (let a = 0; a < kh; a++) for (let b = 0; b < kw; b++) {
    const wt = kernel[kh - 1 - a][kw - 1 - b];
    if (Math.abs(wt) > 2.220446049250313e-16) taps.push([a - oy, b - ox, wt]);
  }
  const out = new Float64Array(h * w);
  const mod = (v, n) => ((v % n) + n) % n;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let t = 0;
    for (const [dy, dx, wt] of taps) t += grid[mod(y + dy, h) * w + mod(x + dx, w)] * wt;
    out[y * w + x] = t;
  }
  return out;
}

export const countActive = g => { let n = 0; for (const v of g) n += v > 0; return n; };
export const countSolid = g => { let n = 0; for (const v of g) n += v >= 1; return n; };

export class Generator2D {
  // patterns: { key: { kernel, survive_range, birth_range, color_map } } from /api/patterns ('2d').
  constructor(width = 100, height = 100, patterns = {}, rs = new RandomState(0)) {
    if (width < 2 || height < 2) throw new Error(`Grid dimensions must be >= 2, got (${width}, ${height})`);
    Object.assign(this, { width, height, patterns, rs });
    this.grid = new Float64Array(width * height);
  }

  seedRandom(density = 0.3) {
    density = Math.min(1, Math.max(0, density));
    if (density === 0) { this.grid = new Float64Array(this.width * this.height); return; }
    this.grid = this.rs.choiceBinary(this.width * this.height, density);
  }

  // np.ogrid offsets from (height // 2, width // 2); a cell is seeded when x*x + y*y <= r*r.
  seedCenter(radius = 10) {
    radius = Math.max(0, radius);
    const { width: w, height: h } = this, cy = h >> 1, cx = w >> 1;
    this.grid = new Float64Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dy = y - cy, dx = x - cx;
      if (dx * dx + dy * dy <= radius * radius) this.grid[y * w + x] = 1;
    }
  }

  seedLine() {
    const { width: w, height: h } = this, row = h >> 1;
    this.grid = new Float64Array(w * h);
    for (let x = w >> 2; x < Math.floor(3 * w / 4); x++) this.grid[row * w + x] = 1;
  }

  grow(patternType = 'coral') {
    const p = this.patterns[patternType];
    if (!p) throw new Error(`Unknown pattern type '${patternType}'. Available: ${Object.keys(this.patterns)}`);
    const [sl, sh] = p.survive_range, [bl, bh] = p.birth_range, g = this.grid;
    const nb = convolveWrap2d(g, this.height, this.width, p.kernel);
    let next = new Float64Array(g.length);
    for (let i = 0; i < g.length; i++) {
      const n = nb[i];
      if ((g[i] > 0 && n >= sl && n <= sh) || (g[i] === 0 && n >= bl && n <= bh)) next[i] = 1;
    }
    if (patternType === 'mycelium') {      // "Add noise for organic appearance": np.random.random(shape) * 0.1
      for (let i = 0; i < next.length; i++) next[i] = Math.min(1, Math.max(0, next[i] + this.rs.random() * 0.1));
    }
    this.grid = next;
    return countActive(next);
  }

  addEnvironment(factor = 'moisture') {
    const { width: w, height: h, grid } = this;
    if (factor === 'moisture') {                 // np.linspace(0.5, 1, height) down the rows
      const step = 0.5 / (h - 1);
      for (let y = 0; y < h; y++) {
        const gy = y === h - 1 ? 1 : y * step + 0.5;
        for (let x = 0; x < w; x++) grid[y * w + x] *= gy;
      }
    } else if (factor === 'light') {             // radial: 1 - 0.5 r^2 / (w h / 4), clipped to [0.3, 1]
      const cy = h >> 1, cx = w >> 1, area = w * h / 4;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dy = y - cy, dx = x - cx;
        const gv = Math.min(1, Math.max(0.3, 1 - (0.5 * (dx * dx + dy * dy)) / area));
        grid[y * w + x] *= gv;
      }
    }
  }
}

// Replay an action list (same format as web/simulate.py) from np.random.seed(rngSeed); returns { gen, counts }.
export function replay2d({ width, height, rng_seed, actions }, patterns) {
  const gen = new Generator2D(width, height, patterns, new RandomState(rng_seed));
  const counts = [];
  for (const a of actions) {
    if (a[0] === 'seed_random') gen.seedRandom(a[1]);
    else if (a[0] === 'seed_center') gen.seedCenter(a[1]);
    else if (a[0] === 'seed_line') gen.seedLine();
    else if (a[0] === 'grow') for (let i = 0; i < a[2]; i++) counts.push(gen.grow(a[1]));
    else if (a[0] === 'env') gen.addEnvironment(a[1]);
    else throw new Error(`unknown 2D action ${a[0]}`);
  }
  return { gen, counts };
}

// visualize(): display = clip(grid * 1.5, 0, 1), then imshow's autoscale to [min, max] and a 256-entry colour map.
// Returns indices 0..255 into the LUT for every cell.
export function displayIndices(grid) {
  let lo = Infinity, hi = -Infinity;
  const d = new Float64Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    const v = Math.min(1, Math.max(0, grid[i] * 1.5));
    d[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
  }
  const out = new Uint8Array(grid.length);
  if (hi > lo) for (let i = 0; i < d.length; i++) out[i] = Math.min(255, Math.floor(((d[i] - lo) / (hi - lo)) * 256));
  return out;
}

// Turn the registry list from /api/patterns into a { key: pattern } map.
export const byKey = list => Object.fromEntries(list.map(p => [p.key, p]));
