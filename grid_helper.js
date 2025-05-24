// Grid Helper for Vita Chaos
// This file provides helper functions for placing objects using grid coordinates

class GridHelper {
    constructor(gameWidth, gameHeight, gridSize = 50) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.gridSize = gridSize;
        
        // Calculate grid dimensions
        this.gridWidth = Math.ceil(gameWidth / gridSize);
        this.gridHeight = Math.ceil(gameHeight / gridSize);
        
        // Create a visual grid overlay
        this.gridOverlay = null;
        this.gridVisible = false;
    }
    
    // Convert grid coordinates to pixel coordinates
    gridToPixel(gridX, gridY) {
        return {
            x: gridX * this.gridSize + (this.gridSize / 2),
            y: gridY * this.gridSize + (this.gridSize / 2)
        };
    }
    
    // Convert pixel coordinates to grid coordinates
    pixelToGrid(pixelX, pixelY) {
        return {
            x: Math.floor(pixelX / this.gridSize),
            y: Math.floor(pixelY / this.gridSize)
        };
    }
    
    // Create a visual grid overlay
    createGridOverlay() {
        // Remove existing grid if any
        if (this.gridOverlay) {
            document.body.removeChild(this.gridOverlay);
        }
        
        // Create a canvas for the grid
        this.gridOverlay = document.createElement('canvas');
        this.gridOverlay.width = this.gameWidth;
        this.gridOverlay.height = this.gameHeight;
        this.gridOverlay.style.position = 'absolute';
        this.gridOverlay.style.top = '0';
        this.gridOverlay.style.left = '0';
        this.gridOverlay.style.pointerEvents = 'none'; // Allow clicks to pass through
        this.gridOverlay.style.zIndex = '999';
        this.gridOverlay.style.opacity = '0.3';
        this.gridOverlay.style.display = 'none'; // Hidden by default
        
        // Draw the grid
        const ctx = this.gridOverlay.getContext('2d');
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        
        // Draw vertical lines
        for (let x = 0; x <= this.gameWidth; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.gameHeight);
            ctx.stroke();
            
            // Add coordinate labels every 5 cells
            if (x % (this.gridSize * 5) === 0) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '12px Arial';
                ctx.fillText(x / this.gridSize, x + 5, 15);
            }
        }
        
        // Draw horizontal lines
        for (let y = 0; y <= this.gameHeight; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.gameWidth, y);
            ctx.stroke();
            
            // Add coordinate labels every 5 cells
            if (y % (this.gridSize * 5) === 0) {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '12px Arial';
                ctx.fillText(y / this.gridSize, 5, y + 15);
            }
        }
        
        document.body.appendChild(this.gridOverlay);
    }
    
    // Toggle grid visibility
    toggleGrid() {
        if (!this.gridOverlay) {
            this.createGridOverlay();
        }
        
        this.gridVisible = !this.gridVisible;
        this.gridOverlay.style.display = this.gridVisible ? 'block' : 'none';
    }
    
    // Update grid size
    updateGridSize(newSize) {
        this.gridSize = newSize;
        this.gridWidth = Math.ceil(this.gameWidth / newSize);
        this.gridHeight = Math.ceil(this.gameHeight / newSize);
        
        // Recreate the grid overlay with new size
        if (this.gridVisible) {
            this.createGridOverlay();
            this.gridOverlay.style.display = 'block';
        }
    }
    
    // Update game dimensions
    updateGameDimensions(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.gridWidth = Math.ceil(gameWidth / this.gridSize);
        this.gridHeight = Math.ceil(gameHeight / this.gridSize);
        
        // Recreate the grid overlay with new dimensions
        if (this.gridVisible) {
            this.createGridOverlay();
            this.gridOverlay.style.display = 'block';
        }
    }
    
    // Place an object at grid coordinates
    placeObjectAtGrid(gridX, gridY, objectCreator) {
        const pixelPos = this.gridToPixel(gridX, gridY);
        return objectCreator(pixelPos.x, pixelPos.y);
    }
    
    // Get a string representation of the grid position
    getGridPositionString(pixelX, pixelY) {
        const gridPos = this.pixelToGrid(pixelX, pixelY);
        return `Grid: (${gridPos.x}, ${gridPos.y})`;
    }
}

// Helper function to create a grid helper and integrate it with the game
function createGridHelper(gameWidth, gameHeight, gridSize = 50) {
    return new GridHelper(gameWidth, gameHeight, gridSize);
}