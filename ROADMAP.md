# Organic Growth Patterns — Roadmap

## Current State
Two scripts: `organic_patterns.py` (2D cellular automaton) and `organic_patterns_3d.py` (3D version). The `OrganicPatternGenerator` class uses numpy/scipy convolution with configurable kernels for coral, lichen, and mycelium growth patterns. Includes environmental factors (light, moisture gradients) and multiple seeding methods. Shared logic extracted into `pattern_base.py`. Has tests, requirements.txt, and proper Python naming.

## Short-term Improvements
- [x] Add a `requirements.txt` (numpy, matplotlib, scipy, opencv-python)
- [x] Add input validation for grid dimensions, density ranges, and growth iterations
- [x] Add docstrings to `grow()`, `seed_random()`, `seed_center()`, `seed_line()`, and `visualize()`
- [x] Handle edge cases: zero iterations, density=0 or density=1, grid size of 1x1
- [ ] Add progress reporting for long growth simulations (callback or tqdm)
- [x] Add a `.gitignore` to exclude generated PNG output files

## Feature Enhancements
- [ ] Add a tkinter or PyQt GUI for interactive parameter adjustment and real-time preview
- [ ] Add GIF/MP4 animation export showing growth evolution over iterations
- [ ] Add new pattern types: algae (DLA-based), fungal networks, crystal growth, slime mold
- [ ] Implement pattern combination — grow two patterns on the same grid with interaction rules
- [ ] Add nutrient depletion as an environmental factor (cells consume resources, limiting growth)
- [ ] Support non-square and circular grid boundaries
- [ ] Add statistical analysis: fractal dimension, growth rate curves, density over time

## Long-term Vision
- [ ] Implement GPU-accelerated growth simulation using CuPy or PyOpenCL for large grids
- [ ] Add 3D visualization with proper rendering (marching cubes + VTK or pyvista) for the 3D version
- [x] Build a web-based interactive simulator (FastAPI app + static GitHub Pages site with a JS engine; `web/`)
- [ ] Add agent-based modeling as an alternative to cellular automata for more realistic growth
- [ ] Support importing real microscopy images as initial seeds for hybrid simulation
- [ ] Publish as a pip package for use in generative art and biology education

## Technical Debt
- [x] Split shared logic between `organic_patterns.py` and `organic_patterns_3d.py` into a common base module
- [x] Replace hardcoded pattern dictionaries with a pattern registry that supports dynamic registration
- [x] Add unit tests for growth rules (verify neighbor counting, birth/survival conditions)
- [ ] The 3D version likely duplicates the 2D logic — refactor to use dimensional-agnostic operations where possible
- [x] Add type hints to all methods in `OrganicPatternGenerator`
- [x] Rename files to use underscores (`organic_patterns.py`) for Python import compatibility
