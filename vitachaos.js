// Ensure the DOM is loaded before trying to access elements
document.addEventListener('DOMContentLoaded', () => {
    // Module aliases from Matter.js
    const Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite,
        Body = Matter.Body,
        Events = Matter.Events, // Used for engine update cycle and collision events
        Query = Matter.Query; // For specific world queries if needed beyond collisions

    // --- Game Configuration ---
    const GAME_WIDTH = 1500;
    const GAME_HEIGHT = 600;

    // Vita (Player) Configuration
    const VITA_START_X = 150;
    const VITA_START_Y_OFFSET = 90; // From bottom, center of Vita (Adjusted for new height)
    const VITA_WIDTH = 30; // Made smaller
    const VITA_HEIGHT = 53; // Made smaller (approx 75% of original, maintaining aspect ratio)
    const VITA_IMAGE_PATH = 'images/vitaimages/vitasprite.png'; // Ensure this image is in the same folder as your HTML
    // IMPORTANT: Adjust these scales based on your 'vitaspin.jpg' dimensions
    const VITA_SPRITE_X_SCALE = 0.05; // RECALCULATE: VITA_WIDTH / your_image_actual_width
    const VITA_SPRITE_Y_SCALE = 0.05; // RECALCULATE: VITA_HEIGHT / your_image_actual_height
    const VITA_FRICTION_AIR = 0.01;
    const VITA_DENSITY = 0.002;
    const VITA_RESTITUTION = 0.1;

    // Ground Configuration
    const GROUND_Y_OFFSET = 30; // From bottom, for the center of the ground
    const GROUND_HEIGHT = 60;   // Thickness of the ground
    const GROUND_COLOR = '#6B8E23';
    // need to let Vita jump on all solid objects, not just the ground
    // (e.g., boxes, walls, etc.), so I'll need to adjust the collision detection logic

    // Walls
    const WALL_THICKNESS = 50; // Thickness for boundary walls
    const WALL_COLOR = '#333333'; // Color for walls (can be made invisible)

    // Physics 
    const GRAVITY_Y = 1;
    const PLAYER_MOVE_FORCE_FACTOR = 0.005;
    const PLAYER_JUMP_FORCE_MULTIPLIER = 0.03; // Increased for a more noticeable jump

    // Other Objects
    const BOX_SIZE = 50;
    const NUM_BOXES = 14;
    const BOX_STACK_INITIAL_X = GAME_WIDTH * 0.7; // Define the initial X position of the box stack
    const NUM_BALLS = 20; // Number of bouncy balls
    const BOUNCY_BALL_RADIUS = 10;
    const BOUNCY_BALL_RESTITUTION = 0.8;
    const BOUNCY_BALL_COLOR = '#4682B4';
    const BACKGROUND_COLOR = '#222222';

    // Camera
    const CAMERA_PADDING = { x: 200, y: 200 }; // How far Vita is from the edge of the screen
    // --- End Game Configuration ---

    // --- Global Game State Variables ---
    let engine, world, render, runner;
    let vitaBody, ground, leftWall, rightWall, boxStack, bouncyBallsArray; // Game objects
    let scoreDisplay, chaosScore = 0;
    let isGameActive = false; // True when game is running (not in start menu, not paused)
    let menuContainer = null; // To hold current menu


    // --- Game Setup ---
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error("Fatal Error: Game container div not found!");
        return;
    }

    // Ensure game container can host absolutely positioned children like the score
    gameContainer.style.position = 'relative';

    // --- Player Input Handling (Persistent) ---
    const keysPressed = {};
    let isVitaOnGround = false; // Flag to control jumping

    document.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
    });
    document.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
    });

    // --- Menu Styling and Creation ---
    function styleMenuElement(menuElement) {
        menuElement.style.position = 'absolute';
        menuElement.style.top = '50%';
        menuElement.style.left = '50%';
        menuElement.style.transform = 'translate(-50%, -50%)';
        menuElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        menuElement.style.padding = '30px';
        menuElement.style.borderRadius = '10px';
        menuElement.style.textAlign = 'center';
        menuElement.style.zIndex = '100'; // Ensure menu is on top
    }

    function createMenuButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.display = 'block';
        button.style.margin = '10px auto';
        button.style.padding = '10px 20px';
        button.style.fontSize = '18px';
        button.style.cursor = 'pointer';
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
        if (runner) Runner.stop(runner); // Stop runner if it was somehow active

        menuContainer = document.createElement('div');
        styleMenuElement(menuContainer);

        const title = document.createElement('h1');
        title.textContent = 'Vita Chaos';
        title.style.color = 'white';
        menuContainer.appendChild(title);

        const startButton = createMenuButton('Start Game', handleStartGame);
        menuContainer.appendChild(startButton);

        gameContainer.appendChild(menuContainer);
    }

    function showPauseMenu() {
        if (!isGameActive) return; // Don't show pause menu if game isn't active
        isGameActive = false;
        Runner.stop(runner);

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

        vitaBody = Bodies.rectangle(VITA_START_X, GAME_HEIGHT - VITA_START_Y_OFFSET, VITA_WIDTH, VITA_HEIGHT, {
            label: "Vita",
            frictionAir: VITA_FRICTION_AIR,
            density: VITA_DENSITY,
            restitution: VITA_RESTITUTION,
            render: { sprite: { texture: VITA_IMAGE_PATH, xScale: VITA_SPRITE_X_SCALE, yScale: VITA_SPRITE_Y_SCALE } }
        });

        ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - GROUND_Y_OFFSET, GAME_WIDTH, GROUND_HEIGHT, {
            isStatic: true, label: "Ground", render: { fillStyle: GROUND_COLOR }
        });

        leftWall = Bodies.rectangle(-WALL_THICKNESS / 4, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
            isStatic: true, label: "WallLeft", render: { fillStyle: WALL_COLOR }
        });
        rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
            isStatic: true, label: "WallRight", render: { fillStyle: WALL_COLOR }
        });

        boxStack = [];
        const boxSize = BOX_SIZE;
        for (let i = 0; i < NUM_BOXES; i++) {
            const box = Bodies.rectangle(BOX_STACK_INITIAL_X, GAME_HEIGHT - GROUND_HEIGHT - (VITA_HEIGHT / 2) - (i * (boxSize + 5)), boxSize, boxSize, {
                label: `Box-${i}`, friction: 0.1, restitution: 0.3, render: { fillStyle: `hsl(${i * 30}, 70%, 60%)` }
            });
            boxStack.push(box);
        }

        bouncyBallsArray = [];
        for (let i = 0; i < NUM_BALLS; i++) {
            const startX = GAME_WIDTH * 0.2 + i * (BOUNCY_BALL_RADIUS * 2.5);
            const startY = 100 + (i % 2 === 0 ? 0 : BOUNCY_BALL_RADIUS * 1.5);
            const ball = Bodies.circle(startX, startY, BOUNCY_BALL_RADIUS, {
                label: `BouncyBall-${i}`, restitution: BOUNCY_BALL_RESTITUTION, friction: 0.05, frictionAir: 0.005,
                render: { fillStyle: `hsl(${i * (360 / NUM_BALLS)}, 80%, 60%)` }
            });
            bouncyBallsArray.push(ball);
        }

        Composite.add(world, [vitaBody, ground, leftWall, rightWall, ...boxStack, ...bouncyBallsArray]);

        // Setup event listeners that depend on engine objects
        setupGameEventListeners();

        runner = Runner.create(); // Create the runner
        Render.run(render); // Start the renderer
    }

    function setupGameEventListeners() {
    // Collision detection to see if Vita is on the ground
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            if ((pair.bodyA.label === "Vita" && pair.bodyB.label === "Ground") ||
                (pair.bodyB.label === "Vita" && pair.bodyA.label === "Ground")) {
                isVitaOnGround = true;
                break;
            }
            // Optional: Allow jumping from on top of boxes (more complex, requires checking collision normal)
            // if ((pair.bodyA.label === "Vita" && pair.bodyB.label.startsWith("Box-")) ||
            //     (pair.bodyB.label === "Vita" && pair.bodyA.label.startsWith("Box-"))) {
            //     // Check if collision is from top
            //     if (pair.collision.normal.y < -0.5 && pair.bodyA.label === "Vita") isVitaOnGround = true; // Vita is bodyA, hit from top
            //     if (pair.collision.normal.y > 0.5 && pair.bodyB.label === "Vita") isVitaOnGround = true; // Vita is bodyB, hit from top
            // }
        }
    });

        // Calculate forces based on Vita's mass (mass = density * area)
        // These need vitaBody to be initialized.
        const moveForce = PLAYER_MOVE_FORCE_FACTOR * vitaBody.mass;
        const jumpForce = PLAYER_JUMP_FORCE_MULTIPLIER * vitaBody.mass;

    // Game loop updates (called by Matter.Runner)
    Events.on(engine, 'beforeUpdate', (event) => {
            if (!isGameActive) return; // Don't process game logic if not active
            // Horizontal movement
            if (keysPressed['a'] || keysPressed['arrowleft']) {
            Body.applyForce(vitaBody, vitaBody.position, { x: -moveForce, y: 0 });
        }
        if (keysPressed['d'] || keysPressed['arrowright']) {
            Body.applyForce(vitaBody, vitaBody.position, { x: moveForce, y: 0 });
        }

        // Jump
        if ((keysPressed['w'] || keysPressed['arrowup'] || keysPressed[' ']) && isVitaOnGround) {
            Body.applyForce(vitaBody, vitaBody.position, { x: 0, y: -jumpForce });
            isVitaOnGround = false; // Prevent double jump until next ground contact
        }

        // Keep Vita from rotating too much (optional, like a platformer character)
        // Body.setAngularVelocity(vitaBody, 0);

        // Walls now handle keeping Vita within bounds, so screen wrapping is removed.
    });

    Events.on(engine, 'afterUpdate', () => {
            if (!isGameActive) return; // Don't process game logic if not active
        // Crude check: if any box is significantly moved or tilted
        let currentChaos = 0;
        boxStack.forEach(box => {
            const isTilted = Math.abs(box.angle) > 0.5;
            const isMovedHorizontally = Math.abs(box.position.x - BOX_STACK_INITIAL_X) > BOX_SIZE * 0.75; // Moved more than 3/4 its width
            if (isTilted || isMovedHorizontally) {
                currentChaos += 10;
            }
        });
        bouncyBallsArray.forEach(ball => {
            if (Math.abs(ball.velocity.x) > 1 || Math.abs(ball.velocity.y) > 1) {
                currentChaos += 5; // Add 5 for each moving ball
            }
        });
        chaosScore = Math.max(chaosScore, currentChaos); // Keep the max chaos achieved
        scoreDisplay.textContent = `Chaos Score: ${chaosScore}`;

        // Center camera on Vita
        Render.lookAt(render, vitaBody, CAMERA_PADDING, true);
    });
    }

    function handleStartGame() {
        clearMenu();
        isGameActive = true;
        chaosScore = 0; // Reset score

        // Create and append score display
        scoreDisplay = document.createElement('div');
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '10px';
        scoreDisplay.style.left = '10px';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.fontFamily = 'Arial, sans-serif';
        scoreDisplay.style.fontSize = '20px';
        gameContainer.appendChild(scoreDisplay);
        scoreDisplay.textContent = `Chaos Score: ${chaosScore}`;

        Runner.run(runner, engine); // Start the physics engine simulation

        console.log("Vita Chaos Started! Control Vita with A/D (or Left/Right Arrows) to move, W/Up Arrow/Space to jump.");
        console.log("Cause some chaos!");
    }

    function handleResumeGame() {
        clearMenu();
        isGameActive = true;
        Runner.start(runner, engine); // Resume the physics engine simulation
    }

    function handleRestartGame() {
        window.location.reload();
    }

    function handleQuitGame() {
        window.location.href = 'index.html'; // Assuming your main page is index.html
    }

    // Global key listener for pause
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'escape') {
            if (isGameActive) {
                showPauseMenu();
            } else if (menuContainer && menuContainer.textContent.includes('Paused')) {
                // If pause menu is already open, Esc can also resume
                handleResumeGame();
            }
        }
    });

    // --- Preload Assets and Initialize Game ---
    const vitaSprite = new Image();
    vitaSprite.onload = () => {
        console.log("Vita sprite loaded successfully!");
        // Now that the image is loaded, we can set up and start the game.
        setupGame(); // Sets up engine, renderer, objects, runner
        showStartMenu(); // Display the start menu initially
    };
    vitaSprite.onerror = () => {
        console.error(`Error loading Vita sprite from path: ${VITA_IMAGE_PATH}. Game cannot start correctly with sprite.`);
        // Optionally, you could fall back to a version of setupGame that doesn't use the sprite,
        // or just show an error message on the screen.
        // For now, we'll still try to set up, but Vita will likely be invisible or cause errors.
        // A better approach would be to prevent game start or use a placeholder.
        alert(`Failed to load critical game asset: ${VITA_IMAGE_PATH}. Vita may not be visible.`);
        setupGame(); // Attempt to setup anyway, or handle this more gracefully
        showStartMenu();
    };
    vitaSprite.src = VITA_IMAGE_PATH; // Start loading the image
});
