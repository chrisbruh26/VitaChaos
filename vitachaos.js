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
        Query = Matter.Query, // For specific world queries if needed beyond collisions
        Vector = Matter.Vector, // For vector operations
        Mouse = Matter.Mouse, // Explicitly alias Mouse
        Constraint = Matter.Constraint; // For grabbing objects

    // --- Game Configuration ---
    const GAME_WIDTH = 1500;
    const GAME_HEIGHT = 600;

    // Vita (Player) Configuration
    const VITA_START_X = 150;
    const VITA_START_Y_OFFSET = 90; // From bottom, center of Vita (Adjusted for new height)
    const VITA_WIDTH = 30; // Made smaller
    const VITA_HEIGHT = 53; // Made smaller (approx 75% of original, maintaining aspect ratio)
    const VITA_IMAGE_PATH = 'vitasprite.png'; // Ensure this image is in the same folder as your HTML
    const VITA_SPRITE_X_SCALE = 0.05;
    const VITA_SPRITE_Y_SCALE = 0.05;
    const VITA_FRICTION_AIR = 0.01;
    const VITA_DENSITY = 0.002;
    const VITA_RESTITUTION = 0.1;

    // Ground Configuration
    const GROUND_Y_OFFSET = 30;
    const GROUND_HEIGHT = 60;
    const GROUND_COLOR = '#6B8E23';

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
    const KICK_FORCE_MAGNITUDE = 0.5; // How strong Vita's kick/headbutt is. Adjust as needed.
    const KICK_RADIUS = 80; // How close an object needs to be to Vita to be affected by the kick (pixels).
    const KICK_ANIMATION_DURATION = 150; // Milliseconds the kick animation lasts
    const KICK_ANIMATION_OFFSET_MAGNITUDE = 0.60; // How far the sprite shifts (as a % of sprite size)

    let kickAnimationTimeout = null; // To manage the animation timeout

    // Player Grab/Throw Configuration
    const GRAB_RADIUS = 70; // How close an object needs to be to Vita to be grabbed.
    const THROW_FORCE_MAGNITUDE = 0.7; // How strong the throw is.
    const GRAB_POINT_OFFSET = { x: VITA_WIDTH / 2 + 15, y: -VITA_HEIGHT / 4 }; // Point in front of Vita to hold objects

    // Camera
    const CAMERA_PADDING = { x: 200, y: 200 }; // How far Vita is from the edge of the screen

    // Respawn Configuration
    const RESPAWN_Y_LIMIT = GAME_HEIGHT + 200; // If object.y > this, respawn
    const RESPAWN_X_BUFFER = 200; // If object.x < -RESPAWN_X_BUFFER or > GAME_WIDTH + RESPAWN_X_BUFFER, respawn
    // --- End Game Configuration ---

    // --- Global Game State Variables ---
    let engine, world, render, runner;
    let vitaBody, ground, ceiling, leftWall, rightWall, boxStack, bouncyBallsArray;
    let forceTrianglesArray; // New array for forcefield triangles
    let scoreDisplay, chaosScore = 0; // chaosScore is initialized here and reset in handleStartGame
    let isGameActive = false;
    let heldObject = null;
    let grabConstraint = null;
    let menuContainer = null;



    // --- Game Setup ---
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error("Fatal Error: Game container div not found!");
        return;
    }
    gameContainer.style.position = 'relative';

    // --- Player Input Handling (Persistent) ---
    const keysPressed = {};
    let isVitaOnGround = false;

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
        menuElement.style.zIndex = '100';
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
        if (runner) Runner.stop(runner);

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
        if (!isGameActive) return;
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

        ceiling = Bodies.rectangle(GAME_WIDTH / 2, CEILING_Y_OFFSET, GAME_WIDTH + WALL_THICKNESS * 2, CEILING_HEIGHT, { // Make it wider than game area
            isStatic: true, label: "Ceiling", render: { fillStyle: WALL_COLOR /* visible: false */ }
        });

        leftWall = Bodies.rectangle(-WALL_THICKNESS / 4, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
            isStatic: true, label: "WallLeft", render: { fillStyle: WALL_COLOR }
        });
        rightWall = Bodies.rectangle(GAME_WIDTH + WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT * 2, {
            isStatic: true, label: "WallRight", render: { fillStyle: WALL_COLOR }
        });

//GAME_WIDTH * 0.2 + i * (BOUNCY_BALL_RADIUS * 2.5);
//100 + (i % 2 === 0 ? 0 : BOUNCY_BALL_RADIUS * 1.5);
            
        // create a stack of frogs

        frogStack = [];
        const frogSize = FROG_SIZE;
        for (let i = 0; i < NUM_FROGS; i++) {
            const initialX = GAME_WIDTH * 0.2 + i * (FROG_SIZE * 10); // Offset from the box stack);
            const initialY = 100 + (i % 2 === 0 ? 0 : FROG_SIZE * 10);
            const frog = Bodies.rectangle(initialX, initialY, frogSize, frogSize, {
                label: `Frog-${i}`, friction: 0.1, restitution: 1.2, render: {
                sprite: {
                    texture: 'frog.png', // Path to your frog image
                    xScale: 0.1, // Scale the image down
                    yScale: 0.1
                }
            }
 
            });
            // Store initial properties for scoring
            frog.initialPosition = { x: initialX, y: initialY };
            frog.initialAngle = frog.angle; // Should be 0 initially
            frogStack.push(frog);
        }


        boxStack = [];
        const boxSize = BOX_SIZE;
        for (let i = 0; i < NUM_BOXES; i++) {
            const initialX = BOX_STACK_INITIAL_X;
            const initialY = GAME_HEIGHT - GROUND_HEIGHT - (VITA_HEIGHT / 2) - (i * (boxSize + 5));
            const box = Bodies.rectangle(initialX, initialY, boxSize, boxSize, {
                label: `Box-${i}`, friction: 0.1, restitution: 0.3, render: { fillStyle: `hsl(${i * 30}, 70%, 60%)` }
            });
            // Store initial properties for scoring
            box.initialPosition = { x: initialX, y: initialY };
            box.initialAngle = box.angle; // Should be 0 initially
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
            ball.initialPosition = { x: startX, y: startY }; // Store initial position for respawn
            ball.initialAngle = ball.angle;
            bouncyBallsArray.push(ball);
        }

        forceTrianglesArray = [];
        for (let i = 0; i < NUM_TRIANGLES; i++) {
            const triX = GAME_WIDTH * 0.3 + i * (TRIANGLE_RADIUS * 3);
            const triY = GAME_HEIGHT - GROUND_Y_OFFSET - TRIANGLE_RADIUS - 100; // Place them a bit above ground
            const triangle = Bodies.polygon(triX, triY, 3, TRIANGLE_RADIUS, {
                label: FORCE_TRIANGLE_LABEL,
                friction: 0.05,
                restitution: 0.1,
                render: { fillStyle: TRIANGLE_COLOR }
            });
            triangle.initialPosition = { x: triX, y: triY }; // Store initial position for respawn
            triangle.initialAngle = triangle.angle;
            forceTrianglesArray.push(triangle);
        }

        Composite.add(world, [vitaBody, ground, ceiling, leftWall, rightWall, ...boxStack, ...bouncyBallsArray, ...forceTrianglesArray, ...frogStack]);

        setupGameEventListeners();
        runner = Runner.create();
        addMouseClickListener(); // Add the listener for kicking
        Render.run(render);
    }

    function setupGameEventListeners() {
        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                let bodyA = pair.bodyA;
                let bodyB = pair.bodyB;

                // Check if Vita is one of the bodies in the collision
                if (bodyA.label === "Vita" || bodyB.label === "Vita") {
                    const vitaIsBodyA = bodyA.label === "Vita";
                    const otherBody = vitaIsBodyA ? bodyB : bodyA;

                    // Don't allow jumping off self (shouldn't happen) or if the other body is somehow Vita too
                    if (otherBody.label === "Vita") continue;

                    // Check collision normal to ensure Vita is on top of the other object.
                    // The collision normal.y points from bodyB towards bodyA.
                    // If Vita is bodyA and lands on bodyB, normal.y will be negative (e.g., -1 for flat).
                    // If Vita is bodyB and lands on bodyA, normal.y will be positive (e.g., +1 for flat).
                    const normalY = pair.collision.normal.y;
                    const onTopThreshold = 0.7; // How "flat" the surface needs to be considered on top

                    if ((vitaIsBodyA && normalY < -onTopThreshold) || (!vitaIsBodyA && normalY > onTopThreshold)) {
                        isVitaOnGround = true;
                        break; // Vita has landed on something, no need to check other pairs for this event
                    }
                }
            }
        });

        const moveForce = PLAYER_MOVE_FORCE_FACTOR * vitaBody.mass;
        const jumpForce = PLAYER_JUMP_FORCE_MULTIPLIER * vitaBody.mass;

        Events.on(engine, 'beforeUpdate', (event) => {
            if (!isGameActive) return;
            if (keysPressed['a'] || keysPressed['arrowleft']) {
                Body.applyForce(vitaBody, vitaBody.position, { x: -moveForce, y: 0 });
            }
            if (keysPressed['d'] || keysPressed['arrowright']) {
                Body.applyForce(vitaBody, vitaBody.position, { x: moveForce, y: 0 });
            }
            if ((keysPressed['w'] || keysPressed['arrowup'] || keysPressed[' ']) && isVitaOnGround) {
                Body.applyForce(vitaBody, vitaBody.position, { x: 0, y: -jumpForce });
                isVitaOnGround = false;
            }
        });

        Events.on(engine, 'afterUpdate', () => {
            if (!isGameActive) return;

            const SIGNIFICANT_DISPLACEMENT_THRESHOLD = BOX_SIZE * 0.3;
            const SIGNIFICANT_ANGLE_CHANGE_RADIANS = 0.2;
            const BALL_VELOCITY_SCORE_THRESHOLD = 2.5;

            let currentChaos = 0;
            boxStack.forEach(box => {
                const displacement = Vector.magnitude(Vector.sub(box.position, box.initialPosition));
                const angleChange = Math.abs(box.angle - box.initialAngle);

                if (displacement > SIGNIFICANT_DISPLACEMENT_THRESHOLD || angleChange > SIGNIFICANT_ANGLE_CHANGE_RADIANS) {
                    currentChaos += 10;
                }
            });
            bouncyBallsArray.forEach(ball => {
                const speed = Vector.magnitude(ball.velocity);
            
            if (speed > BALL_VELOCITY_SCORE_THRESHOLD) { // Corrected: was chaosScore += 5
                currentChaos += 5;
            }
        });

        if (currentChaos > chaosScore) {
            chaosScore = currentChaos;}


            if (scoreDisplay) { // Ensure scoreDisplay exists before trying to update it
                 scoreDisplay.textContent = `Chaos Score: ${chaosScore}`;
            }

            // --- Out-of-Bounds Respawn Logic ---
            const allRespawnableObjects = [...boxStack, ...bouncyBallsArray, ...forceTrianglesArray];
            allRespawnableObjects.forEach(obj => {
                if (obj.position.y > RESPAWN_Y_LIMIT ||
                    obj.position.x < -RESPAWN_X_BUFFER ||
                    obj.position.x > GAME_WIDTH + RESPAWN_X_BUFFER) {

                    Body.setPosition(obj, { ...obj.initialPosition }); // Reset to initial position
                    Body.setVelocity(obj, { x: 0, y: 0 });             // Reset velocity
                    Body.setAngularVelocity(obj, 0);                   // Reset angular velocity
                    Body.setAngle(obj, obj.initialAngle || 0);         // Reset angle
                    if (obj === heldObject) { // If Vita was holding it, release it
                        toggleGrabReleaseObject(); // This will handle removing constraint etc.
                    }
                }
            });

            Render.lookAt(render, vitaBody, CAMERA_PADDING, true);
        });

        // Forcefield logic for triangles
        Events.on(engine, 'collisionActive', (event) => {
            if (!isGameActive) return;
            const pairs = event.pairs;

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                let triangleBody = null;
                let otherBody = null;

                if (pair.bodyA.label === FORCE_TRIANGLE_LABEL && pair.bodyB.label !== "Vita" && pair.bodyB.label !== FORCE_TRIANGLE_LABEL && !pair.bodyB.isStatic) {
                    triangleBody = pair.bodyA;
                    otherBody = pair.bodyB;
                } else if (pair.bodyB.label === FORCE_TRIANGLE_LABEL && pair.bodyA.label !== "Vita" && pair.bodyA.label !== FORCE_TRIANGLE_LABEL && !pair.bodyA.isStatic) {
                    triangleBody = pair.bodyB;
                    otherBody = pair.bodyA;
                }

                if (triangleBody && otherBody) {
                    const direction = Vector.sub(otherBody.position, triangleBody.position);
                    const normalizedDirection = Vector.normalise(direction); // Corrected spelling
                    const force = Vector.mult(normalizedDirection, FORCEFIELD_MAGNITUDE);
                    Body.applyForce(otherBody, otherBody.position, force);
                }
            }
        });
    }

    function addMouseClickListener() {
        if (!render || !render.canvas) {
            console.error("Render canvas not available to add mouse listener.");
            return;
        }

        render.canvas.addEventListener('mousedown', (event) => {
            if (!isGameActive || event.button !== 0) { // Only on left click (button 0) and when game is active
                return;
            }

            const mousePosition = render.mouse.position; // Mouse position relative to canvas

            // Calculate direction from Vita to the mouse click
            let kickDirection = Vector.sub(mousePosition, vitaBody.position);

            if (Vector.magnitudeSquared(kickDirection) === 0) { // Avoid division by zero if mouse is exactly on Vita
                // Default kick direction (e.g., slightly to the right, or based on Vita's velocity if implemented)
                // For now, let's just make it a small horizontal push if direction is zero.
                kickDirection = { x: 1, y: 0 };
            }
            kickDirection = Vector.normalise(kickDirection);

            // --- Kick Animation Start ---
            if (kickAnimationTimeout) {
                clearTimeout(kickAnimationTimeout); // Clear any existing animation timeout
            }
            // Store original offsets if not already default (though they should be)
            const originalXOffset = vitaBody.render.sprite.xOffset || 0;
            const originalYOffset = vitaBody.render.sprite.yOffset || 0;

            // Apply animation offset
            vitaBody.render.sprite.xOffset = originalXOffset + kickDirection.x * KICK_ANIMATION_OFFSET_MAGNITUDE;
            vitaBody.render.sprite.yOffset = originalYOffset + kickDirection.y * KICK_ANIMATION_OFFSET_MAGNITUDE;

            kickAnimationTimeout = setTimeout(() => {
                vitaBody.render.sprite.xOffset = originalXOffset; // Revert to original
                vitaBody.render.sprite.yOffset = originalYOffset; // Revert to original
                kickAnimationTimeout = null;
            }, KICK_ANIMATION_DURATION);
            // --- Kick Animation End ---

            const allDynamicBodies = [...boxStack, ...bouncyBallsArray, ...forceTrianglesArray];

            allDynamicBodies.forEach(objectBody => {
                if (objectBody === vitaBody || objectBody.isStatic) {
                    return; // Don't kick self or static objects
                }

                const distanceToVita = Vector.magnitude(Vector.sub(objectBody.position, vitaBody.position));

                if (distanceToVita < KICK_RADIUS) {
                    const forceVector = Vector.mult(kickDirection, KICK_FORCE_MAGNITUDE);
                    Body.applyForce(objectBody, objectBody.position, forceVector);
                }
            });
        });
    }

    function toggleGrabReleaseObject() {
        if (!isGameActive) return;

        if (heldObject) {
            // --- Release/Throw Object ---
            if (grabConstraint) {
                Composite.remove(world, grabConstraint);
                grabConstraint = null;
            }

            // Reset collision filter for the object and Vita
            if (heldObject.originalCollisionFilter) {
                Body.set(heldObject, 'collisionFilter', heldObject.originalCollisionFilter);
                delete heldObject.originalCollisionFilter;
            }
            if (vitaBody.originalCollisionFilterForGrab) {
                 Body.set(vitaBody, 'collisionFilter', vitaBody.originalCollisionFilterForGrab);
                 delete vitaBody.originalCollisionFilterForGrab;
            }


            // Throwing logic (similar to kick, towards mouse)
            const mousePosition = render.mouse.position;
            let throwDirection = Vector.sub(mousePosition, vitaBody.position);
            if (Vector.magnitudeSquared(throwDirection) === 0) {
                throwDirection = { x: 1, y: 0 }; // Default throw right
            }
            throwDirection = Vector.normalise(throwDirection);
            const throwForce = Vector.mult(throwDirection, THROW_FORCE_MAGNITUDE);
            
            // Add Vita's velocity to the throw for a more natural feel
            const combinedVelocityThrow = Vector.add(vitaBody.velocity, Vector.mult(throwDirection, THROW_FORCE_MAGNITUDE / heldObject.mass * 10)); // Adjust multiplier for desired effect
            // Body.setVelocity(heldObject, combinedVelocityThrow); // Option 1: Set velocity
            Body.applyForce(heldObject, heldObject.position, throwForce); // Option 2: Apply force

            heldObject = null;

        } else {
            // --- Grab Object ---
            const allDynamicBodies = [...boxStack, ...bouncyBallsArray, ...forceTrianglesArray];
            let closestObject = null;
            let minDistanceSq = GRAB_RADIUS * GRAB_RADIUS;

            allDynamicBodies.forEach(obj => {
                if (obj.isStatic) return;
                const distSq = Vector.magnitudeSquared(Vector.sub(obj.position, vitaBody.position));
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestObject = obj;
                }
            });

            if (closestObject) {
                heldObject = closestObject;

                // Store original collision filters and then modify
                heldObject.originalCollisionFilter = { ...heldObject.collisionFilter };
                vitaBody.originalCollisionFilterForGrab = { ...vitaBody.collisionFilter };

                const noCollideGroup = -1; // Objects in the same negative group don't collide
                Body.set(heldObject, 'collisionFilter', { ...heldObject.originalCollisionFilter, group: noCollideGroup });
                Body.set(vitaBody, 'collisionFilter', { ...vitaBody.originalCollisionFilterForGrab, group: noCollideGroup });

                grabConstraint = Constraint.create({
                    bodyA: vitaBody,
                    pointA: { ...GRAB_POINT_OFFSET }, // Use a copy
                    bodyB: heldObject,
                    pointB: { x: 0, y: 0 }, // Attach to center of held object
                    stiffness: 0.07, // Adjust for desired "carry" feel
                    damping: 0.1,
                    length: Vector.magnitude(GRAB_POINT_OFFSET) + (heldObject.circleRadius || Math.max(heldObject.bounds.max.x - heldObject.bounds.min.x, heldObject.bounds.max.y - heldObject.bounds.min.y) / 3) // Approximate length
                });
                Composite.add(world, grabConstraint);
            }
        }
    }

    function handleStartGame() {
        clearMenu();
        isGameActive = true;
        chaosScore = 0; // Reset score

        if (!scoreDisplay || !scoreDisplay.parentNode) { // Create score display if it doesn't exist or was removed
            scoreDisplay = document.createElement('div');
            scoreDisplay.style.position = 'absolute';
            scoreDisplay.style.top = '10px';
            scoreDisplay.style.left = '10px';
            scoreDisplay.style.color = 'white';
            scoreDisplay.style.fontFamily = 'Arial, sans-serif';
            scoreDisplay.style.fontSize = '20px';
            gameContainer.appendChild(scoreDisplay);
        }
        scoreDisplay.textContent = `Chaos Score: ${chaosScore}`;

        Runner.run(runner, engine);

        console.log("Vita Chaos Started! Control Vita with A/D (or Left/Right Arrows) to move, W/Up Arrow/Space to jump.");
        console.log("Cause some chaos!");
    }

    function handleResumeGame() {
        clearMenu();
        isGameActive = true;
        Runner.start(runner, engine);
    }

    function handleRestartGame() {
        window.location.reload();
    }

    function handleQuitGame() {
        window.location.href = 'index.html';
    }

    // Global key listener for pause
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        if (key === 'escape') {
            if (isGameActive) {
                showPauseMenu();
            } else if (menuContainer && menuContainer.textContent.includes('Paused')) {
                handleResumeGame();
            }
        } else if (key === 'e' && isGameActive) {
            toggleGrabReleaseObject();
        }
    });

    // --- Preload Assets and Initialize Game ---
    const vitaSprite = new Image();
    vitaSprite.onload = () => {
        console.log("Vita sprite loaded successfully!");
        setupGame();
        showStartMenu();
    };
    vitaSprite.onerror = () => {
        console.error(`Error loading Vita sprite from path: ${VITA_IMAGE_PATH}. Game cannot start correctly with sprite.`);
        alert(`Failed to load critical game asset: ${VITA_IMAGE_PATH}. Vita may not be visible.`);
        setupGame(); // Attempt to setup anyway, or handle this more gracefully
        showStartMenu();
    };
    vitaSprite.src = VITA_IMAGE_PATH;
    frogSprite.src = 'frog.png'; // Ensure this image is in the same folder as your HTML
});
