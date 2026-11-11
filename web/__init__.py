"""Web interface for Organic Growth Patterns (local FastAPI app + static GitHub Pages site).

Contents:
    app.py       FastAPI app: GET /api/info, /api/patterns, /api/colormaps (exported for the static site) and
                 POST /api/simulate2d, /api/simulate3d (replay a run through the real Python generators).
    simulate.py  Replays action lists through OrganicPatternGenerator / OrganicPattern3D; registry and colour-map JSON.
    static/      Front end (ES modules, no build step) with the JS growth engines and their node test.
"""
