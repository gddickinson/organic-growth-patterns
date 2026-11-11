// Static-site data layer: answers api() GETs from the JSON files exported by scripts/build_static.py
// (api/info.json, api/patterns.json, api/colormaps.json). The POST /simulate2d and /simulate3d routes run the Python
// generators, so they are refused here; the labs show a "needs the local app" notice instead of calling them.
const files = new Map();
function file(rel) {
  if (!files.has(rel)) {
    files.set(rel, fetch('api/' + rel + '.json').then(r => { if (!r.ok) throw new Error(`${r.status} ${rel}`); return r.json(); }));
  }
  return files.get(rel);
}

export async function staticApi(path, body) {
  const clean = path.split('?')[0].replace(/^\/+/, '');
  if (body || clean.startsWith('simulate')) throw new Error('Running the Python generators needs the local app (python run_web.py).');
  return file(clean);
}
