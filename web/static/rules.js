// Rules page: the 2D and 3D pattern registries from pattern_base.py, with kernels drawn as grids (3D as three slices),
// survival/birth ranges, colour maps, and the environmental gradients.
import { route, api, app, esc, list } from './core.js';
import { rampCSS } from './render.js';
import { BLURB_2D } from './home.js';

const kern2 = k => `<div class="kern" style="grid-template-columns:repeat(${k[0].length},18px)" role="img"
  aria-label="kernel ${esc(JSON.stringify(k))}">${k.flat().map((v, i) =>
  `<i class="${v > 0 ? 'on' : i === (k.length * k[0].length - 1) / 2 ? 'mid' : ''}"></i>`).join('')}</div>`;

const support = k => JSON.stringify(k.map(p => p.map(r => r.map(v => (v > 0 ? 1 : 0)))));

route('rules', async () => {
  const pats = await api('/patterns'), cmaps = await api('/colormaps');
  const sup = Object.fromEntries(pats['3d'].map(p => [p.key, support(p.kernel)]));
  const twin = p => pats['3d'].find(o => o.key !== p.key && sup[o.key] === sup[p.key]);
  app().innerHTML = `
  <p class="kicker">Pattern registry</p>
  <h1>Growth rules</h1>
  <p class="lead">Each generation, every cell's neighbours are summed with the pattern's kernel (edges wrap around). A live
  cell survives if the sum is inside the survival range; an empty cell is born if it is inside the birth range. Everything
  else becomes empty.</p>
  <h2>2D (<code>PATTERN_REGISTRY_2D</code>)</h2>
  <div class="scroll"><table>
    <thead><tr><th>Pattern</th><th>Kernel</th><th>Survive</th><th>Birth</th><th>Colour map</th></tr></thead>
    <tbody>${list(pats['2d'], p => `<tr>
      <td><a href="#/grow?pattern=${esc(p.key)}"><b>${esc(p.key)}</b></a><br><span class="small mute">${esc(BLURB_2D[p.key] || '')}</span></td>
      <td>${kern2(p.kernel)}</td><td class="mono">${p.survive_range.join('–')}</td><td class="mono">${p.birth_range.join('–')}</td>
      <td><code>${esc(p.color_map)}</code><div class="ramp" style="background:${rampCSS(cmaps['2d'][p.color_map])}"></div></td></tr>`)}
    </tbody></table></div>
  <p class="small mute">The orange square is the cell itself (weight 0). Mycelium also adds uniform noise in [0, 0.1) to every
  cell after each step, as <code>grow()</code> is written.</p>
  <h2>3D (<code>PATTERN_REGISTRY_3D</code>)</h2>
  <div class="scroll"><table>
    <thead><tr><th>Pattern</th><th>Kernel (z = 0, 1, 2)</th><th>Survive</th><th>Birth</th><th>Colours</th></tr></thead>
    <tbody>${list(pats['3d'], p => `<tr>
      <td><a href="#/grow3d?pattern=${esc(p.key)}"><b>${esc(p.key)}</b></a><br><span class="small mute">
        ${p.kernel.flat(2).filter(v => v > 0).length} neighbours${twin(p) ? `; same neighbourhood as ${esc(twin(p).key)}` : ''}</span></td>
      <td><div class="kslices">${p.kernel.map((sl, z) => `<div><small>z=${z}</small>${kern2(sl)}</div>`).join('')}</div></td>
      <td class="mono">${p.survive_range.join('–')}</td><td class="mono">${p.birth_range.join('–')}</td>
      <td class="small">${esc(p.colors.join(', '))}<div class="ramp" style="background:${rampCSS(cmaps['3d'][p.key])}"></div></td></tr>`)}
    </tbody></table></div>
  <p class="small mute"><code>create_3d_kernel()</code> builds 'sphere' and 'diamond' as the same 6 face neighbours and
  'cube' as all 26; the weights are normalised, and <code>grow()</code> counts each neighbour once.</p>
  <h2>Environment (2D)</h2>
  <div class="two">
    <div class="panel"><h3>Light</h3><p>A radial gradient from the centre: <span class="eq">1 − 0.5·r² / (w·h/4)</span>, clipped to
      [0.3, 1], multiplied into the grid.</p></div>
    <div class="panel"><h3>Moisture</h3><p>A vertical gradient: each row is multiplied by <span class="eq">linspace(0.5, 1, height)</span>,
      from 0.5 at the top row to 1 at the bottom.</p></div>
  </div>
  <p class="small mute">After a gradient, cells hold values below 1; they still count as live (&gt; 0), and the next growth step
  sums these weaker values when counting neighbours.</p>`;
});
