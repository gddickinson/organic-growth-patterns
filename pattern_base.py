"""
Shared base class and pattern registries for organic growth pattern generators.

Extracts the common logic between 2D and 3D generators into a single module
to eliminate code duplication.
"""

import numpy as np
from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple


class OrganicPatternBase(ABC):
    """Abstract base for organic pattern generators (2D and 3D)."""

    @abstractmethod
    def seed_random(self, density: float = 0.3) -> None:
        """Seed the grid with random active cells."""
        ...

    @abstractmethod
    def seed_center(self, radius: int = 10) -> None:
        """Seed a region from the grid center."""
        ...

    @abstractmethod
    def grow(self, pattern_type: str = 'coral') -> int:
        """Advance one generation of growth. Returns active cell count."""
        ...


# ----- 2D Pattern Registry -----
PATTERN_REGISTRY_2D: Dict[str, Dict[str, Any]] = {
    'coral': {
        'kernel': np.array([[1, 1, 1],
                            [1, 0, 1],
                            [1, 1, 1]]),
        'survive_range': (2, 3),
        'birth_range': (3, 3),
        'color_map': 'YlOrRd',
    },
    'lichen': {
        'kernel': np.array([[0, 1, 0],
                            [1, 0, 1],
                            [0, 1, 0]]),
        'survive_range': (1, 3),
        'birth_range': (2, 3),
        'color_map': 'YlGn',
    },
    'mycelium': {
        'kernel': np.array([[1, 1, 1],
                            [1, 0, 1],
                            [1, 1, 1]]),
        'survive_range': (2, 4),
        'birth_range': (2, 3),
        'color_map': 'copper',
    },
}


def create_3d_kernel(shape: str = 'sphere') -> np.ndarray:
    """Create a 3x3x3 kernel for 3D neighborhood calculations.

    Args:
        shape: Kernel geometry - 'sphere', 'diamond', or 'cube'.

    Returns:
        Normalized 3D numpy array.
    """
    kernel = np.zeros((3, 3, 3))

    if shape == 'sphere':
        kernel[1, 1, 0] = kernel[1, 0, 1] = kernel[0, 1, 1] = 1
        kernel[1, 1, 2] = kernel[1, 2, 1] = kernel[2, 1, 1] = 1
        kernel[1, 1, 1] = 0
    elif shape == 'diamond':
        kernel[1, 1, 0] = kernel[1, 0, 1] = kernel[0, 1, 1] = 1
        kernel[1, 1, 2] = kernel[1, 2, 1] = kernel[2, 1, 1] = 1
        kernel[1, 1, 1] = 0
    elif shape == 'cube':
        kernel.fill(1)
        kernel[1, 1, 1] = 0

    total = np.sum(kernel)
    if total > 0:
        kernel = kernel / total
    return kernel


# ----- 3D Pattern Registry -----
PATTERN_REGISTRY_3D: Dict[str, Dict[str, Any]] = {
    'coral': {
        'kernel': create_3d_kernel('sphere'),
        'survive_range': (4, 6),
        'birth_range': (4, 5),
        'colors': ['darkred', 'red', 'orange', 'yellow'],
    },
    'mycelium': {
        'kernel': create_3d_kernel('diamond'),
        'survive_range': (3, 6),
        'birth_range': (3, 4),
        'colors': ['saddlebrown', 'peru', 'burlywood', 'wheat'],
    },
    'crystal': {
        'kernel': create_3d_kernel('cube'),
        'survive_range': (4, 7),
        'birth_range': (5, 6),
        'colors': ['darkblue', 'blue', 'lightblue', 'white'],
    },
}
