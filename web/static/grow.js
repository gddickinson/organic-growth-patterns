// 2D lab (#/grow?pattern=coral&seed=random&rng=42&gens=0): OrganicPatternGenerator running in the browser. Pick a pattern and a
// seeding method, step or play the growth, apply the light / moisture gradients, export a PNG, check against Python.
import { route, api, app, esc, $, slider, animate, onLeave } from './core.js';
import { Generator2D, byKey, countSolid } from './growth_engine.js';
import { RandomState } from './mt19937.js';
import { lutRGB, draw2d, exportPNG, sparkline } from './render.js';
import { logGrow, pythonCode, checkPanel, codeBlock, readout, seg, clampInt } from './lab_common.js';

const SEEDS = [['random', 'Random'], ['center', 'Centre'], ['line', 'Line']];

route('grow', async (args, q) => {
  const [info, pats, cmaps] = await Promise.all([api('/info'), api('/patterns'), api('/colormaps')]);
  const P = byKey(pats['2d']), D = info.defaults_2d;
  const s = {
    pattern: P[q.pattern] ? q.pattern : 'coral', seed: ['random', 'center', 'line'].includes(q.seed) ? q.seed : 'random',
    density: D.density, radius: D.radius, width: D.width, height: D.height, rng: clampInt(q.rng ?? 42, 0, 4294967295, 42),
    speed: 8, playing: false,
  };
  let gen, log, counts, generation;

  app().innerHTML = `
  <p class="kicker">2D lab · OrganicPatternGenerator</p>
  <h1>Grow a 2D pattern</h1>
  <p class="lead">Each generation counts every cell's neighbours with the pattern's kernel (wrapping at the edges) and
  applies its survival and birth ranges. Seed the grid, press play, and try the environmental gradients.</p>
  <div class="lab">
    <div class="controls panel">
      <label for="g-pat">Pattern</label>
      <select id="g-pat">${pats['2d'].map(p => `<option value="${esc(p.key)}">${esc(p.key)}</option>`).join('')}</select>
      <label id="g-seed-l">Seeding</label><div class="seg" id="g-seed" role="group" aria-labelledby="g-seed-l"></div>
      <div id="g-seedctl"></div>
      <div class="row">
        <div><label for="g-w">Width</label><input id="g-w" type="number" min="2" max="400" value="${s.width}"></div>
        <div><label for="g-h">Height</label><input id="g-h" type="number" min="2" max="400" value="${s.height}"></div>
        <div><label for="g-rng">Random seed</label><input id="g-rng" type="number" min="0" max="4294967295" value="${s.rng}"></div>
      </div>
      <div class="bar">
        <button id="g-play" type="button">Play</button>
        <button id="g-step" type="button" class="alt">Step</button>
        <button id="g-step10" type="button" class="alt">+10</button>
        <button id="g-reset" type="button" class="alt">Reseed</button>
      </div>
      <div id="g-speed"></div>
      <label>Environment (multiplies the grid once)</label>
      <div class="bar">
        <button id="g-light" type="button" class="alt">Light gradient</button>
        <button id="g-moist" type="button" class="alt">Moisture gradient</button>
      </div>
      <div class="readout" id="g-read" aria-live="polite"></div>
      <canvas class="spark" id="g-spark" aria-label="Active cells per generation"></canvas>
      <button id="g-png" type="button" class="alt">Export PNG</button>
    </div>
    <div class="view">
      <div class="stage grid2d"><canvas id="g-cv" role="img" aria-label="Growth pattern grid"></canvas></div>
      <p class="hint" id="g-note"></p>
    </div>
  </div>
  <div class="below"><div class="panel" id="g-check"></div><div class="panel" id="g-code"></div></div>`;

  const cv = $('#g-cv'), sel = $('#g-pat');
  sel.value = s.pattern;
  let lut = lutRGB(cmaps['2d'][P[s.pattern].color_map]);

  const runSpec = () => ({ width: s.width, height: s.height, rng_seed: s.rng, actions: log.map(a => [...a]) });
  const seedAction = () => s.seed === 'random' ? ['seed_random', s.density] : s.seed === 'center' ? ['seed_center', s.radius] : ['seed_line'];

  function show() {
    draw2d(cv, gen, lut);
    let lo = Infinity, hi = -Infinity;
    for (const v of gen.grid) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    readout($('#g-read'), [['generation', generation], ['active (> 0)', counts[counts.length - 1]],
      ['solid (= 1)', countSolid(gen.grid)], ['cells', gen.grid.length], ['min', lo.toFixed(3)], ['max', hi.toFixed(3)]]);
    sparkline($('#g-spark'), counts, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    $('#g-code').innerHTML = codeBlock(pythonCode(runSpec(), 2));
    $('#g-note').innerHTML = s.pattern === 'mycelium'
      ? `Mycelium adds noise of up to 0.1 to <em>every</em> cell after each step (as <code>grow()</code> is written), so all
         cells count as active (&gt; 0); "solid" counts the cells at 1. Colour map <code>${esc(P[s.pattern].color_map)}</code>.`
      : `Colour map <code>${esc(P[s.pattern].color_map)}</code>, shown as <code>visualize()</code> does: the grid × 1.5,
         clipped to 1 and scaled to its own range.`;
  }

  function reset() {
    gen = new Generator2D(s.width, s.height, P, new RandomState(s.rng));
    const a = seedAction();
    if (a[0] === 'seed_random') gen.seedRandom(a[1]); else if (a[0] === 'seed_center') gen.seedCenter(a[1]); else gen.seedLine();
    log = [a]; generation = 0;
    counts = [gen.grid.reduce((n, v) => n + (v > 0), 0)];
    show();
  }
  function step(n = 1) {
    for (let i = 0; i < n; i++) { counts.push(gen.grow(s.pattern)); generation++; }
    logGrow(log, s.pattern, n);
    show();
  }
  function env(f) { gen.addEnvironment(f); log.push(['env', f]); show(); }

  function seedControls() {
    const host = $('#g-seedctl');
    host.innerHTML = '';
    if (s.seed === 'random') slider(host, { id: 'dens', label: 'Density', min: 0, max: 1, step: 0.01, value: s.density, fmt: v => v.toFixed(2) }, v => { s.density = v; reset(); });
    else if (s.seed === 'center') slider(host, { id: 'rad', label: 'Radius', min: 0, max: 100, value: s.radius, unit: ' cells' }, v => { s.radius = v; reset(); });
    else host.innerHTML = '<p class="hint">A horizontal line across the middle half of the grid.</p>';
  }
  seg($('#g-seed'), SEEDS, s.seed, v => { s.seed = v; seedControls(); reset(); });
  seedControls();
  slider($('#g-speed'), { id: 'spd', label: 'Speed', min: 1, max: 60, value: s.speed, unit: ' gen/s' }, v => { s.speed = v; });

  sel.onchange = () => { s.pattern = sel.value; lut = lutRGB(cmaps['2d'][P[s.pattern].color_map]); show(); };
  const num = (id, key, lo, hi) => { $(id).onchange = e => { s[key] = clampInt(e.target.value, lo, hi, s[key]); e.target.value = s[key]; reset(); }; };
  num('#g-w', 'width', 2, 400); num('#g-h', 'height', 2, 400); num('#g-rng', 'rng', 0, 4294967295);
  $('#g-step').onclick = () => step(1);
  $('#g-step10').onclick = () => step(10);
  $('#g-reset').onclick = reset;
  $('#g-light').onclick = () => env('light');
  $('#g-moist').onclick = () => env('moisture');
  $('#g-png').onclick = () => exportPNG(cv, `${s.pattern}_${s.seed}_gen_${generation}.png`);

  let stop = null, last = 0;
  const play = $('#g-play');
  play.onclick = () => {
    s.playing = !s.playing;
    play.textContent = s.playing ? 'Pause' : 'Play';
    if (!s.playing) { stop?.(); stop = null; return; }
    stop = animate(t => { if (t - last >= 1000 / s.speed) { last = t; step(1); } });
  };
  onLeave(() => stop?.());

  checkPanel($('#g-check'), {
    dim: 2, run: runSpec,
    compare: py => {
      let worst = 0;
      gen.grid.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - py.grid[i])); });
      const same = JSON.stringify(py.counts) === JSON.stringify(counts.slice(1));
      return { ok: same && worst <= 1e-9, text: same && worst <= 1e-9
        ? `Identical: Python's grid matches all ${gen.grid.length.toLocaleString()} cells (max difference ${worst.toExponential(1)}) and the active count after each of ${py.counts.length} steps.`
        : `Different: counts ${same ? 'match' : 'differ'}, max cell difference ${worst}.` };
    },
  });
  reset();
  const pre = clampInt(q.gens ?? 0, 0, 500, 0);      // #/grow?gens=30 opens a run already grown
  if (pre) step(pre);
});
