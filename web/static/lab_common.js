// Shared lab pieces: the action log (same format as web/simulate.py), its Python equivalent using the repo's classes,
// and the "Check with Python" panel that replays the log through the real generators (local app only).
import { api, esc, isStatic, needsServer } from './core.js';

// Append a growth step to the log, merging with the previous step when it used the same pattern.
export function logGrow(log, pattern, n = 1) {
  const last = log[log.length - 1];
  if (last && last[0] === 'grow' && last[1] === pattern) last[2] += n;
  else log.push(['grow', pattern, n]);
}

// Python that repeats the run with the repo's own code (np.random.seed gives the same numbers as this page).
export function pythonCode(run, dim) {
  const lines = ['import numpy as np'];
  if (dim === 2) lines.push('from organic_patterns import OrganicPatternGenerator', '', `np.random.seed(${run.rng_seed})`,
    `generator = OrganicPatternGenerator(width=${run.width}, height=${run.height})`);
  else lines.push('from organic_patterns_3d import OrganicPattern3D', '', `np.random.seed(${run.rng_seed})`,
    `generator = OrganicPattern3D(width=${run.width}, height=${run.height}, depth=${run.depth})`);
  let last = 'coral';
  for (const a of run.actions) {
    if (a[0] === 'seed_random') lines.push(`generator.seed_random(density=${a[1]})`);
    else if (a[0] === 'seed_center') lines.push(`generator.seed_center(radius=${a[1]})`);
    else if (a[0] === 'seed_line') lines.push('generator.seed_line()');
    else if (a[0] === 'env') lines.push(`generator.add_environment('${a[1]}')`);
    else if (a[0] === 'grow') {
      last = a[1];
      if (dim === 3) lines.push(`generator.grow('${a[1]}', generations=${a[2]})`);
      else lines.push(a[2] === 1 ? `generator.grow('${a[1]}')` : `for _ in range(${a[2]}):\n    generator.grow('${a[1]}')`);
    }
  }
  lines.push(dim === 2 ? `generator.visualize('${last}', save_path='${last}.png')`
    : `generator.visualize_3d('${last}', save_path='3d_${last}.png')`);
  return lines.join('\n');
}

// host: element; ctx: { dim, run(), compare(py) -> { ok, text } }.
export function checkPanel(host, ctx) {
  host.innerHTML = `<h3>Check against Python</h3>
    ${isStatic() ? needsServer('Replaying this run through the Python generators')
      : `<p class="small mute">Replays this run (seed, size and every step you took) through
        <code>${ctx.dim === 2 ? 'OrganicPatternGenerator' : 'OrganicPattern3D'}</code> on the server and compares the result
        with this page's JavaScript engine.</p><button id="chk-go" type="button">Check with Python</button>`}
    <p id="chk-out" class="small" aria-live="polite"></p>`;
  const go = host.querySelector('#chk-go'), out = host.querySelector('#chk-out');
  if (!go) return;
  go.onclick = async () => {
    go.disabled = true; out.className = 'small mute'; out.textContent = 'Running the Python generator...';
    try {
      const t0 = performance.now();
      const py = await api(ctx.dim === 2 ? '/simulate2d' : '/simulate3d', { body: ctx.run() });
      const r = ctx.compare(py);
      out.className = r.ok ? 'small ok' : 'small err';
      out.textContent = `${r.text} (Python took ${Math.round(performance.now() - t0)} ms)`;
    } catch (e) {
      out.className = 'small err'; out.textContent = e.message;
    } finally { go.disabled = false; }
  };
}

export const codeBlock = code => `<h3>The same run in Python</h3>
  <p class="small mute">Paste into a Python session in the repo folder: the seed reproduces this page's grid exactly.</p>
  <pre id="py-code">${esc(code)}</pre>`;

export function readout(host, rows) {
  host.innerHTML = rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
}

// Segmented buttons; returns a setter. opts: [[value, label]].
export function seg(host, opts, value, onPick) {
  host.innerHTML = opts.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === value}"
    class="${v === value ? 'on' : ''}">${esc(l)}</button>`).join('');
  host.querySelectorAll('button').forEach(b => b.onclick = () => {
    host.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    onPick(b.dataset.v);
  });
}

export const clampInt = (v, lo, hi, dflt) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };
