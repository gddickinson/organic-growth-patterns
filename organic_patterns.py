"""
2D Organic Growth Pattern Generator.

Uses cellular automaton rules with configurable kernels for coral, lichen,
and mycelium growth patterns. Includes environmental factors (light, moisture
gradients) and multiple seeding methods.
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import convolve

from pattern_base import OrganicPatternBase, PATTERN_REGISTRY_2D


class OrganicPatternGenerator(OrganicPatternBase):
    """2D organic growth pattern generator using cellular automaton rules."""

    def __init__(self, width: int = 100, height: int = 100):
        """Initialize the generator with given grid dimensions.

        Args:
            width: Grid width in cells. Must be >= 2.
            height: Grid height in cells. Must be >= 2.
        """
        self._validate_dimensions(width, height)
        self.width = width
        self.height = height
        self.grid = np.zeros((height, width))
        self.patterns = PATTERN_REGISTRY_2D

    @staticmethod
    def _validate_dimensions(width: int, height: int) -> None:
        """Validate grid dimensions."""
        if width < 2 or height < 2:
            raise ValueError(f"Grid dimensions must be >= 2, got ({width}, {height})")

    def seed_random(self, density: float = 0.3) -> None:
        """Randomly seed the grid with active cells.

        Args:
            density: Fraction of cells to activate (0.0 to 1.0).
        """
        density = np.clip(density, 0.0, 1.0)
        if density == 0.0:
            self.grid = np.zeros((self.height, self.width))
            return
        self.grid = np.random.choice(
            [0.0, 1.0],
            size=(self.height, self.width),
            p=[1 - density, density]
        )
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def seed_center(self, radius: int = 10) -> None:
        """Seed a circular region from the grid center.

        Args:
            radius: Radius of the seeded circle in cells. Must be >= 0.
        """
        radius = max(0, radius)
        self.grid = np.zeros((self.height, self.width))
        center_y, center_x = self.height // 2, self.width // 2
        y, x = np.ogrid[-center_y:self.height - center_y, -center_x:self.width - center_x]
        mask = x * x + y * y <= radius * radius
        self.grid[mask] = 1.0
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def seed_line(self) -> None:
        """Seed a horizontal line across the middle of the grid."""
        self.grid = np.zeros((self.height, self.width))
        self.grid[self.height // 2, self.width // 4:3 * self.width // 4] = 1.0
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def grow(self, pattern_type: str = 'coral') -> int:
        """Advance one generation of growth using the specified pattern rules.

        Args:
            pattern_type: Key into the pattern registry ('coral', 'lichen', 'mycelium').

        Returns:
            Number of active cells after this growth step.

        Raises:
            KeyError: If pattern_type is not in the registry.
        """
        if pattern_type not in self.patterns:
            raise KeyError(f"Unknown pattern type '{pattern_type}'. "
                           f"Available: {list(self.patterns.keys())}")

        pattern = self.patterns[pattern_type]
        kernel = pattern['kernel']
        survive_low, survive_high = pattern['survive_range']
        birth_low, birth_high = pattern['birth_range']

        # Count neighbors
        neighbors = convolve(self.grid, kernel, mode='wrap')

        # Create next generation grid
        next_grid = np.zeros_like(self.grid)

        # Apply survival and birth rules
        survival_mask = (self.grid > 0) & (neighbors >= survive_low) & (neighbors <= survive_high)
        birth_mask = (self.grid == 0) & (neighbors >= birth_low) & (neighbors <= birth_high)

        next_grid[survival_mask | birth_mask] = 1.0

        # Add noise for organic appearance, to live cells only: noise on empty cells would make every cell > 0,
        # so nothing could ever be born again and the whole grid would count as active.
        if pattern_type == 'mycelium':
            noise = np.random.random(next_grid.shape) * 0.1
            alive = next_grid > 0
            next_grid[alive] = np.clip(next_grid[alive] + noise[alive], 0, 1)

        # Update grid
        self.grid = next_grid
        active_cells = int(np.sum(self.grid > 0))

        if active_cells == 0:
            print("Warning: No active cells remaining!")

        return active_cells

    def add_environment(self, factor: str = 'moisture') -> None:
        """Apply an environmental gradient to modulate the current grid.

        Args:
            factor: Type of environmental influence ('moisture' or 'light').
        """
        if factor == 'moisture':
            gradient = np.linspace(0.5, 1, self.height)
            gradient = np.tile(gradient.reshape(-1, 1), (1, self.width))
            self.grid *= gradient
        elif factor == 'light':
            center_y, center_x = self.height // 2, self.width // 2
            y, x = np.ogrid[-center_y:self.height - center_y, -center_x:self.width - center_x]
            gradient = 1 - 0.5 * (x * x + y * y) / (self.width * self.height / 4)
            gradient = np.clip(gradient, 0.3, 1)
            self.grid *= gradient

    def visualize(self, pattern_type: str = 'coral', show: bool = True,
                  save_path: str = None) -> None:
        """Visualize the current grid state with enhanced contrast.

        Args:
            pattern_type: Pattern type (used to select colormap).
            show: Whether to display the plot interactively.
            save_path: If provided, save the figure to this file path.
        """
        plt.figure(figsize=(10, 10))

        # Enhance contrast for better visibility
        display_grid = np.copy(self.grid)
        display_grid = np.clip(display_grid * 1.5, 0, 1)

        cmap = self.patterns.get(pattern_type, {}).get('color_map', 'viridis')
        plt.imshow(display_grid, cmap=cmap, interpolation='nearest')
        plt.colorbar(label='Cell State')
        plt.title(f'{pattern_type.capitalize()} Pattern\nActive Cells: {np.sum(self.grid > 0)}')

        if save_path:
            plt.savefig(save_path, bbox_inches='tight', dpi=300)
        if show:
            plt.show()
        plt.close()


def main():
    """Run demonstrations of all pattern types with multiple seeding methods."""
    pattern_types = ['coral', 'lichen', 'mycelium']
    seed_methods = [
        ('random', {'density': 0.3}),
        ('center', {'radius': 15}),
        ('line', {})
    ]

    for pattern_type in pattern_types:
        for seed_method, seed_params in seed_methods:
            print(f"\nGenerating {pattern_type} pattern with {seed_method} seeding...")

            generator = OrganicPatternGenerator(width=100, height=100)

            if seed_method == 'random':
                generator.seed_random(**seed_params)
            elif seed_method == 'center':
                generator.seed_center(**seed_params)
            elif seed_method == 'line':
                generator.seed_line()

            generator.visualize(pattern_type,
                                save_path=f'{pattern_type}_{seed_method}_initial.png')

            active_cells = 0
            for i in range(30):
                active_cells = generator.grow(pattern_type)
                if i % 5 == 0:
                    print(f"Generation {i}: {active_cells} active cells")
                    generator.visualize(pattern_type,
                                        save_path=f'{pattern_type}_{seed_method}_gen_{i}.png')

                if active_cells == 0:
                    print("Pattern died out!")
                    break

            if active_cells > 0:
                generator.add_environment('light')
                generator.visualize(pattern_type,
                                    save_path=f'{pattern_type}_{seed_method}_final.png')


if __name__ == "__main__":
    main()
