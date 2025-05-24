// Level Editor Object Definitions
// This file defines the game objects for use in the level editor

// Box object
class Box {
    constructor(x, y, size, labelSuffix, colorIndex) {
        this.body = Matter.Bodies.rectangle(x, y, size, size, {
            label: `Box-${labelSuffix}`, 
            friction: 0.1, 
            restitution: 0.1,
            render: { 
                fillStyle: colorIndex !== undefined ? 
                    `hsl(${colorIndex * 30}, 70%, 60%)` : 
                    '#FF5733' // Default orange color
            }
        });
    }
    
    addToWorld(world) { 
        Matter.Composite.add(world, this.body); 
    }
}

// BouncyBall object
class BouncyBall {
    constructor(x, y, radius, labelSuffix, colorIndex, numBallsTotal) {
        this.body = Matter.Bodies.circle(x, y, radius, {
            label: `BouncyBall-${labelSuffix}`, 
            friction: 0.01, 
            restitution: 0.8,
            render: { 
                fillStyle: colorIndex !== undefined ? 
                    `hsl(${(colorIndex / (numBallsTotal || 1)) * 360}, 70%, 60%)` : 
                    '#3498DB' // Default blue color
            }
        });
        this.body.circleRadius = radius; // Store radius for reset calculations
    }
    
    addToWorld(world) { 
        Matter.Composite.add(world, this.body); 
    }
}

// Frog object
class Frog {
    constructor(x, y, size, labelSuffix) {
        this.body = Matter.Bodies.rectangle(x, y, size, size, {
            label: `Frog-${labelSuffix}`, 
            friction: 0.1, 
            restitution: 1.2,
            render: { 
                fillStyle: '#00FF00', // Green fallback if image fails
                sprite: { 
                    texture: 'images/artwork/frog.png', 
                    xScale: size / 50, 
                    yScale: size / 50 
                }
            }
        });
    }
    
    addToWorld(world) { 
        Matter.Composite.add(world, this.body); 
    }
}

// Foofoo object
class Foofoo {
    constructor(x, y, size, labelSuffix) {
        this.body = Matter.Bodies.rectangle(x, y, size, size, {
            label: `Foofoo-${labelSuffix}`, 
            friction: 0.1, 
            restitution: 0.6,
            render: { 
                fillStyle: '#FF9900', // Orange fallback if image fails
                sprite: { 
                    texture: 'images/artwork/foofoo.png', 
                    xScale: size / 50, 
                    yScale: size / 50 
                }
            }
        });
    }
    
    addToWorld(world) { 
        Matter.Composite.add(world, this.body); 
    }
}

// ForceTriangle object
class ForceTriangle {
    constructor(x, y, radius, labelSuffix, isStatic = true, color = '#FFD700') {
        this.body = Matter.Bodies.polygon(x, y, 3, radius, {
            label: `ForceTriangle-${labelSuffix}`,
            isStatic: isStatic,
            isSensor: true, // Will not physically collide, only apply force
            render: { fillStyle: color }
        });
        
        // Store the radius for later use
        this.body.triangleRadius = radius;
    }
    
    addToWorld(world) {
        Matter.Composite.add(world, this.body);
    }
}

// CustomPlatform object (for regular platforms)
class CustomPlatform {
    constructor(x, y, width, height, fullLabel, color = '#A0522D') {
        this.body = Matter.Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            label: fullLabel,
            render: { fillStyle: color }
        });
    }
    
    addToWorld(world) {
        Matter.Composite.add(world, this.body);
    }
}

// BouncyPlatform object
class BouncyPlatform {
    constructor(x, y, width, height, fullLabel, restitution = 0.8, color = '#FF69B4') {
        this.body = Matter.Bodies.rectangle(x, y, width, height, {
            isStatic: true,
            label: fullLabel,
            restitution: restitution,
            render: { fillStyle: color }
        });
    }
    
    addToWorld(world) {
        Matter.Composite.add(world, this.body);
    }
}