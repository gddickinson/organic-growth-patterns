// Node test: the JS engines must reproduce runs of the repo's Python generators (tests/fixtures/growth_fixture.json,
// written by scripts/make_growth_fixture.py): numpy's random stream, every active-cell count, and the final grids.
// Run: node web/static/growth_engine.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { RandomState } from './mt19937.js';
import { replay2d, byKey, displayIndices } from './growth_engine.js';
import { replay3d } from './growth3d_engine.js';

const fx = JSON.parse(readFileSync(new URL('../../tests/fixtures/growth_fixture.json', import.meta.url)));
const p2 = byKey(fx.patterns['2d']), p3 = byKey(fx.patterns['3d']);
let checks = 0;

for (const { seed, random } of fx.mt19937) {
  const rs = new RandomState(seed);
  random.forEach((v, i) => assert.equal(rs.random(), v, `random_sample seed ${seed} #${i}`));
  checks++;
}

for (const [k, c] of fx.cases_2d.entries()) {
  const { gen, counts } = replay2d(c, p2);
  const label = `2D case ${k} ${JSON.stringify(c.actions.slice(0, 2))}`;
  assert.deepEqual(counts, c.expect.counts, label + ' counts');
  assert.equal(gen.grid.length, c.expect.grid.length);
  let worst = 0;
  gen.grid.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - c.expect.grid[i])); });
  assert.ok(worst <= 1e-9, `${label}: max grid difference ${worst}`);
  checks++;
}

for (const [k, c] of fx.cases_3d.entries()) {
  const { gen, counts } = replay3d(c, p3);
  const label = `3D case ${k} ${JSON.stringify(c.actions)}`;
  assert.deepEqual(counts, c.expect.counts, label + ' counts');
  const on = [];
  gen.grid.forEach((v, i) => { if (v > 0) on.push(i); });
  assert.deepEqual(on, c.expect.on, label + ' active cells');
  assert.deepEqual(gen.history.map(h => h.reduce((n, v) => n + (v > 0), 0)), c.expect.history_counts, label + ' history');
  checks++;
}

// display mapping: imshow autoscale of clip(grid * 1.5, 0, 1) onto 256 colours
assert.deepEqual([...displayIndices(Float64Array.from([0, 0.2, 1, 0.5]))], [0, 76, 255, 192]);
assert.deepEqual([...displayIndices(Float64Array.from([0, 0]))], [0, 0]);

console.log(`growth engine: ${checks} fixture checks passed (${fx.cases_2d.length} 2D runs, ${fx.cases_3d.length} 3D runs, numpy ${fx.numpy})`);
