"""
Unit tests for organic growth pattern generators.

Tests growth rules, seeding methods, input validation, and edge cases.
"""

import numpy as np
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from pattern_base import (
    PATTERN_REGISTRY_2D, PATTERN_REGISTRY_3D, create_3d_kernel
)
from organic_patterns import OrganicPatternGenerator
from organic_patterns_3d import OrganicPattern3D


# ---------- pattern_base tests ----------

class TestPatternRegistries:
    def test_2d_registry_has_expected_keys(self):
        assert set(PATTERN_REGISTRY_2D.keys()) == {'coral', 'lichen', 'mycelium'}

    def test_2d_kernels_are_3x3(self):
        for name, pat in PATTERN_REGISTRY_2D.items():
            assert pat['kernel'].shape == (3, 3), f"{name} kernel wrong shape"

    def test_3d_registry_has_expected_keys(self):
        assert set(PATTERN_REGISTRY_3D.keys()) == {'coral', 'mycelium', 'crystal'}

    def test_3d_kernels_are_3x3x3(self):
        for name, pat in PATTERN_REGISTRY_3D.items():
            assert pat['kernel'].shape == (3, 3, 3), f"{name} kernel wrong shape"

    def test_create_3d_kernel_shapes(self):
        for shape in ('sphere', 'diamond', 'cube'):
            k = create_3d_kernel(shape)
            assert k.shape == (3, 3, 3)
            assert k[1, 1, 1] == 0.0  # center always zero


# ---------- OrganicPatternGenerator (2D) tests ----------

class TestOrganicPatternGenerator2D:
    def test_init_creates_zero_grid(self):
        gen = OrganicPatternGenerator(50, 50)
        assert gen.grid.shape == (50, 50)
        assert np.sum(gen.grid) == 0

    def test_invalid_dimensions_raises(self):
        with pytest.raises(ValueError):
            OrganicPatternGenerator(1, 1)

    def test_seed_random_density(self):
        gen = OrganicPatternGenerator(100, 100)
        gen.seed_random(density=0.5)
        # Should be roughly 50% active (allow wide margin for randomness)
        frac = np.mean(gen.grid > 0)
        assert 0.3 < frac < 0.7

    def test_seed_random_zero_density(self):
        gen = OrganicPatternGenerator(50, 50)
        gen.seed_random(density=0.0)
        assert np.sum(gen.grid) == 0

    def test_seed_center(self):
        gen = OrganicPatternGenerator(100, 100)
        gen.seed_center(radius=10)
        assert np.sum(gen.grid > 0) > 0
        # Center cell should be active
        assert gen.grid[50, 50] == 1.0

    def test_seed_line(self):
        gen = OrganicPatternGenerator(100, 100)
        gen.seed_line()
        assert np.sum(gen.grid > 0) > 0
        # Middle row should have active cells
        assert np.sum(gen.grid[50, :]) > 0

    def test_grow_returns_active_count(self):
        gen = OrganicPatternGenerator(50, 50)
        gen.seed_random(density=0.3)
        count = gen.grow('coral')
        assert isinstance(count, int)
        assert count >= 0

    def test_grow_unknown_pattern_raises(self):
        gen = OrganicPatternGenerator(50, 50)
        gen.seed_random()
        with pytest.raises(KeyError):
            gen.grow('nonexistent')

    def test_grow_all_pattern_types(self):
        for ptype in PATTERN_REGISTRY_2D:
            gen = OrganicPatternGenerator(30, 30)
            gen.seed_random(density=0.3)
            count = gen.grow(ptype)
            assert count >= 0

    def test_environment_moisture(self):
        gen = OrganicPatternGenerator(50, 50)
        gen.seed_random(density=0.5)
        before = gen.grid.copy()
        gen.add_environment('moisture')
        # Grid should be modified (gradient applied)
        assert not np.array_equal(gen.grid, before)

    def test_environment_light(self):
        gen = OrganicPatternGenerator(50, 50)
        gen.seed_random(density=0.5)
        before = gen.grid.copy()
        gen.add_environment('light')
        assert not np.array_equal(gen.grid, before)


# ---------- OrganicPattern3D tests ----------

class TestOrganicPattern3D:
    def test_init(self):
        gen = OrganicPattern3D(20, 20, 20)
        assert gen.grid.shape == (20, 20, 20)

    def test_invalid_dimensions_raises(self):
        with pytest.raises(ValueError):
            OrganicPattern3D(1, 20, 20)

    def test_seed_random(self):
        gen = OrganicPattern3D(20, 20, 20)
        gen.seed_random(density=0.1)
        assert np.sum(gen.grid > 0) > 0
        assert len(gen.history) == 1

    def test_seed_center(self):
        gen = OrganicPattern3D(20, 20, 20)
        gen.seed_center(radius=3)
        assert np.sum(gen.grid > 0) > 0

    def test_grow_returns_count(self):
        gen = OrganicPattern3D(15, 15, 15)
        gen.seed_random(density=0.1)
        count = gen.grow('coral', generations=2)
        assert isinstance(count, int)
        assert len(gen.history) == 3  # initial + 2 generations

    def test_grow_unknown_pattern_raises(self):
        gen = OrganicPattern3D(10, 10, 10)
        gen.seed_random()
        with pytest.raises(KeyError):
            gen.grow('nonexistent')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
