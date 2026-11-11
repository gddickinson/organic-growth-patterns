"""Replay a growth run through the repo's own generators, for the web API and the JS-engine fixtures.

A run is (grid size, numpy RNG seed, action list). Actions mirror the public methods of OrganicPatternGenerator (2D)
and OrganicPattern3D (3D):

    ["seed_random", density]   ["seed_center", radius]   ["seed_line"]          (seed_line: 2D only)
    ["grow", pattern, n]       ["env", "light" | "moisture"]                     (env: 2D only)

np.random.seed(rng_seed) is called first, so a run is reproducible and the browser engine (which ports numpy's
MT19937 and np.random.choice) can repeat it exactly.
"""
import contextlib
import io
import threading

import matplotlib

matplotlib.use("Agg")

import numpy as np  # noqa: E402
from matplotlib import colormaps  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap, to_hex  # noqa: E402

from organic_patterns import OrganicPatternGenerator  # noqa: E402
from organic_patterns_3d import OrganicPattern3D  # noqa: E402
from pattern_base import PATTERN_REGISTRY_2D, PATTERN_REGISTRY_3D  # noqa: E402

MAX_CELLS_2D = 400 * 400
MAX_CELLS_3D = 48 ** 3
MAX_GROW_WORK = 20_000_000      # cells x generations per request
_lock = threading.Lock()         # np.random is global state


def _check_grow(pattern, n, registry):
    if pattern not in registry:
        raise ValueError(f"unknown pattern {pattern!r}; available: {sorted(registry)}")
    n = int(n)
    if not 0 <= n <= 1000:
        raise ValueError("grow count must be between 0 and 1000")
    return n


def _work(actions, cells):
    return cells * sum(int(a[2]) for a in actions if a and a[0] == "grow" and len(a) > 2)


def replay_2d(width, height, rng_seed, actions):
    """Run the actions on an OrganicPatternGenerator; returns (generator, active-cell count after each growth step)."""
    if width * height > MAX_CELLS_2D or _work(actions, width * height) > MAX_GROW_WORK:
        raise ValueError("grid too large or too many generations for one request")
    counts = []
    with _lock, contextlib.redirect_stdout(io.StringIO()):
        np.random.seed(int(rng_seed))
        gen = OrganicPatternGenerator(int(width), int(height))
        for a in actions:
            kind = a[0]
            if kind == "seed_random":
                gen.seed_random(density=float(a[1]))
            elif kind == "seed_center":
                gen.seed_center(radius=int(a[1]))
            elif kind == "seed_line":
                gen.seed_line()
            elif kind == "grow":
                for _ in range(_check_grow(a[1], a[2], PATTERN_REGISTRY_2D)):
                    counts.append(gen.grow(a[1]))
            elif kind == "env":
                if a[1] not in ("light", "moisture"):
                    raise ValueError("environment factor must be 'light' or 'moisture'")
                gen.add_environment(a[1])
            else:
                raise ValueError(f"unknown 2D action {kind!r}")
    return gen, counts


def replay_3d(width, height, depth, rng_seed, actions):
    """Run the actions on an OrganicPattern3D; returns (generator, active-cell count after each growth step)."""
    if width * height * depth > MAX_CELLS_3D or _work(actions, width * height * depth) > MAX_GROW_WORK:
        raise ValueError("grid too large or too many generations for one request")
    counts = []
    with _lock, contextlib.redirect_stdout(io.StringIO()):
        np.random.seed(int(rng_seed))
        gen = OrganicPattern3D(int(width), int(height), int(depth))
        for a in actions:
            kind = a[0]
            if kind == "seed_random":
                gen.seed_random(density=float(a[1]))
            elif kind == "seed_center":
                gen.seed_center(radius=int(a[1]))
            elif kind == "grow":
                for _ in range(_check_grow(a[1], a[2], PATTERN_REGISTRY_3D)):
                    counts.append(gen.grow(a[1]))
            else:
                raise ValueError(f"unknown 3D action {kind!r}")
    return gen, counts


def grid_2d_payload(gen, counts):
    return {"width": gen.width, "height": gen.height, "counts": counts,
            "active": int(np.sum(gen.grid > 0)), "grid": [float(v) for v in gen.grid.ravel()]}


def grid_3d_payload(gen, counts):
    flat = gen.grid.ravel()
    return {"width": gen.width, "height": gen.height, "depth": gen.depth, "counts": counts,
            "active": int(np.sum(flat > 0)), "on": [int(i) for i in np.flatnonzero(flat > 0)],
            "history_counts": [int(np.sum(h > 0)) for h in gen.history]}


def patterns_payload():
    """The 2D and 3D pattern registries from pattern_base.py, as JSON."""
    two = [{"key": k, "kernel": p["kernel"].astype(float).tolist(), "survive_range": list(p["survive_range"]),
            "birth_range": list(p["birth_range"]), "color_map": p["color_map"]} for k, p in PATTERN_REGISTRY_2D.items()]
    three = [{"key": k, "kernel": p["kernel"].astype(float).tolist(), "survive_range": list(p["survive_range"]),
              "birth_range": list(p["birth_range"]), "colors": list(p["colors"])} for k, p in PATTERN_REGISTRY_3D.items()]
    return {"2d": two, "3d": three}


def _lut(cmap):
    return [to_hex(c) for c in cmap(np.arange(cmap.N))]


def colormaps_payload():
    """256-entry hex lookup tables: matplotlib's maps used by the 2D patterns (imshow), and the 3D patterns'
    LinearSegmentedColormap.from_list(colors), exactly as organic_patterns*.py build them."""
    two = {p["color_map"]: _lut(colormaps[p["color_map"]]) for p in PATTERN_REGISTRY_2D.values()}
    two["viridis"] = _lut(colormaps["viridis"])       # visualize()'s fallback colour map
    three = {k: _lut(LinearSegmentedColormap.from_list("custom", p["colors"])) for k, p in PATTERN_REGISTRY_3D.items()}
    return {"2d": two, "3d": three}
