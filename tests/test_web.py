"""Web interface tests: every exported endpoint answers, the static build is complete, and the JS engine tests pass.

Run: python -m pytest -q tests/test_web.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from web.app import STATIC, STATIC_ENDPOINTS, app  # noqa: E402

client = TestClient(app)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200 and "static/main.js" in r.text


@pytest.mark.parametrize("path", STATIC_ENDPOINTS)
def test_endpoint(path):
    r = client.get("/api" + path)
    assert r.status_code == 200, r.text
    assert r.json() is not None


def test_static_build(tmp_path):
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_static
    build_static.build(tmp_path / "site")
    assert (tmp_path / "site" / "index.html").read_text().count("APP_STATIC") == 1
    for path in STATIC_ENDPOINTS:
        assert (tmp_path / "site" / "api" / (path.strip("/") + ".json")).exists()


def test_static_assets_referenced_exist():
    html = (STATIC / "index.html").read_text()
    for name in ("style.css", "main.js"):
        assert f"static/{name}" in html and (STATIC / name).exists()


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_js_engine():
    tests = sorted(STATIC.glob("*.test.mjs"))
    for t in tests:
        r = subprocess.run(["node", str(t)], capture_output=True, text=True)
        assert r.returncode == 0, r.stdout + r.stderr


# --- project-specific API tests ------------------------------------------------------------------------------------
import json  # noqa: E402

import numpy as np  # noqa: E402

FIXTURE = ROOT / "tests" / "fixtures" / "growth_fixture.json"


def _close(a, b):
    """Recursive comparison with a float tolerance (libm differs in the last digit between macOS and Linux)."""
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(_close(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(_close(x, y) for x, y in zip(a, b))
    if isinstance(a, float) or isinstance(b, float):
        return bool(np.isclose(a, b, rtol=1e-9, atol=1e-12))
    return a == b


def test_fixture_is_current():
    sys.path.insert(0, str(ROOT / "scripts"))
    import make_growth_fixture
    fresh = make_growth_fixture.build()
    stored = json.loads(FIXTURE.read_text())
    fresh.pop("numpy"), stored.pop("numpy")
    assert _close(fresh, stored), "run python scripts/make_growth_fixture.py"


def test_patterns_match_registry():
    from pattern_base import PATTERN_REGISTRY_2D, PATTERN_REGISTRY_3D
    p = client.get("/api/patterns").json()
    assert [x["key"] for x in p["2d"]] == list(PATTERN_REGISTRY_2D)
    assert [x["key"] for x in p["3d"]] == list(PATTERN_REGISTRY_3D)


def test_colormaps_have_256_entries():
    c = client.get("/api/colormaps").json()
    for group in ("2d", "3d"):
        for name, lut in c[group].items():
            assert len(lut) == 256 and all(h.startswith("#") and len(h) == 7 for h in lut), name


def test_simulate2d_matches_generator():
    from organic_patterns import OrganicPatternGenerator
    body = {"width": 12, "height": 9, "rng_seed": 5,
            "actions": [["seed_random", 0.4], ["grow", "lichen", 3], ["env", "moisture"], ["grow", "coral", 1]]}
    r = client.post("/api/simulate2d", json=body).json()
    np.random.seed(5)
    g = OrganicPatternGenerator(12, 9)
    g.seed_random(0.4)
    counts = [g.grow("lichen") for _ in range(3)]
    g.add_environment("moisture")
    counts.append(g.grow("coral"))
    assert r["counts"] == counts and np.allclose(r["grid"], g.grid.ravel())


def test_simulate3d_counts():
    body = {"width": 10, "height": 10, "depth": 10, "rng_seed": 1, "actions": [["seed_center", 3], ["grow", "crystal", 2]]}
    r = client.post("/api/simulate3d", json=body).json()
    assert len(r["counts"]) == 2 and r["active"] == len(r["on"]) == r["counts"][-1] > 0


@pytest.mark.parametrize("body", [
    {"width": 10, "height": 10, "rng_seed": 1, "actions": [["grow", "nope", 1]]},
    {"width": 10, "height": 10, "rng_seed": 1, "actions": [["teleport"]]},
    {"width": 4000, "height": 4000, "rng_seed": 1, "actions": [["seed_line"]]},
    {"width": 10, "height": 10, "rng_seed": 1, "actions": [["grow", "coral", 5000]]},
])
def test_simulate2d_rejects_bad_runs(body):
    assert client.post("/api/simulate2d", json=body).status_code == 400
