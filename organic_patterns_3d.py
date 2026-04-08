"""
3D Organic Growth Pattern Generator.

Extends the organic pattern system to three dimensions with 3D kernels,
volumetric visualization, and time-lapse animation export.
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401
import matplotlib.animation as animation
from scipy.ndimage import convolve
from matplotlib.colors import LinearSegmentedColormap

from pattern_base import OrganicPatternBase, PATTERN_REGISTRY_3D


class OrganicPattern3D(OrganicPatternBase):
    """3D organic growth pattern generator using volumetric cellular automaton rules."""

    def __init__(self, width: int = 50, height: int = 50, depth: int = 50):
        """Initialize the 3D generator.

        Args:
            width: Grid width. Must be >= 2.
            height: Grid height. Must be >= 2.
            depth: Grid depth. Must be >= 2.
        """
        if min(width, height, depth) < 2:
            raise ValueError(f"All dimensions must be >= 2, got ({width}, {height}, {depth})")
        self.width = width
        self.height = height
        self.depth = depth
        self.grid = np.zeros((depth, height, width))
        self.history = []
        self.patterns = PATTERN_REGISTRY_3D

    def seed_random(self, density: float = 0.1) -> None:
        """Initialize with random active points.

        Args:
            density: Fraction of cells to activate (0.0 to 1.0).
        """
        density = np.clip(density, 0.0, 1.0)
        self.grid = np.random.choice(
            [0, 1],
            size=(self.depth, self.height, self.width),
            p=[1 - density, density]
        )
        self.history = [self.grid.copy()]

    def seed_center(self, radius: int = 5) -> None:
        """Initialize from a spherical region at the grid center.

        Args:
            radius: Radius of the seeded sphere in cells.
        """
        radius = max(0, radius)
        self.grid = np.zeros((self.depth, self.height, self.width))
        center_x, center_y, center_z = self.width // 2, self.height // 2, self.depth // 2

        for x in range(self.width):
            for y in range(self.height):
                for z in range(self.depth):
                    distance = np.sqrt((x - center_x)**2 + (y - center_y)**2 + (z - center_z)**2)
                    if distance <= radius:
                        self.grid[z, y, x] = 1

        self.history = [self.grid.copy()]

    def grow(self, pattern_type: str = 'coral', generations: int = 1) -> int:
        """Grow the pattern for the specified number of generations.

        Args:
            pattern_type: Key into the pattern registry.
            generations: Number of growth steps to simulate.

        Returns:
            Number of active cells after growth.

        Raises:
            KeyError: If pattern_type is not in the registry.
        """
        if pattern_type not in self.patterns:
            raise KeyError(f"Unknown pattern type '{pattern_type}'. "
                           f"Available: {list(self.patterns.keys())}")

        pattern = self.patterns[pattern_type]

        for _ in range(generations):
            neighbors = convolve(self.grid, pattern['kernel'], mode='wrap')

            next_grid = np.zeros_like(self.grid)

            survive_low, survive_high = pattern['survive_range']
            birth_low, birth_high = pattern['birth_range']

            survive_mask = (self.grid > 0) & \
                           (neighbors >= survive_low) & \
                           (neighbors <= survive_high)
            birth_mask = (self.grid == 0) & \
                         (neighbors >= birth_low) & \
                         (neighbors <= birth_high)

            next_grid[survive_mask | birth_mask] = 1

            self.grid = next_grid
            self.history.append(self.grid.copy())

        return int(np.sum(self.grid > 0))

    def visualize_3d(self, pattern_type: str = 'coral', threshold: float = 0.5,
                     save_path: str = None) -> None:
        """Create a 3D scatter visualization of the current state.

        Args:
            pattern_type: Pattern type (for colormap selection).
            threshold: Minimum cell value to display.
            save_path: If provided, save the figure to this path.
        """
        fig = plt.figure(figsize=(12, 12))
        ax = fig.add_subplot(111, projection='3d')

        x, y, z = np.where(self.grid > threshold)

        colors = self.patterns[pattern_type]['colors']
        custom_cmap = LinearSegmentedColormap.from_list('custom', colors)

        c = z / max(self.depth, 1)

        ax.scatter(x, y, z, c=c, cmap=custom_cmap, alpha=0.6)

        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Z')
        ax.set_title(f'3D {pattern_type.capitalize()} Pattern')

        if save_path:
            plt.savefig(save_path)
        plt.show()

    def create_timelapse(self, pattern_type: str = 'coral', save_path: str = 'timelapse.gif',
                         interval: int = 200, threshold: float = 0.5):
        """Create time-lapse animation of pattern growth.

        Args:
            pattern_type: Pattern type (for colormap selection).
            save_path: Output file path for the animation.
            interval: Delay between frames in milliseconds.
            threshold: Minimum cell value to display.
        """
        fig = plt.figure(figsize=(12, 12))

        colors = self.patterns[pattern_type]['colors']
        custom_cmap = LinearSegmentedColormap.from_list('custom', colors)

        def update(frame):
            plt.clf()
            ax = fig.add_subplot(111, projection='3d')

            x, y, z = np.where(self.history[frame] > threshold)

            if len(x) > 0:
                c = z / max(self.depth, 1)
                ax.scatter(x, y, z, c=c, cmap=custom_cmap, alpha=0.6)

            ax.set_xlabel('X')
            ax.set_ylabel('Y')
            ax.set_zlabel('Z')
            ax.set_title(f'3D {pattern_type.capitalize()} Pattern - Generation {frame}')

            return ax,

        anim = animation.FuncAnimation(fig, update, frames=len(self.history),
                                       interval=interval, blit=False)

        if save_path:
            anim.save(save_path, writer='pillow')

        plt.show()
        return anim


def main():
    """Run demonstrations of all 3D pattern types."""
    patterns = ['coral', 'mycelium', 'crystal']

    for pattern in patterns:
        print(f"\nGenerating 3D {pattern} pattern...")

        generator = OrganicPattern3D(width=30, height=30, depth=30)
        generator.seed_center(radius=3)

        for gen in range(10):
            generator.grow(pattern_type=pattern)
            print(f"Generation {gen + 1} complete")

        generator.visualize_3d(pattern_type=pattern,
                               save_path=f'3d_{pattern}_final.png')

        generator.create_timelapse(pattern_type=pattern,
                                   save_path=f'3d_{pattern}_timelapse.gif')


if __name__ == "__main__":
    main()
