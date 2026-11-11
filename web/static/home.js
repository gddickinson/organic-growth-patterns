// Home page: hero, counts from /api/info, one card per pattern (2D and 3D) with its colour map, and how the site works.
import { route, api, app, esc, list, tags, isStatic } from './core.js';
import { rampCSS } from './render.js';

// One-line descriptions from the README ("Multiple Growth Patterns", "Growth Rules") and the 3D registry.
export const BLURB_2D = {
  coral: 'Branching growth: survives with 2-3 neighbours, born with exactly 3.',
  lichen: 'Spreading growth on the 4-neighbour cross: survives with 1-3, born with 2-3.',
  mycelium: 'Network-like growth: survives with 2-4, born with 2-3, plus noise for an organic look.',
};

route('home', async () => {
  const [info, pats, cmaps] = await Promise.all([api('/info'), api('/patterns'), api('/colormaps')]);
  const nb = k => k.flat(2).filter(v => v > 0).length;
  app().innerHTML = `
  <section class="hero">
    <p class="kicker">Seed · Count neighbours · Grow</p>
    <h1 class="glow">Organic Growth Patterns</h1>
    <p class="lead">A cellular-automaton system that generates and visualises organic growth patterns inspired by natural
    phenomena: coral, lichen and mycelium in 2D, and coral, mycelium and crystal in 3D, with environmental light and
    moisture gradients. Every pattern grows here, in your browser, from the same rules and random numbers as the Python code.</p>
    <a class="btn" href="#/grow">Open the 2D lab</a><a class="btn alt" href="#/grow3d">Open the 3D lab</a>
  </section>
  <div class="tiles">
    <div class="tile"><b>${info.patterns_2d.length}</b><span>2D patterns</span></div>
    <div class="tile"><b>${info.patterns_3d.length}</b><span>3D patterns</span></div>
    <div class="tile"><b>${info.seeds_2d.length}</b><span>seeding methods</span></div>
    <div class="tile"><b>${info.environments.length}</b><span>environment gradients</span></div>
    <div class="tile"><b>${info.fixture_runs}</b><span>Python runs reproduced exactly by the JS engine</span></div>
  </div>
  <h2>2D patterns</h2>
  <div class="grid cards-pat">${list(pats['2d'], p => `
    <a class="card" href="#/grow?pattern=${esc(p.key)}">
      <b>${esc(p.key[0].toUpperCase() + p.key.slice(1))}</b><small>${esc(BLURB_2D[p.key] || '')}</small>
      <div>${tags([`survive ${p.survive_range.join('-')}`, `birth ${p.birth_range.join('-')}`, `${nb(p.kernel)} neighbours`], 'a')}</div>
      <div class="ramp" style="background:${rampCSS(cmaps['2d'][p.color_map])}" title="${esc(p.color_map)}"></div>
    </a>`)}</div>
  <h2>3D patterns</h2>
  <div class="grid cards-pat">${list(pats['3d'], p => `
    <a class="card" href="#/grow3d?pattern=${esc(p.key)}">
      <b>${esc(p.key[0].toUpperCase() + p.key.slice(1))}</b><small>${esc(p.colors.join(' → '))}</small>
      <div>${tags([`survive ${p.survive_range.join('-')}`, `birth ${p.birth_range.join('-')}`, `${nb(p.kernel)} neighbours`], 'c')}</div>
      <div class="ramp" style="background:${rampCSS(cmaps['3d'][p.key])}"></div>
    </a>`)}</div>
  <h2>How this site works</h2>
  <div class="flow">
    <div>The rules (kernels, survival and birth ranges) and colour maps are read from the Python pattern registries in
      <code>pattern_base.py</code> and from matplotlib, and exported as JSON.</div>
    <div><code>OrganicPatternGenerator</code> and <code>OrganicPattern3D</code> are ported to small JavaScript engines,
      including numpy's random-number generator, so a seed here gives the same pattern as <code>np.random.seed</code> in Python.</div>
    <div>Node tests replay ${info.fixture_runs} runs of the Python generators (every pattern and seeding method, the
      gradients, the desktop demos) and require identical grids and cell counts.</div>
    <div>${isStatic() ? 'Run the app locally (see About) and' : 'Here, in the local app, you can'} press "Check with Python"
      in either lab to replay your own run through the real Python classes.</div>
  </div>`;
});
