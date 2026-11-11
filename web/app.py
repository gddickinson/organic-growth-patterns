"""FastAPI web app for Organic Growth Patterns: serves the front end in static/ and the JSON API under /api.

Run with `python run_web.py` (http://127.0.0.1:8172, local only). `scripts/build_static.py` exports every path in
STATIC_ENDPOINTS to JSON for the GitHub Pages site, so keep that list in step with the GET routes below. The POST
routes replay a run through the repo's real generators (web/simulate.py) so the page can check its JS engine.
"""
import json
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from web import simulate  # noqa: E402
from pattern_base import PATTERN_REGISTRY_2D, PATTERN_REGISTRY_3D  # noqa: E402

STATIC = Path(__file__).resolve().parent / "static"
FIXTURE = ROOT / "tests" / "fixtures" / "growth_fixture.json"

app = FastAPI(title="Organic Growth Patterns")
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/api/info")
def info():
    """Counts for the home page, the desktop demos' default settings, and how many Python runs the JS engine matches."""
    fx = json.loads(FIXTURE.read_text()) if FIXTURE.exists() else {"cases_2d": [], "cases_3d": []}
    return {
        "title": "Organic Growth Patterns",
        "patterns_2d": list(PATTERN_REGISTRY_2D), "patterns_3d": list(PATTERN_REGISTRY_3D),
        "seeds_2d": ["random", "center", "line"], "seeds_3d": ["random", "center"],
        "environments": ["light", "moisture"],
        # organic_patterns.main() / organic_patterns_3d.main() and the methods' own defaults
        "defaults_2d": {"width": 100, "height": 100, "density": 0.3, "radius": 15, "generations": 30},
        "defaults_3d": {"width": 30, "height": 30, "depth": 30, "density": 0.1, "radius": 3, "generations": 10},
        "fixture_runs": len(fx["cases_2d"]) + len(fx["cases_3d"]),
    }


@app.get("/api/patterns")
def patterns():
    """The pattern registries from pattern_base.py (kernels, survive/birth ranges, colours)."""
    return simulate.patterns_payload()


@app.get("/api/colormaps")
def colormaps():
    """matplotlib colour maps used by the 2D and 3D visualisations, as 256-entry hex tables."""
    return simulate.colormaps_payload()


class Run2D(BaseModel):
    width: int
    height: int
    rng_seed: int
    actions: list


class Run3D(Run2D):
    depth: int


@app.post("/api/simulate2d")
def simulate_2d(run: Run2D):
    """Replay a 2D run through OrganicPatternGenerator and return the grid and counts."""
    try:
        gen, counts = simulate.replay_2d(run.width, run.height, run.rng_seed, run.actions)
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise HTTPException(400, str(e))
    return simulate.grid_2d_payload(gen, counts)


@app.post("/api/simulate3d")
def simulate_3d(run: Run3D):
    """Replay a 3D run through OrganicPattern3D and return the active cells and counts."""
    try:
        gen, counts = simulate.replay_3d(run.width, run.height, run.depth, run.rng_seed, run.actions)
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise HTTPException(400, str(e))
    return simulate.grid_3d_payload(gen, counts)


# GET paths (without the /api prefix) written to the static site as api/<path>.json.
STATIC_ENDPOINTS = ["/info", "/patterns", "/colormaps"]
