// /home/reginapinkdog/projects/Game_files/vitasworld/html/vitachaos_mobile_combined.js
console.log("Vita Chaos Mobile: Script loaded (vitachaos_mobile_combined.js)");

// Ensure gameAPI namespace exists
window.gameAPI = window.gameAPI || {};

(function(gameAPI) {
    // Matter.js aliases
    const Engine = Matter.Engine,
          Render = Matter.Render,
          Runner = Matter.Runner,
          Composite = Matter.Composite,
          Bodies = Matter.Bodies,
          Events = Matter.Events,
          Body = Matter.Body,
          Vector = Matter.Vector,
          Mouse = Matter.Mouse,
          Constraint = Matter.Constraint;

    // --- Game Configuration ---
    // Base dimensions for mobile - scaled down from desktop but still large for exploration
    const BASE_GAME_WIDTH = 10000; // Width of the game world
    const SINGLE_AREA_HEIGHT = 800; // Height of one vertical area
    const NUM_AREAS_VERTICAL = 3; // Number of vertical areas stacked
    const BASE_GAME_HEIGHT = SINGLE_AREA_HEIGHT * NUM_AREAS_VERTICAL; // Total height of the game world
    
    // Farming/Gardening Configuration removed for mobile version
    
    // Physics
    const GRAVITY_Y = 0.8; // Adjusted for mobile feel
    const BASE_MOVE_FORCE = 0.004; // Base movement force
    const PLAYER_MOVE_FORCE_FACTOR = 0.008; // Increased for better responsiveness on all devices
    const PLAYER_JUMP_FORCE_MULTIPLIER = 0.06; // Significantly increased for more noticeable jumps
    
    // Speed adjustment variables
    let speedMultiplier = 1.0; // Can be adjusted in-game
    const MIN_SPEED = 0.5;
    const MAX_SPEED = 2.0;
    
    // Foofoo powers toggle
    let foofoosPowersEnabled = true; // Default to enabled
    
    // Player Configuration
    const VITA_WIDTH = 30;
    const VITA_HEIGHT = 50;
    const VITA_FRICTION_AIR = 0.01;
    const VITA_DENSITY = 0.002;
    const VITA_RESTITUTION = 0.4;
    
    // Ground Configuration
    const GROUND_HEIGHT = 50;
    const GROUND_COLOR = '#006400'; // Dark Green
    const PLATFORM_COLOR = '#A0522D'; // Brown for platforms
    const PLATFORM_THICKNESS = GROUND_HEIGHT;
    
    // Walls
    const WALL_THICKNESS = 50;
    const WALL_COLOR = '#4A4A4A'; // Dark Grey
    
    // Other Objects - Reduced for less clutter
    const BOX_SIZE = 40; // Slightly smaller for mobile
    const NUM_BOXES = 6; // Reduced for less clutter
    const NUM_BALLS = 8; // Reduced for less clutter
    const BOUNCY_BALL_RADIUS = 10;
    const BOUNCY_BALL_RESTITUTION = 0.5;
    const BACKGROUND_COLOR = '#87CEEB';
        
    // Frog Configuration
    const FROG_SIZE = 40;
    const NUM_FROGS = 5; // Reduced for less clutter
    
    // Bouncy Platform Configuration
    const BOUNCY_PLATFORM_COLOR = '#FF69B4';
    const BOUNCY_PLATFORM_RESTITUTION = 0.4;
    
    // Foofoo Configuration
    const FOOFOO_SIZE = 40;
    const NUM_FOOFOOS = 2; // Reduced for less clutter
    const FOOFOO_POWER_RADIUS = 150; // Radius of Foofoo's physics-altering power
    const FOOFOO_POWER_COOLDOWN = 8000; // 8 seconds between power activations
    const FOOFOO_POWER_DURATION = 5000; // 5 seconds of altered physics
    const FOOFOO_POWER_TYPES = ['antigravity', 'superBounce', 'slowMotion', 'spinChaos']; // Different power types
    
    // Forcefield Triangle Configuration
    const NUM_TRIANGLES = 5; // Fewer triangles for performance
    const TRIANGLE_RADIUS = 10;
    const TRIANGLE_COLOR = '#FFD700'; // Gold
    const FORCEFIELD_MAGNITUDE = 0.2; // Slightly reduced for mobile
    const FORCE_TRIANGLE_LABEL = "ForceTriangle";
    
    // Player Kick/Headbutt Configuration
    const KICK_FORCE_MAGNITUDE = 0.4; // Slightly reduced for mobile
    const KICK_RADIUS = 70;
    const KICK_ANIMATION_DURATION = 150;
    
    // Player Grab/Throw Configuration
    const GRAB_RADIUS = 60; // Slightly reduced for mobile
    const THROW_FORCE_MAGNITUDE = 0.6; // Slightly reduced for mobile
    const GRAB_POINT_OFFSET = { x: VITA_WIDTH / 2 + 10, y: -VITA_HEIGHT / 4 };
    
    // Camera
    const CAMERA_PADDING = { x: 200, y: 200 };
    const CAMERA_ZOOM_FACTOR = 1.5; // Zoom factor to make objects appear larger (higher = more zoomed in)
    
    // Respawn Configuration
    const RESPAWN_Y_LIMIT = BASE_GAME_HEIGHT + 200;
    const RESPAWN_X_BUFFER = 200;
    
    // NPC Configuration - Enhanced for more purpose
    const NUM_NPCS = 8; // Increased number of NPCs for more interaction opportunities
    const NPC_WIDTH = 25;
    const NPC_HEIGHT = 45;
    const NPC_FRICTION = 0.05;
    const NPC_FRICTION_AIR = 0.02;
    const NPC_RESTITUTION = 0.3;
    const NPC_DENSITY = 0.002;
    const NPC_JUMP_FORCE = 0.03;
    const NPC_MOVE_FORCE = 0.0015;
    const NPC_FLEE_DISTANCE = 150; // Distance at which NPCs start to flee from player
    const NPC_INTERACTION_DISTANCE = 100; // Increased for easier interaction
    const NPC_TYPES = ['human', 'farmer', 'scientist', 'tourist', 'magician']; // Added new NPC type
    const NPC_COLORS = ['#FFC0CB', '#8B4513', '#4169E1', '#FF8C00', '#9932CC']; // Added purple for magician
    const NPC_DROP_COOLDOWN = 10000; // Reduced to 10 seconds between object drops
    const NPC_DROP_CHANCE = 0.5; // Increased to 50% chance to drop an object during interaction
    
    // --- End Game Configuration ---

    // --- Global Game State Variables ---
    let engine;
    let render;
    let runner;
    let canvas;
    let gameContainer;
    let world;
    
    let player;
    let ground, leftWall, rightWall, ceiling;
    let platform2; // Second floor platform
    let boxStack = [];
    let bouncyBallsArray = [];
    let frogStack = [];
    let foofooStack = [];
    let forceTrianglesArray = [];
    let bouncyPlatformObjects = [];
    let customStaticPlatformObjects = [];
    let npcArray = []; // Array to store NPCs
    
    // Liquify and Clean Mechanics
    let liquifiedParticlesArray = [];
    window.liquifiedParticlesArray = liquifiedParticlesArray; // Expose for potential editor interaction or debugging
    const LIQUIFY_RADIUS = 80; // How close Vita needs to be to liquify an object (slightly smaller for mobile)
    const PARTICLE_SIZE = 8;   // Size of each particle (slightly smaller for mobile)
    const MIN_PARTICLES_ON_LIQUIFY = 8; // Minimum particles to generate
    const CLEANUP_RADIUS = 120; // Radius around Vita to clean up particles
    
    // Liquifier and Cleaner Object Configuration
    const LIQUIFIER_OBJECT_SIZE = 5;
    const LIQUIFIER_OBJECT_COLOR = '#40E0D0'; // Turquoise
    const NUM_LIQUIFIERS = 2; // Default number
    const LIQUIFIER_OBJECT_LABEL_PREFIX = "Liquifier";
    
    const CLEANER_OBJECT_SIZE = 5;
    const CLEANER_OBJECT_COLOR = '#FA8072'; // Salmon
    const NUM_CLEANERS = 2; // Default number
    const CLEANER_OBJECT_LABEL_PREFIX = "Cleaner";
    
    let liquifierObjectsArray = [];
    let cleanerObjectsArray = [];
    
    // Farming/Gardening variables removed for mobile version
    
    let gameHasBeenInitialized = false;
    let chaosScore = 0;
    let scoreDisplay;
    let lastNpcInteractionTime = 0; // Track last NPC interaction time
    
    // Pause menu variables
    let isPaused = false;
    let pauseButton;
    let pauseMenu;
    let speedControlsInMenu;
    
    // Touch controls state
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;
    let touchAction = null; // 'move', 'jump', 'kick', 'grab'
    let heldObject = null;
    let grabConstraint = null;
    
    // Camera variables
    let cameraOffset = { x: 0, y: 0 };
    let targetCameraOffset = { x: 0, y: 0 };
    let cameraSmoothing = 0.1; // Lower = smoother camera

    // --- Helper Classes for Game Object Creation ---
    // Garden and Plant classes removed for mobile version
    
    class NPC {
        constructor(x, y, type, index) {
            // Determine NPC type and appearance
            const typeIndex = NPC_TYPES.indexOf(type);
            const npcType = typeIndex >= 0 ? type : NPC_TYPES[Math.floor(Math.random() * NPC_TYPES.length)];
            const colorIndex = typeIndex >= 0 ? typeIndex : Math.floor(Math.random() * NPC_COLORS.length);
            
            // Create the NPC body - make it static so it doesn't fall
            this.body = Bodies.rectangle(x, y, NPC_WIDTH, NPC_HEIGHT, {
                label: `NPC-${npcType}-${index}`,
                friction: NPC_FRICTION,
                frictionAir: NPC_FRICTION_AIR,
                restitution: NPC_RESTITUTION,
                density: NPC_DENSITY,
                isStatic: false, // true would make NPCs static so they don't fall, but I want them to topple
                render: {
                    fillStyle: NPC_COLORS[colorIndex],
                    strokeStyle: '#000000',
                    lineWidth: 2
                }
            });
            
            // Add visual enhancements to make NPCs more recognizable
            try {
                // Try to create a face for the NPC using DOM elements
                const npcFace = document.createElement('div');
                npcFace.style.position = 'absolute';
                npcFace.style.width = NPC_WIDTH + 'px';
                npcFace.style.height = NPC_HEIGHT + 'px';
                npcFace.style.pointerEvents = 'none';
                npcFace.style.zIndex = '50';
                npcFace.style.display = 'flex';
                npcFace.style.flexDirection = 'column';
                npcFace.style.justifyContent = 'center';
                npcFace.style.alignItems = 'center';
                
                // Add eyes and mouth
                npcFace.innerHTML = `
                    <div style="display:flex;width:100%;justify-content:space-around;margin-bottom:5px;">
                        <div style="width:5px;height:5px;background-color:black;border-radius:50%;"></div>
                        <div style="width:5px;height:5px;background-color:black;border-radius:50%;"></div>
                    </div>
                    <div style="width:10px;height:3px;background-color:black;border-radius:3px;"></div>
                `;
                
                // Add to game container
                if (gameContainer) {
                    gameContainer.appendChild(npcFace);
                    this.faceElement = npcFace;
                    
                    // Update position in the first frame
                    setTimeout(() => {
                        if (this.body && this.faceElement) {
                            const screenPos = worldToScreen(this.body.position);
                            this.faceElement.style.left = (screenPos.x - NPC_WIDTH/2) + 'px';
                            this.faceElement.style.top = (screenPos.y - NPC_HEIGHT/2) + 'px';
                        }
                    }, 100);
                }
            } catch (e) {
                console.error("Could not create NPC face element", e);
                this.faceElement = null;
            }
            
            // NPC properties
            this.type = npcType;
            this.state = 'idle'; // idle, walking, fleeing, interacting
            this.direction = Math.random() > 0.5 ? 1 : -1; // 1 for right, -1 for left
            this.lastStateChange = Date.now();
            this.lastJump = 0;
            this.lastInteraction = 0;
            this.speechBubble = null;
            this.interactionCooldown = 5000; // 5 seconds between interactions
            this.isRagdoll = false;
            this.ragdollTimeout = null;
            this.health = 100;
            
            // Create speech bubble element
            this.createSpeechBubble();
        }
        
        addToWorld(world) {
            Composite.add(world, this.body);
        }
        
        createSpeechBubble() {
            // Create speech bubble element
            this.speechBubble = document.createElement('div');
            this.speechBubble.style.position = 'absolute';
            this.speechBubble.style.backgroundColor = 'white';
            this.speechBubble.style.border = '2px solid black';
            this.speechBubble.style.borderRadius = '10px';
            this.speechBubble.style.padding = '8px';
            this.speechBubble.style.fontSize = '14px'; // Increased font size
            this.speechBubble.style.fontWeight = 'bold'; // Make text bold
            this.speechBubble.style.display = 'none';
            this.speechBubble.style.zIndex = '1000'; // Higher z-index to ensure visibility
            this.speechBubble.style.pointerEvents = 'none';
            this.speechBubble.style.maxWidth = '150px'; // Wider bubble
            this.speechBubble.style.textAlign = 'center';
            this.speechBubble.style.color = '#000000'; // Ensure text is black
            this.speechBubble.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)'; // Add shadow for better visibility
            
            // Add a small triangle at the bottom to point to the NPC
            const pointer = document.createElement('div');
            pointer.style.position = 'absolute';
            pointer.style.bottom = '-10px';
            pointer.style.left = '50%';
            pointer.style.marginLeft = '-10px';
            pointer.style.width = '0';
            pointer.style.height = '0';
            pointer.style.borderLeft = '10px solid transparent';
            pointer.style.borderRight = '10px solid transparent';
            pointer.style.borderTop = '10px solid white';
            this.speechBubble.appendChild(pointer);
            
            // Add to game container
            if (gameContainer) {
                gameContainer.appendChild(this.speechBubble);
                console.log("Speech bubble created and added to game container");
            } else {
                console.error("Game container not found when creating speech bubble");
            }
        }
        
        updateSpeechBubble() {
            if (!this.speechBubble || !this.body) return;
            
            // Position speech bubble above NPC
            const screenPos = worldToScreen(this.body.position);
            this.speechBubble.style.left = (screenPos.x - 75) + 'px'; // Center better
            this.speechBubble.style.top = (screenPos.y - NPC_HEIGHT - 60) + 'px'; // Higher above NPC
        }
        
        speak(message, duration = 4000) { // Longer duration
            if (!this.speechBubble) {
                console.error("Speech bubble not found when trying to speak");
                return;
            }
            
            console.log(`NPC ${this.type} speaking: "${message}"`);
            
            // Set message and show speech bubble
            this.speechBubble.innerHTML = message + '<div style="position:absolute;bottom:-10px;left:50%;margin-left:-10px;width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:10px solid white;"></div>';
            this.speechBubble.style.display = 'block';
            this.speechBubble.style.opacity = '1';
            
            // Update position
            this.updateSpeechBubble();
            
            // Hide after duration
            setTimeout(() => {
                if (this.speechBubble) {
                    // Fade out
                    this.speechBubble.style.transition = 'opacity 0.5s';
                    this.speechBubble.style.opacity = '0';
                    
                    // Hide after fade
                    setTimeout(() => {
                        if (this.speechBubble) {
                            this.speechBubble.style.display = 'none';
                            this.speechBubble.style.transition = '';
                        }
                    }, 500);
                }
            }, duration);
        }
        
        update() {
            if (!this.body || !player) return;
            
            // Update speech bubble position
            this.updateSpeechBubble();
            
            // Update face element position
            if (this.faceElement) {
                const screenPos = worldToScreen(this.body.position);
                this.faceElement.style.left = (screenPos.x - NPC_WIDTH/2) + 'px';
                this.faceElement.style.top = (screenPos.y - NPC_HEIGHT/2) + 'px';
                
                // Update rotation to match body
                this.faceElement.style.transform = `rotate(${this.body.angle}rad)`;
            }
            
            // If in ragdoll state, don't update behavior
            if (this.isRagdoll) return;
            
            // Calculate distance to player
            const distToPlayer = Vector.magnitude(Vector.sub(this.body.position, player.position));
            
            // Determine state based on distance to player and time
            const now = Date.now();
            
            // Occasionally speak when player is nearby but not too close
            if (distToPlayer < NPC_INTERACTION_DISTANCE * 2 && 
                distToPlayer > NPC_FLEE_DISTANCE && 
                now - this.lastInteraction > this.interactionCooldown && 
                Math.random() < 0.01) {
                
                // Speak with a random message based on NPC type
                this.interact();
            }
            
            // State transitions
            if (distToPlayer < NPC_FLEE_DISTANCE) {
                // Close to player - flee
                this.state = 'fleeing';
                this.lastStateChange = now;
                
                // Higher chance to speak when fleeing
                if (now - this.lastInteraction > this.interactionCooldown / 2 && Math.random() < 0.03) {
                    const screams = [
                        "AAAHH!",
                        "Help!",
                        "Run away!",
                        "Oh no!",
                        "Not again!"
                    ];
                    this.speak(screams[Math.floor(Math.random() * screams.length)]);
                    this.lastInteraction = now;
                }
            } else if (now - this.lastStateChange > 5000) {
                // Random state change every 5 seconds
                const rand = Math.random();
                if (rand < 0.6) {
                    this.state = 'idle';
                } else {
                    this.state = 'walking';
                    this.direction = Math.random() > 0.5 ? 1 : -1;
                }
                this.lastStateChange = now;
            }
            
            // Execute behavior based on state
            switch (this.state) {
                case 'idle':
                    // Do nothing, just stand
                    break;
                    
                case 'walking':
                    // Move by directly changing position
                    const walkSpeed = 1.5 * this.direction;
                    Body.setPosition(this.body, {
                        x: this.body.position.x + walkSpeed,
                        y: this.body.position.y
                    });
                    
                    // Check if NPC is near a wall or edge and change direction
                    if (this.body.position.x < WALL_THICKNESS + NPC_WIDTH || 
                        this.body.position.x > BASE_GAME_WIDTH - WALL_THICKNESS - NPC_WIDTH) {
                        this.direction *= -1; // Reverse direction
                    }
                    break;
                    
                case 'fleeing':
                    // Determine direction away from player
                    const fleeDir = Vector.normalise(Vector.sub(this.body.position, player.position));
                    const fleeSpeed = 3; // Faster movement when fleeing
                    
                    // Move by directly changing position
                    Body.setPosition(this.body, {
                        x: this.body.position.x + fleeDir.x * fleeSpeed,
                        y: this.body.position.y
                    });
                    
                    // Check if NPC is near a wall and stop fleeing
                    if (this.body.position.x < WALL_THICKNESS + NPC_WIDTH || 
                        this.body.position.x > BASE_GAME_WIDTH - WALL_THICKNESS - NPC_WIDTH) {
                        this.state = 'idle';
                        this.lastStateChange = now;
                    }
                    
                    // Occasionally scream when fleeing
                    if (Math.random() < 0.02 && now - this.lastInteraction > this.interactionCooldown) {
                        const screams = [
                            "AAAHH!",
                            "Help!",
                            "Run away!",
                            "Oh no!",
                            "Not again!"
                        ];
                        this.speak(screams[Math.floor(Math.random() * screams.length)]);
                        this.lastInteraction = now;
                    }
                    break;
            }
            
            // Check if NPC is stuck and needs to change direction
            if (Math.abs(this.body.velocity.x) < 0.1 && this.state === 'walking') {
                this.direction *= -1; // Reverse direction
            }
            
            // Limit velocity for better control
            const maxVelocity = 3;
            if (Math.abs(this.body.velocity.x) > maxVelocity) {
                Body.setVelocity(this.body, {
                    x: Math.sign(this.body.velocity.x) * maxVelocity,
                    y: this.body.velocity.y
                });
            }
        }
        
        interact() {
            const now = Date.now();
            if (now - this.lastInteraction < this.interactionCooldown) return;
            
            // Different interactions based on NPC type
            let messages = [];
            switch (this.type) {
                case 'human':
                    messages = [
                        "Hey! Watch it!",
                        "What are you doing?",
                        "Leave me alone!",
                        "Help! I'm being chased!",
                        "This is madness!",
                        "I can help you create chaos!",
                        "Need something to play with?"
                    ];
                    break;
                case 'farmer':
                    messages = [
                        "Get off my land!",
                        "My crops!",
                        "Darn kids these days...",
                        "Stop that ruckus!",
                        "You're worse than those goats!",
                        "Take this crate, it might be useful!",
                        "I've got some supplies for you."
                    ];
                    break;
                case 'scientist':
                    messages = [
                        "Fascinating specimen!",
                        "This defies physics!",
                        "I must document this!",
                        "For science!",
                        "My research is ruined!",
                        "I've developed a new tool for you to test.",
                        "This device will help with your experiments."
                    ];
                    break;
                case 'tourist':
                    messages = [
                        "This wasn't in the brochure!",
                        "I should've gone to Hawaii...",
                        "Can I take a selfie with you?",
                        "Is this part of the tour?",
                        "Five stars, very exciting!",
                        "I found this strange souvenir for you!",
                        "Look what I bought at the gift shop!"
                    ];
                    break;
                case 'magician':
                    messages = [
                        "Abracadabra!",
                        "Watch closely as I make something appear!",
                        "Magic is just science we don't understand yet.",
                        "For my next trick, I'll need a volunteer!",
                        "The magic is in your hands now!",
                        "This magical item will bring chaos and wonder!",
                        "Every great magician needs special props."
                    ];
                    break;
                default:
                    messages = [
                        "Hello there!",
                        "What's happening?",
                        "Oh my!",
                        "This is crazy!",
                        "I didn't sign up for this!",
                        "I might have something for you.",
                        "Let me help you on your adventure."
                    ];
            }
            
            // Say a random message
            this.speak(messages[Math.floor(Math.random() * messages.length)]);
            this.lastInteraction = now;
            
            // Increased chance to drop an object
            if (Math.random() < NPC_DROP_CHANCE) {
                this.dropObject();
                
                // Give player feedback about the interaction
                showTemporaryMessage(`${this.type.charAt(0).toUpperCase() + this.type.slice(1)} gave you something!`, 2000);
            } else {
                // Even if no object is dropped, give some feedback
                showTemporaryMessage(`You interacted with a ${this.type}`, 1500);
            }
            
            // Add chaos score - increased for more reward
            updateChaosScore(15);
        }
        
        dropObject() {
            // Create a position slightly offset from the NPC
            const dropX = this.body.position.x + (Math.random() * 40 - 20);
            const dropY = this.body.position.y + 30; // Drop below the NPC
            
            // Different NPCs drop different types of objects
            let objectCreated = false;
            
            switch (this.type) {
                case 'human':
                    // Humans drop bouncy balls
                    if (bouncyBallsArray.length < 30) { // Limit total number of balls
                        try {
                            const ball = Bodies.circle(
                                dropX, 
                                dropY, 
                                BOUNCY_BALL_RADIUS, 
                                {
                                    label: `BouncyBall-${Date.now()}`,
                                    restitution: BOUNCY_BALL_RESTITUTION,
                                    friction: 0.01,
                                    frictionAir: 0.01,
                                    render: { fillStyle: getRandomColor() }
                                }
                            );
                            
                            Composite.add(world, ball);
                            bouncyBallsArray.push(ball);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("Here, catch this ball!");
                        } catch (e) {
                            console.error("Error creating bouncy ball:", e);
                        }
                    }
                    break;
                    
                case 'farmer':
                    // Farmers drop boxes (like crates)
                    if (boxStack.length < 25) { // Limit total number of boxes
                        try {
                            const box = Bodies.rectangle(
                                dropX, 
                                dropY, 
                                BOX_SIZE, 
                                BOX_SIZE, 
                                {
                                    label: `Box-${Date.now()}`,
                                    restitution: 0.2,
                                    friction: 0.1,
                                    render: { fillStyle: '#8B4513' } // Brown for crates
                                }
                            );
                            
                            Composite.add(world, box);
                            boxStack.push(box);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("Take this crate, it might be useful!");
                        } catch (e) {
                            console.error("Error creating box:", e);
                        }
                    }
                    break;
                    
                case 'scientist':
                    // Scientists drop special objects - liquifiers or cleaners
                    if (Math.random() < 0.5 && liquifierObjectsArray.length < 5) {
                        try {
                            const liquifier = Bodies.rectangle(
                                dropX, 
                                dropY, 
                                LIQUIFIER_OBJECT_SIZE, 
                                LIQUIFIER_OBJECT_SIZE, 
                                {
                                    label: `${LIQUIFIER_OBJECT_LABEL_PREFIX}-${Date.now()}`,
                                    restitution: 0.3,
                                    friction: 0.1,
                                    render: { fillStyle: LIQUIFIER_OBJECT_COLOR }
                                }
                            );
                            
                            Composite.add(world, liquifier);
                            liquifierObjectsArray.push(liquifier);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("I've developed this liquifier. Use it wisely!");
                        } catch (e) {
                            console.error("Error creating liquifier:", e);
                        }
                    } else if (cleanerObjectsArray.length < 5) {
                        try {
                            const cleaner = Bodies.rectangle(
                                dropX, 
                                dropY, 
                                CLEANER_OBJECT_SIZE, 
                                CLEANER_OBJECT_SIZE, 
                                {
                                    label: `${CLEANER_OBJECT_LABEL_PREFIX}-${Date.now()}`,
                                    restitution: 0.3,
                                    friction: 0.1,
                                    render: { fillStyle: CLEANER_OBJECT_COLOR }
                                }
                            );
                            
                            Composite.add(world, cleaner);
                            cleanerObjectsArray.push(cleaner);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("This cleaner should help with the mess!");
                        } catch (e) {
                            console.error("Error creating cleaner:", e);
                        }
                    }
                    break;
                    
                case 'tourist':
                    // Tourists drop force triangles
                    if (forceTrianglesArray.length < 10) { // Limit total number of triangles
                        try {
                            const triangle = new ForceTriangle(
                                dropX, 
                                dropY, 
                                TRIANGLE_RADIUS, 
                                `${FORCE_TRIANGLE_LABEL}-${Date.now()}`, 
                                false, // Not static
                                TRIANGLE_COLOR
                            );
                            
                            triangle.addToWorld(world);
                            forceTrianglesArray.push(triangle);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("I found this strange triangle souvenir!");
                        } catch (e) {
                            console.error("Error creating force triangle:", e);
                        }
                    }
                    break;
                    
                case 'magician':
                    // Magicians can drop special objects - foofoos or random surprise
                    if (Math.random() < 0.6 && foofooStack.length < 5) {
                        try {
                            // Create a Foofoo (special physics-altering creature)
                            const foofoo = new Foofoo(dropX, dropY, FOOFOO_SIZE, `Foofoo-${Date.now()}`);
                            foofoo.addToWorld(world);
                            foofooStack.push(foofoo);
                            objectCreated = true;
                            
                            // Announce the drop
                            this.speak("This magical Foofoo will alter reality around you!");
                        } catch (e) {
                            console.error("Error creating foofoo:", e);
                        }
                    } else {
                        // Create a random special object
                        const randomChoice = Math.random();
                        
                        if (randomChoice < 0.33) {
                            // Create a super bouncy ball
                            try {
                                const superBall = Bodies.circle(
                                    dropX, 
                                    dropY, 
                                    BOUNCY_BALL_RADIUS * 1.5, 
                                    {
                                        label: `SuperBall-${Date.now()}`,
                                        restitution: 0.9, // Super bouncy
                                        friction: 0.01,
                                        frictionAir: 0.001,
                                        render: { 
                                            fillStyle: '#FF00FF', // Magenta
                                            lineWidth: 2,
                                            strokeStyle: '#FFFFFF'
                                        }
                                    }
                                );
                                
                                Composite.add(world, superBall);
                                bouncyBallsArray.push(superBall);
                                objectCreated = true;
                                
                                // Announce the drop
                                this.speak("This magical ball has extraordinary bounce!");
                            } catch (e) {
                                console.error("Error creating super ball:", e);
                            }
                        } else {
                            // Create a force triangle with enhanced power
                            try {
                                const magicTriangle = new ForceTriangle(
                                    dropX, 
                                    dropY, 
                                    TRIANGLE_RADIUS * 1.2, 
                                    `${FORCE_TRIANGLE_LABEL}-Magic-${Date.now()}`, 
                                    false, // Not static
                                    '#FF00FF' // Magenta
                                );
                                
                                // Enhance the force magnitude for this special triangle
                                magicTriangle.forceMagnitude = FORCEFIELD_MAGNITUDE * 1.5;
                                
                                magicTriangle.addToWorld(world);
                                forceTrianglesArray.push(magicTriangle);
                                objectCreated = true;
                                
                                // Announce the drop
                                this.speak("This enchanted triangle contains powerful forces!");
                            } catch (e) {
                                console.error("Error creating magic triangle:", e);
                            }
                        }
                    }
                    break;
            }
            
            // If no object was created, give a generic message
            if (!objectCreated) {
                this.speak("I wish I had something to give you...");
            } else {
                // Increase chaos score when an object is dropped
                updateChaosScore(15); // Increased reward
            }
        }
        
        enterRagdollState(duration = 5000) {
            if (this.isRagdoll) return;
            
            this.isRagdoll = true;
            
            // Make NPC more bouncy and less friction
            this.body.restitution = 0.6;
            this.body.frictionAir = 0.01;
            
            // Allow rotation
            this.body.inertia = this.body.inertia / 10;
            
            // Scream with NPC-type specific ragdoll reactions
            let ragdollScreams = [];
            
            switch (this.type) {
                case 'human':
                    ragdollScreams = [
                        "WAAAAH!",
                        "OOOOF!",
                        "AIEEE!",
                        "NOOOOO!",
                        "WHY ME?!"
                    ];
                    break;
                case 'farmer':
                    ragdollScreams = [
                        "MY BACK!",
                        "MY CROPS!",
                        "DAGNABBIT!",
                        "HELP ME!",
                        "I'M FLYING!"
                    ];
                    break;
                case 'scientist':
                    ragdollScreams = [
                        "FASCINATING!",
                        "PHYSICS!",
                        "GRAVITY!",
                        "MY RESEARCH!",
                        "I CAN SEE MY LAB FROM HERE!"
                    ];
                    break;
                case 'tourist':
                    ragdollScreams = [
                        "MY CAMERA!",
                        "I WANT A REFUND!",
                        "THIS ISN'T IN THE BROCHURE!",
                        "WHEEEEE!",
                        "I'M POSTING THIS ONLINE!"
                    ];
                    break;
                default:
                    ragdollScreams = ["WAAAAH!", "OOOOF!", "AIEEE!", "NOOOOO!"];
            }
            
            this.speak(ragdollScreams[Math.floor(Math.random() * ragdollScreams.length)]);
            
            // Add chaos score
            updateChaosScore(25);
            
            // Reset after duration
            this.ragdollTimeout = setTimeout(() => {
                if (this.body) {
                    this.isRagdoll = false;
                    this.body.restitution = NPC_RESTITUTION;
                    this.body.frictionAir = NPC_FRICTION_AIR;
                    this.body.inertia = Infinity; // Prevent rotation
                    Body.setAngularVelocity(this.body, 0);
                    
                    // 50% chance to say something after recovering
                    if (Math.random() < 0.5) {
                        const recoveryMessages = [
                            "Ugh... what happened?",
                            "I'm calling my lawyer!",
                            "That hurt!",
                            "I need a doctor...",
                            "Not cool, dude!"
                        ];
                        
                        // Delay the recovery message slightly
                        setTimeout(() => {
                            this.speak(recoveryMessages[Math.floor(Math.random() * recoveryMessages.length)]);
                        }, 500);
                    }
                }
            }, duration);
        }
        
        takeDamage(amount) {
            this.health -= amount;
            
            // Visual feedback
            if (this.body && this.body.render) {
                const originalColor = this.body.render.fillStyle;
                this.body.render.fillStyle = '#FF0000'; // Red flash
                
                setTimeout(() => {
                    if (this.body && this.body.render) {
                        this.body.render.fillStyle = originalColor;
                    }
                }, 200);
            }
            
            // Enter ragdoll state
            this.enterRagdollState();
            
            return this.health <= 0;
        }
        
        cleanup() {
            // Remove speech bubble
            if (this.speechBubble && this.speechBubble.parentNode) {
                this.speechBubble.parentNode.removeChild(this.speechBubble);
            }
            
            // Remove face element
            if (this.faceElement && this.faceElement.parentNode) {
                this.faceElement.parentNode.removeChild(this.faceElement);
            }
            
            // Clear timeout
            if (this.ragdollTimeout) {
                clearTimeout(this.ragdollTimeout);
            }
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
                label: `Frog-${labelSuffix}`, 
                friction: 0.1, 
                restitution: 1.2, 
                render: { 
                    sprite: { 
                        texture: 'images/artwork/frog.png', 
                        xScale: 0.1, 
                        yScale: 0.1 
                    } 
                }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    class Foofoo {
        constructor(x, y, size, labelSuffix) {
            this.body = Bodies.rectangle(x, y, size, size, {
                label: `Foofoo-${labelSuffix}`, 
                friction: 0.1, 
                restitution: 0.5,
                render: { 
                    sprite: { 
                        texture: 'images/cats/foofoo.png', 
                        xScale: 0.05, 
                        yScale: 0.05 
                    } 
                }
            });
            
            // Foofoo special powers
            this.lastPowerUse = 0;
            this.currentPower = null;
            this.powerEndTime = 0;
            this.powerActive = false;
            this.powerType = null;
            this.powerParticles = [];
            this.powerVisualElement = null;
            
            // Create power visual element
            this.createPowerVisual();
        }
        
        addToWorld(world) { 
            Composite.add(world, this.body); 
        }
        
        createPowerVisual() {
            try {
                // Create a visual indicator for Foofoo's power
                this.powerVisualElement = document.createElement('div');
                this.powerVisualElement.style.position = 'absolute';
                this.powerVisualElement.style.borderRadius = '50%';
                this.powerVisualElement.style.pointerEvents = 'none';
                this.powerVisualElement.style.zIndex = '40';
                this.powerVisualElement.style.opacity = '0';
                this.powerVisualElement.style.transition = 'opacity 0.3s ease';
                this.powerVisualElement.style.boxShadow = '0 0 20px 10px rgba(255, 215, 0, 0.7)';
                
                // Add to game container
                if (gameContainer) {
                    gameContainer.appendChild(this.powerVisualElement);
                }
            } catch (e) {
                console.error("Could not create Foofoo power visual element", e);
                this.powerVisualElement = null;
            }
        }
        
        update() {
            const now = Date.now();
            
            // Update power visual position if it exists
            if (this.powerVisualElement && this.body) {
                const screenPos = worldToScreen(this.body.position);
                this.powerVisualElement.style.left = (screenPos.x - FOOFOO_POWER_RADIUS) + 'px';
                this.powerVisualElement.style.top = (screenPos.y - FOOFOO_POWER_RADIUS) + 'px';
                this.powerVisualElement.style.width = (FOOFOO_POWER_RADIUS * 2) + 'px';
                this.powerVisualElement.style.height = (FOOFOO_POWER_RADIUS * 2) + 'px';
            }
            
            // Only process powers if they're enabled
            if (foofoosPowersEnabled) {
                // Check if player is near Foofoo
                if (player && !this.powerActive && now - this.lastPowerUse > FOOFOO_POWER_COOLDOWN) {
                    const distToPlayer = Vector.magnitude(Vector.sub(this.body.position, player.position));
                    
                    // If player is close enough, activate a random power
                    if (distToPlayer < NPC_INTERACTION_DISTANCE) {
                        this.activatePower();
                    }
                }
                
                // Check if power should end
                if (this.powerActive && now > this.powerEndTime) {
                    this.deactivatePower();
                }
                
                // Apply active power effects
                if (this.powerActive) {
                    this.applyPowerEffects();
                }
            } else if (this.powerActive) {
                // If powers are disabled while one is active, deactivate it
                this.deactivatePower();
            }
        }
        
        activatePower() {
            // Select a random power type
            this.powerType = FOOFOO_POWER_TYPES[Math.floor(Math.random() * FOOFOO_POWER_TYPES.length)];
            this.powerActive = true;
            this.lastPowerUse = Date.now();
            this.powerEndTime = this.lastPowerUse + FOOFOO_POWER_DURATION;
            
            // Show power visual
            if (this.powerVisualElement) {
                // Set color based on power type
                let powerColor;
                switch (this.powerType) {
                    case 'antigravity': 
                        powerColor = 'rgba(64, 224, 208, 0.3)'; // Turquoise
                        break;
                    case 'superBounce': 
                        powerColor = 'rgba(255, 105, 180, 0.3)'; // Hot Pink
                        break;
                    case 'slowMotion': 
                        powerColor = 'rgba(138, 43, 226, 0.3)'; // Purple
                        break;
                    case 'spinChaos': 
                        powerColor = 'rgba(255, 165, 0, 0.3)'; // Orange
                        break;
                    default: 
                        powerColor = 'rgba(255, 215, 0, 0.3)'; // Gold
                }
                
                this.powerVisualElement.style.backgroundColor = powerColor;
                this.powerVisualElement.style.opacity = '1';
            }
            
            // Apply initial power effects
            this.initializePowerEffects();
            
            // Announce power activation
            this.announcePower();
        }
        
        deactivatePower() {
            this.powerActive = false;
            
            // Hide power visual
            if (this.powerVisualElement) {
                this.powerVisualElement.style.opacity = '0';
            }
            
            // Reset physics to normal
            this.resetPhysics();
            
            // Clear power type
            this.powerType = null;
        }
        
        initializePowerEffects() {
            // Apply initial effects based on power type
            switch (this.powerType) {
                case 'antigravity':
                    // Reverse gravity
                    engine.world.gravity.y = -GRAVITY_Y * 0.5;
                    break;
                    
                case 'superBounce':
                    // Make everything super bouncy
                    Composite.allBodies(world).forEach(body => {
                        if (!body.isStatic && body !== player) {
                            body.restitution = 0.9;
                        }
                    });
                    break;
                    
                case 'slowMotion':
                    // Slow down time
                    engine.timing.timeScale = 0.5;
                    break;
                    
                case 'spinChaos':
                    // No initial effect, will be applied in applyPowerEffects
                    break;
            }
        }
        
        applyPowerEffects() {
            // Apply ongoing effects based on power type
            const bodies = Composite.allBodies(world);
            
            bodies.forEach(body => {
                if (!body.isStatic && body !== player && body !== this.body) {
                    const distToFoofoo = Vector.magnitude(Vector.sub(this.body.position, body.position));
                    
                    if (distToFoofoo < FOOFOO_POWER_RADIUS) {
                        switch (this.powerType) {
                            case 'antigravity':
                                // Bodies float upward gently
                                Body.applyForce(body, body.position, { 
                                    x: 0, 
                                    y: -0.0005 * body.mass 
                                });
                                break;
                                
                            case 'superBounce':
                                // Ensure bodies remain bouncy
                                body.restitution = 0.9;
                                
                                // Add a small random force occasionally
                                if (Math.random() < 0.05) {
                                    Body.applyForce(body, body.position, { 
                                        x: (Math.random() - 0.5) * 0.001 * body.mass, 
                                        y: (Math.random() - 0.5) * 0.001 * body.mass 
                                    });
                                }
                                break;
                                
                            case 'slowMotion':
                                // Already handled by timeScale change
                                break;
                                
                            case 'spinChaos':
                                // Make objects spin
                                Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.05);
                                
                                // Add random forces
                                if (Math.random() < 0.1) {
                                    Body.applyForce(body, body.position, { 
                                        x: (Math.random() - 0.5) * 0.002 * body.mass, 
                                        y: (Math.random() - 0.5) * 0.002 * body.mass 
                                    });
                                }
                                break;
                        }
                    }
                }
            });
        }
        
        resetPhysics() {
            // Reset physics based on what was changed
            switch (this.powerType) {
                case 'antigravity':
                    // Reset gravity
                    engine.world.gravity.y = GRAVITY_Y;
                    break;
                    
                case 'superBounce':
                    // Reset restitution
                    Composite.allBodies(world).forEach(body => {
                        if (!body.isStatic && body !== player) {
                            // Reset to default values based on object type
                            if (body.label && body.label.startsWith('Box')) {
                                body.restitution = 0.2;
                            } else if (body.label && body.label.startsWith('BouncyBall')) {
                                body.restitution = BOUNCY_BALL_RESTITUTION;
                            } else if (body.label && body.label.startsWith('Frog')) {
                                body.restitution = 0.5;
                            } else if (body.label && body.label.startsWith('Foofoo')) {
                                body.restitution = 0.5;
                            } else {
                                body.restitution = 0.3;
                            }
                        }
                    });
                    break;
                    
                case 'slowMotion':
                    // Reset time scale
                    engine.timing.timeScale = 1.0;
                    break;
                    
                case 'spinChaos':
                    // No specific reset needed
                    break;
            }
        }
        
        announcePower() {
            // Create a temporary announcement element
            const announcement = document.createElement('div');
            announcement.style.position = 'absolute';
            announcement.style.top = '20%';
            announcement.style.left = '50%';
            announcement.style.transform = 'translate(-50%, -50%)';
            announcement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            announcement.style.color = '#FFD700'; // Gold
            announcement.style.padding = '15px 25px';
            announcement.style.borderRadius = '10px';
            announcement.style.fontSize = '24px';
            announcement.style.fontWeight = 'bold';
            announcement.style.zIndex = '1000';
            announcement.style.textAlign = 'center';
            announcement.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
            
            // Set message based on power type
            let message;
            switch (this.powerType) {
                case 'antigravity': 
                    message = "Foofoo Power: ANTI-GRAVITY!";
                    break;
                case 'superBounce': 
                    message = "Foofoo Power: SUPER BOUNCE!";
                    break;
                case 'slowMotion': 
                    message = "Foofoo Power: SLOW MOTION!";
                    break;
                case 'spinChaos': 
                    message = "Foofoo Power: SPIN CHAOS!";
                    break;
                default: 
                    message = "Foofoo Power Activated!";
            }
            
            announcement.textContent = message;
            
            // Add to game container
            if (gameContainer) {
                gameContainer.appendChild(announcement);
                
                // Animate in
                announcement.style.opacity = '0';
                announcement.style.transition = 'opacity 0.5s ease';
                
                setTimeout(() => {
                    announcement.style.opacity = '1';
                }, 10);
                
                // Remove after a few seconds
                setTimeout(() => {
                    announcement.style.opacity = '0';
                    setTimeout(() => {
                        if (announcement.parentNode) {
                            announcement.parentNode.removeChild(announcement);
                        }
                    }, 500);
                }, 3000);
            }
        }
    }

    class ForceTriangle {
        constructor(x, y, radius, label, isStatic = true, color = TRIANGLE_COLOR) {
            this.body = Bodies.polygon(x, y, 3, radius, {
                label: label, 
                isStatic: isStatic, 
                render: { 
                    fillStyle: color, 
                    strokeStyle: '#DAA520', 
                    lineWidth: 1 
                }
            });
        }
        addToWorld(world) { Composite.add(world, this.body); }
    }

    class EnvironmentBuilder {
        constructor(world) {
            this.world = world;
        }

        createFloors(gameWidth, gameHeight, singleAreaHeight) {
            // Create main ground
            ground = Bodies.rectangle(gameWidth / 2, gameHeight - (GROUND_HEIGHT / 2), gameWidth, GROUND_HEIGHT, {
                isStatic: true, 
                label: "Ground", 
                render: { fillStyle: GROUND_COLOR }
            });
            
            // Create second floor platform
            platform2 = Bodies.rectangle(gameWidth / 2, (gameHeight - singleAreaHeight) - (PLATFORM_THICKNESS / 2), gameWidth, PLATFORM_THICKNESS, {
                isStatic: true, 
                label: "Platform2", 
                render: { fillStyle: PLATFORM_COLOR }
            });
            
            Composite.add(this.world, [ground, platform2]);
            return { ground, platform2 };
        }

        createWalls(gameWidth, gameHeight) {
            leftWall = Bodies.rectangle(WALL_THICKNESS / 2, gameHeight / 2, WALL_THICKNESS, gameHeight * 2, {
                isStatic: true, 
                label: "leftwall", 
                render: { fillStyle: WALL_COLOR }
            });
            
            rightWall = Bodies.rectangle(gameWidth - WALL_THICKNESS / 2, gameHeight / 2, WALL_THICKNESS, gameHeight * 2, {
                isStatic: true, 
                label: "rightwall", 
                render: { fillStyle: WALL_COLOR }
            });
            
            Composite.add(this.world, [leftWall, rightWall]);
            return { leftWall, rightWall };
        }

        createCeiling(gameWidth) {
            ceiling = Bodies.rectangle(gameWidth / 2, WALL_THICKNESS / 2, gameWidth, WALL_THICKNESS, {
                isStatic: true, 
                label: "ceiling", 
                render: { fillStyle: WALL_COLOR }
            });
            
            Composite.add(this.world, ceiling);
            return ceiling;
        }

        createCustomPlatforms(platformsData = []) {
            const customPlatforms = [];
            platformsData.forEach(data => {
                const platform = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                    isStatic: true,
                    label: data.label || "CustomPlatform",
                    render: { fillStyle: data.color || '#555555' }
                });
                customPlatforms.push(platform);
            });
            
            if (customPlatforms.length > 0) {
                Composite.add(this.world, customPlatforms);
            }
            
            return customPlatforms;
        }

        createBouncyPlatforms(platformsData = []) {
            const bouncyPlatforms = [];
            platformsData.forEach(data => {
                const platform = Bodies.rectangle(data.x, data.y, data.width, data.height, {
                    isStatic: true,
                    label: data.label || "BouncyPlatform",
                    restitution: BOUNCY_PLATFORM_RESTITUTION,
                    render: { fillStyle: data.color || BOUNCY_PLATFORM_COLOR }
                });
                bouncyPlatforms.push(platform);
            });
            
            if (bouncyPlatforms.length > 0) {
                Composite.add(this.world, bouncyPlatforms);
            }
            
            return bouncyPlatforms;
        }
    }

    // --- Platform Definition Functions ---
    function getCustomPlatformDefinitions(currentWidth, currentHeight, singleAreaHeight) {
        const FLOOR_1_TOP_Y = currentHeight - GROUND_HEIGHT;
        const FLOOR_2_TOP_Y = (currentHeight - singleAreaHeight) - PLATFORM_THICKNESS;
        
        return [
            { x: currentWidth * 0.25, y: FLOOR_1_TOP_Y - 150, width: 200, height: 30, label: "CustomPlatformA", color: '#CC0000' },
            { x: currentWidth * 0.75, y: FLOOR_1_TOP_Y - 250, width: 150, height: 25, label: "CustomPlatformB", color: '#666666' },
            { x: currentWidth * 0.5,  y: FLOOR_2_TOP_Y - 200, width: 300, height: 30, label: "CustomPlatformC_Area2", color: '#888888' }
        ];
    }

    function getBouncyPlatformDefinitions(currentWidth, currentHeight) {
        return [
            { x: currentWidth * 0.7, y: currentHeight - (GROUND_HEIGHT * 1.2), width: 250, height: 40, label: "BouncyPlatform1" },
            { x: currentWidth * 0.3, y: currentHeight - (GROUND_HEIGHT * 2), width: 150, height: 40, label: "BouncyPlatform2" }
        ];
    }

    function initializeGameOnce() {
        console.log("Vita Chaos Mobile: initializeGameOnce() called.");
        gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            console.error('Vita Chaos Mobile: CRITICAL - Game container #game-container not found in the HTML.');
            return false;
        }
        
        // Apply touch-action to game container to prevent double-tap zoom
        gameContainer.style.touchAction = 'manipulation';
        
        console.log(`Vita Chaos Mobile: Game container found. Initial clientWidth: ${gameContainer.clientWidth}, clientHeight: ${gameContainer.clientHeight}`);

        // 1. Create Matter.js Engine
        engine = Engine.create();
        world = engine.world;
        engine.world.gravity.y = GRAVITY_Y;
        console.log("Vita Chaos Mobile: Matter.js Engine created.");

        // 2. Create Matter.js Renderer
        render = Render.create({
            element: gameContainer,
            engine: engine,
            options: {
                width: gameContainer.clientWidth || 300,
                height: gameContainer.clientHeight || 150,
                wireframes: false,
                background: BACKGROUND_COLOR,
                showAngleIndicator: false, // Disabled - was causing yellow lines
                showCollisions: false,     // Disabled - was causing yellow squares
                showVelocity: false,       // Disabled - was causing velocity vectors
                hasBounds: true           // Important for camera system
            }
        });
        canvas = render.canvas;
        console.log("Vita Chaos Mobile: Matter.js Renderer created. Canvas should be in game-container.");

        Render.run(render);
        console.log("Vita Chaos Mobile: Matter.js Renderer started.");

        // 3. Create Matter.js Runner
        runner = Runner.create();
        Runner.run(runner, engine);
        console.log("Vita Chaos Mobile: Matter.js Runner started.");

        // 4. Setup initial world state (static elements, player)
        setupStaticWorldElements();
        
        // 5. Setup touch controls
        setupTouchControls();
        
        // 6. Setup collision handling
        setupCollisionHandling();
        
        // 7. Create score display
        createScoreDisplay();
        
        // 8. Log the number of objects created
        const allBodies = Composite.allBodies(world);
        console.log(`Vita Chaos Mobile: Total bodies in world after initialization: ${allBodies.length}`);
        allBodies.forEach(body => {
            console.log(`Body: ${body.label}, Position: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`);
        });

        console.log("Vita Chaos Mobile: Game initialized successfully.");
        return true;
    }

    function setupStaticWorldElements() {
        if (!engine || !render) {
            console.warn("Vita Chaos Mobile: setupStaticWorldElements called before engine/render ready.");
            return;
        }
        console.log("Vita Chaos Mobile: setupStaticWorldElements() called.");

        // Get current dimensions from render
        const currentWidth = render.options.width;
        const currentHeight = render.options.height;

        console.log(`Vita Chaos Mobile: Setting up static world for dimensions: ${currentWidth}x${currentHeight}`);

        // Clear existing bodies if they exist
        clearExistingBodies();

        // Create environment builder
        const envBuilder = new EnvironmentBuilder(world);
        
        // Create floors (ground and platform2)
        envBuilder.createFloors(BASE_GAME_WIDTH, BASE_GAME_HEIGHT, SINGLE_AREA_HEIGHT);
        
        // Create walls
        envBuilder.createWalls(BASE_GAME_WIDTH, BASE_GAME_HEIGHT);
        
        // Create ceiling
        envBuilder.createCeiling(BASE_GAME_WIDTH);
        
        // Create custom platforms
        customStaticPlatformObjects = envBuilder.createCustomPlatforms(
            getCustomPlatformDefinitions(BASE_GAME_WIDTH, BASE_GAME_HEIGHT, SINGLE_AREA_HEIGHT)
        );
        
        // Create bouncy platforms
        bouncyPlatformObjects = envBuilder.createBouncyPlatforms(
            getBouncyPlatformDefinitions(BASE_GAME_WIDTH, BASE_GAME_HEIGHT)
        );

        // Create Player
        createPlayer();
        
        // Create game objects
        createGameObjects();
        
        // Set initial camera position to show player with zoom factor
        if (player) {
            // Calculate effective viewport size with zoom factor
            const effectiveWidth = render.options.width / CAMERA_ZOOM_FACTOR;
            const effectiveHeight = render.options.height / CAMERA_ZOOM_FACTOR;
            
            // Set initial camera position with zoom
            cameraOffset.x = Math.max(0, player.position.x - effectiveWidth / 2);
            cameraOffset.y = Math.max(0, player.position.y - effectiveHeight / 2);
            
            // Update render bounds with zoom factor
            render.bounds.min.x = cameraOffset.x;
            render.bounds.min.y = cameraOffset.y;
            render.bounds.max.x = cameraOffset.x + effectiveWidth;
            render.bounds.max.y = cameraOffset.y + effectiveHeight;
            
            console.log(`Vita Chaos Mobile: Initial camera position set to (${cameraOffset.x.toFixed(0)}, ${cameraOffset.y.toFixed(0)})`);
        }
        
        // Log all bodies in the world for verification
        const allBodies = Composite.allBodies(world);
        console.log(`Vita Chaos Mobile: Total bodies in world: ${allBodies.length}`);
        
        // Log the positions of key objects
        console.log(`Ground position: (${ground.position.x.toFixed(0)}, ${ground.position.y.toFixed(0)})`);
        console.log(`Platform2 position: (${platform2.position.x.toFixed(0)}, ${platform2.position.y.toFixed(0)})`);
        if (player) {
            console.log(`Player position: (${player.position.x.toFixed(0)}, ${player.position.y.toFixed(0)})`);
        }
    }
    
    function clearExistingBodies() {
        // Clear static bodies
        const staticBodies = [ground, leftWall, rightWall, ceiling, platform2].filter(b => b);
        if (staticBodies.length > 0) {
            Composite.remove(world, staticBodies);
            console.log("Vita Chaos Mobile: Removed old static bodies.");
        }
        
        // Clear custom platforms
        if (customStaticPlatformObjects.length > 0) {
            Composite.remove(world, customStaticPlatformObjects);
            customStaticPlatformObjects = [];
        }
        
        // Clear bouncy platforms
        if (bouncyPlatformObjects.length > 0) {
            Composite.remove(world, bouncyPlatformObjects);
            bouncyPlatformObjects = [];
        }
        
        // Clear player
        if (player && Composite.get(world, player.id, player.type)) {
            Composite.remove(world, player);
            player = null;
            console.log("Vita Chaos Mobile: Removed old player body for recreation.");
        }
        
        // Clear game objects
        clearGameObjects();
    }
    
    function clearGameObjects() {
        // Clear boxes
        if (boxStack.length > 0) {
            boxStack.forEach(box => {
                if (box.body && Composite.get(world, box.body.id, box.body.type)) {
                    Composite.remove(world, box.body);
                }
            });
            boxStack = [];
        }
        
        // Clear bouncy balls
        if (bouncyBallsArray.length > 0) {
            bouncyBallsArray.forEach(ball => {
                if (ball.body && Composite.get(world, ball.body.id, ball.body.type)) {
                    Composite.remove(world, ball.body);
                }
            });
            bouncyBallsArray = [];
        }
        
        // Clear frogs
        if (frogStack.length > 0) {
            frogStack.forEach(frog => {
                if (frog.body && Composite.get(world, frog.body.id, frog.body.type)) {
                    Composite.remove(world, frog.body);
                }
            });
            frogStack = [];
        }
        
        // Clear foofoos
        if (foofooStack.length > 0) {
            foofooStack.forEach(foofoo => {
                if (foofoo.body && Composite.get(world, foofoo.body.id, foofoo.body.type)) {
                    Composite.remove(world, foofoo.body);
                }
            });
            foofooStack = [];
        }
        
        // Clear force triangles
        if (forceTrianglesArray.length > 0) {
            forceTrianglesArray.forEach(triangle => {
                if (triangle.body && Composite.get(world, triangle.body.id, triangle.body.type)) {
                    Composite.remove(world, triangle.body);
                }
            });
            forceTrianglesArray = [];
        }
        
        // Clear NPCs
        if (npcArray.length > 0) {
            npcArray.forEach(npc => {
                if (npc.body && Composite.get(world, npc.body.id, npc.body.type)) {
                    Composite.remove(world, npc.body);
                }
                // Clean up NPC resources
                npc.cleanup();
            });
            npcArray = [];
        }
    }
    
    function createPlayer() {
        // Position player clearly within the view
        const playerX = BASE_GAME_WIDTH * 0.25;
        const playerY = BASE_GAME_HEIGHT * 0.75;
        
        // First try with sprite
        try {
            // Preload the image to check if it exists
            const img = new Image();
            img.src = 'images/vitaimages/vitasprite.png';
            
            console.log("Vita Chaos Mobile: Attempting to create player with sprite texture");
            
            player = Bodies.rectangle(playerX, playerY, VITA_WIDTH, VITA_HEIGHT, {
                label: 'player',
                restitution: VITA_RESTITUTION,
                friction: 0.05,
                frictionAir: VITA_FRICTION_AIR,
                density: VITA_DENSITY,
                render: {
                    sprite: {
                        texture: 'images/vitaimages/vitasprite.png',
                        xScale: 0.05,
                        yScale: 0.05
                    }
                }
            });
        } catch (e) {
            // Fallback to colored rectangle if sprite fails
            console.error("Vita Chaos Mobile: Error creating player with sprite, falling back to colored rectangle", e);
            
            player = Bodies.rectangle(playerX, playerY, VITA_WIDTH, VITA_HEIGHT, {
                label: 'player',
                restitution: VITA_RESTITUTION,
                friction: 0.05,
                frictionAir: VITA_FRICTION_AIR,
                density: VITA_DENSITY,
                render: {
                    fillStyle: '#FFD700', // Gold color
                    strokeStyle: '#000000',
                    lineWidth: 2
                }
            });
        }
        
        Composite.add(world, player);
        console.log(`Vita Chaos Mobile: Player created and added to world at (${playerX.toFixed(2)}, ${playerY.toFixed(2)}).`);
    }
    
    function createGameObjects() {
        console.log("Vita Chaos Mobile: Creating game objects...");
        
        // Create boxes
        for (let i = 0; i < NUM_BOXES; i++) {
            const x = BASE_GAME_WIDTH * 0.7 + (i % 3) * (BOX_SIZE + 5);
            const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - (Math.floor(i / 3) + 1) * (BOX_SIZE + 5);
            const box = new Box(x, y, BOX_SIZE, i, i);
            box.addToWorld(world);
            boxStack.push(box);
        }
        console.log(`Vita Chaos Mobile: Created ${boxStack.length} boxes`);
        
        // Create bouncy balls
        for (let i = 0; i < NUM_BALLS; i++) {
            const x = BASE_GAME_WIDTH * 0.4 + (Math.random() * BASE_GAME_WIDTH * 0.2);
            const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 100 - (Math.random() * 200);
            const ball = new BouncyBall(x, y, BOUNCY_BALL_RADIUS, i, i, NUM_BALLS);
            ball.addToWorld(world);
            bouncyBallsArray.push(ball);
        }
        console.log(`Vita Chaos Mobile: Created ${bouncyBallsArray.length} bouncy balls`);
        
        // Create frogs with fallback
        for (let i = 0; i < NUM_FROGS; i++) {
            try {
                const x = BASE_GAME_WIDTH * 0.3 + (Math.random() * BASE_GAME_WIDTH * 0.4);
                const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 150 - (Math.random() * 300);
                
                // Check if image exists
                const img = new Image();
                img.src = 'images/artwork/frog.png';
                
                const frog = new Frog(x, y, FROG_SIZE, i);
                frog.addToWorld(world);
                frogStack.push(frog);
            } catch (e) {
                console.error("Vita Chaos Mobile: Error creating frog with sprite, creating colored circle instead", e);
                
                const x = BASE_GAME_WIDTH * 0.3 + (Math.random() * BASE_GAME_WIDTH * 0.4);
                const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 150 - (Math.random() * 300);
                
                const frogBody = Bodies.circle(x, y, FROG_SIZE/2, {
                    label: `Frog-${i}`,
                    friction: 0.1,
                    restitution: 1.2,
                    render: { fillStyle: '#00FF00' } // Green color for frogs
                });
                
                Composite.add(world, frogBody);
                frogStack.push({ body: frogBody });
            }
        }
        console.log(`Vita Chaos Mobile: Created ${frogStack.length} frogs`);
        
        // Create foofoos with fallback
        for (let i = 0; i < NUM_FOOFOOS; i++) {
            try {
                const x = BASE_GAME_WIDTH * 0.5 + (Math.random() * BASE_GAME_WIDTH * 0.3);
                const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 200 - (Math.random() * 400);
                
                // Check if image exists
                const img = new Image();
                img.src = 'images/cats/foofoo.png';
                
                const foofoo = new Foofoo(x, y, FOOFOO_SIZE, i);
                foofoo.addToWorld(world);
                foofooStack.push(foofoo);
            } catch (e) {
                console.error("Vita Chaos Mobile: Error creating foofoo with sprite, creating colored rectangle instead", e);
                
                const x = BASE_GAME_WIDTH * 0.5 + (Math.random() * BASE_GAME_WIDTH * 0.3);
                const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 200 - (Math.random() * 400);
                
                const foofooBody = Bodies.rectangle(x, y, FOOFOO_SIZE, FOOFOO_SIZE, {
                    label: `Foofoo-${i}`,
                    friction: 0.1,
                    restitution: 0.5,
                    render: { fillStyle: '#FFA500' } // Orange color for foofoos
                });
                
                Composite.add(world, foofooBody);
                foofooStack.push({ body: foofooBody });
            }
        }
        console.log(`Vita Chaos Mobile: Created ${foofooStack.length} foofoos`);
        
        // Create force triangles
        for (let i = 0; i < NUM_TRIANGLES; i++) {
            const x = BASE_GAME_WIDTH * 0.2 + (Math.random() * BASE_GAME_WIDTH * 0.6);
            const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - 100 - (Math.random() * 500);
            const triangle = new ForceTriangle(x, y, TRIANGLE_RADIUS, `${FORCE_TRIANGLE_LABEL}-${i}`);
            triangle.addToWorld(world);
            forceTrianglesArray.push(triangle);
        }
        console.log(`Vita Chaos Mobile: Created ${forceTrianglesArray.length} force triangles`);
        
        // Create NPCs
        for (let i = 0; i < NUM_NPCS; i++) {
            // Distribute NPCs across the game world
            let x, y;
            
            // Place NPCs in different areas
            if (i < NUM_NPCS / 2) {
                // First half on ground level
                x = WALL_THICKNESS + 100 + (Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - 200));
                y = BASE_GAME_HEIGHT - GROUND_HEIGHT - NPC_HEIGHT;
            } else {
                // Second half on second floor
                x = WALL_THICKNESS + 100 + (Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - 200));
                y = (BASE_GAME_HEIGHT - SINGLE_AREA_HEIGHT) - PLATFORM_THICKNESS - NPC_HEIGHT;
            }
            
            // Randomly select NPC type
            const npcType = NPC_TYPES[Math.floor(Math.random() * NPC_TYPES.length)];
            
            // Create NPC
            const npc = new NPC(x, y, npcType, i);
            npc.addToWorld(world);
            npcArray.push(npc);
        }
        console.log(`Vita Chaos Mobile: Created ${npcArray.length} NPCs`);
        
        // Create liquifier objects
        for (let i = 0; i < NUM_LIQUIFIERS; i++) {
            const x = WALL_THICKNESS + 150 + (Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - 300));
            const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - LIQUIFIER_OBJECT_SIZE - (Math.random() * 400);
            
            const liquifier = Bodies.circle(x, y, LIQUIFIER_OBJECT_SIZE, {
                label: `${LIQUIFIER_OBJECT_LABEL_PREFIX}-${i}`,
                friction: 0.05,
                frictionAir: 0.02,
                restitution: 0.7,
                density: 0.001,
                render: { 
                    fillStyle: LIQUIFIER_OBJECT_COLOR,
                    strokeStyle: '#FFFFFF',
                    lineWidth: 2
                }
            });
            
            Composite.add(world, liquifier);
            liquifierObjectsArray.push(liquifier);
        }
        console.log(`Vita Chaos Mobile: Created ${liquifierObjectsArray.length} liquifier objects`);
        
        // Create cleaner objects
        for (let i = 0; i < NUM_CLEANERS; i++) {
            const x = WALL_THICKNESS + 150 + (Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - 300));
            const y = BASE_GAME_HEIGHT - GROUND_HEIGHT - CLEANER_OBJECT_SIZE - (Math.random() * 400);
            
            const cleaner = Bodies.circle(x, y, CLEANER_OBJECT_SIZE, {
                label: `${CLEANER_OBJECT_LABEL_PREFIX}-${i}`,
                friction: 0.05,
                frictionAir: 0.02,
                restitution: 0.7,
                density: 0.001,
                render: { 
                    fillStyle: CLEANER_OBJECT_COLOR,
                    strokeStyle: '#FFFFFF',
                    lineWidth: 2
                }
            });
            
            Composite.add(world, cleaner);
            cleanerObjectsArray.push(cleaner);
        }
        console.log(`Vita Chaos Mobile: Created ${cleanerObjectsArray.length} cleaner objects`);
        
        // Garden plots removed for mobile version
        console.log("Vita Chaos Mobile: Garden plots feature removed for mobile version");
        
        console.log("Vita Chaos Mobile: All game objects created successfully");
    }
    
    function setupTouchControls() {
        // Create touch control UI elements
        createTouchControlUI();
        
        // Add touch event listeners
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
    }
    
    function createTouchControlUI() {
        // Create a container for touch controls
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'touch-controls';
        controlsContainer.style.position = 'absolute';
        controlsContainer.style.bottom = '10px';
        controlsContainer.style.left = '10px';
        controlsContainer.style.right = '10px';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'space-between';
        
        // Left side controls (movement)
        const leftControls = document.createElement('div');
        leftControls.id = 'movement-pad';
        leftControls.style.width = '40%';
        leftControls.style.height = '80px';
        leftControls.style.borderRadius = '40px';
        leftControls.style.border = '2px solid rgba(255,255,255,0.3)';
        leftControls.style.backgroundColor = 'rgba(0,0,0,0.2)';
        leftControls.style.position = 'relative';
        leftControls.style.pointerEvents = 'auto'; // Make it interactive
        
        // Add movement indicator
        const moveIndicator = document.createElement('div');
        moveIndicator.id = 'move-indicator';
        moveIndicator.style.position = 'absolute';
        moveIndicator.style.width = '30px';
        moveIndicator.style.height = '30px';
        moveIndicator.style.borderRadius = '15px';
        moveIndicator.style.backgroundColor = 'rgba(255,255,255,0.5)';
        moveIndicator.style.top = '50%';
        moveIndicator.style.left = '50%';
        moveIndicator.style.transform = 'translate(-50%, -50%)';
        moveIndicator.style.display = 'none'; // Hidden by default
        
        leftControls.appendChild(moveIndicator);
        
        // Add movement pad event listeners
        leftControls.addEventListener('touchstart', handleMovementPadTouch);
        leftControls.addEventListener('touchmove', handleMovementPadTouch);
        leftControls.addEventListener('touchend', function() {
            moveIndicator.style.display = 'none';
        });
        
        // Right side controls (actions)
        const rightControls = document.createElement('div');
        rightControls.style.width = '40%';
        rightControls.style.display = 'flex';
        rightControls.style.justifyContent = 'space-around';
        rightControls.style.flexWrap = 'wrap'; // Allow buttons to wrap to multiple rows
        
        // Action buttons with functionality (gardening removed for mobile)
        const actions = [
            { name: 'Jump', color: '#4169E1', action: jumpPlayer },
            { name: 'Kick', color: '#FF6347', action: kickAction },
            { name: 'Grab', color: '#32CD32', action: grabAction },
            { name: 'Liquify', color: '#40E0D0', action: liquifyNearestObject },
            { name: 'Clean', color: '#FA8072', action: cleanupNearbyLooseItems }
        ];
        
        actions.forEach(actionObj => {
            const button = document.createElement('div');
            button.id = `${actionObj.name.toLowerCase()}-button`;
            button.style.width = '50px';
            button.style.height = '50px';
            button.style.borderRadius = '25px';
            button.style.border = '2px solid rgba(255,255,255,0.3)';
            button.style.backgroundColor = actionObj.color;
            button.style.display = 'flex';
            button.style.justifyContent = 'center';
            button.style.alignItems = 'center';
            button.style.color = 'white';
            button.style.fontSize = '10px';
            button.style.fontWeight = 'bold';
            button.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            button.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            button.style.pointerEvents = 'auto'; // Make it interactive
            button.style.margin = '5px'; // Add margin between buttons
            button.textContent = actionObj.name;
            
            // Add button press effect
            button.addEventListener('touchstart', function() {
                button.style.transform = 'scale(0.95)';
                button.style.boxShadow = '0 2px 3px rgba(0,0,0,0.3)';
                // Execute the action
                actionObj.action();
            });
            
            button.addEventListener('touchend', function() {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            });
            
            rightControls.appendChild(button);
        });
        
        controlsContainer.appendChild(leftControls);
        controlsContainer.appendChild(rightControls);
        
        gameContainer.appendChild(controlsContainer);
        
        // Create pause button and menu
        createPauseButton();
    }
    
    function handleMovementPadTouch(event) {
        event.preventDefault();
        
        const touch = event.touches[0];
        const pad = document.getElementById('movement-pad');
        const indicator = document.getElementById('move-indicator');
        
        if (!pad || !indicator) return;
        
        // Get pad dimensions and position
        const padRect = pad.getBoundingClientRect();
        const padCenterX = padRect.width / 2;
        
        // Calculate touch position relative to pad center
        const touchX = touch.clientX - padRect.left;
        
        // Show and position the indicator
        indicator.style.display = 'block';
        
        // Constrain indicator to pad width
        const maxOffset = padRect.width / 2 - 15; // 15 is half the indicator width
        const offsetX = Math.max(-maxOffset, Math.min(maxOffset, touchX - padCenterX));
        
        indicator.style.transform = `translate(${offsetX}px, -50%)`;
        indicator.style.left = '50%';
        
        // Determine movement direction and intensity
        if (offsetX > 5) {
            // Move right with intensity based on offset
            const intensity = Math.min(1, offsetX / maxOffset);
            movePlayerWithIntensity('right', intensity);
        } else if (offsetX < -5) {
            // Move left with intensity based on offset
            const intensity = Math.min(1, Math.abs(offsetX) / maxOffset);
            movePlayerWithIntensity('left', intensity);
        }
    }
    
    function createPauseButton() {
        // Create pause button
        pauseButton = document.createElement('button');
        pauseButton.id = 'pause-button';
        pauseButton.textContent = '⏸️';
        pauseButton.style.position = 'absolute';
        pauseButton.style.top = '15px';
        pauseButton.style.right = '15px';
        pauseButton.style.width = '60px';
        pauseButton.style.height = '60px';
        pauseButton.style.borderRadius = '30px';
        pauseButton.style.border = '2px solid white';
        pauseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        pauseButton.style.color = 'white';
        pauseButton.style.fontSize = '30px';
        pauseButton.style.fontWeight = 'bold';
        pauseButton.style.cursor = 'pointer';
        pauseButton.style.zIndex = '1000';
        pauseButton.style.pointerEvents = 'auto';
        pauseButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Add event listener
        pauseButton.addEventListener('click', function() {
            togglePauseMenu();
        });
        
        gameContainer.appendChild(pauseButton);
        
        // Create pause menu (initially hidden)
        createPauseMenu();
    }
    
    function createPauseMenu() {
        // Create pause menu container
        pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.style.position = 'absolute';
        pauseMenu.style.top = '50%';
        pauseMenu.style.left = '50%';
        pauseMenu.style.transform = 'translate(-50%, -50%)';
        pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        pauseMenu.style.padding = '20px';
        pauseMenu.style.borderRadius = '10px';
        pauseMenu.style.display = 'none';
        pauseMenu.style.flexDirection = 'column';
        pauseMenu.style.alignItems = 'center';
        pauseMenu.style.gap = '15px';
        pauseMenu.style.minWidth = '200px';
        pauseMenu.style.zIndex = '2000';
        pauseMenu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        pauseMenu.style.pointerEvents = 'auto';
        pauseMenu.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Pause menu title
        const menuTitle = document.createElement('h2');
        menuTitle.textContent = 'PAUSED';
        menuTitle.style.color = 'white';
        menuTitle.style.margin = '0 0 15px 0';
        menuTitle.style.fontFamily = 'Arial, sans-serif';
        
        // Create speed controls for the menu
        createSpeedControlsForMenu();
        
        // Create Foofoo powers toggle
        const foofooToggleContainer = createFoofooPowersToggle();
        
        // Resume button
        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume Game';
        resumeButton.style.width = '100%';
        resumeButton.style.padding = '10px';
        resumeButton.style.borderRadius = '5px';
        resumeButton.style.border = 'none';
        resumeButton.style.backgroundColor = '#32CD32'; // Lime Green
        resumeButton.style.color = 'white';
        resumeButton.style.fontSize = '16px';
        resumeButton.style.fontWeight = 'bold';
        resumeButton.style.cursor = 'pointer';
        resumeButton.style.marginBottom = '5px';
        resumeButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Restart button
        const restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Game';
        restartButton.style.width = '100%';
        restartButton.style.padding = '10px';
        restartButton.style.borderRadius = '5px';
        restartButton.style.border = 'none';
        restartButton.style.backgroundColor = '#FF6347'; // Tomato
        restartButton.style.color = 'white';
        restartButton.style.fontSize = '16px';
        restartButton.style.fontWeight = 'bold';
        restartButton.style.cursor = 'pointer';
        restartButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Reset Player button
        const resetPlayerButton = document.createElement('button');
        resetPlayerButton.textContent = 'Reset Vita';
        resetPlayerButton.style.width = '100%';
        resetPlayerButton.style.padding = '10px';
        resetPlayerButton.style.borderRadius = '5px';
        resetPlayerButton.style.border = 'none';
        resetPlayerButton.style.backgroundColor = '#4169E1'; // Royal Blue
        resetPlayerButton.style.color = 'white';
        resetPlayerButton.style.fontSize = '16px';
        resetPlayerButton.style.fontWeight = 'bold';
        resetPlayerButton.style.cursor = 'pointer';
        resetPlayerButton.style.marginTop = '5px';
        resetPlayerButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Add event listeners
        resumeButton.addEventListener('click', function() {
            togglePauseMenu();
        });
        
        restartButton.addEventListener('click', function() {
            togglePauseMenu();
            gameAPI.resetGame();
        });
        
        resetPlayerButton.addEventListener('click', function() {
            togglePauseMenu();
            resetPlayerPosition();
        });
        
        // Assemble the menu
        pauseMenu.appendChild(menuTitle);
        pauseMenu.appendChild(speedControlsInMenu);
        pauseMenu.appendChild(foofooToggleContainer);
        pauseMenu.appendChild(resumeButton);
        pauseMenu.appendChild(restartButton);
        pauseMenu.appendChild(resetPlayerButton);
        
        gameContainer.appendChild(pauseMenu);
    }
    
    function createFoofooPowersToggle() {
        // Create a container for the Foofoo powers toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.style.display = 'flex';
        toggleContainer.style.flexDirection = 'column';
        toggleContainer.style.alignItems = 'center';
        toggleContainer.style.width = '100%';
        toggleContainer.style.marginBottom = '15px';
        toggleContainer.style.padding = '10px';
        toggleContainer.style.backgroundColor = 'rgba(255, 165, 0, 0.2)'; // Light orange background
        toggleContainer.style.borderRadius = '8px';
        
        // Toggle label
        const toggleLabel = document.createElement('div');
        toggleLabel.style.color = 'white';
        toggleLabel.style.fontSize = '14px';
        toggleLabel.style.marginBottom = '10px';
        toggleLabel.style.fontWeight = 'bold';
        toggleLabel.textContent = 'Foofoo Powers';
        
        // Create toggle switch container
        const switchContainer = document.createElement('div');
        switchContainer.style.display = 'flex';
        switchContainer.style.alignItems = 'center';
        switchContainer.style.justifyContent = 'space-between';
        switchContainer.style.width = '100%';
        
        // Status text
        const statusText = document.createElement('span');
        statusText.style.color = foofoosPowersEnabled ? '#32CD32' : '#FF6347'; // Green if enabled, red if disabled
        statusText.style.fontSize = '14px';
        statusText.textContent = foofoosPowersEnabled ? 'Enabled' : 'Disabled';
        
        // Create the toggle button
        const toggleButton = document.createElement('button');
        toggleButton.style.width = '60px';
        toggleButton.style.height = '30px';
        toggleButton.style.borderRadius = '15px';
        toggleButton.style.border = 'none';
        toggleButton.style.position = 'relative';
        toggleButton.style.backgroundColor = foofoosPowersEnabled ? '#32CD32' : '#FF6347'; // Green if enabled, red if disabled
        toggleButton.style.transition = 'background-color 0.3s';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Create the toggle slider
        const toggleSlider = document.createElement('div');
        toggleSlider.style.width = '26px';
        toggleSlider.style.height = '26px';
        toggleSlider.style.borderRadius = '50%';
        toggleSlider.style.backgroundColor = 'white';
        toggleSlider.style.position = 'absolute';
        toggleSlider.style.top = '2px';
        toggleSlider.style.left = foofoosPowersEnabled ? '32px' : '2px'; // Right if enabled, left if disabled
        toggleSlider.style.transition = 'left 0.3s';
        toggleSlider.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        
        // Add the slider to the button
        toggleButton.appendChild(toggleSlider);
        
        // Add event listener to toggle button
        toggleButton.addEventListener('click', function() {
            // Toggle the state
            foofoosPowersEnabled = !foofoosPowersEnabled;
            
            // Update the UI
            toggleButton.style.backgroundColor = foofoosPowersEnabled ? '#32CD32' : '#FF6347';
            toggleSlider.style.left = foofoosPowersEnabled ? '32px' : '2px';
            statusText.style.color = foofoosPowersEnabled ? '#32CD32' : '#FF6347';
            statusText.textContent = foofoosPowersEnabled ? 'Enabled' : 'Disabled';
            
            // Log the change
            console.log(`Foofoo powers ${foofoosPowersEnabled ? 'enabled' : 'disabled'}`);
            
            // Show a notification to the player
            showTemporaryMessage(`Foofoo Powers ${foofoosPowersEnabled ? 'Enabled' : 'Disabled'}`, 2000);
        });
        
        // Assemble the toggle
        switchContainer.appendChild(statusText);
        switchContainer.appendChild(toggleButton);
        toggleContainer.appendChild(toggleLabel);
        toggleContainer.appendChild(switchContainer);
        
        return toggleContainer;
    }
    
    function createSpeedControlsForMenu() {
        // Create a container for speed controls
        speedControlsInMenu = document.createElement('div');
        speedControlsInMenu.id = 'speed-controls-menu';
        speedControlsInMenu.style.display = 'flex';
        speedControlsInMenu.style.flexDirection = 'column';
        speedControlsInMenu.style.alignItems = 'center';
        speedControlsInMenu.style.width = '100%';
        speedControlsInMenu.style.marginBottom = '10px';
        
        // Speed label
        const speedLabel = document.createElement('div');
        speedLabel.id = 'speed-label';
        speedLabel.style.color = 'white';
        speedLabel.style.fontSize = '14px';
        speedLabel.style.marginBottom = '10px';
        speedLabel.textContent = `Game Speed: ${speedMultiplier.toFixed(1)}x`;
        
        // Speed buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.width = '100%';
        buttonContainer.style.justifyContent = 'space-between';
        
        // Decrease speed button
        const decreaseButton = document.createElement('button');
        decreaseButton.textContent = '-';
        decreaseButton.style.width = '40px';
        decreaseButton.style.height = '40px';
        decreaseButton.style.borderRadius = '20px';
        decreaseButton.style.border = 'none';
        decreaseButton.style.backgroundColor = '#FF6347'; // Tomato
        decreaseButton.style.color = 'white';
        decreaseButton.style.fontSize = '20px';
        decreaseButton.style.fontWeight = 'bold';
        decreaseButton.style.cursor = 'pointer';
        decreaseButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Increase speed button
        const increaseButton = document.createElement('button');
        increaseButton.textContent = '+';
        increaseButton.style.width = '40px';
        increaseButton.style.height = '40px';
        increaseButton.style.borderRadius = '20px';
        increaseButton.style.border = 'none';
        increaseButton.style.backgroundColor = '#32CD32'; // Lime Green
        increaseButton.style.color = 'white';
        increaseButton.style.fontSize = '20px';
        increaseButton.style.fontWeight = 'bold';
        increaseButton.style.cursor = 'pointer';
        increaseButton.style.touchAction = 'manipulation'; // Prevent double-tap zoom
        
        // Add event listeners
        decreaseButton.addEventListener('click', function() {
            speedMultiplier = Math.max(MIN_SPEED, speedMultiplier - 0.1);
            speedLabel.textContent = `Game Speed: ${speedMultiplier.toFixed(1)}x`;
            console.log(`Speed decreased to ${speedMultiplier.toFixed(1)}x`);
        });
        
        increaseButton.addEventListener('click', function() {
            speedMultiplier = Math.min(MAX_SPEED, speedMultiplier + 0.1);
            speedLabel.textContent = `Game Speed: ${speedMultiplier.toFixed(1)}x`;
            console.log(`Speed increased to ${speedMultiplier.toFixed(1)}x`);
        });
        
        // Assemble the UI
        buttonContainer.appendChild(decreaseButton);
        buttonContainer.appendChild(increaseButton);
        
        speedControlsInMenu.appendChild(speedLabel);
        speedControlsInMenu.appendChild(buttonContainer);
    }
    
    function togglePauseMenu() {
        isPaused = !isPaused;
        
        if (isPaused) {
            // Show pause menu
            pauseMenu.style.display = 'flex';
            pauseButton.textContent = '▶️';
            
            // Pause the game engine
            Runner.stop(runner);
        } else {
            // Hide pause menu
            pauseMenu.style.display = 'none';
            pauseButton.textContent = '⏸️';
            
            // Resume the game engine
            Runner.start(runner, engine);
        }
        
        console.log(`Game ${isPaused ? 'paused' : 'resumed'}`);
    }
    
    // These functions are now primarily for canvas touches outside the UI controls
    function handleTouchStart(event) {
        event.preventDefault();
        
        // Check if the touch is on a control element
        if (isControlElement(event.target)) {
            return; // Let the control element handle it
        }
        
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isTouching = true;
        
        // For touches on the canvas (not on controls), we'll use the old behavior
        // Determine touch action based on position
        const containerRect = gameContainer.getBoundingClientRect();
        const relativeX = (touch.clientX - containerRect.left) / containerRect.width;
        
        if (relativeX < 0.5) {
            // Left side - movement
            touchAction = 'move';
        } else {
            // Right side - determine action based on Y position
            const relativeY = (touch.clientY - containerRect.top) / containerRect.height;
            
            if (relativeY < 0.33) {
                touchAction = 'jump';
                jumpPlayer();
            } else if (relativeY < 0.66) {
                touchAction = 'kick';
                kickAction();
            } else {
                touchAction = 'grab';
                grabAction();
            }
        }
    }
    
    function handleTouchMove(event) {
        if (!isTouching) return;
        event.preventDefault();
        
        // Check if the touch is on a control element
        if (isControlElement(event.target)) {
            return; // Let the control element handle it
        }
        
        const touch = event.touches[0];
        
        if (touchAction === 'move') {
            const deltaX = touch.clientX - touchStartX;
            movePlayer(deltaX > 0 ? 'right' : 'left');
        }
    }
    
    function handleTouchEnd(event) {
        event.preventDefault();
        isTouching = false;
        touchAction = null;
        
        // Release grabbed object if we were grabbing
        if (grabConstraint) {
            Composite.remove(world, grabConstraint);
            grabConstraint = null;
            heldObject = null;
        }
    }
    
    // Helper function to check if an element is a control element
    function isControlElement(element) {
        if (!element) return false;
        
        // Check if the element or any of its parents have control-related IDs
        let current = element;
        while (current) {
            const id = current.id || '';
            if (id.includes('button') || 
                id === 'movement-pad' || 
                id === 'move-indicator' || 
                id === 'touch-controls' ||
                id === 'speed-controls' ||
                id === 'pause-menu' ||
                id === 'speed-controls-menu') {
                return true;
            }
            current = current.parentElement;
        }
        
        return false;
    }
    
    function movePlayer(direction) {
        movePlayerWithIntensity(direction, 1.0);
    }
    
    function movePlayerWithIntensity(direction, intensity) {
        if (!player) return;
        
        // Calculate force with speed multiplier and intensity
        const moveForce = PLAYER_MOVE_FORCE_FACTOR * speedMultiplier * intensity;
        
        const force = direction === 'right' ? 
            Vector.create(moveForce, 0) : 
            Vector.create(-moveForce, 0);
        
        // Apply force to player
        Body.applyForce(player, player.position, force);
        
        // Log movement occasionally for debugging
        if (Math.random() < 0.01) {
            console.log(`Player movement: direction=${direction}, intensity=${intensity.toFixed(2)}, force=${moveForce.toFixed(5)}, speedMultiplier=${speedMultiplier.toFixed(2)}`);
        }
    }
    
    function jumpPlayer() {
        if (!player) return;
        
        // Check if player is on ground or platform
        const playerBottom = player.position.y + VITA_HEIGHT / 2;
        const bodies = Composite.allBodies(world);
        
        let canJump = false;
        let closestDistance = 20; // Increased tolerance for jumping (was 5)
        
        for (let body of bodies) {
            if (body.isStatic && body !== player) {
                // Check if this is a platform or ground (not a wall)
                if (body.label && (body.label.includes("Ground") || 
                                  body.label.includes("Platform") || 
                                  body.label === "ceiling")) {
                    
                    // Calculate distance between player bottom and body top
                    const bodyTop = body.bounds.min.y;
                    const distance = Math.abs(playerBottom - bodyTop);
                    
                    if (distance < closestDistance) {
                        canJump = true;
                        break;
                    }
                }
            }
        }
        
        // Always allow jumping for better gameplay (even if not perfectly on ground)
        // This makes the game more forgiving and fun
        canJump = true;
        
        if (canJump) {
            // Apply jump force with speed multiplier
            const jumpForce = Vector.create(0, -PLAYER_JUMP_FORCE_MULTIPLIER * speedMultiplier);
            Body.applyForce(player, player.position, jumpForce);
            
            // Add a small upward velocity boost for more immediate response
            Body.setVelocity(player, {
                x: player.velocity.x,
                y: Math.min(player.velocity.y, -5 * speedMultiplier) // Ensure upward velocity
            });
            
            // Visual feedback - flash the jump button
            const jumpButton = document.getElementById('jump-button');
            if (jumpButton) {
                jumpButton.style.backgroundColor = '#FFFFFF';
                setTimeout(() => {
                    jumpButton.style.backgroundColor = '#4169E1'; // Return to blue
                }, 200);
            }
            
            // Log jump for debugging
            console.log(`Player jumped with force: ${(PLAYER_JUMP_FORCE_MULTIPLIER * speedMultiplier).toFixed(5)}, speedMultiplier: ${speedMultiplier.toFixed(2)}`);
        }
    }
    
    function kickAction() {
        if (!player) return;
        
        // Visual feedback - flash the kick button
        const kickButton = document.getElementById('kick-button');
        if (kickButton) {
            kickButton.style.backgroundColor = '#FFFFFF';
            setTimeout(() => {
                kickButton.style.backgroundColor = '#FF6347'; // Return to red
            }, 200);
        }
        
        // Create a visual kick effect
        createKickEffect();
        
        // Find objects within kick radius
        const bodies = Composite.allBodies(world);
        const playerPos = player.position;
        let objectKicked = false;
        
        for (let body of bodies) {
            if (body !== player && !body.isStatic) {
                const distance = Vector.magnitude(Vector.sub(body.position, playerPos));
                
                if (distance < KICK_RADIUS) {
                    // Calculate direction from player to object
                    const direction = Vector.normalise(Vector.sub(body.position, playerPos));
                    
                    // Check if this is an NPC
                    if (body.label && body.label.includes('NPC-')) {
                        // Find the NPC object
                        const npc = npcArray.find(n => n.body === body);
                        if (npc) {
                            // Apply stronger kick force to NPCs for more dramatic effect
                            const npcKickForce = Vector.mult(direction, KICK_FORCE_MAGNITUDE * speedMultiplier * 2.5);
                            Body.applyForce(body, body.position, npcKickForce);
                            
                            // Put NPC in ragdoll state
                            npc.enterRagdollState(8000); // Longer ragdoll state for kicks
                            
                            // Apply damage
                            const kickDamage = 20 + Math.floor(Math.random() * 10);
                            npc.takeDamage(kickDamage);
                            
                            // Add extra chaos score for kicking NPCs
                            updateChaosScore(30);
                            
                            // Log kick for debugging
                            console.log(`Kicked NPC ${body.label} with force: ${(KICK_FORCE_MAGNITUDE * speedMultiplier * 2.5).toFixed(5)}`);
                        }
                    } else {
                        // Regular object kick
                        // Apply kick force with speed multiplier - increased for more dramatic effect
                        const kickForce = Vector.mult(direction, KICK_FORCE_MAGNITUDE * speedMultiplier * 1.5);
                        Body.applyForce(body, body.position, kickForce);
                        
                        // Add some spin for more dramatic effect
                        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
                        
                        // Log kick for debugging
                        console.log(`Kicked object ${body.label} with force: ${(KICK_FORCE_MAGNITUDE * speedMultiplier * 1.5).toFixed(5)}`);
                        
                        // Increase chaos score
                        updateChaosScore(10);
                    }
                    
                    objectKicked = true;
                }
            }
        }
        
        if (!objectKicked) {
            console.log("No objects within kick radius");
        }
    }
    
    function createKickEffect() {
        // Create a visual kick effect circle that expands and fades
        const kickEffect = document.createElement('div');
        kickEffect.style.position = 'absolute';
        kickEffect.style.width = '50px';
        kickEffect.style.height = '50px';
        kickEffect.style.borderRadius = '50%';
        kickEffect.style.backgroundColor = 'rgba(255, 99, 71, 0.5)'; // Semi-transparent red
        kickEffect.style.border = '2px solid rgba(255, 255, 255, 0.7)';
        kickEffect.style.pointerEvents = 'none';
        kickEffect.style.zIndex = '100';
        kickEffect.style.transition = 'all 0.3s ease-out';
        
        // Position at player
        const playerScreenPos = worldToScreen(player.position);
        kickEffect.style.left = (playerScreenPos.x - 25) + 'px';
        kickEffect.style.top = (playerScreenPos.y - 25) + 'px';
        
        // Add to game container
        gameContainer.appendChild(kickEffect);
        
        // Animate expansion
        setTimeout(() => {
            kickEffect.style.width = KICK_RADIUS * 2 + 'px';
            kickEffect.style.height = KICK_RADIUS * 2 + 'px';
            kickEffect.style.left = (playerScreenPos.x - KICK_RADIUS) + 'px';
            kickEffect.style.top = (playerScreenPos.y - KICK_RADIUS) + 'px';
            kickEffect.style.opacity = '0';
        }, 10);
        
        // Remove after animation
        setTimeout(() => {
            gameContainer.removeChild(kickEffect);
        }, 300);
    }
    
    // Helper function to convert world coordinates to screen coordinates
    function worldToScreen(worldPos) {
        // With zoom factor, the conversion needs to account for the zoomed view
        return {
            x: (worldPos.x - render.bounds.min.x) * render.options.width / (render.bounds.max.x - render.bounds.min.x),
            y: (worldPos.y - render.bounds.min.y) * render.options.height / (render.bounds.max.y - render.bounds.min.y)
        };
    }
    
    // Liquify and Clean Functions
    function getObjectColor(body) {
        if (body.render && body.render.fillStyle && body.render.fillStyle !== 'transparent') {
            return body.render.fillStyle;
        }
        if (body.label) {
            if (body.label.startsWith('Frog')) return '#381a7b'; // Purple for Frogs
            if (body.label.startsWith('Foofoo')) return '#E67E22'; // Orange for Foofoos
            if (body.label.startsWith('Box')) return '#FF5733'; // Orange-Red for Boxes
            if (body.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX)) return LIQUIFIER_OBJECT_COLOR;
            if (body.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX)) return CLEANER_OBJECT_COLOR;
            if (body.label.startsWith('Ball') || body.label.startsWith('BouncyBall')) return '#3498DB'; // Blue for Balls
            if (body.label.startsWith(FORCE_TRIANGLE_LABEL)) return TRIANGLE_COLOR;
            if (body.label.startsWith('NPC')) return '#FFC0CB'; // Pink for NPCs
        }
        return '#CCCCCC'; // Light gray default
    }
    
    function getObjectColors(body) {
        // Prioritize explicit multiFillStyles if available
        if (body.render && Array.isArray(body.render.multiFillStyles) && body.render.multiFillStyles.length > 0) {
            return body.render.multiFillStyles;
        }
        
        // Fallback to single color
        const singleColor = getObjectColor(body);
        return [singleColor]; // Return as an array with one color
    }
    
    function removeBody(bodyToRemove, isParticle = false, isBeingLiquified = false) {
        if (!bodyToRemove) return false;
        
        // Remove from world
        Composite.remove(world, bodyToRemove);
        
        // Remove from appropriate array
        if (isParticle) {
            liquifiedParticlesArray = liquifiedParticlesArray.filter(p => p !== bodyToRemove);
            window.liquifiedParticlesArray = liquifiedParticlesArray; // Update exposed array
        } else {
            // Remove from specific arrays based on object type
            if (bodyToRemove.label && bodyToRemove.label.startsWith('Box')) {
                boxStack = boxStack.filter(b => b !== bodyToRemove);
            } else if (bodyToRemove.label && bodyToRemove.label.startsWith('BouncyBall')) {
                bouncyBallsArray = bouncyBallsArray.filter(b => b !== bodyToRemove);
            } else if (bodyToRemove.label && bodyToRemove.label.startsWith('Frog')) {
                frogStack = frogStack.filter(f => f !== bodyToRemove);
            } else if (bodyToRemove.label && bodyToRemove.label.startsWith('Foofoo')) {
                foofooStack = foofooStack.filter(f => f !== bodyToRemove);
            } else if (bodyToRemove.label && bodyToRemove.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX)) {
                liquifierObjectsArray = liquifierObjectsArray.filter(l => l !== bodyToRemove);
            } else if (bodyToRemove.label && bodyToRemove.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX)) {
                cleanerObjectsArray = cleanerObjectsArray.filter(c => c !== bodyToRemove);
            }
        }
        
        // Add chaos score for removal
        if (!isParticle && !isBeingLiquified) {
            updateChaosScore(10);
        }
        
        return true;
    }
    
    function liquifyBody(bodyToLiquify) {
        if (!bodyToLiquify || bodyToLiquify.isStatic || bodyToLiquify === player || 
            bodyToLiquify.isSensor || bodyToLiquify.label.startsWith('particle-')) {
            return false;
        }
        
        const originalPosition = { ...bodyToLiquify.position };
        const particleColors = getObjectColors(bodyToLiquify);
        const originalLabel = bodyToLiquify.label;
        
        // Remove the original body
        removeBody(bodyToLiquify, false, true);
        
        // Calculate number of particles based on object size
        let effectiveSize;
        if (bodyToLiquify.circleRadius) { // It's a circle
            effectiveSize = bodyToLiquify.circleRadius * 2; // Diameter
        } else { // It's a rectangle/polygon
            const width = bodyToLiquify.bounds.max.x - bodyToLiquify.bounds.min.x;
            const height = bodyToLiquify.bounds.max.y - bodyToLiquify.bounds.min.y;
            effectiveSize = (width + height) / 2; // Average dimension
        }
        const numParticlesToCreate = Math.max(MIN_PARTICLES_ON_LIQUIFY, Math.floor(effectiveSize * 1.5)); // Reduced for mobile
        
        // Create particles
        for (let i = 0; i < numParticlesToCreate; i++) {
            const angle = Math.random() * Math.PI * 2;
            const offsetMagnitude = Math.random() * (bodyToLiquify.circleRadius || PARTICLE_SIZE * 4);
            const particleX = originalPosition.x + Math.cos(angle) * offsetMagnitude;
            const particleY = originalPosition.y + Math.sin(angle) * offsetMagnitude;
            const chosenParticleColor = particleColors[i % particleColors.length];
            
            const particle = Bodies.rectangle(particleX, particleY, PARTICLE_SIZE, PARTICLE_SIZE, {
                friction: 0.05, 
                restitution: 0.4, 
                density: 0.001,
                label: `particle-${originalLabel || 'unknown'}-${i}`,
                render: { fillStyle: chosenParticleColor }
            });
            Composite.add(world, particle);
            liquifiedParticlesArray.push(particle);
        }
        
        console.log(`Liquified object: ${originalLabel || 'Unknown'}`);
        updateChaosScore(25);
        
        // Visual feedback removed to reduce clutter
        
        return true;
    }
    
    function liquifyNearestObject() {
        if (!player) return;
        
        // Visual feedback - flash the liquify button
        const liquifyButton = document.getElementById('liquify-button');
        if (liquifyButton) {
            liquifyButton.style.backgroundColor = '#FFFFFF';
            setTimeout(() => {
                liquifyButton.style.backgroundColor = '#40E0D0'; // Return to turquoise
            }, 200);
        }
        
        // Find objects within liquify radius
        const bodies = Composite.allBodies(world);
        const playerPos = player.position;
        let nearestObject = null;
        let minDistance = LIQUIFY_RADIUS;
        
        for (let body of bodies) {
            // Skip if it's the player, static, a sensor, or a particle
            if (body === player || body.isStatic || body.isSensor || 
                (body.label && (
                    body.label.startsWith('particle-') || 
                    body.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX) || 
                    body.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX) ||
                    body.label.startsWith('GardenPlot-') ||
                    body.label.startsWith('Plant-') ||
                    body.label.startsWith('Water-')
                ))) {
                continue;
            }
            
            // Check if it's an NPC body
            let isNpcBody = false;
            if (body.label && body.label.includes('NPC-')) {
                const npc = npcArray.find(n => n.body === body);
                if (npc) {
                    isNpcBody = true;
                }
            }
            
            // Calculate distance
            const distance = Vector.magnitude(Vector.sub(body.position, playerPos));
            
            // If it's within range and closer than any previous object
            if (distance < minDistance) {
                minDistance = distance;
                nearestObject = body;
            }
        }
        
        // If we found an object to liquify
        if (nearestObject) {
            console.log(`Attempting to liquify object: ${nearestObject.label || 'Unknown'}`);
            
            // Special handling for NPCs
            if (nearestObject.label && nearestObject.label.includes('NPC-')) {
                const npc = npcArray.find(n => n.body === nearestObject);
                if (npc) {
                    // Apply damage to NPC before liquifying
                    npc.takeDamage(100); // Instant death
                }
            }
            
            // Liquify the object
            if (liquifyBody(nearestObject)) {
                // Create a liquify effect
                createLiquifyEffect(nearestObject.position);
                return true;
            }
        } else {
            console.log("No objects within liquify radius");
            // Visual feedback removed to reduce clutter
        }
        
        return false;
    }
    
    function cleanupNearbyLooseItems() {
        if (!player) return;
        
        // Visual feedback - flash the clean button
        const cleanButton = document.getElementById('clean-button');
        if (cleanButton) {
            cleanButton.style.backgroundColor = '#FFFFFF';
            setTimeout(() => {
                cleanButton.style.backgroundColor = '#FA8072'; // Return to salmon
            }, 200);
        }
        
        const playerPos = player.position;
        let particlesToRemove = [];
        
        liquifiedParticlesArray.forEach(particle => {
            const dx = particle.position.x - playerPos.x;
            const dy = particle.position.y - playerPos.y;
            const distSq = dx * dx + dy * dy;
            
            if (distSq < CLEANUP_RADIUS * CLEANUP_RADIUS) {
                Composite.remove(world, particle);
                particlesToRemove.push(particle);
            }
        });
        
        if (particlesToRemove.length > 0) {
            liquifiedParticlesArray = liquifiedParticlesArray.filter(p => !particlesToRemove.includes(p));
            window.liquifiedParticlesArray = liquifiedParticlesArray; // Update exposed array
            
            // Create a cleaning effect
            createCleaningEffect(playerPos, CLEANUP_RADIUS);
            
            // Add score for cleaning
            updateChaosScore(particlesToRemove.length);
            
            console.log(`Cleaned up ${particlesToRemove.length} particles`);
            return true;
        } else {
            console.log("No particles to clean up");
            // Visual feedback removed to reduce clutter
        }
        
        return false;
    }
    
    function createCleaningEffect(position, radius) {
        // Create a visual cleaning effect circle that expands and fades
        const cleanEffect = document.createElement('div');
        cleanEffect.style.position = 'absolute';
        cleanEffect.style.width = '50px';
        cleanEffect.style.height = '50px';
        cleanEffect.style.borderRadius = '50%';
        cleanEffect.style.border = '2px solid #FA8072';
        cleanEffect.style.backgroundColor = 'rgba(250, 128, 114, 0.2)';
        cleanEffect.style.transform = 'translate(-50%, -50%)';
        cleanEffect.style.pointerEvents = 'none';
        cleanEffect.style.zIndex = '100';
        
        // Position at player
        const screenPos = worldToScreen(position);
        cleanEffect.style.left = screenPos.x + 'px';
        cleanEffect.style.top = screenPos.y + 'px';
        
        // Add to game container
        if (gameContainer) {
            gameContainer.appendChild(cleanEffect);
            
            // Animate expansion and fade
            cleanEffect.style.transition = 'all 300ms ease-out';
            setTimeout(() => {
                cleanEffect.style.width = (radius * 2) + 'px';
                cleanEffect.style.height = (radius * 2) + 'px';
                cleanEffect.style.opacity = '0';
                
                // Remove after animation
                setTimeout(() => {
                    if (cleanEffect.parentNode) {
                        cleanEffect.parentNode.removeChild(cleanEffect);
                    }
                }, 300);
            }, 10);
        }
    }
    
    function createLiquifyEffect(position) {
        // Create a visual liquify effect with splashing particles
        const numParticles = 12;
        const baseSize = 10;
        const colors = ['#40E0D0', '#48D1CD', '#20B2AA', '#00CED1'];
        
        // Create splash particles
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = `${baseSize + Math.random() * 5}px`;
            particle.style.height = `${baseSize + Math.random() * 5}px`;
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.transform = 'translate(-50%, -50%)';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '100';
            
            // Position at liquified object
            const screenPos = worldToScreen(position);
            particle.style.left = screenPos.x + 'px';
            particle.style.top = screenPos.y + 'px';
            
            // Add to game container
            if (gameContainer) {
                gameContainer.appendChild(particle);
                
                // Animate particle movement and fade
                const angle = Math.random() * Math.PI * 2;
                const distance = 30 + Math.random() * 70;
                const duration = 300 + Math.random() * 500;
                
                particle.style.transition = `all ${duration}ms ease-out`;
                setTimeout(() => {
                    particle.style.left = (screenPos.x + Math.cos(angle) * distance) + 'px';
                    particle.style.top = (screenPos.y + Math.sin(angle) * distance) + 'px';
                    particle.style.opacity = '0';
                    
                    // Remove after animation
                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, duration);
                }, 10);
            }
        }
    }
    
    function addVisualFeedback(position, color, text) {
        // Create a feedback element
        const feedback = document.createElement('div');
        feedback.style.position = 'absolute';
        feedback.style.color = color;
        feedback.style.fontWeight = 'bold';
        feedback.style.fontSize = '16px';
        feedback.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)';
        feedback.style.pointerEvents = 'none';
        feedback.style.zIndex = '1000';
        feedback.textContent = text;
        
        // Position it at the world position
        const screenPos = worldToScreen(position);
        feedback.style.left = screenPos.x + 'px';
        feedback.style.top = screenPos.y + 'px';
        
        // Add to game container
        if (gameContainer) {
            gameContainer.appendChild(feedback);
            
            // Animate and remove
            feedback.style.transition = 'all 1s ease-out';
            setTimeout(() => {
                feedback.style.opacity = '0';
                feedback.style.transform = 'translateY(-30px)';
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.parentNode.removeChild(feedback);
                    }
                }, 1000);
            }, 100);
        }
    }
    
    // Farming action functions
    // Gardening-related functions removed for mobile version
    
    function grabAction() {
        if (!player) return;
        
        // If already grabbing something, release it
        if (grabConstraint) {
            console.log("Releasing grabbed object");
            Composite.remove(world, grabConstraint);
            grabConstraint = null;
            heldObject = null;
            return;
        }
        
        // Find closest object within grab radius
        const bodies = Composite.allBodies(world);
        const playerPos = player.position;
        let closestBody = null;
        let closestDistance = GRAB_RADIUS;
        
        for (let body of bodies) {
            if (body !== player && !body.isStatic) {
                const distance = Vector.magnitude(Vector.sub(body.position, playerPos));
                
                if (distance < closestDistance) {
                    closestBody = body;
                    closestDistance = distance;
                }
            }
        }
        
        if (closestBody) {
            // Create grab constraint
            heldObject = closestBody;
            
            // Calculate grab point (in front of player)
            const grabPoint = {
                x: player.position.x + GRAB_POINT_OFFSET.x,
                y: player.position.y + GRAB_POINT_OFFSET.y
            };
            
            grabConstraint = Constraint.create({
                bodyA: player,
                bodyB: heldObject,
                pointA: GRAB_POINT_OFFSET,
                stiffness: 0.1,
                render: {
                    visible: true,
                    lineWidth: 2,
                    strokeStyle: '#FFFFFF'
                }
            });
            
            Composite.add(world, grabConstraint);
            console.log(`Grabbed object: ${heldObject.label}`);
            
            // Flash the grab button to indicate success
            const grabButton = document.getElementById('grab-button');
            if (grabButton) {
                grabButton.style.backgroundColor = '#FFFFFF';
                setTimeout(() => {
                    grabButton.style.backgroundColor = '#32CD32';
                }, 200);
            }
            
            // Increase chaos score
            updateChaosScore(5);
        } else {
            console.log("No object within grab radius");
        }
    }
    
    function setupCollisionHandling() {
        // Add collision event handling
        Events.on(engine, 'collisionStart', function(event) {
            const pairs = event.pairs;
            
            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i];
                
                // Check for collisions with force triangles
                if (pair.bodyA.label.includes(FORCE_TRIANGLE_LABEL) || pair.bodyB.label.includes(FORCE_TRIANGLE_LABEL)) {
                    const triangle = pair.bodyA.label.includes(FORCE_TRIANGLE_LABEL) ? pair.bodyA : pair.bodyB;
                    const otherBody = pair.bodyA === triangle ? pair.bodyB : pair.bodyA;
                    
                    if (!otherBody.isStatic) {
                        // Calculate force direction (away from triangle)
                        const forceDir = Vector.normalise(Vector.sub(otherBody.position, triangle.position));
                        const forceMagnitude = FORCEFIELD_MAGNITUDE;
                        const force = Vector.mult(forceDir, forceMagnitude);
                        
                        // Apply force
                        Body.applyForce(otherBody, otherBody.position, force);
                        
                        // Increase chaos score
                        updateChaosScore(15);
                    }
                }
                
                // Check for collisions with liquifier objects
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;
                let performedSpecialAction = false;
                
                // Check for Liquifier
                let liquifier = null;
                let otherBody = null;
                
                if (bodyA.label && bodyA.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX) && 
                    !bodyB.isStatic && bodyB !== player) {
                    liquifier = bodyA;
                    otherBody = bodyB;
                } else if (bodyB.label && bodyB.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX) && 
                           !bodyA.isStatic && bodyA !== player) {
                    liquifier = bodyB;
                    otherBody = bodyA;
                }
                
                if (liquifier && otherBody) {
                    performedSpecialAction = true;
                    // Prevent liquifier from liquifying cleaners, other liquifiers, or particles
                    if (otherBody.label && (
                        otherBody.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX) ||
                        otherBody.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX) ||
                        otherBody.label.startsWith('particle-'))) {
                        // Do nothing
                    } else {
                        liquifyBody(otherBody);
                    }
                }
                
                // Check for Cleaner (only if not already handled by liquifier)
                if (!performedSpecialAction) {
                    let cleaner = null;
                    otherBody = null;
                    
                    if (bodyA.label && bodyA.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX) && 
                        !bodyB.isStatic && bodyB !== player) {
                        cleaner = bodyA;
                        otherBody = bodyB;
                    } else if (bodyB.label && bodyB.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX) && 
                               !bodyA.isStatic && bodyA !== player) {
                        cleaner = bodyB;
                        otherBody = bodyA;
                    }
                    
                    if (cleaner && otherBody) {
                        performedSpecialAction = true;
                        // Prevent cleaner from cleaning other cleaners or liquifiers
                        if (otherBody.label && (
                            otherBody.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX) ||
                            otherBody.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX))) {
                            // Do nothing
                        } else {
                            removeBody(otherBody, otherBody.label.startsWith('particle-'));
                        }
                    }
                }
                
                // Check for player collisions with objects
                if (pair.bodyA === player || pair.bodyB === player) {
                    const otherBody = pair.bodyA === player ? pair.bodyB : pair.bodyA;
                    
                    // Increase chaos score for player collisions
                    if (!otherBody.isStatic) {
                        updateChaosScore(1);
                        
                        // Check if this is an NPC
                        if (otherBody.label && otherBody.label.includes('NPC-')) {
                            // Find the NPC object
                            const npc = npcArray.find(n => n.body === otherBody);
                            if (npc) {
                                // Calculate collision velocity
                                const relativeVelocity = Vector.magnitude(Vector.sub(
                                    pair.bodyA.velocity, pair.bodyB.velocity
                                ));
                                
                                // If it's a hard collision, put NPC in ragdoll state
                                if (relativeVelocity > 5) {
                                    npc.enterRagdollState();
                                    
                                    // Add damage based on collision intensity
                                    const damage = Math.floor(relativeVelocity * 5);
                                    npc.takeDamage(damage);
                                } else {
                                    // Just interact with the NPC
                                    const now = Date.now();
                                    if (now - lastNpcInteractionTime > 1000) { // Limit interaction frequency
                                        npc.interact();
                                        lastNpcInteractionTime = now;
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Check for NPC collisions with other objects
                const hasNpc = (pair.bodyA.label && pair.bodyA.label.includes('NPC-')) || 
                              (pair.bodyB.label && pair.bodyB.label.includes('NPC-'));
                              
                if (hasNpc && pair.bodyA !== player && pair.bodyB !== player) {
                    const npcBody = pair.bodyA.label && pair.bodyA.label.includes('NPC-') ? pair.bodyA : pair.bodyB;
                    const otherBody = npcBody === pair.bodyA ? pair.bodyB : pair.bodyA;
                    
                    // Find the NPC object
                    const npc = npcArray.find(n => n.body === npcBody);
                    
                    if (npc && !otherBody.isStatic) {
                        // Calculate collision velocity
                        const relativeVelocity = Vector.magnitude(Vector.sub(
                            pair.bodyA.velocity, pair.bodyB.velocity
                        ));
                        
                        // If it's a hard collision with another object, react
                        if (relativeVelocity > 8) {
                            // 20% chance to enter ragdoll state on hard collisions
                            if (Math.random() < 0.2) {
                                npc.enterRagdollState();
                            }
                        }
                    }
                }
            }
        });
        
        // Add update event for camera following, object respawning, and NPC/Foofoo updates
        Events.on(engine, 'afterUpdate', function() {
            if (player) {
                updateCamera();
                checkObjectsForRespawn();
                
                // Update NPCs
                npcArray.forEach(npc => {
                    npc.update();
                });
                
                // Update Foofoos to apply their special powers
                foofooStack.forEach(foofoo => {
                    if (typeof foofoo.update === 'function') {
                        foofoo.update();
                    }
                });
            }
        });
    }
    
    function updateCamera() {
        if (!player) return;
        
        // Calculate effective viewport size with zoom factor
        const effectiveWidth = render.options.width / CAMERA_ZOOM_FACTOR;
        const effectiveHeight = render.options.height / CAMERA_ZOOM_FACTOR;
        
        // Calculate target camera position (centered on player with zoom)
        targetCameraOffset.x = player.position.x - effectiveWidth / 2;
        targetCameraOffset.y = player.position.y - effectiveHeight / 2;
        
        // Constrain camera to game world bounds with padding
        targetCameraOffset.x = Math.max(0, Math.min(targetCameraOffset.x, BASE_GAME_WIDTH - effectiveWidth));
        targetCameraOffset.y = Math.max(0, Math.min(targetCameraOffset.y, BASE_GAME_HEIGHT - effectiveHeight));
        
        // Smooth camera movement
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * cameraSmoothing;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * cameraSmoothing;
        
        // Update render bounds with zoom factor applied
        render.bounds.min.x = cameraOffset.x;
        render.bounds.min.y = cameraOffset.y;
        render.bounds.max.x = cameraOffset.x + effectiveWidth;
        render.bounds.max.y = cameraOffset.y + effectiveHeight;
        
        // Log camera position occasionally (every ~5 seconds) for debugging
        if (Math.random() < 0.01) {
            console.log(`Camera position: (${cameraOffset.x.toFixed(0)}, ${cameraOffset.y.toFixed(0)})`);
            console.log(`Player position: (${player.position.x.toFixed(0)}, ${player.position.y.toFixed(0)})`);
            console.log(`Render bounds: (${render.bounds.min.x.toFixed(0)}, ${render.bounds.min.y.toFixed(0)}) to (${render.bounds.max.x.toFixed(0)}, ${render.bounds.max.y.toFixed(0)})`);
        }
    }
    
    function checkObjectsForRespawn() {
        const bodies = Composite.allBodies(world);
        
        // Check for out-of-bounds objects
        for (let body of bodies) {
            if (!body.isStatic && body !== player) {
                // Check if object is out of bounds
                if (body.position.y > RESPAWN_Y_LIMIT || 
                    body.position.x < -RESPAWN_X_BUFFER || 
                    body.position.x > BASE_GAME_WIDTH + RESPAWN_X_BUFFER) {
                    
                    // Respawn object at a random position
                    const newX = Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2) + WALL_THICKNESS;
                    const newY = Math.random() * (BASE_GAME_HEIGHT / 2) + 100;
                    
                    Body.setPosition(body, { x: newX, y: newY });
                    Body.setVelocity(body, { x: 0, y: 0 });
                    Body.setAngularVelocity(body, 0);
                    
                    // Increase chaos score
                    updateChaosScore(5);
                }
            }
        }
        
        // Check if we need to regenerate objects for endless sandbox feeling
        checkAndRegenerateObjects();
    }
    
    function checkAndRegenerateObjects() {
        // Count active objects by type
        const boxCount = boxStack.length;
        const ballCount = bouncyBallsArray.length;
        const frogCount = frogStack.length;
        const foofooCount = foofooStack.length;
        const triangleCount = forceTrianglesArray.length;
        const particleCount = liquifiedParticlesArray.length;
        
        // Check if we're running low on interactive objects
        const totalInteractiveObjects = boxCount + ballCount + frogCount + triangleCount;
        
        // More aggressive regeneration thresholds for better sandbox experience
        const lowBoxThreshold = Math.floor(NUM_BOXES * 0.4); // 40% of original box count
        const lowBallThreshold = Math.floor(NUM_BALLS * 0.4); // 40% of original ball count
        const lowFrogThreshold = Math.floor(NUM_FROGS * 0.4); // 40% of original frog count
        const lowTriangleThreshold = Math.floor(NUM_TRIANGLES * 0.4); // 40% of original triangle count
        const lowTotalThreshold = Math.floor((NUM_BOXES + NUM_BALLS + NUM_FROGS + NUM_TRIANGLES) * 0.3); // 30% of all objects
        
        // Log object counts occasionally for debugging
        if (Math.random() < 0.01) {
            console.log(`Object counts - Boxes: ${boxCount}, Balls: ${ballCount}, Frogs: ${frogCount}, Foofoos: ${foofooCount}, Triangles: ${triangleCount}, Particles: ${particleCount}`);
        }
        
        // Check individual object types and total count
        if (boxCount <= lowBoxThreshold || 
            ballCount <= lowBallThreshold || 
            frogCount <= lowFrogThreshold || 
            triangleCount <= lowTriangleThreshold ||
            totalInteractiveObjects <= lowTotalThreshold) {
            
            console.log("Low object count detected, regenerating objects for endless sandbox play");
            
            // Create a notification for the player
            showTemporaryMessage("New objects have appeared in the world!", 3000);
            
            // Regenerate objects
            regenerateObjects();
        }
    }
    
    function regenerateObjects() {
        // Determine how many of each object type to create - more aggressive regeneration
        const numBoxesToCreate = Math.max(0, Math.min(8, NUM_BOXES * 1.5 - boxStack.length));
        const numBallsToCreate = Math.max(0, Math.min(10, NUM_BALLS * 1.5 - bouncyBallsArray.length));
        const numFrogsToCreate = Math.max(0, Math.min(5, NUM_FROGS * 1.5 - frogStack.length));
        const numTrianglesToCreate = Math.max(0, Math.min(5, NUM_TRIANGLES * 1.5 - forceTrianglesArray.length));
        
        // Create boxes - spread them out more for less clutter
        for (let i = 0; i < numBoxesToCreate; i++) {
            // Spread objects across the game width more evenly
            const sectionWidth = (BASE_GAME_WIDTH - WALL_THICKNESS * 2) / numBoxesToCreate;
            const x = WALL_THICKNESS + (i * sectionWidth) + (Math.random() * sectionWidth * 0.8);
            const y = Math.random() * 400 + 100; // More vertical spread
            
            try {
                const box = Bodies.rectangle(x, y, BOX_SIZE, BOX_SIZE, {
                    label: `Box-${Date.now()}-${i}`,
                    restitution: 0.2,
                    friction: 0.1,
                    render: { fillStyle: getRandomColor() }
                });
                
                Composite.add(world, box);
                boxStack.push(box);
            } catch (e) {
                console.error("Error creating regenerated box:", e);
            }
        }
        
        // Create bouncy balls
        for (let i = 0; i < numBallsToCreate; i++) {
            const x = Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - BOUNCY_BALL_RADIUS * 2) + WALL_THICKNESS;
            const y = Math.random() * 300 + 100; // Place in upper part of the game area
            
            try {
                const ball = Bodies.circle(x, y, BOUNCY_BALL_RADIUS, {
                    label: `BouncyBall-${Date.now()}-${i}`,
                    restitution: BOUNCY_BALL_RESTITUTION,
                    friction: 0.01,
                    frictionAir: 0.01,
                    render: { fillStyle: getRandomColor() }
                });
                
                Composite.add(world, ball);
                bouncyBallsArray.push(ball);
            } catch (e) {
                console.error("Error creating regenerated ball:", e);
            }
        }
        
        // Create frogs
        for (let i = 0; i < numFrogsToCreate; i++) {
            const x = Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - FROG_SIZE) + WALL_THICKNESS;
            const y = Math.random() * 300 + 100; // Place in upper part of the game area
            
            try {
                const frog = new Frog(x, y, FROG_SIZE, `Regenerated-${i}`);
                frog.addToWorld(world);
                frogStack.push(frog);
            } catch (e) {
                console.error("Error creating regenerated frog:", e);
            }
        }
        
        // Create force triangles
        for (let i = 0; i < numTrianglesToCreate; i++) {
            const x = Math.random() * (BASE_GAME_WIDTH - WALL_THICKNESS * 2 - TRIANGLE_RADIUS * 2) + WALL_THICKNESS;
            const y = Math.random() * 300 + 100; // Place in upper part of the game area
            
            try {
                const triangle = new ForceTriangle(
                    x, y, TRIANGLE_RADIUS, 
                    `${FORCE_TRIANGLE_LABEL}-Regenerated-${i}`, 
                    false, // Not static
                    TRIANGLE_COLOR
                );
                
                triangle.addToWorld(world);
                forceTrianglesArray.push(triangle);
            } catch (e) {
                console.error("Error creating regenerated triangle:", e);
            }
        }
        
        // Increase chaos score for regeneration
        updateChaosScore(25);
    }
    
    function showTemporaryMessage(message, duration = 3000) {
        // Create a temporary message element
        const messageElement = document.createElement('div');
        messageElement.style.position = 'absolute';
        messageElement.style.top = '10%';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translate(-50%, -50%)';
        messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        messageElement.style.color = '#FFFFFF';
        messageElement.style.padding = '15px 25px';
        messageElement.style.borderRadius = '10px';
        messageElement.style.fontSize = '20px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.zIndex = '1000';
        messageElement.style.textAlign = 'center';
        messageElement.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        messageElement.textContent = message;
        
        // Add to game container
        if (gameContainer) {
            gameContainer.appendChild(messageElement);
            
            // Animate in
            messageElement.style.opacity = '0';
            messageElement.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                messageElement.style.opacity = '1';
            }, 10);
            
            // Remove after duration
            setTimeout(() => {
                messageElement.style.opacity = '0';
                setTimeout(() => {
                    if (messageElement.parentNode) {
                        messageElement.parentNode.removeChild(messageElement);
                    }
                }, 500);
            }, duration);
        }
    }
    
    function createScoreDisplay() {
        // Create score display element
        scoreDisplay = document.createElement('div');
        scoreDisplay.id = 'chaos-score';
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '10px';
        scoreDisplay.style.left = '10px'; // Changed from right to left to avoid overlap with pause button
        scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        scoreDisplay.style.color = '#FFD700';
        scoreDisplay.style.padding = '5px 10px';
        scoreDisplay.style.borderRadius = '5px';
        scoreDisplay.style.fontSize = '16px';
        scoreDisplay.style.fontWeight = 'bold';
        scoreDisplay.style.zIndex = '900'; // Added z-index to ensure it's below the pause menu but above other elements
        scoreDisplay.textContent = 'Chaos: 0';
        
        gameContainer.appendChild(scoreDisplay);
    }
    
    function updateChaosScore(points) {
        chaosScore += points;
        if (scoreDisplay) {
            scoreDisplay.textContent = `Chaos: ${chaosScore}`;
        }
    }

    gameAPI.handleResize = function() {
        console.log("Vita Chaos Mobile: gameAPI.handleResize() called.");

        if (!gameContainer) {
            gameContainer = document.getElementById('game-container');
            if (!gameContainer) {
                console.error("Vita Chaos Mobile: handleResize - Game container not found. Aborting resize.");
                return;
            }
        }

        // Attempt to initialize if not done yet and in landscape
        if (!gameHasBeenInitialized && (window.innerWidth >= window.innerHeight)) {
            console.log("Vita Chaos Mobile: handleResize - Game not initialized, attempting initialization now (landscape detected).");
            if (!initializeGameOnce()) {
                console.error("Vita Chaos Mobile: handleResize - Initialization failed. Aborting resize.");
                return;
            }
            gameHasBeenInitialized = true;
        } else if (!gameHasBeenInitialized) {
            console.warn("Vita Chaos Mobile: handleResize - Game not initialized (possibly still in portrait or init failed). Aborting resize.");
            return;
        }

        // Ensure engine and render are available
        if (!engine || !render || !canvas) {
            console.error("Vita Chaos Mobile: handleResize - Engine, Render, or Canvas not available. This indicates a severe initialization problem.");
            return;
        }

        // Short delay to allow browser to update layout dimensions
        setTimeout(() => {
            const newWidth = gameContainer.clientWidth;
            const newHeight = gameContainer.clientHeight;

            console.log(`Vita Chaos Mobile: handleResize - new container dimensions: ${newWidth}x${newHeight}`);

            if (newWidth === 0 || newHeight === 0) {
                console.warn(`Vita Chaos Mobile: handleResize - Game container has zero dimensions (${newWidth}x${newHeight}). Canvas update aborted. Check CSS for #game-container.`);
                return;
            }

            // 1. Update Canvas CSS for display size
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';

            // 2. Update Canvas internal resolution for sharpness
            const dpr = window.devicePixelRatio || 1;
            canvas.width = newWidth * dpr;
            canvas.height = newHeight * dpr;

            // 3. Update Matter.js Renderer Options
            render.options.width = newWidth;
            render.options.height = newHeight;
            Render.setPixelRatio(render, dpr);

            // 4. Update Matter.js Renderer Bounds (the "camera" view)
            // We don't reset the bounds here because we're using camera following
            // Instead, the next engine update will adjust the camera position

            console.log(`Vita Chaos Mobile: Canvas updated - CSS: ${newWidth}x${newHeight}, Internal: ${canvas.width}x${canvas.height}, DPR: ${dpr}`);
            console.log(`Vita Chaos Mobile: Render options updated - Size: ${render.options.width}x${render.options.height}`);

            // 5. Reset camera position to follow player
            if (player) {
                targetCameraOffset.x = player.position.x - render.options.width / 2;
                targetCameraOffset.y = player.position.y - render.options.height / 2;
                cameraOffset = {...targetCameraOffset}; // Immediate update to avoid jarring transition
                updateCamera(); // Apply the camera update
            }

            console.log("Vita Chaos Mobile: handleResize completed.");
        }, 50);
    };

    function tryInitializeGame() {
        console.log("Vita Chaos Mobile: tryInitializeGame() called.");
        if (gameHasBeenInitialized) {
            console.log("Vita Chaos Mobile: Game already initialized.");
            return;
        }

        if (window.innerWidth >= window.innerHeight) { // Check for landscape
            console.log("Vita Chaos Mobile: Device in landscape. Proceeding with initialization.");
            if (initializeGameOnce()) {
                gameHasBeenInitialized = true;
                // Perform an initial resize to set everything up correctly.
                gameAPI.handleResize();
            } else {
                console.error("Vita Chaos Mobile: Initialization failed in tryInitializeGame.");
            }
        } else {
            console.log("Vita Chaos Mobile: Device in portrait mode. Game initialization deferred.");
            // The orientation warning script in HTML will call handleResize when orientation changes to landscape
        }
    }

    // Prevent double-tap zoom on iOS and other mobile browsers
    function preventDoubleTapZoom() {
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // Add additional touch event handlers to prevent zoom
        document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // Prevent pinch zoom
        document.addEventListener('touchmove', function(event) {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, { passive: false });
        
        // Add CSS to prevent text selection which can also trigger zoom
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                -khtml-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
                touch-action: manipulation;
            }
        `;
        document.head.appendChild(style);
        
        console.log("Double-tap zoom prevention initialized");
    }
    
    // Attempt to initialize the game when the DOM is ready.
    document.addEventListener('DOMContentLoaded', function() {
        tryInitializeGame();
        preventDoubleTapZoom();
    });

    // Expose a manual init for debugging if needed, or if called by HTML after orientation change
    gameAPI.ensureInitialized = function() {
        if (!gameHasBeenInitialized) {
            console.log("Vita Chaos Mobile: gameAPI.ensureInitialized() called, trying to initialize.");
            tryInitializeGame();
        }
    };
    
    // Expose reset function
    // Function to reset player position
    function resetPlayerPosition() {
        if (player) {
            console.log("Vita Chaos Mobile: Resetting player position...");
            
            // Calculate a safe position for the player
            const playerX = BASE_GAME_WIDTH * 0.1;
            const playerY = BASE_GAME_HEIGHT - GROUND_HEIGHT - VITA_HEIGHT;
            
            // Reset player position and velocity
            Body.setPosition(player, { x: playerX, y: playerY });
            Body.setVelocity(player, { x: 0, y: 0 });
            Body.setAngularVelocity(player, 0);
            Body.setAngle(player, 0);
            
            // Update camera to focus on player with zoom factor
            const effectiveWidth = render.options.width / CAMERA_ZOOM_FACTOR;
            const effectiveHeight = render.options.height / CAMERA_ZOOM_FACTOR;
            targetCameraOffset.x = player.position.x - effectiveWidth / 2;
            targetCameraOffset.y = player.position.y - effectiveHeight / 2;
            
            // Visual feedback removed to reduce clutter
        }
    }
    
    gameAPI.resetGame = function() {
        if (gameHasBeenInitialized) {
            console.log("Vita Chaos Mobile: Resetting game...");
            
            // Reset score
            chaosScore = 0;
            if (scoreDisplay) {
                scoreDisplay.textContent = 'Chaos: 0';
            }
            
            // If game was paused, resume it
            if (isPaused) {
                isPaused = false;
                pauseMenu.style.display = 'none';
                pauseButton.textContent = '⏸️';
                Runner.start(runner, engine);
            }
            
            // Reset game elements
            setupStaticWorldElements();
        }
    };

})(window.gameAPI);
