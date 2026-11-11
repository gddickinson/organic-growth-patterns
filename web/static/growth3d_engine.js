// 3D growth engine: a port of OrganicPattern3D (organic_patterns_3d.py), grid stored (depth, height, width) in C
// order like the numpy array. Rules come from pattern_base.PATTERN_REGISTRY_3D via /api/patterns; neighbours are
// counted with the kernel's support, as grow() does. Seeded through the numpy-compatible RandomState.
import { RandomState } from './mt19937.js';

export function convolveWrap3d(grid, d, h, w, kernel) {
  const taps = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    if (kernel[2 - a][2 - b][2 - c] > 0) taps.push([a - 1, b - 1, c - 1]);
  }
  const out = new Float64Array(d * h * w), hw = h * w;
  for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let t = 0;
    for (const [dz, dy, dx] of taps) {
      const zz = (z + dz + d) % d, yy = (y + dy + h) % h, xx = (x + dx + w) % w;
      t += grid[zz * hw + yy * w + xx];
    }
    out[z * hw + y * w + x] = t;
  }
  return out;
}

export class Generator3D {
  constructor(width = 50, height = 50, depth = 50, patterns = {}, rs = new RandomState(0)) {
    if (Math.min(width, height, depth) < 2) throw new Error(`All dimensions must be >= 2, got (${width}, ${height}, ${depth})`);
    Object.assign(this, { width, height, depth, patterns, rs });
    this.grid = new Float64Array(width * height * depth);
    this.history = [];
  }

  seedRandom(density = 0.1) {
    density = Math.min(1, Math.max(0, density));
    this.grid = this.rs.choiceBinary(this.width * this.height * this.depth, density);
    this.history = [this.grid.slice()];
  }

  seedCenter(radius = 5) {
    radius = Math.max(0, radius);
    const { width: w, height: h, depth: d } = this, cx = w >> 1, cy = h >> 1, cz = d >> 1;
    this.grid = new Float64Array(w * h * d);
    for (let z = 0; z < d; z++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) <= radius) this.grid[(z * h + y) * w + x] = 1;
    }
    this.history = [this.grid.slice()];
  }

  grow(patternType = 'coral', generations = 1) {
    const p = this.patterns[patternType];
    if (!p) throw new Error(`Unknown pattern type '${patternType}'. Available: ${Object.keys(this.patterns)}`);
    const [sl, sh] = p.survive_range, [bl, bh] = p.birth_range;
    for (let k = 0; k < generations; k++) {
      const g = this.grid, nb = convolveWrap3d(g, this.depth, this.height, this.width, p.kernel);
      const next = new Float64Array(g.length);
      for (let i = 0; i < g.length; i++) {
        const n = nb[i];
        if ((g[i] > 0 && n >= sl && n <= sh) || (g[i] === 0 && n >= bl && n <= bh)) next[i] = 1;
      }
      this.grid = next;
      this.history.push(next.slice());
    }
    let n = 0;
    for (const v of this.grid) n += v > 0;
    return n;
  }

  // active_coords(): x (width), y (height), z (depth) of cells above threshold, in np.where order.
  activeCoords(threshold = 0.5, grid = this.grid) {
    const { width: w, height: h } = this, xs = [], ys = [], zs = [];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > threshold) { xs.push(i % w); ys.push(Math.floor(i / w) % h); zs.push(Math.floor(i / (w * h))); }
    }
    return { xs, ys, zs };
  }
}

export function replay3d({ width, height, depth, rng_seed, actions }, patterns) {
  const gen = new Generator3D(width, height, depth, patterns, new RandomState(rng_seed));
  const counts = [];
  for (const a of actions) {
    if (a[0] === 'seed_random') gen.seedRandom(a[1]);
    else if (a[0] === 'seed_center') gen.seedCenter(a[1]);
    else if (a[0] === 'grow') for (let i = 0; i < a[2]; i++) counts.push(gen.grow(a[1]));
    else throw new Error(`unknown 3D action ${a[0]}`);
  }
  return { gen, counts };
}
