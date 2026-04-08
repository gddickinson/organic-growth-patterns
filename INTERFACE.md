# Organic Growth Patterns - Interface Map

## Module Overview

| File | Purpose |
|------|---------|
| `pattern_base.py` | Abstract base class `OrganicPatternBase`, 2D/3D pattern registries, `create_3d_kernel()` |
| `organic_patterns.py` | `OrganicPatternGenerator` - 2D cellular automaton with seeding, growth, environment, and visualization |
| `organic_patterns_3d.py` | `OrganicPattern3D` - 3D volumetric cellular automaton with scatter visualization and timelapse export |
| `test_organic_patterns.py` | Unit tests for all modules |
| `_archive/` | Original hyphenated filenames (pre-refactor) |

## Key Classes

- **`OrganicPatternBase`** (`pattern_base.py`): ABC defining `seed_random()`, `seed_center()`, `grow()`.
- **`OrganicPatternGenerator`** (`organic_patterns.py`): 2D implementation. Methods: `seed_random()`, `seed_center()`, `seed_line()`, `grow()`, `add_environment()`, `visualize()`.
- **`OrganicPattern3D`** (`organic_patterns_3d.py`): 3D implementation. Methods: `seed_random()`, `seed_center()`, `grow()`, `visualize_3d()`, `create_timelapse()`.

## Data Flow

1. Create a generator instance with grid dimensions
2. Seed the grid (`seed_random`, `seed_center`, `seed_line`)
3. Call `grow(pattern_type)` repeatedly to simulate
4. Optionally `add_environment()` (2D only)
5. `visualize()` / `visualize_3d()` to render output

## Pattern Registries

- `PATTERN_REGISTRY_2D`: coral, lichen, mycelium (2D kernels + color maps)
- `PATTERN_REGISTRY_3D`: coral, mycelium, crystal (3D kernels + color lists)
