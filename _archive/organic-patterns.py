import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import convolve
import cv2

class OrganicPatternGenerator:
    def __init__(self, width=100, height=100):
        self.width = width
        self.height = height
        self.grid = np.zeros((height, width))
        self.patterns = {
            'coral': {
                'kernel': np.array([[1, 1, 1],
                                  [1, 0, 1],
                                  [1, 1, 1]]),
                'survive_range': (2, 3),
                'birth_range': (3, 3),
                'color_map': 'YlOrRd'  # Yellow-Orange-Red colormap
            },
            'lichen': {
                'kernel': np.array([[0, 1, 0],
                                  [1, 0, 1],
                                  [0, 1, 0]]),
                'survive_range': (1, 3),
                'birth_range': (2, 3),
                'color_map': 'YlGn'    # Yellow-Green colormap
            },
            'mycelium': {
                'kernel': np.array([[1, 1, 1],
                                  [1, 0, 1],
                                  [1, 1, 1]]),
                'survive_range': (2, 4),
                'birth_range': (2, 3),
                'color_map': 'copper'   # Copper colormap
            }
        }

    def seed_random(self, density=0.3):
        """Randomly seed the grid"""
        self.grid = np.random.choice(
            [0.0, 1.0],
            size=(self.height, self.width),
            p=[1-density, density]
        )
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def seed_center(self, radius=10):
        """Seed from center"""
        self.grid = np.zeros((self.height, self.width))
        center_y, center_x = self.height // 2, self.width // 2
        y, x = np.ogrid[-center_y:self.height-center_y, -center_x:self.width-center_x]
        mask = x*x + y*y <= radius*radius
        self.grid[mask] = 1.0
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def seed_line(self):
        """Seed with a line pattern"""
        self.grid = np.zeros((self.height, self.width))
        self.grid[self.height//2, self.width//4:3*self.width//4] = 1.0
        print(f"Initial active cells: {np.sum(self.grid > 0)}")

    def grow(self, pattern_type='coral'):
        """Grow pattern according to specific rules"""
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

        # Add noise for organic appearance
        if pattern_type == 'mycelium':
            noise = np.random.random(next_grid.shape) * 0.1
            next_grid = np.clip(next_grid + noise, 0, 1)

        # Update grid
        self.grid = next_grid
        active_cells = np.sum(self.grid > 0)

        # Print debug info
        if active_cells == 0:
            print("Warning: No active cells remaining!")

        return active_cells

    def add_environment(self, factor='moisture'):
        """Add environmental influences"""
        if factor == 'moisture':
            gradient = np.linspace(0.5, 1, self.height)
            gradient = np.tile(gradient.reshape(-1, 1), (1, self.width))
            self.grid *= gradient
        elif factor == 'light':
            center_y, center_x = self.height // 2, self.width // 2
            y, x = np.ogrid[-center_y:self.height-center_y, -center_x:self.width-center_x]
            gradient = 1 - 0.5 * (x*x + y*y) / (self.width * self.height / 4)
            gradient = np.clip(gradient, 0.3, 1)
            self.grid *= gradient

    def visualize(self, pattern_type='coral', show=True, save_path=None):
        """Visualize current state with enhanced contrast"""
        plt.figure(figsize=(10, 10))

        # Enhance contrast for better visibility
        display_grid = np.copy(self.grid)
        display_grid = np.clip(display_grid * 1.5, 0, 1)  # Boost contrast

        plt.imshow(display_grid,
                  cmap=self.patterns[pattern_type]['color_map'],
                  interpolation='nearest')
        plt.colorbar(label='Cell State')
        plt.title(f'{pattern_type.capitalize()} Pattern\nActive Cells: {np.sum(self.grid > 0)}')

        if save_path:
            plt.savefig(save_path, bbox_inches='tight', dpi=300)
        if show:
            plt.show()
        plt.close()

def main():
    # Test each pattern type
    pattern_types = ['coral', 'lichen', 'mycelium']
    seed_methods = [
        ('random', {'density': 0.3}),
        ('center', {'radius': 15}),
        ('line', {})
    ]

    for pattern_type in pattern_types:
        for seed_method, seed_params in seed_methods:
            print(f"\nGenerating {pattern_type} pattern with {seed_method} seeding...")

            # Initialize generator
            generator = OrganicPatternGenerator(width=100, height=100)

            # Seed the pattern
            if seed_method == 'random':
                generator.seed_random(**seed_params)
            elif seed_method == 'center':
                generator.seed_center(**seed_params)
            elif seed_method == 'line':
                generator.seed_line()

            # Save initial state
            generator.visualize(pattern_type,
                              save_path=f'{pattern_type}_{seed_method}_initial.png')

            # Grow pattern
            for i in range(30):
                active_cells = generator.grow(pattern_type)
                if i % 5 == 0:  # Save more frequently
                    print(f"Generation {i}: {active_cells} active cells")
                    generator.visualize(pattern_type,
                                     save_path=f'{pattern_type}_{seed_method}_gen_{i}.png')

                # Break if pattern dies out
                if active_cells == 0:
                    print("Pattern died out!")
                    break

            # Add environmental factor and save final state
            if active_cells > 0:
                generator.add_environment('light')
                generator.visualize(pattern_type,
                                  save_path=f'{pattern_type}_{seed_method}_final.png')

if __name__ == "__main__":
    main()
