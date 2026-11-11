// 3D lab (#/grow3d?pattern=crystal&seed=center&rng=0&gens=0): OrganicPattern3D running in the browser, drawn as visualize_3d()'s scatter plot
// (drag or use the arrow keys to rotate). Scrub the history like create_timelapse(), export PNG, check against Python.
import { route, api, app, esc, $, slider, animate } from './core.js';
import { Generator3D } from './growth3d_engine.js';
import { byKey } from './growth_engine.js';
import { RandomState } from './mt19937.js';
import { lutRGB, draw3d, exportPNG, sparkline } from './render.js';
import { logGrow, pythonCode, checkPanel, codeBlock, readout, seg, clampInt } from './lab_common.js';

route('grow3d', async (args, q) => {
  const [info, pats, cmaps] = await Promise.all([api('/info'), api('/patterns'), api('/colormaps')]);
  const P = byKey(pats['3d']), D = info.defaults_3d;
  const s = {
    pattern: P[q.pattern] ? q.pattern : 'crystal', seed: q.seed === 'random' ? 'random' : 'center',
    density: D.density, radius: D.radius, width: D.width, height: D.height, depth: D.depth,
    rng: clampInt(q.rng ?? 0, 0, 4294967295, 0), speed: 4, spin: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  const view = { az: -0.95, el: 0.45 };
  let gen, log, counts, frame = 0;

  app().innerHTML = `
  <p class="kicker">3D lab · OrganicPattern3D</p>
  <h1>Grow a 3D pattern</h1>
  <p class="lead">The volumetric version: every cell counts its 6 face neighbours (coral, mycelium) or all 26 (crystal),
  wrapping at the faces, then applies the pattern's survival and birth ranges.</p>
  <div class="lab">
    <div class="controls panel">
      <label for="v-pat">Pattern</label>
      <select id="v-pat">${pats['3d'].map(p => `<option value="${esc(p.key)}">${esc(p.key)}</option>`).join('')}</select>
      <label id="v-seed-l">Seeding</label><div class="seg" id="v-seed" role="group" aria-labelledby="v-seed-l"></div>
      <div id="v-seedctl"></div>
      <div class="row">
        <div><label for="v-w">Width</label><input id="v-w" type="number" min="2" max="48" value="${s.width}"></div>
        <div><label for="v-h">Height</label><input id="v-h" type="number" min="2" max="48" value="${s.height}"></div>
        <div><label for="v-d">Depth</label><input id="v-d" type="number" min="2" max="48" value="${s.depth}"></div>
      </div>
      <label for="v-rng">Random seed</label><input id="v-rng" type="number" min="0" max="4294967295" value="${s.rng}">
      <div class="bar">
        <button id="v-play" type="button">Play</button>
        <button id="v-step" type="button" class="alt">Step</button>
        <button id="v-reset" type="button" class="alt">Reseed</button>
      </div>
      <div id="v-speed"></div>
      <div id="v-frame"></div>
      <label><input type="checkbox" id="v-spin" ${s.spin ? 'checked' : ''}> Rotate slowly</label>
      <div class="readout" id="v-read" aria-live="polite"></div>
      <canvas class="spark" id="v-spark" aria-label="Active cells per generation"></canvas>
      <button id="v-png" type="button" class="alt">Export PNG</button>
    </div>
    <div class="view">
      <div class="stage vol"><canvas id="v-cv" tabindex="0" role="img" aria-label="3D scatter of active cells; drag or use arrow keys to rotate"></canvas></div>
      <p class="hint">Drag (or focus and use the arrow keys) to rotate. Colour follows depth (z), as in <code>visualize_3d()</code>.</p>
    </div>
  </div>
  <div class="below"><div class="panel" id="v-check"></div><div class="panel" id="v-code"></div></div>`;

  const cv = $('#v-cv'), sel = $('#v-pat');
  sel.value = s.pattern;
  const lut = () => lutRGB(cmaps['3d'][s.pattern]);
  let LUT = lut();
  const runSpec = () => ({ width: s.width, height: s.height, depth: s.depth, rng_seed: s.rng, actions: log.map(a => [...a]) });

  const paint = () => draw3d(cv, gen, gen.history[frame], LUT, view, `3D ${s.pattern[0].toUpperCase() + s.pattern.slice(1)} Pattern - Generation ${frame}`);
  let frameInput = null;
  function frameSlider() {
    const host = $('#v-frame');
    host.innerHTML = '';
    frameInput = slider(host, { id: 'frm', label: 'Show generation', min: 0, max: gen.history.length - 1, value: frame }, v => { frame = v; show(false); });
  }
  function show(full = true) {
    paint();
    readout($('#v-read'), [['generation', `${frame} / ${gen.history.length - 1}`], ['active', counts[frame]],
      ['voxels', gen.grid.length], ['last gen', counts[counts.length - 1]]]);
    if (full) {
      frameSlider();
      sparkline($('#v-spark'), counts, getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
      $('#v-code').innerHTML = codeBlock(pythonCode(runSpec(), 3));
    }
  }
  function reset() {
    gen = new Generator3D(s.width, s.height, s.depth, P, new RandomState(s.rng));
    if (s.seed === 'random') { gen.seedRandom(s.density); log = [['seed_random', s.density]]; }
    else { gen.seedCenter(s.radius); log = [['seed_center', s.radius]]; }
    counts = [gen.grid.reduce((n, v) => n + (v > 0), 0)];
    frame = 0;
    show();
  }
  function step() {
    counts.push(gen.grow(s.pattern));
    logGrow(log, s.pattern, 1);
    frame = gen.history.length - 1;
    show();
  }

  function seedControls() {
    const host = $('#v-seedctl');
    host.innerHTML = '';
    if (s.seed === 'random') slider(host, { id: 'vdens', label: 'Density', min: 0, max: 0.6, step: 0.01, value: s.density, fmt: v => v.toFixed(2) }, v => { s.density = v; reset(); });
    else slider(host, { id: 'vrad', label: 'Radius', min: 0, max: 20, value: s.radius, unit: ' cells' }, v => { s.radius = v; reset(); });
  }
  seg($('#v-seed'), [['center', 'Centre sphere'], ['random', 'Random']], s.seed, v => { s.seed = v; seedControls(); reset(); });
  seedControls();
  slider($('#v-speed'), { id: 'vspd', label: 'Speed', min: 1, max: 20, value: s.speed, unit: ' gen/s' }, v => { s.speed = v; });
  sel.onchange = () => { s.pattern = sel.value; LUT = lut(); show(false); };
  const num = (id, key, lo, hi) => { $(id).onchange = e => { s[key] = clampInt(e.target.value, lo, hi, s[key]); e.target.value = s[key]; reset(); }; };
  num('#v-w', 'width', 2, 48); num('#v-h', 'height', 2, 48); num('#v-d', 'depth', 2, 48); num('#v-rng', 'rng', 0, 4294967295);
  $('#v-step').onclick = step;
  $('#v-reset').onclick = reset;
  $('#v-spin').onchange = e => { s.spin = e.target.checked; };
  $('#v-png').onclick = () => exportPNG(cv, `3d_${s.pattern}_gen_${frame}.png`, 0);

  // rotation: pointer drag and arrow keys
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', () => { drag = null; });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    view.az += (e.clientX - drag[0]) * 0.01;
    view.el = Math.max(-1.5, Math.min(1.5, view.el + (e.clientY - drag[1]) * 0.01));
    drag = [e.clientX, e.clientY]; paint();
  });
  cv.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[e.key];
    if (!k) return;
    e.preventDefault(); view.az += k[0]; view.el = Math.max(-1.5, Math.min(1.5, view.el + k[1])); paint();
  });

  let playing = false, last = 0;
  const play = $('#v-play');
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; };
  animate(t => {
    if (playing && t - last >= 1000 / s.speed) { last = t; step(); return; }
    if (s.spin && !drag) { view.az += 0.004; paint(); }
  });

  checkPanel($('#v-check'), {
    dim: 3, run: runSpec,
    compare: py => {
      const on = [];
      gen.grid.forEach((v, i) => { if (v > 0) on.push(i); });
      const same = JSON.stringify(on) === JSON.stringify(py.on), cs = JSON.stringify(py.counts) === JSON.stringify(counts.slice(1));
      return { ok: same && cs, text: same && cs
        ? `Identical: the same ${on.length.toLocaleString()} active voxels of ${gen.grid.length.toLocaleString()}, and the same count after each of ${py.counts.length} steps.`
        : `Different: ${same ? 'final voxels match' : 'final voxels differ'}, ${cs ? 'counts match' : 'counts differ'}.` };
    },
  });
  reset();
  const pre = clampInt(q.gens ?? 0, 0, 200, 0);      // #/grow3d?gens=10 opens a run already grown
  for (let i = 0; i < pre; i++) step();
});
