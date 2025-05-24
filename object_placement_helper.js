// Object Placement Helper for Vita Chaos
// This file provides helper functions for placing objects in code without complex calculations

// Global object to store placement helpers
const ObjectPlacer = {
    // Initialize with game dimensions
    init: function(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        console.log(`ObjectPlacer initialized with game dimensions: ${gameWidth}x${gameHeight}`);
        return this;
    },
    
    // Place an object at a percentage of the screen width/height
    // Example: placeAtPercent(0.5, 0.3) places at 50% of width, 30% of height
    placeAtPercent: function(percentX, percentY) {
        return {
            x: this.gameWidth * percentX,
            y: this.gameHeight * percentY
        };
    },
    
    // Place an object relative to the ground level
    // groundLevel: which floor (1 = bottom floor, 2 = second floor, etc.)
    // heightAboveGround: pixels above the ground
    // percentX: percentage across the screen width
    placeAboveGround: function(groundLevel, heightAboveGround, percentX, floorHeight, groundHeight) {
        const floorY = this.gameHeight - ((groundLevel - 1) * floorHeight) - groundHeight;
        return {
            x: this.gameWidth * percentX,
            y: floorY - heightAboveGround
        };
    },
    
    // Place an object in a grid cell (divides the screen into a grid)
    // gridX, gridY: grid coordinates
    // gridWidth, gridHeight: number of grid cells horizontally and vertically
    placeInGrid: function(gridX, gridY, gridWidth, gridHeight) {
        const cellWidth = this.gameWidth / gridWidth;
        const cellHeight = this.gameHeight / gridHeight;
        return {
            x: cellWidth * (gridX + 0.5), // Center in the cell
            y: cellHeight * (gridY + 0.5)  // Center in the cell
        };
    },
    
    // Place an object relative to another object
    // baseObject: the reference object (Matter.js body)
    // offsetX, offsetY: pixel offset from the base object's position
    placeRelativeTo: function(baseObject, offsetX, offsetY) {
        return {
            x: baseObject.position.x + offsetX,
            y: baseObject.position.y + offsetY
        };
    },
    
    // Place an object in a circle around a center point
    // centerX, centerY: center point coordinates
    // radius: distance from center
    // angle: angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
    placeInCircle: function(centerX, centerY, radius, angle) {
        const radians = angle * (Math.PI / 180);
        return {
            x: centerX + radius * Math.cos(radians),
            y: centerY + radius * Math.sin(radians)
        };
    },
    
    // Place objects in a row
    // startX, startY: starting position
    // spacing: distance between objects
    // count: number of objects
    // createFunc: function to create each object, receives (x, y, index)
    createRow: function(startX, startY, spacing, count, createFunc) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            const x = startX + (i * spacing);
            objects.push(createFunc(x, startY, i));
        }
        return objects;
    },
    
    // Place objects in a column
    // startX, startY: starting position
    // spacing: distance between objects
    // count: number of objects
    // createFunc: function to create each object, receives (x, y, index)
    createColumn: function(startX, startY, spacing, count, createFunc) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            const y = startY + (i * spacing);
            objects.push(createFunc(startX, y, i));
        }
        return objects;
    },
    
    // Place objects in a grid pattern
    // startX, startY: starting position of the top-left object
    // spacingX, spacingY: distance between objects
    // columns, rows: number of columns and rows
    // createFunc: function to create each object, receives (x, y, column, row)
    createGrid: function(startX, startY, spacingX, spacingY, columns, rows, createFunc) {
        const objects = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                const x = startX + (col * spacingX);
                const y = startY + (row * spacingY);
                objects.push(createFunc(x, y, col, row));
            }
        }
        return objects;
    },
    
    // Place objects in a circle pattern
    // centerX, centerY: center point coordinates
    // radius: distance from center
    // count: number of objects
    // createFunc: function to create each object, receives (x, y, angle, index)
    createCircle: function(centerX, centerY, radius, count, createFunc) {
        const objects = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 360;
            const pos = this.placeInCircle(centerX, centerY, radius, angle);
            objects.push(createFunc(pos.x, pos.y, angle, i));
        }
        return objects;
    },
    
    // Log the actual position for debugging
    logPosition: function(name, x, y) {
        console.log(`${name} position: (${Math.round(x)}, ${Math.round(y)})`);
    }
};

// Example usage:
/*
// Initialize the placer
const placer = ObjectPlacer.init(GAME_WIDTH, GAME_HEIGHT);

// Place a box at 70% of screen width, 30% of screen height
const boxPos = placer.placeAtPercent(0.7, 0.3);
const box = new Box(boxPos.x, boxPos.y, BOX_SIZE, "example", 0);
box.addToWorld(world);
placer.logPosition("Box", boxPos.x, boxPos.y);

// Create a row of 5 balls
const balls = placer.createRow(100, 200, 50, 5, (x, y, i) => {
    const ball = new BouncyBall(x, y, BOUNCY_BALL_RADIUS, `row-${i}`, i, 5);
    ball.addToWorld(world);
    return ball.body;
});

// Create a grid of frogs
const frogs = placer.createGrid(200, 100, 60, 60, 3, 2, (x, y, col, row) => {
    const frog = new Frog(x, y, FROG_SIZE, `grid-${col}-${row}`);
    frog.addToWorld(world);
    return frog.body;
});
*/