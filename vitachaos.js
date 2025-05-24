// Vita Chaos - Desktop Version
// This is a simplified desktop-only version of the game
document.addEventListener('DOMContentLoaded', () => {
    // Ensure game plans container is visible by default
    const gamePlansContainer = document.getElementById('game-plans-container');
    if (gamePlansContainer) {
        gamePlansContainer.style.display = 'block';
    }
    
    // Module aliases from Matter.js
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Body = Matter.Body,
        Events = Matter.Events, // Used for engine update cycle and collision events
        Query = Matter.Query, // For specific world queries if needed beyond collisions
        Vector = Matter.Vector, // For vector operations
        Mouse = Matter.Mouse, // Explicitly alias Mouse
        Constraint = Matter.Constraint; // For grabbing objects

    // --- Game Configuration --- // UPDATE THIS TO CHANGE THE SIZE OF THE GAME AREA
    // Base dimensions for desktop 
    const BASE_GAME_WIDTH = 1900; // Width of the game world
    const SINGLE_AREA_HEIGHT = 1200; // Height of one vertical area
    const NUM_AREAS_VERTICAL = 4; // Number of vertical areas stacked
    const BASE_GAME_HEIGHT = SINGLE_AREA_HEIGHT * NUM_AREAS_VERTICAL; // Total height of the game world
    
    // Calculate actual game dimensions based on screen size
    let GAME_WIDTH, GAME_HEIGHT;
    
    function calculateGameDimensions() {
        let sw = window.innerWidth;
        let sh = window.innerHeight;
        let newGameWidth, newGameHeight;

        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            // Fullscreen mode: Use entire screen.
            newGameWidth = sw;
            newGameHeight = sh;
        } else {
            // Desktop, not fullscreen: Scale with aspect ratio, fit within 90% of window.
            const targetWidth = sw * 0.9;
            const targetHeight = sh * 0.9;

            newGameWidth = BASE_GAME_WIDTH;
            newGameHeight = BASE_GAME_HEIGHT;

            // Scale down to fit targetWidth
            if (newGameWidth > targetWidth) {
                const ratio = targetWidth / newGameWidth;
                newGameWidth = targetWidth;
                newGameHeight *= ratio;
            }
            // Scale down to fit targetHeight
            if (newGameHeight > targetHeight) {
                const ratio = targetHeight / newGameHeight;
                newGameHeight = targetHeight;
                newGameWidth *= ratio;
            }
            // Ensure minimum size for desktop
            newGameWidth = Math.max(newGameWidth, 300);
            newGameHeight = Math.max(newGameHeight, 300 * (BASE_GAME_HEIGHT / BASE_GAME_WIDTH));
        }
        GAME_WIDTH = Math.floor(newGameWidth);
        GAME_HEIGHT = Math.floor(newGameHeight);
        
        return { width: GAME_WIDTH, height: GAME_HEIGHT };
    }
    
    // Initial calculation
    const dimensions = calculateGameDimensions();
    GAME_WIDTH = dimensions.width;
    GAME_HEIGHT = dimensions.height;

    // Vita (Player) Configuration
    const VITA_START_X = 150;
    const VITA_WIDTH = 30; // Made smaller
    const VITA_HEIGHT = 53; // Made smaller (approx 75% of original, maintaining aspect ratio)
    const VITA_IMAGE_PATH = 'images/vitaimages/vitasprite.png'; // Path to Vita sprite
    const VITA_SPRITE_X_SCALE = 0.05;
    const VITA_SPRITE_Y_SCALE = 0.05;
    const VITA_FRICTION_AIR = 0.01;
    const VITA_DENSITY = 0.002;
    const VITA_RESTITUTION = 0.1;
    let VITA_START_Y; // Will be calculated in setupGame based on multi-area layout

    // Ground Configuration
    const GROUND_Y_OFFSET = 30; // This offset is from the bottom of the *relevant* area's floor
    const GROUND_HEIGHT = 60;
    const GROUND_COLOR = '#6B8E23';
    const PLATFORM_COLOR = '#A0522D'; // Color for the new platform
    const PLATFORM_THICKNESS = GROUND_HEIGHT; // New platform can have same thickness as ground
    let platform2; // The floor of the second area

    // Walls
    const WALL_THICKNESS = 50;
    const WALL_COLOR = '#333333';

    // Ceiling Configuration
    const CEILING_Y_OFFSET = -WALL_THICKNESS / 2; // Position it just above the game area
    const CEILING_HEIGHT = WALL_THICKNESS;

    // Physics
    const GRAVITY_Y = 1;
    const PLAYER_MOVE_FORCE_FACTOR = 0.005;
    const PLAYER_JUMP_FORCE_MULTIPLIER = 0.03;

    // Other Objects
    const BOX_SIZE = 50;
    const NUM_BOXES = 14;
    const BOX_STACK_INITIAL_X = GAME_WIDTH * 0.7;
    const NUM_BALLS = 20;
    const BOUNCY_BALL_RADIUS = 10;
    const BOUNCY_BALL_RESTITUTION = 0.5; // Example: Made less bouncy
    const BACKGROUND_COLOR = '#222222';

    // Frog Configuration
    const FROG_SIZE = 5;
    const NUM_FROGS = 14;
    
    // Forcefield Triangle Configuration
    const NUM_TRIANGLES = 10;
    const TRIANGLE_RADIUS = 10; // "Radius" for the polygon
    const TRIANGLE_COLOR = '#FFD700'; // Gold
    const FORCEFIELD_MAGNITUDE = 0.3; // Force applied by triangles. Adjust as needed.
    const FORCE_TRIANGLE_LABEL = "ForceTriangle";

    // Player Kick/Headbutt Configuration
    const KICK_FORCE_MAGNITUDE = 0.5; // Matched to original
    const KICK_RADIUS = 80; // Matched to original
    const KICK_ANIMATION_DURATION = 150; // Milliseconds the kick animation lasts
    const KICK_ANIMATION_OFFSET_MAGNITUDE = 0.60; // How far the sprite shifts (as a % of sprite size)

    let kickAnimationTimeout = null; // To manage the animation timeout
    
    // Player Grab/Throw Configuration
    const GRAB_RADIUS = 70; // Matched to original
    const THROW_FORCE_MAGNITUDE = 0.7; // Matched to original
    const GRAB_POINT_OFFSET = { x: VITA_WIDTH / 2 + 15, y: -VITA_HEIGHT / 4 }; // Point in front of Vita to hold objects

    // Camera
    const CAMERA_PADDING = { x: 350, y: 350 }; // Increased padding to "zoom out" and see more area

    // Respawn Configuration
    const RESPAWN_Y_LIMIT = GAME_HEIGHT + 200; // If object.y > this, respawn
    const RESPAWN_X_BUFFER = 200; // If object.x < -RESPAWN_X_BUFFER or > GAME_WIDTH + RESPAWN_X_BUFFER, respawn
    // --- End Game Configuration ---

    // --- Global Game State Variables ---
    let engine, world, render, runner;
    let vitaBody, ground1, ceiling, leftWall, rightWall, boxStack, bouncyBallsArray, frogStack; // Renamed ground to ground1
    let forceTrianglesArray; // New array for forcefield triangles
    let scoreDisplay, chaosScore = 0; // chaosScore is initialized here and reset in handleStartGame
    let isGameActive = false;
    let heldObject = null;
    let grabConstraint = null;
    let menuContainer = null;

    // --- Game Setup ---

    // --- Helper Classes for Game Object Creation ---

    class EnvironmentBuilder {
        constructor(world, config) {
            this.world = world;
            this.config = config; // Pass all relevant game constants
        }

        createFloors() {
            const { GAME_WIDTH, GAME_HEIGHT, SINGLE_AREA_HEIGHT, GROUND_HEIGHT, PLATFORM_THICKNESS, GROUND_COLOR, PLATFORM_COLOR } = this.config;
            const ground1 = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - (GROUND_HEIGHT / 2), GAME_WIDTH, GROUND_HEIGHT, {
                isStatic: true, label: "Ground1", render: { fillStyle: GROUND_COLOR }
            });
            const platform2 = Bodies.rectangle(GAME_WIDTH / 2, (GAME_HEIGHT - SINGLE_AREA_HEIGHT) - (PLATFORM_THICKNESS / 2), GAME_WIDTH, PLATFORM_THICKNESS, {
                isStatic: true, label: "Platform2", render: { fillStyle: PLATFORM_COLOR }
            });
            Composite.add(this.world, [ground1, platform2]);
            return { ground1, platform2 };
        }

        createWalls() {
            const { GAME_WIDTH, GAME_HEIGHT, WALL_THICKNESS, WALL_COLOR } = this.config;
            const leftWall = Bodies.rectangle(-WALL_THICKNESS / 4, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
                isStatic: true, label: "WallLeft", render: { fillStyle: WALL_COLOR }
            });
            const rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
                isStatic: true, label: "WallRight", render: { fillStyle: WALL_COLOR }
            });
            Composite.add(this.world, [leftWall, rightWall]);
            return { leftWall, rightWall };
        }

        createCeiling() {
            const { GAME_WIDTH, CEILING_Y_OFFSET, CEILING_HEIGHT, WALL_THICKNESS, WALL_COLOR } = this.config;
            const ceiling = Bodies.rectangle(GAME_WIDTH / 2, CEILING_Y_OFFSET, GAME_WIDTH + WALL_THICKNESS * 2, CEILING_HEIGHT, {
                isStatic: true, label: "Ceiling", render: { fillStyle: WALL_COLOR }
            });
            Composite.add(this.world, ceiling);
            return ceiling;
        }

        createCustomPlatforms(platformsData = []) {
            const customPlatforms = [];
            platformsData.forEach(data => {
                const platform = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                    isStatic: true,
                    label: data.label || "CustomPlatform", // Give it a label
                    render: { fillStyle: data.color || '#555555' } // Default color or specify
                });
                customPlatforms.push(platform);
            });
            if (customPlatforms.length > 0) {
                Composite.add(this.world, customPlatforms);
            }
            return customPlatforms; // Return the array of created platform bodies
        }
    }

    class Box {
        constructor(x, y, size, labelSuffix, colorIndex) {
            this.body = Bodies.rectangle(x, y, size, size, {
                label: `Box-${labelSuffix}`,
                friction: 0.1,
                restitution: 0.1,
                render: { fillStyle: `hsl(${colorIndex * 30}, 70%, 60%)` }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    class BouncyBall {
        constructor(x, y, radius, labelSuffix, colorIndex, numBallsTotal) {
            this.body = Bodies.circle(x, y, radius, {
                label: `Ball-${labelSuffix}`,
                friction: 0.001,
                restitution: BOUNCY_BALL_RESTITUTION, 
                render: { fillStyle: `hsl(${colorIndex * (360 / numBallsTotal)}, 80%, 60%)` }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    class Frog {
        constructor(x, y, size, labelSuffix) {
            this.body = Bodies.rectangle(x, y, size, size, {
                label: `Frog-${labelSuffix}`, friction: 0.1, restitution: 1.2, 
                render: { sprite: { texture: 'images/artwork/frog.png', xScale: 0.1, yScale: 0.1 } }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    class ForceTriangle {
        constructor(x, y, radius, label, isStatic = true, color = TRIANGLE_COLOR) {
            this.body = Bodies.polygon(x, y, 3, radius, {
                label: label, isStatic: isStatic, render: { fillStyle: color, strokeStyle: '#DAA520', lineWidth: 1 }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error("Fatal Error: Game container div not found!");
        return;
    }
    gameContainer.style.position = 'relative';

    // --- Player Input Handling (Persistent) ---
    const keysPressed = {};
    let isVitaOnGround = false;
    let rKeyPressed = false; // Flag to ensure 'R' key reset happens once per press

    // Keyboard controls for desktop
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;

        // Handle 'R' key for resetting Vita's position
        if (key === 'r' && isGameActive && !rKeyPressed) {
            rKeyPressed = true; // Set flag to prevent multiple resets if key is held
            resetVitaPosition();
        }
    });
    
    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = false;

        if (key === 'r') {
            rKeyPressed = false; // Reset flag when 'R' key is released
        }
    });
    
    // --- Menu Styling and Creation ---
    function styleMenuElement(menuElement) {
        menuElement.style.position = 'absolute';
        menuElement.style.top = '50%';
        menuElement.style.left = '50%';
        menuElement.style.transform = 'translate(-50%, -50%)';
        menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'; // Slightly more opaque for better readability
        menuElement.style.padding = '30px';
        menuElement.style.borderRadius = '10px';
        menuElement.style.textAlign = 'center';
        menuElement.style.zIndex = '100';
        menuElement.style.width = 'auto';
        menuElement.style.maxWidth = '500px';
        
        // Add a subtle shadow for better visibility
        menuElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    }

    function createMenuButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.display = 'block';
        button.style.width = 'auto';
        button.style.margin = '10px auto';
        button.style.padding = '10px 20px';
        button.style.fontSize = '18px';
        button.style.cursor = 'pointer';
        button.style.borderRadius = '5px';
        button.style.border = 'none';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = 'white';
        button.style.fontWeight = 'bold';
        
        // Add subtle shadow for depth
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        
        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#45a049';
        });
        
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#4CAF50';
        });
        
        button.addEventListener('click', onClick);
        return button;
    }

    function clearMenu() {
        if (menuContainer && menuContainer.parentNode) {
            menuContainer.parentNode.removeChild(menuContainer);
        }
        menuContainer = null;
    }

    function showStartMenu() {
        clearMenu();
        isGameActive = false;
        if (runner) Runner.stop(runner);
        
        // Show the game plans container when at the start menu
        const gamePlansContainer = document.getElementById('game-plans-container');
        if (gamePlansContainer) {
            gamePlansContainer.style.display = 'block';
        }
        
        // Hide controls info at the start menu
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            controlsInfo.style.display = 'none';
        }

        menuContainer = document.createElement('div');
        styleMenuElement(menuContainer);

        const title = document.createElement('h1');
        title.textContent = 'Vita Chaos';
        title.style.color = 'white';
        menuContainer.appendChild(title);

        const startButton = createMenuButton('Start Game', handleStartGame);
        menuContainer.appendChild(startButton);

        const fullscreenButton = createMenuButton('Toggle Fullscreen', toggleFullscreen);
        menuContainer.appendChild(fullscreenButton);

        gameContainer.appendChild(menuContainer);
    }

    function showPauseMenu() {
        if (!isGameActive) return;
        isGameActive = false;
        Runner.stop(runner);
        
        // Show the game plans container when the game is paused
        const gamePlansContainer = document.getElementById('game-plans-container');
        if (gamePlansContainer) {
            gamePlansContainer.style.display = 'block';
        }

        clearMenu();
        menuContainer = document.createElement('div');
        styleMenuElement(menuContainer);

        const title = document.createElement('h2');
        title.textContent = 'Paused';
        title.style.color = 'white';
        menuContainer.appendChild(title);

        const resumeButton = createMenuButton('Resume', handleResumeGame);
        const restartButton = createMenuButton('Restart', handleRestartGame);
        const quitButton = createMenuButton('Quit to Main Menu', handleQuitGame);

        menuContainer.appendChild(resumeButton);
        menuContainer.appendChild(restartButton);
        menuContainer.appendChild(quitButton);

        gameContainer.appendChild(menuContainer);
    }

    // --- Game State Control Functions ---
    function setupGame() {
        engine = Engine.create();
        world = engine.world;
        world.gravity.y = GRAVITY_Y;

        // Calculate floor Y positions (top surface)
        const FLOOR_1_TOP_Y = GAME_HEIGHT - GROUND_HEIGHT;
        const FLOOR_2_TOP_Y = (GAME_HEIGHT - SINGLE_AREA_HEIGHT) - PLATFORM_THICKNESS;
        VITA_START_Y = FLOOR_1_TOP_Y - VITA_HEIGHT / 2 - 20; // Start 20px above floor 1

        // Prepare config for EnvironmentBuilder
        const envConfig = {
            GAME_WIDTH, GAME_HEIGHT, SINGLE_AREA_HEIGHT,
            GROUND_HEIGHT, PLATFORM_THICKNESS, GROUND_COLOR, PLATFORM_COLOR,
            WALL_THICKNESS, WALL_COLOR,
            CEILING_Y_OFFSET, CEILING_HEIGHT
        };

        const envBuilder = new EnvironmentBuilder(world, envConfig);
        const floors = envBuilder.createFloors();
        ground1 = floors.ground1; // ground1 is now set here
        platform2 = floors.platform2; // platform2 is now set here
        const walls = envBuilder.createWalls();
        leftWall = walls.leftWall; // leftWall is now set here
        rightWall = walls.rightWall; // rightWall is now set here
        ceiling = envBuilder.createCeiling(); // ceiling is now set here

        render = Render.create({
            element: gameContainer,
            engine: engine,
            options: {
                width: GAME_WIDTH,
                height: GAME_HEIGHT,
                wireframes: false,
                background: BACKGROUND_COLOR
            }
        });

        // Ensure render.mouse is initialized
        if (!render.mouse) {
            console.warn('render.mouse is not defined after Render.create. Manually creating Matter.Mouse.');
            if (typeof Mouse !== 'undefined') { // Check if our alias Mouse exists
                render.mouse = Mouse.create(render.canvas);
                if (render.mouse) {
                    console.log('Manually created render.mouse successfully.');
                } else {
                    console.error('Failed to manually create render.mouse.');
                }
            } else {
                console.error('Matter.Mouse (aliased as Mouse) is not available for manual creation.');
            }
        }
        vitaBody = Bodies.rectangle(VITA_START_X, VITA_START_Y, VITA_WIDTH, VITA_HEIGHT, {
            label: "Vita",
            frictionAir: VITA_FRICTION_AIR,
            density: VITA_DENSITY,
            restitution: VITA_RESTITUTION,
            render: { sprite: { texture: VITA_IMAGE_PATH, xScale: VITA_SPRITE_X_SCALE, yScale: VITA_SPRITE_Y_SCALE } }
        });
        
        Composite.add(world, vitaBody); // Add Vita separately

        // Define your new static platforms (using the builder)
        const newPlatformsData = [
            { x: GAME_WIDTH * 0.25, y: FLOOR_1_TOP_Y - 150, width: 200, height: 30, label: "CustomPlatformA", color: '#CC0000' }, // Made red
            { x: GAME_WIDTH * 0.75, y: FLOOR_1_TOP_Y - 250, width: 150, height: 25, label: "CustomPlatformB", color: '#666666' },
            { x: GAME_WIDTH * 0.5, y: FLOOR_2_TOP_Y - 200, width: 300, height: 30, label: "CustomPlatformC_Area2", color: '#888888' }
        ];
        const customStaticPlatforms = envBuilder.createCustomPlatforms(newPlatformsData);
        // Note: customStaticPlatforms are added to the world by the builder.
        // They will be picked up by the `potentialSupports` logic if their labels match.

        // create a stack of frogs
        frogStack = [];
        const frogsPerArea = Math.ceil(NUM_FROGS / NUM_AREAS_VERTICAL);
        const frogSize = FROG_SIZE;
        for (let i = 0; i < frogsPerArea; i++) { // Frogs in Area 1 (bottom)
            const initialX = GAME_WIDTH * 0.2 + i * (FROG_SIZE * 10);
            const initialY = FLOOR_1_TOP_Y - frogSize / 2 - 50 - (i % 2 === 0 ? 0 : FROG_SIZE * 1.5); // Relative to floor 1
            const frogObj = new Frog(initialX, initialY, frogSize, `${i}`);
            frogObj.addToWorld(world);
            frogStack.push(frogObj.body);
        }
        for (let i = 0; i < frogsPerArea && (frogStack.length < NUM_FROGS); i++) { // Frogs in Area 2 (top)
            const initialX = GAME_WIDTH * 0.2 + i * (FROG_SIZE * 10);
            const initialY = FLOOR_2_TOP_Y - frogSize / 2 - 50 - (i % 2 === 0 ? 0 : FROG_SIZE * 1.5); // Relative to floor 2
            const frogObj = new Frog(initialX, initialY, frogSize, `Area2-${i}`);
            frogObj.addToWorld(world);
            frogStack.push(frogObj.body);
        }

        // Create a stack of boxes
        boxStack = [];
        const boxesPerArea = Math.ceil(NUM_BOXES / NUM_AREAS_VERTICAL);
        for (let i = 0; i < boxesPerArea; i++) { // Boxes in Area 1
            const initialX = BOX_STACK_INITIAL_X + (i % 2 === 0 ? 0 : BOX_SIZE / 2);
            const initialY = FLOOR_1_TOP_Y - BOX_SIZE / 2 - (Math.floor(i / 2) * BOX_SIZE);
            const boxObj = new Box(initialX, initialY, BOX_SIZE, `${i}`, i);
            boxObj.addToWorld(world);
            boxStack.push(boxObj.body);
        }
        for (let i = 0; i < boxesPerArea && (boxStack.length < NUM_BOXES); i++) { // Boxes in Area 2
            const initialX = BOX_STACK_INITIAL_X + (i % 2 === 0 ? 0 : BOX_SIZE / 2) - GAME_WIDTH * 0.4; // Place them differently
            const initialY = FLOOR_2_TOP_Y - BOX_SIZE / 2 - (Math.floor(i / 2) * BOX_SIZE);
            const boxObj = new Box(initialX, initialY, BOX_SIZE, `Area2-${i}`, i + boxesPerArea);
            boxObj.addToWorld(world);
            boxStack.push(boxObj.body);
        }

        // Create bouncy balls
        bouncyBallsArray = [];
        const ballsPerArea = Math.ceil(NUM_BALLS / NUM_AREAS_VERTICAL);
        for (let i = 0; i < ballsPerArea; i++) { // Balls in Area 1
            const initialX = GAME_WIDTH * 0.2 + i * (BOUNCY_BALL_RADIUS * 2.5);
            const initialY = FLOOR_1_TOP_Y - BOUNCY_BALL_RADIUS - 100 - (i % 2 === 0 ? 0 : BOUNCY_BALL_RADIUS * 1.5);
            const ballObj = new BouncyBall(initialX, initialY, BOUNCY_BALL_RADIUS, `${i}`, i, NUM_BALLS);
            ballObj.addToWorld(world);
            bouncyBallsArray.push(ballObj.body);
        }
        for (let i = 0; i < ballsPerArea && (bouncyBallsArray.length < NUM_BALLS); i++) { // Balls in Area 2
            const initialX = GAME_WIDTH * 0.8 - i * (BOUNCY_BALL_RADIUS * 2.5); // Different X start
            const initialY = FLOOR_2_TOP_Y - BOUNCY_BALL_RADIUS - 100 - (i % 2 === 0 ? 0 : BOUNCY_BALL_RADIUS * 1.5);
            const ballObj = new BouncyBall(initialX, initialY, BOUNCY_BALL_RADIUS, `Area2-${i}`, i + ballsPerArea, NUM_BALLS);
            ballObj.addToWorld(world);
            bouncyBallsArray.push(ballObj.body);
        }

        // Create forcefield triangles
        forceTrianglesArray = [];
        for (let i = 0; i < NUM_TRIANGLES; i++) {
            // Create triangles at random positions
            const initialX = Math.random() * GAME_WIDTH * 0.8 + GAME_WIDTH * 0.1; // Keep away from edges
            const initialY = Math.random() * GAME_HEIGHT * 0.6 + 50; // Keep away from top and bottom
            
            const triangleObj = new ForceTriangle(initialX, initialY, TRIANGLE_RADIUS, `${FORCE_TRIANGLE_LABEL}-${i}`);
            triangleObj.addToWorld(world);
            forceTrianglesArray.push(triangleObj.body);
        }

        // Create score display
        scoreDisplay = document.createElement('div');
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '10px';
        scoreDisplay.style.left = '10px';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.fontSize = '24px';
        scoreDisplay.style.fontWeight = 'bold';
        scoreDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        scoreDisplay.style.zIndex = '10';
        gameContainer.appendChild(scoreDisplay);
        updateScoreDisplay();

        // Set up collision detection
        Events.on(engine, 'collisionStart', handleCollisions);
        
        // Set up the game update loop
        Events.on(engine, 'beforeUpdate', updateGame);
        Events.on(engine, 'afterUpdate', afterUpdateGame); // Add afterUpdate listener for camera

        // Start the renderer
        Render.run(render);
        
        // Create runner
        runner = Runner.create();
        addMouseClickListener(); // Add the listener for kicking (identical to original)
    }

    function handleCollisions(event) {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // isVitaOnGround is now determined in updateGame for more consistent per-frame checking.
            
            // Check for collisions between objects (excluding walls, ground, ceiling)
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Skip if either body is static (walls, ground, ceiling) or if Vita is involved
            if (bodyA.isStatic || bodyB.isStatic || bodyA.label === "Vita" || bodyB.label === "Vita") {
                continue;
            }
            
            // Calculate collision force (simplified)
            const relativeVelocity = {
                x: bodyB.velocity.x - bodyA.velocity.x,
                y: bodyB.velocity.y - bodyA.velocity.y
            };
            
            const speed = Math.sqrt(relativeVelocity.x * relativeVelocity.x + relativeVelocity.y * relativeVelocity.y);
            
            // Only count significant collisions
            if (speed > 3) {
                // Add points based on collision speed
                const points = Math.floor(speed);
                chaosScore += points;
                updateScoreDisplay();
                
                // No visual feedback for points - removed flying numbers
            }
        }
    }

    // Removed createPointsPopup function as we don't need visual point indicators

    function updateScoreDisplay() {
        if (scoreDisplay) {
            scoreDisplay.textContent = `Chaos Score: ${chaosScore}`;
        }
    }

    function updateGame() {
        if (!isGameActive || !vitaBody) return;
        
        // Reset ground contact flag at the start of each update.
        isVitaOnGround = false;

        // Determine if Vita is on any standable surface
        const potentialSupports = [
            ground1,
            platform2, // Add the new platform as a support
            ...boxStack,
            ...frogStack,
            ...forceTrianglesArray.filter(t => t.isStatic), // Only static triangles can be stood on
            ...Composite.allBodies(world).filter(body => body.isStatic && body.label && body.label.startsWith("CustomPlatform"))
        ];

        for (const supportBody of potentialSupports) {
            if (!supportBody || supportBody === vitaBody) continue; // Skip null or self

            const collisions = Query.collides(vitaBody, [supportBody]);
            if (collisions.length > 0) {
                for (const collision of collisions) {
                    // Debugging: Log collision details for specific platforms
                    if (supportBody.label === "Ground1" || supportBody.label.startsWith("CustomPlatform")) {
                        console.log(
                            `Query.collides with ${supportBody.label}:\n` +
                            `  Pair: A=${collision.bodyA.label}, B=${collision.bodyB.label}\n` +
                            `  collided: ${collision.collided}, normal: x=${collision.normal ? collision.normal.x.toFixed(3) : 'N/A'}, y=${collision.normal ? collision.normal.y.toFixed(3) : 'N/A'}`
                        );
                    }

                    if (collision.collided && collision.normal) {
                        let normalY_pointsFromBtoA = collision.normal.y;

                        // Case 1: Vita is bodyA, Support is bodyB
                        // Normal points from Support (B) to Vita (A).
                        // If Vita is on top, normal.y should be negative (e.g., -1).
                        if (collision.bodyA === vitaBody && collision.bodyB === supportBody) {
                            if (normalY_pointsFromBtoA < -0.5) {
                                isVitaOnGround = true;
                            }
                        } 
                        // Case 2: Vita is bodyB, Support is bodyA
                        // Normal points from Vita (B) to Support (A).
                        // If Vita is on top, normal.y should be positive (e.g., +1, as it points from Vita downwards to the support).
                        else if (collision.bodyA === supportBody && collision.bodyB === vitaBody) {
                            if (normalY_pointsFromBtoA > 0.5) { 
                                isVitaOnGround = true;
                            }
                        }

                        if (isVitaOnGround) {
                            // console.log(`isVitaOnGround set TRUE by ${supportBody.label} (A:${collision.bodyA.label}, B:${collision.bodyB.label}, normal.y:${normalY_pointsFromBtoA.toFixed(3)})`);
                            break; 
                        }
                    }
                }
            }
            if (isVitaOnGround) break; // Exit early if already confirmed on a support
        }
        
        // Handle keyboard input for movement
        handlePlayerMovement();
        
        // Handle forcefield effects
        applyForcefields();
        
        // Check for objects that need to be respawned
        checkForRespawns();
    }

    function afterUpdateGame() {
        if (!isGameActive || !vitaBody || !render) return;

        // Camera follow Vita
        Render.lookAt(render, vitaBody, CAMERA_PADDING, true);
    }

    function handlePlayerMovement() {
        // Handle keyboard movement
        if (keysPressed['a'] || keysPressed['arrowleft']) {
            // Move left
            Body.applyForce(vitaBody, vitaBody.position, { x: -PLAYER_MOVE_FORCE_FACTOR * vitaBody.mass, y: 0 });
            // Flip sprite to face left
            if (vitaBody.render.sprite) {
                vitaBody.render.sprite.xScale = -Math.abs(VITA_SPRITE_X_SCALE);
            }
        }
        
        if (keysPressed['d'] || keysPressed['arrowright']) {
            // Move right
            Body.applyForce(vitaBody, vitaBody.position, { x: PLAYER_MOVE_FORCE_FACTOR * vitaBody.mass, y: 0 });
            // Flip sprite to face right
            if (vitaBody.render.sprite) {
                vitaBody.render.sprite.xScale = Math.abs(VITA_SPRITE_X_SCALE);
            }
        }
        
        // Jump only if on ground
        if (keysPressed['w'] || keysPressed['arrowup'] || keysPressed[' ']) {
            console.log(`Jump key pressed. isVitaOnGround: ${isVitaOnGround}`); // Log jump attempt and ground status
            if (isVitaOnGround) {
                // Apply an upward force for jumping
                const jumpForce = PLAYER_JUMP_FORCE_MULTIPLIER * vitaBody.mass;
                Body.applyForce(vitaBody, vitaBody.position, { x: 0, y: -jumpForce });
            }
        }
        
        // Grab/throw with 'e' key
        if (keysPressed['e']) {
            // Only trigger once per keypress
            if (!keysPressed.eWasPressed) {
                keysPressed.eWasPressed = true;
                toggleGrabReleaseObject();
            }
        } else {
            keysPressed.eWasPressed = false;
        }
    }

    function toggleGrabReleaseObject() {
        if (heldObject) {
            // Release the currently held object
            releaseObject();
        } else {
            // Try to grab a nearby object
            grabNearestObject();
        }
    }

    function grabNearestObject() {
        // Find the nearest non-static object within grab radius
        let nearestObject = null;
        let minDistanceSq = GRAB_RADIUS * GRAB_RADIUS; // Use squared distance for efficiency
        
        const allDynamicBodies = [...boxStack, ...bouncyBallsArray, ...frogStack, ...forceTrianglesArray.filter(t => !t.isStatic)];
        allDynamicBodies.forEach(body => {
            if (body.isStatic || body === vitaBody) { // Simpler check, force triangles are already filtered if static
                return;
            }
            
            // Calculate distance between Vita and the object
            const dx = body.position.x - vitaBody.position.x;
            const dy = body.position.y - vitaBody.position.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                nearestObject = body;
            }
        });
        
        if (nearestObject) {
            heldObject = nearestObject;
            
            // Store original collision filters and then modify to prevent self-collision while holding
            heldObject.originalCollisionFilter = { ...heldObject.collisionFilter };
            vitaBody.originalCollisionFilterForGrab = { ...vitaBody.collisionFilter };

            const noCollideGroup = -1; // Objects in the same negative group don't collide
            Body.set(heldObject, 'collisionFilter', { ...heldObject.originalCollisionFilter, group: noCollideGroup });
            Body.set(vitaBody, 'collisionFilter', { ...vitaBody.originalCollisionFilterForGrab, group: noCollideGroup });
            
            const isFacingRight = vitaBody.render.sprite.xScale > 0;
            const actualPointA = {
                x: isFacingRight ? GRAB_POINT_OFFSET.x : -GRAB_POINT_OFFSET.x,
                y: GRAB_POINT_OFFSET.y
            };
            
            // Create a constraint to "hold" the object
            grabConstraint = Constraint.create({
                bodyA: vitaBody,
                pointA: actualPointA,
                bodyB: heldObject,
                pointB: { x: 0, y: 0 }, // Attach to center of held object
                stiffness: 0.07,        // Lowered to match original's typical feel
                damping: 0.1,           // Added from original
                length: Vector.magnitude(GRAB_POINT_OFFSET) + // Using GRAB_POINT_OFFSET magnitude
                        (heldObject.circleRadius || Math.max(heldObject.bounds.max.x - heldObject.bounds.min.x, heldObject.bounds.max.y - heldObject.bounds.min.y) / 3),
                render: {
                    visible: true,
                    lineWidth: 2,
                    strokeStyle: '#FFFFFF'
                }
            });
            Composite.add(world, grabConstraint);
        }
    }

    function releaseObject() {
        if (!heldObject || !grabConstraint) return;
        
        // Remove the constraint
        Composite.remove(world, grabConstraint);
        grabConstraint = null;

        // Restore original collision filters
        if (heldObject.originalCollisionFilter) {
            Body.set(heldObject, 'collisionFilter', heldObject.originalCollisionFilter);
            delete heldObject.originalCollisionFilter;
        }
        if (vitaBody.originalCollisionFilterForGrab) {
             Body.set(vitaBody, 'collisionFilter', vitaBody.originalCollisionFilterForGrab);
             delete vitaBody.originalCollisionFilterForGrab;
        }

        // Throwing logic (similar to kick, towards mouse) - matches original
        const mousePos = render.mouse.position; // Use render.mouse.position
        let throwDirection = Vector.sub(mousePos, vitaBody.position);
        if (Vector.magnitudeSquared(throwDirection) === 0) {
            // Default throw direction if mouse is exactly on Vita (e.g., throw right)
            throwDirection = { x: vitaBody.render.sprite.xScale > 0 ? 1 : -1, y: 0 };
        }
        throwDirection = Vector.normalise(throwDirection);
        
        const throwForceVector = Vector.mult(throwDirection, THROW_FORCE_MAGNITUDE);
        Body.applyForce(heldObject, heldObject.position, throwForceVector);
        
        // Reset held object and constraint
        heldObject = null;
    }

    function applyForcefields() {
        // Skip if no forcefield triangles
        if (!forceTrianglesArray || forceTrianglesArray.length === 0) return;
        
        // Get all non-static bodies except Vita and the triangles themselves
        const affectedBodies = Composite.allBodies(world).filter(body => {
            return !body.isStatic && body !== vitaBody && !body.label.includes(FORCE_TRIANGLE_LABEL);
        });
        
        // For each forcefield triangle
        forceTrianglesArray.forEach(triangle => {
            // For each body that can be affected
            affectedBodies.forEach(body => {
                // Calculate distance between triangle and body
                const dx = body.position.x - triangle.position.x;
                const dy = body.position.y - triangle.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Apply force if within range (using triangle radius * 10 as the range)
                const forceRange = TRIANGLE_RADIUS * 10;
                if (distance < forceRange) {
                    // Calculate force direction (away from triangle)
                    const forceMagnitude = FORCEFIELD_MAGNITUDE * (1 - distance / forceRange); // Stronger when closer
                    const forceX = dx / distance * forceMagnitude * body.mass;
                    const forceY = dy / distance * forceMagnitude * body.mass;
                    
                    // Apply the force
                    Body.applyForce(body, body.position, { x: forceX, y: forceY });
                }
            });
        });
    }

    function checkForRespawns() {
        // Get all non-static bodies except Vita
        const respawnableBodies = Composite.allBodies(world).filter(body => {
            return !body.isStatic && body !== vitaBody;
        });
        
        // Check each body
        respawnableBodies.forEach(body => {
            // Check if body is out of bounds
            if (body.position.y > RESPAWN_Y_LIMIT || 
                body.position.x < -RESPAWN_X_BUFFER || 
                body.position.x > GAME_WIDTH + RESPAWN_X_BUFFER) {
                
                // Respawn the body at a random position near the top
                Body.setPosition(body, {
                    x: Math.random() * (GAME_WIDTH - 100) + 50,
                    y: Math.random() * 100 // Respawn in the upper part of the current view or top area
                });
                
                // Reset velocity
                Body.setVelocity(body, { x: 0, y: 0 });
                Body.setAngularVelocity(body, 0);
                Body.setAngle(body, 0);
                
                // Add points for respawning an object
                chaosScore += 10;
                updateScoreDisplay();
            }
        });
    }

    function resetVitaPosition() {
        // Recalculate VITA_START_Y in case of resize
        const FLOOR_1_TOP_Y_reset = GAME_HEIGHT - GROUND_HEIGHT;
        const VITA_START_Y_reset = FLOOR_1_TOP_Y_reset - VITA_HEIGHT / 2 - 20;

        Body.setPosition(vitaBody, { x: VITA_START_X, y: VITA_START_Y_reset });
        Body.setVelocity(vitaBody, { x: 0, y: 0 });
        Body.setAngularVelocity(vitaBody, 0);
        Body.setAngle(vitaBody, 0);
        // If holding an object, release it
        if (heldObject) {
            releaseObject();
        }
    }

    function addMouseClickListener() {
        if (!render || !render.canvas) {
            console.error("Render canvas not available to add mouse listener.");
            return;
        }

        // Function to handle mouse clicks for kicking (identical to original's handleInteraction)
        function handleKickInteraction(event) {
            if (!isGameActive || !vitaBody || event.button !== 0) return; // Only left click

            // Use render.mouse.position which is already in world coordinates (scaled by canvas)
            const interactionPosition = render.mouse.position;

            // Calculate direction from Vita to the interaction point
            let kickDirection = Vector.sub(interactionPosition, vitaBody.position);

            if (Vector.magnitudeSquared(kickDirection) === 0) {
                // Default kick direction if exactly on Vita (e.g., direction Vita is facing)
                kickDirection = { x: vitaBody.render.sprite.xScale > 0 ? 1 : -1, y: 0 };
            }
            kickDirection = Vector.normalise(kickDirection);

            // --- Kick Animation Start (Identical to original) ---
            if (kickAnimationTimeout) {
                clearTimeout(kickAnimationTimeout);
            }
            const originalXOffset = vitaBody.render.sprite.xOffset || 0;
            const originalYOffset = vitaBody.render.sprite.yOffset || 0;

            vitaBody.render.sprite.xOffset = originalXOffset + kickDirection.x * KICK_ANIMATION_OFFSET_MAGNITUDE;
            vitaBody.render.sprite.yOffset = originalYOffset + kickDirection.y * KICK_ANIMATION_OFFSET_MAGNITUDE;

            kickAnimationTimeout = setTimeout(() => {
                vitaBody.render.sprite.xOffset = originalXOffset;
                vitaBody.render.sprite.yOffset = originalYOffset;
                kickAnimationTimeout = null;
            }, KICK_ANIMATION_DURATION);
            // --- Kick Animation End ---

            const allDynamicBodies = [...boxStack, ...bouncyBallsArray, ...frogStack, ...forceTrianglesArray.filter(t => !t.isStatic)];

            allDynamicBodies.forEach(objectBody => {
                if (objectBody === vitaBody || objectBody.isStatic) {
                    return; // Don't kick self or static objects
                }

                const distanceToVita = Vector.magnitude(Vector.sub(objectBody.position, vitaBody.position));

                if (distanceToVita < KICK_RADIUS) {
                    const forceVector = Vector.mult(kickDirection, KICK_FORCE_MAGNITUDE); // Apply fixed force magnitude
                    Body.applyForce(objectBody, objectBody.position, forceVector);
                     // Add points for kicking objects
                    chaosScore += 5; // Example: 5 points per kick
                    updateScoreDisplay();
                }
            });
        }
        render.canvas.addEventListener('mousedown', handleKickInteraction);
    }

    // --- Game Control Functions ---
    function handleStartGame() {
        clearMenu();
        
        // Hide the game plans container during gameplay
        const gamePlansContainer = document.getElementById('game-plans-container');
        if (gamePlansContainer) {
            gamePlansContainer.style.display = 'none';
        }
        
        // Show controls info during gameplay
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            controlsInfo.style.display = 'block';
        }
        
        // Reset score
        chaosScore = 0;
        updateScoreDisplay();
        
        // If game was already set up, just reset positions
        if (engine && world && vitaBody) {
            resetVitaPosition();
            
            // Reset all movable objects to their respective areas
            const FLOOR_1_TOP_Y = GAME_HEIGHT - GROUND_HEIGHT;
            const FLOOR_2_TOP_Y = (GAME_HEIGHT - SINGLE_AREA_HEIGHT) - PLATFORM_THICKNESS;

            const resetObject = (obj, area) => {
                let randomX = Math.random() * (GAME_WIDTH - 100) + 50;
                let randomY;
                if (area === 1) {
                    randomY = FLOOR_1_TOP_Y - (obj.circleRadius || obj.height || BOX_SIZE) / 2 - (Math.random() * 100 + 50);
                } else { // area === 2
                    randomY = FLOOR_2_TOP_Y - (obj.circleRadius || obj.height || BOX_SIZE) / 2 - (Math.random() * 100 + 50);
                }
                Body.setPosition(obj, { x: randomX, y: randomY });
                Body.setVelocity(obj, { x: 0, y: 0 });
                Body.setAngularVelocity(obj, 0);
                Body.setAngle(obj, 0);
            };
            
            // This is a simplified reset; ideally, objects would remember their original area
            // For now, we'll just scatter them somewhat randomly in the two areas
            const allMovable = [...boxStack, ...bouncyBallsArray, ...frogStack, ...forceTrianglesArray.filter(t => !t.isStatic)];
            allMovable.forEach((obj, index) => {
                resetObject(obj, (index % NUM_AREAS_VERTICAL) + 1); // Distribute somewhat between areas
            });

        } else {
            // First time setup
            setupGame();
        }
        
        // Start the game
        isGameActive = true;
        Runner.run(runner, engine);
        
        // Set up keyboard pause
        document.addEventListener('keydown', handlePauseKey);
    }

    function handlePauseKey(event) {
        if (event.key === 'Escape' || event.key === 'p') {
            if (isGameActive) {
                showPauseMenu();
            } else if (menuContainer && menuContainer.textContent.includes('Paused')) {
                handleResumeGame();
            }
        }
    }

    function handleResumeGame() {
        clearMenu();
        
        // Hide the game plans container during gameplay
        const gamePlansContainer = document.getElementById('game-plans-container');
        if (gamePlansContainer) {
            gamePlansContainer.style.display = 'none';
        }
        
        isGameActive = true;
        Runner.run(runner, engine);
    }

    function handleRestartGame() {
        clearMenu();
        handleStartGame();
    }

    function handleQuitGame() {
        clearMenu();
        
        // If holding an object, release it
        if (heldObject) {
            releaseObject();
        }
        
        showStartMenu();
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement && 
            !document.mozFullScreenElement && 
            !document.webkitFullscreenElement && 
            !document.msFullscreenElement) {
            // Enter fullscreen
            if (gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen();
            } else if (gameContainer.msRequestFullscreen) {
                gameContainer.msRequestFullscreen();
            } else if (gameContainer.mozRequestFullScreen) {
                gameContainer.mozRequestFullScreen();
            } else if (gameContainer.webkitRequestFullscreen) {
                gameContainer.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    function handleResizeOrOrientationChange() {
        if (!render) return;
        
        // Recalculate game dimensions
        const dimensions = calculateGameDimensions();
        GAME_WIDTH = dimensions.width;
        GAME_HEIGHT = dimensions.height;
        
        // Update render canvas size
        render.options.width = GAME_WIDTH;
        render.options.height = GAME_HEIGHT;
        render.canvas.width = GAME_WIDTH;
        render.canvas.height = GAME_HEIGHT;
        
        // Update ground position
        if (ground1) { // Floor of Area 1
            Body.setPosition(ground1, { x: GAME_WIDTH / 2, y: GAME_HEIGHT - (GROUND_HEIGHT / 2) });
            Body.setVertices(ground1, Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - (GROUND_HEIGHT / 2), GAME_WIDTH, GROUND_HEIGHT).vertices);
        }

        if (platform2) { // Floor of Area 2
            const platform2_y_center = (GAME_HEIGHT - SINGLE_AREA_HEIGHT) - (PLATFORM_THICKNESS / 2);
            Body.setPosition(platform2, { x: GAME_WIDTH / 2, y: platform2_y_center });
            Body.setVertices(platform2, Bodies.rectangle(GAME_WIDTH / 2, platform2_y_center, GAME_WIDTH, PLATFORM_THICKNESS).vertices);
        }
        
        // Update ceiling position
        if (ceiling) {
            Body.setPosition(ceiling, { x: GAME_WIDTH / 2, y: CEILING_Y_OFFSET });
            Body.setVertices(ceiling, Bodies.rectangle(GAME_WIDTH / 2, CEILING_Y_OFFSET, GAME_WIDTH + WALL_THICKNESS * 2, CEILING_HEIGHT).vertices);
        }
        
        // Update walls
        if (leftWall) {
            Body.setPosition(leftWall, { x: -WALL_THICKNESS / 4, y: GAME_HEIGHT / 2 });
            Body.setVertices(leftWall, Bodies.rectangle(-WALL_THICKNESS / 4, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2).vertices);
        }
        
        if (rightWall) {
            Body.setPosition(rightWall, { x: GAME_WIDTH + WALL_THICKNESS / 2, y: GAME_HEIGHT / 2 });
            Body.setVertices(rightWall, Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2).vertices);
        }
        
        // If Vita exists, make sure it's not out of bounds
        if (vitaBody) {
            const vitaX = Math.min(Math.max(vitaBody.position.x, VITA_WIDTH / 2), GAME_WIDTH - VITA_WIDTH / 2);
            // Ensure Vita stays above the lowest ground and below the highest ceiling part relevant to gameplay
            const lowestFloorY = GAME_HEIGHT - GROUND_HEIGHT; // Top of ground1
            const vitaY = Math.min(Math.max(vitaBody.position.y, VITA_HEIGHT / 2), lowestFloorY - VITA_HEIGHT / 2);
            Body.setPosition(vitaBody, { x: vitaX, y: vitaY });
        }
        
        // Run the renderer to update the view
        Render.run(render);
    }

    // Listen for window resize
    window.addEventListener('resize', handleResizeOrOrientationChange);
    
    // Listen for fullscreen changes to trigger resize
    document.addEventListener('fullscreenchange', handleResizeOrOrientationChange);
    document.addEventListener('webkitfullscreenchange', handleResizeOrOrientationChange); // Safari
    document.addEventListener('mozfullscreenchange', handleResizeOrOrientationChange);    // Firefox
    document.addEventListener('MSFullscreenChange', handleResizeOrOrientationChange);     // IE11

    // --- Preload Assets and Initialize Game ---
    const vitaSprite = new Image();
    vitaSprite.src = VITA_IMAGE_PATH;
    vitaSprite.onload = () => {
        console.log('Vita sprite loaded successfully');
        // Show the start menu once assets are loaded
        showStartMenu();
    };
    vitaSprite.onerror = () => {
        console.error('Failed to load Vita sprite');
        // Show the start menu anyway, but Vita might not have a sprite
        showStartMenu();
    };
});
