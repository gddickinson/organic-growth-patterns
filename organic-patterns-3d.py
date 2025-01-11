import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import matplotlib.animation as animation
from scipy.ndimage import convolve
import cv2
from matplotlib.colors import LinearSegmentedColormap

class OrganicPattern3D:
    def __init__(self, width=50, height=50, depth=50):
        self.width = width
        self.height = height
        self.depth = depth
        self.grid = np.zeros((depth, height, width))
        self.history = []  # For time-lapse
        
        # 3D kernels for different patterns
        self.patterns = {
            'coral': {
                'kernel': self._create_3d_kernel('sphere'),
                'survive_range': (4, 6),
                'birth_range': (4, 5),
                'colors': ['darkred', 'red', 'orange', 'yellow']
            },
            'mycelium': {
                'kernel': self._create_3d_kernel('diamond'),
                'survive_range': (3, 6),
                'birth_range': (3, 4),
                'colors': ['saddlebrown', 'peru', 'burlywood', 'wheat']
            },
            'crystal': {
                'kernel': self._create_3d_kernel('cube'),
                'survive_range': (4, 7),
                'birth_range': (5, 6),
                'colors': ['darkblue', 'blue', 'lightblue', 'white']
            }
        }
    
    def _create_3d_kernel(self, shape='sphere'):
        """Create different 3D kernels for neighborhood calculations"""
        kernel = np.zeros((3, 3, 3))
        
        if shape == 'sphere':
            # Approximate sphere
            kernel[1, 1, 0] = kernel[1, 0, 1] = kernel[0, 1, 1] = 1
            kernel[1, 1, 2] = kernel[1, 2, 1] = kernel[2, 1, 1] = 1
            kernel[1, 1, 1] = 0  # Center point
        elif shape == 'diamond':
            # Diamond shape
            kernel[1, 1, 0] = kernel[1, 0, 1] = kernel[0, 1, 1] = 1
            kernel[1, 1, 2] = kernel[1, 2, 1] = kernel[2, 1, 1] = 1
            kernel[1, 1, 1] = 0
        elif shape == 'cube':
            # Full cube
            kernel.fill(1)
            kernel[1, 1, 1] = 0
            
        return kernel / np.sum(kernel)  # Normalize
    
    def seed_random(self, density=0.1):
        """Initialize with random points"""
        self.grid = np.random.choice([0, 1], 
                                   size=(self.depth, self.height, self.width), 
                                   p=[1-density, density])
        self.history = [self.grid.copy()]
    
    def seed_center(self, radius=5):
        """Initialize from center point"""
        self.grid = np.zeros((self.depth, self.height, self.width))
        center_x, center_y, center_z = self.width//2, self.height//2, self.depth//2
        
        for x in range(self.width):
            for y in range(self.height):
                for z in range(self.depth):
                    distance = np.sqrt((x-center_x)**2 + (y-center_y)**2 + (z-center_z)**2)
                    if distance <= radius:
                        self.grid[z, y, x] = 1
                        
        self.history = [self.grid.copy()]
    
    def grow(self, pattern_type='coral', generations=1):
        """Grow the pattern for specified number of generations"""
        pattern = self.patterns[pattern_type]
        
        for _ in range(generations):
            # Calculate neighbors using 3D convolution
            neighbors = convolve(self.grid, pattern['kernel'], mode='wrap')
            
            # Create next generation grid
            next_grid = np.zeros_like(self.grid)
            
            # Apply rules
            survive_low, survive_high = pattern['survive_range']
            birth_low, birth_high = pattern['birth_range']
            
            # Survival
            survive_mask = (self.grid > 0) & \
                         (neighbors >= survive_low) & \
                         (neighbors <= survive_high)
            
            # Birth
            birth_mask = (self.grid == 0) & \
                        (neighbors >= birth_low) & \
                        (neighbors <= birth_high)
            
            next_grid[survive_mask | birth_mask] = 1
            
            # Update grid
            self.grid = next_grid
            self.history.append(self.grid.copy())
    
    def visualize_3d(self, pattern_type='coral', threshold=0.5, save_path=None):
        """Create 3D visualization of the current state"""
        fig = plt.figure(figsize=(12, 12))
        ax = fig.add_subplot(111, projection='3d')
        
        # Get active cell coordinates
        x, y, z = np.where(self.grid > threshold)
        
        # Create custom colormap
        colors = self.patterns[pattern_type]['colors']
        n_colors = len(colors)
        custom_cmap = LinearSegmentedColormap.from_list('custom', colors)
        
        # Color points based on position
        c = z / self.depth  # Use depth for coloring
        
        # Plot points
        scatter = ax.scatter(x, y, z, c=c, cmap=custom_cmap, alpha=0.6)
        
        # Set labels and title
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Z')
        ax.set_title(f'3D {pattern_type.capitalize()} Pattern')
        
        if save_path:
            plt.savefig(save_path)
        plt.show()
    
    def create_timelapse(self, pattern_type='coral', save_path='timelapse.gif', 
                        interval=200, threshold=0.5):
        """Create time-lapse animation of pattern growth"""
        fig = plt.figure(figsize=(12, 12))
        
        # Create custom colormap
        colors = self.patterns[pattern_type]['colors']
        custom_cmap = LinearSegmentedColormap.from_list('custom', colors)
        
        def update(frame):
            plt.clf()
            ax = fig.add_subplot(111, projection='3d')
            
            # Get coordinates for this frame
            x, y, z = np.where(self.history[frame] > threshold)
            
            if len(x) > 0:  # Only plot if points exist
                c = z / self.depth
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
    # Test different patterns
    patterns = ['coral', 'mycelium', 'crystal']
    
    for pattern in patterns:
        print(f"\nGenerating 3D {pattern} pattern...")
        
        # Create and initialize generator
        generator = OrganicPattern3D(width=30, height=30, depth=30)
        generator.seed_center(radius=3)
        
        # Grow pattern
        for gen in range(10):
            generator.grow(pattern_type=pattern)
            print(f"Generation {gen + 1} complete")
        
        # Create visualization
        generator.visualize_3d(pattern_type=pattern, 
                             save_path=f'3d_{pattern}_final.png')
        
        # Create time-lapse
        generator.create_timelapse(pattern_type=pattern,
                                 save_path=f'3d_{pattern}_timelapse.gif')

if __name__ == "__main__":
    main()