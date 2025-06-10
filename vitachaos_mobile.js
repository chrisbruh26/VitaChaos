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
    // Base dimensions for mobile - expanded for endless sandbox feeling
    const BASE_GAME_WIDTH = 10000; // Width of the game world - much wider for exploration
    const SINGLE_AREA_HEIGHT = 800; // Height of one vertical area
    const NUM_AREAS_VERTICAL = 5; // Number of vertical areas stacked - increased for more vertical space
    const BASE_GAME_HEIGHT = SINGLE_AREA_HEIGHT * NUM_AREAS_VERTICAL; // Total height of the game world
    
    // Physics
    const GRAVITY_Y = 0.8; // Adjusted for mobile feel
    const BASE_MOVE_FORCE = 0.004; // Base movement force
    const PLAYER_MOVE_FORCE_FACTOR = 0.008; // Increased for better responsiveness on all devices
    const PLAYER_JUMP_FORCE_MULTIPLIER = 0.06; // Significantly increased for more noticeable jumps
    
    // Speed adjustment variables
    let speedMultiplier = 1.0; // Can be adjusted in-game
    const MIN_SPEED = 0.5;
    const MAX_SPEED = 2.0;
    
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
    
    // Other Objects
    const BOX_SIZE = 40; // Slightly smaller for mobile
    const NUM_BOXES = 10; // Fewer boxes for performance
    const NUM_BALLS = 15; // Fewer balls for performance
    const BOUNCY_BALL_RADIUS = 10;
    const BOUNCY_BALL_RESTITUTION = 0.5;
    const BACKGROUND_COLOR = '#333333';
        
    // Frog Configuration
    const FROG_SIZE = 40;
    const NUM_FROGS = 8; // Fewer frogs for performance
    
    // Bouncy Platform Configuration
    const BOUNCY_PLATFORM_COLOR = '#FF69B4';
    const BOUNCY_PLATFORM_RESTITUTION = 0.4;
    
    // Foofoo Configuration
    const FOOFOO_SIZE = 40;
    const NUM_FOOFOOS = 3; // Fewer foofoos for performance
    
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
    
    // Respawn Configuration
    const RESPAWN_Y_LIMIT = BASE_GAME_HEIGHT + 200;
    const RESPAWN_X_BUFFER = 200;
    
    // Removed NPC Configuration
    
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
    
    // Liquify and Clean Mechanics
    let liquifiedParticlesArray = [];
    window.liquifiedParticlesArray = liquifiedParticlesArray; // Expose for potential editor interaction or debugging
    const LIQUIFY_RADIUS = 150; // How close Vita needs to be to liquify an object - increased for easier use
    const PARTICLE_SIZE = 8;   // Size of each particle
    const MIN_PARTICLES_ON_LIQUIFY = 8; // Minimum particles to generate
    const CLEANUP_RADIUS = 150; // Radius around Vita to clean up particles - increased for easier use
    
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
    
    let gameHasBeenInitialized = false;
    let chaosScore = 0;
    let scoreDisplay;
    
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
    let weldConstraintsArray = []; // To keep track of weld constraints
    let grabConstraint = null;
    
    // Camera variables
    let cameraOffset = { x: 0, y: 0 };
    let targetCameraOffset = { x: 0, y: 0 };
    let cameraSmoothing = 0.1; // Lower = smoother camera

    // --- Helper Classes for Game Object Creation ---
    class NPC {
        constructor(x, y, type, index) {
            // Determine NPC type and appearance
            const typeIndex = NPC_TYPES.indexOf(type);
            const npcType = typeIndex >= 0 ? type : NPC_TYPES[Math.floor(Math.random() * NPC_TYPES.length)];
            const colorIndex = typeIndex >= 0 ? typeIndex : Math.floor(Math.random() * NPC_COLORS.length);
            
            // Create the NPC body
            this.body = Bodies.rectangle(x, y, NPC_WIDTH, NPC_HEIGHT, {
                label: `NPC-${npcType}-${index}`,
                friction: NPC_FRICTION,
                frictionAir: NPC_FRICTION_AIR,
                restitution: NPC_RESTITUTION,
                density: NPC_DENSITY,
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
                    // Apply walking force
                    const walkForce = Vector.create(NPC_MOVE_FORCE * this.direction, 0);
                    Body.applyForce(this.body, this.body.position, walkForce);
                    
                    // Occasionally jump
                    if (Math.random() < 0.01 && now - this.lastJump > 3000) {
                        const jumpForce = Vector.create(0, -NPC_JUMP_FORCE);
                        Body.applyForce(this.body, this.body.position, jumpForce);
                        this.lastJump = now;
                    }
                    break;
                    
                case 'fleeing':
                    // Determine direction away from player
                    const fleeDir = Vector.normalise(Vector.sub(this.body.position, player.position));
                    const fleeForce = Vector.mult(fleeDir, NPC_MOVE_FORCE * 2); // Flee faster
                    Body.applyForce(this.body, this.body.position, fleeForce);
                    
                    // Jump more frequently when fleeing
                    if (Math.random() < 0.03 && now - this.lastJump > 1500) {
                        const jumpForce = Vector.create(0, -NPC_JUMP_FORCE * 1.2);
                        Body.applyForce(this.body, this.body.position, jumpForce);
                        this.lastJump = now;
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
                        "This is madness!"
                    ];
                    break;
                case 'farmer':
                    messages = [
                        "Get off my land!",
                        "My crops!",
                        "Darn kids these days...",
                        "Stop that ruckus!",
                        "You're worse than those goats!"
                    ];
                    break;
                case 'scientist':
                    messages = [
                        "Fascinating specimen!",
                        "This defies physics!",
                        "I must document this!",
                        "For science!",
                        "My research is ruined!"
                    ];
                    break;
                case 'tourist':
                    messages = [
                        "This wasn't in the brochure!",
                        "I should've gone to Hawaii...",
                        "Can I take a selfie with you?",
                        "Is this part of the tour?",
                        "Five stars, very exciting!"
                    ];
                    break;
                default:
                    messages = [
                        "Hello there!",
                        "What's happening?",
                        "Oh my!",
                        "This is crazy!",
                        "I didn't sign up for this!"
                    ];
            }
            
            // Say a random message
            this.speak(messages[Math.floor(Math.random() * messages.length)]);
            this.lastInteraction = now;
            
            // Add chaos score
            updateChaosScore(10);
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
        }
        addToWorld(world) { Composite.add(world, this.body); }
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
                showAngleIndicator: false, // Disabled to remove yellow lines
                showCollisions: false,     // Disabled to remove visual clutter
                showVelocity: false,       // Disabled to remove yellow lines
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
        
        // Set initial camera position to show player
        if (player) {
            // Set initial camera position
            cameraOffset.x = Math.max(0, player.position.x - render.options.width / 2);
            cameraOffset.y = Math.max(0, player.position.y - render.options.height / 2);
            
            // Update render bounds
            render.bounds.min.x = cameraOffset.x;
            render.bounds.min.y = cameraOffset.y;
            render.bounds.max.x = cameraOffset.x + render.options.width;
            render.bounds.max.y = cameraOffset.y + render.options.height;
            
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
        
        // Clear liquified particles
        if (liquifiedParticlesArray.length > 0) {
            liquifiedParticlesArray.forEach(particle => {
                if (particle && Composite.get(world, particle.id, particle.type)) {
                    Composite.remove(world, particle);
                }
            });
            liquifiedParticlesArray = [];
            window.liquifiedParticlesArray = liquifiedParticlesArray;
        }
        
        // Clear liquifier objects
        if (liquifierObjectsArray.length > 0) {
            liquifierObjectsArray.forEach(obj => {
                if (obj && Composite.get(world, obj.id, obj.type)) {
                    Composite.remove(world, obj);
                }
            });
            liquifierObjectsArray = [];
        }
        
        // Clear cleaner objects
        if (cleanerObjectsArray.length > 0) {
            cleanerObjectsArray.forEach(obj => {
                if (obj && Composite.get(world, obj.id, obj.type)) {
                    Composite.remove(world, obj);
                }
            });
            cleanerObjectsArray = [];
        }
    }
    
    function createPlayer() {
        // Position player on the ground level instead of on the platform
        const playerX = BASE_GAME_WIDTH * 0.25;
        const playerY = BASE_GAME_HEIGHT - GROUND_HEIGHT - VITA_HEIGHT - 10; // Just above the ground
        
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
        
        // Create liquifier objects
        createLiquifierObjects();
        
        // Create cleaner objects
        createCleanerObjects();
        
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
        
        // Action buttons with functionality
        const actions = [
            { name: 'Jump', color: '#4169E1', action: jumpPlayer },
            { name: 'Kick', color: '#FF6347', action: kickAction },
            { name: 'Grab', color: '#32CD32', action: grabAction },
            { name: 'Weld', color: '#FFD700', action: weldAction, fontSize: '14px' }, // New Weld button
            { name: 'Liquify', color: '#40E0D0', action: liquifyNearestObject, fontSize: '14px', glow: true },
            { name: 'Clean', color: '#FA8072', action: cleanupNearbyLooseItems, fontSize: '14px', glow: true }
        ];
        
        actions.forEach(actionObj => {
            const button = document.createElement('div');
            button.id = `${actionObj.name.toLowerCase()}-button`;
            button.style.width = '60px';
            button.style.height = '60px';
            button.style.borderRadius = '30px';
            button.style.border = '2px solid rgba(255,255,255,0.3)';
            button.style.backgroundColor = actionObj.color;
            button.style.display = 'flex';
            button.style.justifyContent = 'center';
            button.style.alignItems = 'center';
            button.style.color = 'white';
            button.style.fontSize = actionObj.fontSize || '12px';
            button.style.fontWeight = 'bold';
            button.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
            button.style.boxShadow = actionObj.glow ? 
                `0 0 10px ${actionObj.color}, 0 4px 6px rgba(0,0,0,0.3)` : 
                '0 4px 6px rgba(0,0,0,0.3)';
            button.style.pointerEvents = 'auto'; // Make it interactive
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
        pauseButton.style.top = '10px';
        pauseButton.style.right = '10px';
        pauseButton.style.width = '40px';
        pauseButton.style.height = '40px';
        pauseButton.style.borderRadius = '20px';
        pauseButton.style.border = 'none';
        pauseButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        pauseButton.style.color = 'white';
        pauseButton.style.fontSize = '20px';
        pauseButton.style.fontWeight = 'bold';
        pauseButton.style.cursor = 'pointer';
        pauseButton.style.zIndex = '1000';
        pauseButton.style.pointerEvents = 'auto';
        
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
        
        // Pause menu title
        const menuTitle = document.createElement('h2');
        menuTitle.textContent = 'PAUSED';
        menuTitle.style.color = 'white';
        menuTitle.style.margin = '0 0 15px 0';
        menuTitle.style.fontFamily = 'Arial, sans-serif';
        
        // Create speed controls for the menu
        createSpeedControlsForMenu();
        
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
        
        // Add event listeners
        resumeButton.addEventListener('click', function() {
            togglePauseMenu();
        });
        
        restartButton.addEventListener('click', function() {
            togglePauseMenu();
            gameAPI.resetGame();
        });
        
        // Assemble the menu
        pauseMenu.appendChild(menuTitle);
        pauseMenu.appendChild(speedControlsInMenu);
        pauseMenu.appendChild(resumeButton);
        pauseMenu.appendChild(restartButton);
        
        gameContainer.appendChild(pauseMenu);
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
                    
                    // All objects get the same kick force now
                    // Apply kick force with speed multiplier - increased for more dramatic effect
                    const kickForce = Vector.mult(direction, KICK_FORCE_MAGNITUDE * speedMultiplier * 1.5);
                    Body.applyForce(body, body.position, kickForce);
                    
                    // Add some spin for more dramatic effect
                    Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
                    
                    // Log kick for debugging
                    console.log(`Kicked object ${body.label} with force: ${(KICK_FORCE_MAGNITUDE * speedMultiplier * 1.5).toFixed(5)}`);
                    
                    // Increase chaos score
                    updateChaosScore(10);
                    
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
        return {
            x: (worldPos.x - render.bounds.min.x) * render.options.width / (render.bounds.max.x - render.bounds.min.x),
            y: (worldPos.y - render.bounds.min.y) * render.options.height / (render.bounds.max.y - render.bounds.min.y)
        };
    }
    
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
    
    function weldAction() {
        if (!player || !heldObject) {
            console.log("Weld action: Player needs to be holding an object first.");
            // Optionally, provide feedback to the player (e.g., flash weld button red)
            const weldButton = document.getElementById('weld-button');
            if (weldButton) {
                const originalColor = weldButton.style.backgroundColor;
                weldButton.style.backgroundColor = '#FF0000'; // Red flash
                setTimeout(() => {
                    weldButton.style.backgroundColor = originalColor;
                }, 300);
            }
            return;
        }

        const objectA = heldObject; // The object player is holding

        // Find the nearest dynamic, non-static object to weld to (excluding player and objectA)
        let targetObjectB = null;
        let minDistanceSq = Infinity;
        const allBodies = Composite.allBodies(world);

        allBodies.forEach(body => {
            if (body === player || body === objectA || body.isStatic || body.isSensor || body.label.startsWith('particle-')) {
                return;
            }
            const distSq = Vector.magnitudeSquared(Vector.sub(body.position, objectA.position));
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                targetObjectB = body;
            }
        });

        if (targetObjectB && minDistanceSq < (GRAB_RADIUS + 50) * (GRAB_RADIUS + 50)) { // Check if target is reasonably close
            // 1. Release objectA from player's grab
            if (grabConstraint) {
                Composite.remove(world, grabConstraint);
                grabConstraint = null;
            }
            // Restore original collision filters if they were changed for grabbing
            if (objectA.originalCollisionFilter) {
                Body.set(objectA, 'collisionFilter', objectA.originalCollisionFilter);
                delete objectA.originalCollisionFilter;
            }
            if (player.originalCollisionFilterForGrab) { // Assuming player's filter was also changed
                 Body.set(player, 'collisionFilter', player.originalCollisionFilterForGrab);
                 delete player.originalCollisionFilterForGrab;
            }
            heldObject = null; // Player is no longer holding it for welding

            // 2. Calculate Attachment Position and Constraint Points
            const boundsA = objectA.bounds;
            const boundsB = targetObjectB.bounds;
            const wA = boundsA.max.x - boundsA.min.x;
            const hA = boundsA.max.y - boundsA.min.y;
            const wB = boundsB.max.x - boundsB.min.x;
            const hB = boundsB.max.y - boundsB.min.y;

            // Simplified: Attach to the closest side. For now, let's try attaching A to the right of B.
            // A more robust solution would check all 4 sides and pick the best fit.
            // This example attaches objectA's left side to objectB's right side.

            const newPositionA = {
                x: boundsB.max.x + wA / 2 + 1, // +1 for a tiny gap
                y: targetObjectB.position.y // Align vertical centers
            };
            Body.setPosition(objectA, newPositionA);
            Body.setVelocity(objectA, { x: 0, y: 0 }); // Stop movement
            Body.setAngularVelocity(objectA, 0);

            const pointA = { x: -wA / 2, y: 0 }; // Mid-left of A
            const pointB = { x: wB / 2, y: 0 };  // Mid-right of B

            // 3. Create Weld Constraint
            const weldConstraint = Constraint.create({
                bodyA: objectA,
                bodyB: targetObjectB,
                pointA: pointA,
                pointB: pointB,
                length: 1, // Small length to keep them "touching"
                stiffness: 0.9, // High stiffness for a rigid connection
                damping: 0.1,
                render: { visible: false } // Constraint not visible
            });
            Composite.add(world, weldConstraint);
            weldConstraintsArray.push(weldConstraint);

            // 4. Collision Filtering (Optional but recommended for stability)
            // Make them part of the same collision group so they don't push each other apart
            const weldGroup = Body.nextGroup(true); // Get a new unique negative group
            Body.set(objectA, 'collisionFilter', { ...objectA.collisionFilter, group: weldGroup });
            Body.set(targetObjectB, 'collisionFilter', { ...targetObjectB.collisionFilter, group: weldGroup });

            console.log(`Welded ${objectA.label} to ${targetObjectB.label}`);
            updateChaosScore(20); // Score for successful weld
        } else {
            console.log("Weld action: No suitable target object found nearby.");
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
                
                // Check for player collisions with objects
                if (pair.bodyA === player || pair.bodyB === player) {
                    const otherBody = pair.bodyA === player ? pair.bodyB : pair.bodyA;
                    
                    // Increase chaos score for player collisions
                    if (!otherBody.isStatic) {
                        updateChaosScore(1);
                        
                        // NPC collision handling removed
                    }
                }
                
                // NPC collision handling removed
            }
        });
        
        // Add update event for camera following and object respawning
        Events.on(engine, 'afterUpdate', function() {
            if (player) {
                updateCamera();
                checkObjectsForRespawn();
            }
        });
    }
    
    function updateCamera() {
        if (!player) return;
        
        // Calculate target camera position (centered on player)
        targetCameraOffset.x = player.position.x - render.options.width / 2;
        targetCameraOffset.y = player.position.y - render.options.height / 2;
        
        // Constrain camera to game world bounds with padding
        targetCameraOffset.x = Math.max(0, Math.min(targetCameraOffset.x, BASE_GAME_WIDTH - render.options.width));
        targetCameraOffset.y = Math.max(0, Math.min(targetCameraOffset.y, BASE_GAME_HEIGHT - render.options.height));
        
        // Smooth camera movement
        cameraOffset.x += (targetCameraOffset.x - cameraOffset.x) * cameraSmoothing;
        cameraOffset.y += (targetCameraOffset.y - cameraOffset.y) * cameraSmoothing;
        
        // Update render bounds
        render.bounds.min.x = cameraOffset.x;
        render.bounds.min.y = cameraOffset.y;
        render.bounds.max.x = cameraOffset.x + render.options.width;
        render.bounds.max.y = cameraOffset.y + render.options.height;
        
        // Log camera position occasionally (every ~5 seconds) for debugging
        if (Math.random() < 0.01) {
            console.log(`Camera position: (${cameraOffset.x.toFixed(0)}, ${cameraOffset.y.toFixed(0)})`);
            console.log(`Player position: (${player.position.x.toFixed(0)}, ${player.position.y.toFixed(0)})`);
            console.log(`Render bounds: (${render.bounds.min.x.toFixed(0)}, ${render.bounds.min.y.toFixed(0)}) to (${render.bounds.max.x.toFixed(0)}, ${render.bounds.max.y.toFixed(0)})`);
        }
    }
    
    function checkObjectsForRespawn() {
        const bodies = Composite.allBodies(world);
        
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

    // Attempt to initialize the game when the DOM is ready.
    document.addEventListener('DOMContentLoaded', tryInitializeGame);

    // Expose a manual init for debugging if needed, or if called by HTML after orientation change
    gameAPI.ensureInitialized = function() {
        if (!gameHasBeenInitialized) {
            console.log("Vita Chaos Mobile: gameAPI.ensureInitialized() called, trying to initialize.");
            tryInitializeGame();
        }
    };
    
    // Expose reset function
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
        // Clear any existing weld constraints
        weldConstraintsArray.forEach(constraint => {
            Composite.remove(world, constraint);
        });
        weldConstraintsArray = [];
        console.log("Vita Chaos Mobile: Cleared weld constraints.");
    };
    
    // --- Liquify and Clean Mechanics ---
    
    // Helper function to safely remove a body from the world
    function removeBody(body, removeFromArray = true, checkExists = true) {
        if (!body) return false;
        
        // Check if the body exists in the world
        if (checkExists && !Composite.get(world, body.id, body.type)) {
            return false;
        }
        
        // Remove from world
        Composite.remove(world, body);
        
        // Remove from appropriate array if requested
        if (removeFromArray) {
            if (body.label) {
                if (body.label.startsWith('Box-')) {
                    boxStack = boxStack.filter(box => box.body !== body);
                } else if (body.label.startsWith('Ball-') || body.label.startsWith('BouncyBall-')) {
                    bouncyBallsArray = bouncyBallsArray.filter(ball => ball.body !== body);
                } else if (body.label.startsWith('Frog-')) {
                    frogStack = frogStack.filter(frog => frog.body !== body);
                } else if (body.label.startsWith('Foofoo-')) {
                    foofooStack = foofooStack.filter(foofoo => foofoo.body !== body);
                } else if (body.label.startsWith(FORCE_TRIANGLE_LABEL)) {
                    forceTrianglesArray = forceTrianglesArray.filter(triangle => triangle.body !== body);
                } else if (body.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX)) {
                    liquifierObjectsArray = liquifierObjectsArray.filter(obj => obj !== body);
                } else if (body.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX)) {
                    cleanerObjectsArray = cleanerObjectsArray.filter(obj => obj !== body);
                }
            }
        }
        
        return true;
    }
    
    // Helper function to get object color
    function getObjectColor(body) {
        if (body.render && body.render.fillStyle) {
            return body.render.fillStyle;
        }
        
        // Default colors based on object type
        if (body.label) {
            if (body.label.startsWith('Box')) return '#FF5733'; // Orange-Red for Boxes
            if (body.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX)) return LIQUIFIER_OBJECT_COLOR;
            if (body.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX)) return CLEANER_OBJECT_COLOR;
            if (body.label.startsWith('Ball') || body.label.startsWith('BouncyBall')) return '#3498DB'; // Blue for Balls
            if (body.label.startsWith(FORCE_TRIANGLE_LABEL)) return TRIANGLE_COLOR;
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
    
    function liquifyBody(bodyToLiquify) {
        if (!bodyToLiquify || bodyToLiquify.isStatic || bodyToLiquify === player || 
            bodyToLiquify.isSensor || (bodyToLiquify.label && bodyToLiquify.label.startsWith('particle-'))) {
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
        
        return true;
    }
    
    function liquifyNearestObject() {
        if (!player) {
            console.log("Liquify failed: No player found");
            return false;
        }
        
        // Find objects within liquify radius
        const bodies = Composite.allBodies(world);
        const playerPos = player.position;
        let nearestObject = null;
        let minDistance = LIQUIFY_RADIUS;
        
        console.log(`Liquify: Searching among ${bodies.length} bodies in world`);
        
        for (let body of bodies) {
            // Skip if it's the player, static, a sensor, or a particle
            if (body === player || body.isStatic || body.isSensor || 
                (body.label && (
                    body.label.startsWith('particle-') || 
                    body.label.startsWith(LIQUIFIER_OBJECT_LABEL_PREFIX) || 
                    body.label.startsWith(CLEANER_OBJECT_LABEL_PREFIX)
                ))) {
                continue;
            }
            
            // Calculate distance
            const distance = Vector.magnitude(Vector.sub(body.position, playerPos));
            
            // If it's within range and closer than any previous object
            if (distance < minDistance) {
                minDistance = distance;
                nearestObject = body;
                console.log(`Liquify: Found potential object: ${body.label || 'Unlabeled'} at distance ${distance.toFixed(2)}`);
            }
        }
        
        // If we found an object to liquify
        if (nearestObject) {
            console.log(`Attempting to liquify object: ${nearestObject.label || 'Unknown'}`);
            
            // Liquify the object
            if (liquifyBody(nearestObject)) {
                // Create a liquify effect
                createLiquifyEffect(nearestObject.position);
                return true;
            } else {
                console.log("Liquify failed: Object could not be liquified");
            }
        } else {
            console.log("No objects within liquify radius");
        }
        
        return false;
    }
    
    function cleanupNearbyLooseItems() {
        if (!player) return;
        
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
        
        // Position at the center of the cleaning action
        const screenPos = worldToScreen(position);
        cleanEffect.style.left = screenPos.x + 'px';
        cleanEffect.style.top = screenPos.y + 'px';
        
        // Add to game container
        if (gameContainer) {
            gameContainer.appendChild(cleanEffect);
            
            // Animate expansion and fade
            setTimeout(() => {
                cleanEffect.style.transition = 'all 0.3s ease-out';
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
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            
            // Position at the center of the liquified object
            const screenPos = worldToScreen(position);
            particle.style.left = screenPos.x + 'px';
            particle.style.top = screenPos.y + 'px';
            
            // Add to game container
            if (gameContainer) {
                gameContainer.appendChild(particle);
                
                // Animate particle
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 40;
                const duration = 300 + Math.random() * 200;
                
                setTimeout(() => {
                    particle.style.transition = `all ${duration}ms ease-out`;
                    particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
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
    
    // Create liquifier objects
    function createLiquifierObjects() {
        for (let i = 0; i < NUM_LIQUIFIERS; i++) {
            const x = Math.random() * BASE_GAME_WIDTH;
            const y = Math.random() * BASE_GAME_HEIGHT / 2; // Place in upper half of world
            
            const liquifier = Bodies.circle(x, y, LIQUIFIER_OBJECT_SIZE, {
                label: `${LIQUIFIER_OBJECT_LABEL_PREFIX}-${i}`,
                isStatic: false,
                isSensor: false,
                friction: 0.05,
                frictionAir: 0.02,
                restitution: 0.8,
                density: 0.001,
                render: {
                    fillStyle: LIQUIFIER_OBJECT_COLOR,
                    strokeStyle: '#000000',
                    lineWidth: 1
                }
            });
            Composite.add(world, liquifier);
            liquifierObjectsArray.push(liquifier);
        }
        console.log(`Vita Chaos Mobile: Created ${liquifierObjectsArray.length} liquifier objects`);
    }
    
    // Create cleaner objects
    function createCleanerObjects() {
        for (let i = 0; i < NUM_CLEANERS; i++) {
            const x = Math.random() * BASE_GAME_WIDTH;
            const y = Math.random() * BASE_GAME_HEIGHT / 2; // Place in upper half of world
            
            const cleaner = Bodies.circle(x, y, CLEANER_OBJECT_SIZE, {
                label: `${CLEANER_OBJECT_LABEL_PREFIX}-${i}`,
                isStatic: false,
                isSensor: false,
                friction: 0.05,
                frictionAir: 0.02,
                restitution: 0.8,
                density: 0.001,
                render: {
                    fillStyle: CLEANER_OBJECT_COLOR,
                    strokeStyle: '#000000',
                    lineWidth: 1
                }
            });
            Composite.add(world, cleaner);
            cleanerObjectsArray.push(cleaner);
        }
        console.log(`Vita Chaos Mobile: Created ${cleanerObjectsArray.length} cleaner objects`);
    }

})(window.gameAPI);