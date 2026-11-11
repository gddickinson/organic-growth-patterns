// About page: what the project is, how to run the scripts, the web app and the static site, and credits (README).
import { route, app, isStatic } from './core.js';

route('about', () => {
  app().innerHTML = `
  <p class="kicker">About</p>
  <h1>Organic Growth Patterns</h1>
  <p class="lead">A Python cellular-automaton system that generates and visualises organic growth patterns inspired by
  natural phenomena like coral, lichen and mycelium growth, combining cellular automata rules with environmental factors.
  It is designed for both educational purposes and artistic exploration.</p>

  <h2>This web version</h2>
  <p>The site is the working generator: <code>OrganicPatternGenerator</code> (2D) and <code>OrganicPattern3D</code> are
  ported to small JavaScript engines (<code>growth_engine.js</code>, <code>growth3d_engine.js</code>), with numpy's
  MT19937 random-number generator and <code>np.random.choice</code> ported too (<code>mt19937.js</code>). The rules and
  colour maps are read from the Python registries and matplotlib. Node tests require the engines to reproduce runs of the
  Python generators exactly, and each lab shows the Python code that repeats your run.</p>
  ${isStatic() ? '<p class="static-note">You are on the static site: everything runs in your browser; only the "Check with Python" buttons need the local app.</p>' : ''}

  <h2>Run the Python scripts</h2>
  <pre>pip install -r requirements.txt     # numpy, matplotlib, scipy
python organic_patterns.py          # 2D demo: every pattern x seeding method, PNGs every 5 generations
python organic_patterns_3d.py       # 3D demo: scatter plot and GIF time-lapse per pattern
python -m pytest -q test_organic_patterns.py</pre>

  <h2>Run the web app</h2>
  <pre>pip install -r requirements-web.txt
python run_web.py                   # http://127.0.0.1:8172</pre>
  <p>Build the static site (what GitHub Pages serves) with <code>python scripts/build_static.py</code>; run the web tests with
  <code>python -m pytest -q tests/test_web.py</code> (includes the node engine test).</p>

  <h2>Credits</h2>
  <ul>
    <li>Inspired by natural growth patterns; built on cellular automata principles</li>
    <li>Created with assistance from Anthropic's Claude AI</li>
    <li>MIT licence</li>
  </ul>
  <p><a href="https://github.com/gddickinson/organic-growth-patterns">Source on GitHub</a></p>`;
});
