# Session log

## 2026-11-11 - Web interface, static GitHub Pages site, bug fixes (branch `web-interface`)

**Bugs fixed (each in its own commit, with regression tests in `test_organic_patterns.py`):**
- 3D growth died after one generation: `grow()` convolved with the normalised registry kernels, so neighbour counts
  were fractions <= 1 and the integer survive/birth ranges were never met. It now counts neighbours with the kernel's
  support. Crystal and mycelium now grow; coral still dies out from the demo seeds (its rule needs 4+ of 6 neighbours).
- 3D scatter plot / timelapse had x and z swapped (grid is (depth, height, width)); new `active_coords()`.
- Docs: README required opencv-python (unused, removed from requirements.txt too), had a placeholder clone URL and
  listed 3D as a future feature; ROADMAP claimed a .gitignore that did not exist (added).

**Web interface (`web/`, `run_web.py`, port 8172):** FastAPI app + plain ES-module front end from the web kit. The
static site is the full app: 2D and 3D generators ported to JS (`growth_engine.js`, `growth3d_engine.js`) with numpy's
MT19937 and `np.random.choice` ported (`mt19937.js`), so seeded runs match Python exactly. Pages: home, 2D lab, 3D lab,
rules, about. Local app adds "Check with Python" (POST /api/simulate2d|3d replays the run through the real classes).
`tests/fixtures/growth_fixture.json` (18 Python runs) is reproduced by the node test with zero difference.

**Needs George's decision (not changed):**
- Mycelium 2D noise: `grow('mycelium')` adds noise in [0, 0.1) to *every* cell, so after one step every cell is > 0:
  the active count is always the whole grid, births can never happen again (`grid == 0` is never true), and
  "Pattern died out" can never trigger. Options: add noise only to live cells, or count live cells as >= 0.5. The web
  ports it as written and shows a "solid (= 1)" count next to the active count.
- `create_3d_kernel('sphere')` and `'diamond'` build the identical 6-neighbour kernel; "diamond" may have been meant as
  a different (e.g. 18-neighbour) shape.

Tests: `test_organic_patterns.py` 25 passed; `tests/test_web.py` 16 passed (incl. node engine test).
