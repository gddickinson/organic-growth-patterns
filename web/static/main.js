// Entry point: animated background, lazy page modules, footer mode, router.
import { start, lazy, route, app, isStatic, $ } from './core.js';
import { background } from './bg.js';

const PAGES = { 'home.js': ['home'], 'grow.js': ['grow'], 'grow3d.js': ['grow3d'], 'rules.js': ['rules'], 'about.js': ['about'] };
lazy(Object.fromEntries(Object.entries(PAGES).flatMap(([file, names]) => names.map(n => [n, () => import('./' + file)]))));

route('notfound', () => { app().innerHTML = '<h1>Not found</h1><p><a href="#/">Back to the start</a></p>'; });

$('#mode').textContent = isStatic()
  ? 'static site: every pattern grows in your browser'
  : 'local app: browser engine + Python generators at /api';
background($('#bg')).catch(e => console.warn('background:', e));
start();
