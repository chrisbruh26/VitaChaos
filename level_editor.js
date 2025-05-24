// Vita Chaos Level Editor
// This file provides a visual editor for placing objects in the game

class VitaChaosLevelEditor {
    constructor(gameConfig) {
        this.gameConfig = gameConfig;
        this.editorActive = false;
        this.selectedObjectType = null;
        this.objectTypes = [
            { name: 'Box', class: 'Box', icon: '📦' },
            { name: 'BouncyBall', class: 'BouncyBall', icon: '🔴' },
            { name: 'Frog', class: 'Frog', icon: '🐸' },
            { name: 'Foofoo', class: 'Foofoo', icon: '🐱' },
            { name: 'ForceTriangle', class: 'ForceTriangle', icon: '🔺' },
            { name: 'Platform', class: 'CustomPlatform', icon: '📏' },
            { name: 'BouncyPlatform', class: 'BouncyPlatform', icon: '🔵' }
        ];
        
        // Store all placed objects
        this.placedObjects = [];
        
        // Reference to the game's Matter.js world
        this.world = null;
        
        // Editor DOM elements
        this.editorContainer = null;
        this.objectPanel = null;
        this.propertiesPanel = null;
        this.coordinatesDisplay = null;
        this.objectsList = null;
        this.modeIndicator = null;
        
        // Current object being placed/edited
        this.currentObject = null;
        this.isDragging = false;
        
        // Editor modes
        this.editorMode = 'place'; // 'place', 'delete', 'select'
        this.selectedObjectId = null;
        
        // Grid settings
        this.gridSize = 20; // Size of grid cells in pixels
        this.snapToGrid = true;
        
        // Preview object (ghost object that follows mouse)
        this.previewObject = null;
        
        // Keyboard state
        this.keysPressed = {};
        
        // Object deletion highlight
        this.highlightedObject = null;
    }
    
    // Initialize the editor
    initialize(world, render) {
        this.world = world;
        this.render = render;
        
        // Create editor UI
        this.createEditorUI();
        
        // Add event listeners
        this.addEventListeners();
        
        console.log('Level Editor initialized');
    }
    
    // Create the editor UI elements
    createEditorUI() {
        // Main editor container
        this.editorContainer = document.createElement('div');
        this.editorContainer.id = 'level-editor';
        this.editorContainer.style.position = 'absolute';
        this.editorContainer.style.top = '0';
        this.editorContainer.style.right = '0';
        this.editorContainer.style.width = '300px';
        this.editorContainer.style.height = '100%';
        this.editorContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.editorContainer.style.color = 'white';
        this.editorContainer.style.padding = '10px';
        this.editorContainer.style.boxSizing = 'border-box';
        this.editorContainer.style.zIndex = '1000';
        this.editorContainer.style.overflowY = 'auto';
        this.editorContainer.style.display = 'none'; // Hidden by default
        
        // Editor header
        const header = document.createElement('div');
        header.innerHTML = '<h2>Vita Chaos Level Editor</h2>';
        this.editorContainer.appendChild(header);
        
        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Close Editor';
        toggleButton.style.padding = '8px';
        toggleButton.style.marginBottom = '10px';
        toggleButton.style.width = '100%';
        toggleButton.addEventListener('click', () => this.toggleEditor());
        this.editorContainer.appendChild(toggleButton);
        
        // Editor mode indicator
        this.modeIndicator = document.createElement('div');
        this.modeIndicator.style.backgroundColor = '#4CAF50';
        this.modeIndicator.style.color = 'white';
        this.modeIndicator.style.padding = '5px';
        this.modeIndicator.style.borderRadius = '3px';
        this.modeIndicator.style.marginBottom = '10px';
        this.modeIndicator.style.textAlign = 'center';
        this.modeIndicator.style.fontWeight = 'bold';
        this.modeIndicator.textContent = 'Mode: Place (P)';
        this.editorContainer.appendChild(this.modeIndicator);
        
        // Editor controls help
        const controlsHelp = document.createElement('div');
        controlsHelp.style.backgroundColor = '#333';
        controlsHelp.style.padding = '8px';
        controlsHelp.style.borderRadius = '3px';
        controlsHelp.style.marginBottom = '10px';
        controlsHelp.style.fontSize = '12px';
        controlsHelp.innerHTML = `
            <strong>Keyboard Controls:</strong>
            <ul style="margin: 5px 0; padding-left: 20px;">
                <li>P: Place mode</li>
                <li>D: Delete mode</li>
                <li>S: Select mode</li>
                <li>Enter: Place object</li>
                <li>Escape: Cancel placement</li>
                <li>Delete / Backspace: Delete selected object</li>
                <li>C: Clear all objects</li>
            </ul>
        `;
        this.editorContainer.appendChild(controlsHelp);
        
        // Grid settings
        const gridSettings = document.createElement('div');
        gridSettings.style.marginBottom = '10px';
        
        const gridSizeLabel = document.createElement('label');
        gridSizeLabel.textContent = 'Grid Size: ';
        const gridSizeInput = document.createElement('input');
        gridSizeInput.type = 'number';
        gridSizeInput.min = '5';
        gridSizeInput.max = '100';
        gridSizeInput.value = this.gridSize;
        gridSizeInput.style.width = '60px';
        gridSizeInput.addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
        });
        
        const snapCheckbox = document.createElement('input');
        snapCheckbox.type = 'checkbox';
        snapCheckbox.checked = this.snapToGrid;
        snapCheckbox.id = 'snap-to-grid';
        snapCheckbox.addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });
        
        const snapLabel = document.createElement('label');
        snapLabel.htmlFor = 'snap-to-grid';
        snapLabel.textContent = 'Snap to Grid';
        
        gridSettings.appendChild(gridSizeLabel);
        gridSettings.appendChild(gridSizeInput);
        gridSettings.appendChild(document.createElement('br'));
        gridSettings.appendChild(snapCheckbox);
        gridSettings.appendChild(snapLabel);
        
        this.editorContainer.appendChild(gridSettings);
        
        // Object type selection
        const objectTypeSelector = document.createElement('div');
        objectTypeSelector.innerHTML = '<h3>Object Types</h3>';
        
        const objectTypeList = document.createElement('div');
        objectTypeList.style.display = 'flex';
        objectTypeList.style.flexWrap = 'wrap';
        objectTypeList.style.gap = '5px';
        objectTypeList.style.marginBottom = '10px';
        
        this.objectTypes.forEach(type => {
            const typeButton = document.createElement('button');
            typeButton.textContent = `${type.icon} ${type.name}`;
            typeButton.style.padding = '5px';
            typeButton.style.flex = '1 0 45%';
            typeButton.addEventListener('click', () => this.selectObjectType(type));
            objectTypeList.appendChild(typeButton);
        });
        
        objectTypeSelector.appendChild(objectTypeList);
        this.editorContainer.appendChild(objectTypeSelector);
        
        // Properties panel for the selected object
        this.propertiesPanel = document.createElement('div');
        this.propertiesPanel.innerHTML = '<h3>Properties</h3><p>Select an object type first</p>';
        this.editorContainer.appendChild(this.propertiesPanel);
        
        // Coordinates display
        this.coordinatesDisplay = document.createElement('div');
        this.coordinatesDisplay.style.position = 'absolute';
        this.coordinatesDisplay.style.bottom = '10px';
        this.coordinatesDisplay.style.left = '10px';
        this.coordinatesDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.coordinatesDisplay.style.color = 'white';
        this.coordinatesDisplay.style.padding = '5px';
        this.coordinatesDisplay.style.borderRadius = '3px';
        this.coordinatesDisplay.style.zIndex = '1000';
        this.coordinatesDisplay.style.display = 'none';
        
        // Placed objects list
        this.objectsList = document.createElement('div');
        this.objectsList.innerHTML = '<h3>Placed Objects</h3>';
        
        // Add clear all button
        const clearAllButton = document.createElement('button');
        clearAllButton.textContent = 'Clear All Objects';
        clearAllButton.style.padding = '5px';
        clearAllButton.style.marginBottom = '10px';
        clearAllButton.style.width = '100%';
        clearAllButton.style.backgroundColor = '#f44336';
        clearAllButton.style.color = 'white';
        clearAllButton.style.border = 'none';
        clearAllButton.style.borderRadius = '3px';
        clearAllButton.addEventListener('click', () => this.clearAllObjects());
        
        this.objectsList.appendChild(clearAllButton);
        this.objectsList.appendChild(document.createElement('ul')).id = 'placed-objects-list';
        this.editorContainer.appendChild(this.objectsList);
        
        // Export/Import buttons
        const exportImportDiv = document.createElement('div');
        exportImportDiv.style.marginTop = '20px';
        
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Export Level';
        exportButton.style.padding = '8px';
        exportButton.style.marginRight = '10px';
        exportButton.addEventListener('click', () => this.exportLevel());
        
        const importButton = document.createElement('button');
        importButton.textContent = 'Import Level';
        importButton.style.padding = '8px';
        importButton.addEventListener('click', () => this.importLevel());
        
        exportImportDiv.appendChild(exportButton);
        exportImportDiv.appendChild(importButton);
        this.editorContainer.appendChild(exportImportDiv);
        
        // Add the editor container to the document
        document.body.appendChild(this.editorContainer);
        document.body.appendChild(this.coordinatesDisplay);
        
        // Create floating toggle button (always visible)
        const floatingToggle = document.createElement('button');
        floatingToggle.textContent = 'Level Editor';
        floatingToggle.style.position = 'absolute';
        floatingToggle.style.top = '10px';
        floatingToggle.style.right = '10px';
        floatingToggle.style.padding = '8px';
        floatingToggle.style.zIndex = '1001';
        floatingToggle.addEventListener('click', () => this.toggleEditor());
        document.body.appendChild(floatingToggle);
    }
    
    // Toggle the editor visibility
    toggleEditor() {
        this.editorActive = !this.editorActive;
        this.editorContainer.style.display = this.editorActive ? 'block' : 'none';
        
        if (this.editorActive) {
            // Pause the game when editor is active
            if (typeof pauseGame === 'function') {
                pauseGame();
            }
            
            // Update the objects list
            this.updateObjectsList();
            
            // Set default mode
            this.setEditorMode('place');
        } else {
            // Resume the game when editor is closed
            if (typeof resumeGame === 'function') {
                resumeGame();
            }
            
            // Hide coordinates display
            this.coordinatesDisplay.style.display = 'none';
            
            // Clear any preview objects
            this.clearPreviewObject();
            
            // Reset mode
            this.isDragging = false;
            this.currentObject = null;
        }
    }
    
    // Set the editor mode
    setEditorMode(mode) {
        this.editorMode = mode;
        
        // Update the mode indicator
        switch (mode) {
            case 'place':
                this.modeIndicator.textContent = 'Mode: Place (P)';
                this.modeIndicator.style.backgroundColor = '#4CAF50'; // Green
                break;
            case 'delete':
                this.modeIndicator.textContent = 'Mode: Delete (D)';
                this.modeIndicator.style.backgroundColor = '#f44336'; // Red
                break;
            case 'select':
                this.modeIndicator.textContent = 'Mode: Select (S)';
                this.modeIndicator.style.backgroundColor = '#2196F3'; // Blue
                break;
        }
        
        // Clear any preview objects
        this.clearPreviewObject();
        
        // Reset state
        this.isDragging = false;
        this.currentObject = null;
        this.coordinatesDisplay.style.display = 'none';
        this.highlightedObject = null;
        this.highlightedObjectBody = null; // To store the actual Matter body
    }
    
    // Clear the preview object
    clearPreviewObject() {
        if (this.previewObject) {
            Matter.Composite.remove(this.world, this.previewObject);
            this.previewObject = null;
        }
    }
    
    // Select an object type to place
    selectObjectType(type) {
        this.selectedObjectType = type;
        this.updatePropertiesPanel();
        
        // Switch to place mode
        this.setEditorMode('place');
    }
    
    // Update the properties panel based on selected object type
    updatePropertiesPanel() {
        if (!this.selectedObjectType) {
            this.propertiesPanel.innerHTML = '<h3>Properties</h3><p>Select an object type first</p>';
            return;
        }
        
        this.propertiesPanel.innerHTML = `<h3>${this.selectedObjectType.name} Properties</h3>`;
        
        const form = document.createElement('form');
        form.id = 'object-properties-form';
        
        // Common properties for all objects
        this.addFormField(form, 'label', 'Label', 'text', `${this.selectedObjectType.name}-${Date.now()}`);
        
        // Type-specific properties
        switch (this.selectedObjectType.name) {
            case 'Box':
                this.addFormField(form, 'size', 'Size', 'number', this.gameConfig.BOX_SIZE || 50);
                this.addFormField(form, 'color', 'Color', 'color', '#FF5733');
                break;
                
            case 'BouncyBall':
                this.addFormField(form, 'radius', 'Radius', 'number', this.gameConfig.BOUNCY_BALL_RADIUS || 10);
                this.addFormField(form, 'restitution', 'Bounciness', 'number', this.gameConfig.BOUNCY_BALL_RESTITUTION || 0.5, 0, 1, 0.1);
                this.addFormField(form, 'color', 'Color', 'color', '#3498DB');
                break;
                
            case 'Frog':
                this.addFormField(form, 'size', 'Size', 'number', this.gameConfig.FROG_SIZE || 5);
                break;
                
            case 'Foofoo':
                this.addFormField(form, 'size', 'Size', 'number', this.gameConfig.FOOFOO_SIZE || 4);
                break;
                
            case 'ForceTriangle':
                this.addFormField(form, 'radius', 'Radius', 'number', this.gameConfig.TRIANGLE_RADIUS || 10);
                this.addFormField(form, 'forceMagnitude', 'Force Magnitude', 'number', this.gameConfig.FORCEFIELD_MAGNITUDE || 0.3, 0, 2, 0.1);
                this.addFormField(form, 'color', 'Color', 'color', this.gameConfig.TRIANGLE_COLOR || '#FFD700');
                break;
                
            case 'Platform':
            case 'BouncyPlatform':
                this.addFormField(form, 'width', 'Width', 'number', 200);
                this.addFormField(form, 'height', 'Height', 'number', 30);
                this.addFormField(form, 'color', 'Color', 'color', 
                    this.selectedObjectType.name === 'Platform' ? '#A0522D' : '#FF69B4');
                if (this.selectedObjectType.name === 'BouncyPlatform') {
                    this.addFormField(form, 'restitution', 'Bounciness', 'number', 
                        this.gameConfig.BOUNCY_PLATFORM_RESTITUTION || 0.01, 0, 1, 0.01);
                }
                break;
        }
        
        // Add place button
        const placeButton = document.createElement('button');
        placeButton.type = 'button';
        placeButton.textContent = 'Start Placing (P)';
        placeButton.style.padding = '8px';
        placeButton.style.marginTop = '10px';
        placeButton.style.width = '100%';
        placeButton.addEventListener('click', () => {
            this.setEditorMode('place');
            this.startPlacingObject();
        });
        
        form.appendChild(placeButton);
        this.propertiesPanel.appendChild(form);
    }
    
    // Helper to add form fields
    addFormField(form, name, label, type, defaultValue, min = null, max = null, step = null) {
        const fieldDiv = document.createElement('div');
        fieldDiv.style.marginBottom = '10px';
        
        const fieldLabel = document.createElement('label');
        fieldLabel.textContent = `${label}: `;
        fieldLabel.htmlFor = `property-${name}`;
        
        const fieldInput = document.createElement('input');
        fieldInput.type = type;
        fieldInput.id = `property-${name}`;
        fieldInput.name = name;
        fieldInput.value = defaultValue;
        
        if (type === 'number') {
            fieldInput.style.width = '60px';
            if (min !== null) fieldInput.min = min;
            if (max !== null) fieldInput.max = max;
            if (step !== null) fieldInput.step = step;
        }
        
        fieldDiv.appendChild(fieldLabel);
        fieldDiv.appendChild(fieldInput);
        form.appendChild(fieldDiv);
    }
    
    // Start placing an object
    startPlacingObject() {
        if (!this.selectedObjectType) return;
        
        // Get properties from form
        const form = document.getElementById('object-properties-form');
        const formData = new FormData(form);
        const properties = {};
        
        for (const [key, value] of formData.entries()) {
            const inputElement = form.elements[key]; // Get the form element by name

            if (key === 'label') {
                properties[key] = value; // Label is always a string
            } else if (inputElement && inputElement.type === 'color') { // Check input type for color
                properties[key] = value; // Color is a string, store as is
            } else {
                properties[key] = parseFloat(value); // Other properties are numbers
            }
        }
        
        this.currentObject = {
            type: this.selectedObjectType,
            properties: properties,
            position: { x: 0, y: 0 }
        };
        
        // Show coordinates display
        this.coordinatesDisplay.style.display = 'block';
        
        // Enable placement mode
        this.isDragging = true;
    }
    
    // Add event listeners for mouse interaction
    addEventListeners() {
        // Mouse move event for object placement and deletion
        document.addEventListener('mousemove', (e) => {
            if (!this.editorActive) return;
            
            // Get mouse position relative to canvas
            const canvas = this.render.canvas;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            let x = (e.clientX - rect.left) * scaleX;
            let y = (e.clientY - rect.top) * scaleY;
            
            // Snap to grid if enabled
            if (this.snapToGrid) {
                x = Math.round(x / this.gridSize) * this.gridSize;
                y = Math.round(y / this.gridSize) * this.gridSize;
            }
            
            // Update coordinates display
            this.coordinatesDisplay.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
            this.coordinatesDisplay.style.left = `${e.clientX + 5}px`; // Reduced offset
            this.coordinatesDisplay.style.top = `${e.clientY + 5}px`;  // Reduced offset
            
            if (this.editorMode === 'place' && this.isDragging && this.currentObject) {
                // Update current object position
                this.currentObject.position = { x, y };
                
                // Show coordinates display
                this.coordinatesDisplay.style.display = 'block';
                
                // Update preview object
                this.updatePreviewObject(x, y);
            } else if (this.editorMode === 'delete') {
                // Show coordinates display
                this.coordinatesDisplay.style.display = 'block';
                
                // Highlight object under cursor for deletion
                this.highlightObjectUnderCursor(x, y);
            }
        });
        
        // Mouse click event for placing/deleting objects
        document.addEventListener('click', (e) => {
            if (!this.editorActive) return;
            
            // Don't do anything if clicking on the editor UI
            if (e.target.closest('#level-editor')) return;
            
            // Get mouse position relative to canvas
            const canvas = this.render.canvas;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            let x = (e.clientX - rect.left) * scaleX;
            let y = (e.clientY - rect.top) * scaleY;
            
            // Snap to grid if enabled
            if (this.snapToGrid) {
                x = Math.round(x / this.gridSize) * this.gridSize;
                y = Math.round(y / this.gridSize) * this.gridSize;
            }
            
            if (this.editorMode === 'place' && this.isDragging && this.currentObject) {
                // Place the object
                this.placeObject();
                
                // Keep placement mode active for multiple placements
                this.startPlacingObject();
            } else if (this.editorMode === 'delete') {
                // Delete the object under the cursor
                this.deleteObjectAtPosition(x, y);
            }
        });
        
        // Keyboard events for editor controls
        document.addEventListener('keydown', (e) => {
            if (!this.editorActive) return;
            
            this.keysPressed[e.key.toLowerCase()] = true;
            
            // Mode switching
            if (e.key === 'p' || e.key === 'P') {
                this.setEditorMode('place');
                if (this.selectedObjectType) {
                    this.startPlacingObject();
                }
            } else if (e.key === 'd' || e.key === 'D') {
                this.setEditorMode('delete');
            } else if (e.key === 's' || e.key === 'S') {
                this.setEditorMode('select');
            }
            
            // Object placement
            if (e.key === 'Enter' && this.editorMode === 'place' && this.isDragging && this.currentObject) {
                this.placeObject();
                this.startPlacingObject(); // Continue placing
            }
            
            // Cancel placement
            if (e.key === 'Escape') {
                this.isDragging = false;
                this.currentObject = null;
                this.coordinatesDisplay.style.display = 'none';
                this.clearPreviewObject();
            }
            
            // Delete selected object
            if (e.key === 'Delete' && this.highlightedObject) {
                this.deleteObject(this.highlightedObject.id);
                this.highlightedObject = null;
            }
            
            // Clear all objects
            if (e.key === 'c' || e.key === 'C') {
                if (confirm('Are you sure you want to clear all objects?')) {
                    this.clearAllObjects();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keysPressed[e.key.toLowerCase()] = false;
        });
        
        // Right-click to cancel placement
        document.addEventListener('contextmenu', (e) => {
            if (!this.editorActive) return;
            
            e.preventDefault();
            
            if (this.editorMode === 'place' && this.isDragging) {
                this.isDragging = false;
                this.currentObject = null;
                this.coordinatesDisplay.style.display = 'none';
                this.clearPreviewObject();
            }
        });
    }
    
    // Update the preview object
    updatePreviewObject(x, y) {
        // Clear any existing preview
        this.clearPreviewObject();
        
        if (!this.currentObject) return;
        
        const { type, properties } = this.currentObject;
        
        // Create a preview object based on the type
        switch (type.name) {
            case 'Box':
                this.previewObject = Matter.Bodies.rectangle(
                    x, y, properties.size, properties.size,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: properties.color + '80', // Add transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
                
            case 'BouncyBall':
                this.previewObject = Matter.Bodies.circle(
                    x, y, properties.radius,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: properties.color + '80', // Add transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
                
            case 'Frog':
                this.previewObject = Matter.Bodies.rectangle(
                    x, y, properties.size, properties.size,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: '#00FF0080', // Green with transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
                
            case 'Foofoo':
                this.previewObject = Matter.Bodies.rectangle(
                    x, y, properties.size, properties.size,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: '#FF990080', // Orange with transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
                
            case 'ForceTriangle':
                this.previewObject = Matter.Bodies.polygon(
                    x, y, 3, properties.radius,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: properties.color + '80', // Add transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
                
            case 'Platform':
            case 'BouncyPlatform':
                this.previewObject = Matter.Bodies.rectangle(
                    x, y, properties.width, properties.height,
                    {
                        isStatic: true,
                        isSensor: true,
                        render: {
                            fillStyle: properties.color + '80', // Add transparency
                            strokeStyle: '#FFFFFF',
                            lineWidth: 1
                        }
                    }
                );
                break;
        }
        
        // Add the preview object to the world
        if (this.previewObject) {
            Matter.Composite.add(this.world, this.previewObject);
        }
    }
    
    // Highlight object under cursor for deletion
    highlightObjectUnderCursor(x, y) {
        // Reset previous highlight
        if (this.highlightedObjectBody) {
            if (this.highlightedObjectBody.render.originalStrokeStyle !== undefined) {
                this.highlightedObjectBody.render.strokeStyle = this.highlightedObjectBody.render.originalStrokeStyle;
                this.highlightedObjectBody.render.lineWidth = this.highlightedObjectBody.render.originalLineWidth;
                delete this.highlightedObjectBody.render.originalStrokeStyle;
                delete this.highlightedObjectBody.render.originalLineWidth;
            }
        }
        this.highlightedObjectBody = null;

        const point = { x, y };
        let closestBody = null;
        let closestDistance = Infinity;

        // Define labels of objects that should NOT be deleted by clicking.
        // Add all essential ground/wall labels from vitachaos_desktop.js
        const NON_DELETABLE_LABELS = [
            "Vita", "Ground1", "Platform2", "Ground2", "GroundHorizontal", 
            "WallLeft", "WallRight", "Ceiling", "BouncyWallLeft" 
        ];
        // Define prefixes for static objects that ARE deletable.
        const DELETABLE_STATIC_LABEL_PREFIXES = [
            "CustomPlatform", "BouncyPlatform", "GoatArea-" // For GoatArea-Platform, GoatArea-Ramp etc.
        ];

        Matter.Composite.allBodies(this.world).forEach(body => {
            if (NON_DELETABLE_LABELS.includes(body.label)) {
                return; // Skip non-deletable essentials
            }

            // Object is deletable if it's not static, or if it's static and matches a deletable prefix
            const isDeletableStatic = body.isStatic && DELETABLE_STATIC_LABEL_PREFIXES.some(
                prefix => body.label && body.label.startsWith(prefix)
            );

            if (!body.isStatic || isDeletableStatic) {
                const bounds = body.bounds;
                const margin = 10; // Easier selection

                // Check if point is within object bounds (with margin)
                if (Matter.Bounds.contains(bounds, point) ||
                    (point.x >= bounds.min.x - margin && point.x <= bounds.max.x + margin &&
                     point.y >= bounds.min.y - margin && point.y <= bounds.max.y + margin)) {

                    const dx = body.position.x - point.x;
                    const dy = body.position.y - point.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestBody = body;
                    }
                }
            }
        });

        if (closestBody) {
            // Store original styles before applying highlight
            closestBody.render.originalStrokeStyle = closestBody.render.strokeStyle || (closestBody.render.fillStyle ? '#FFFFFF' : '#000000'); // Default based on fill
            closestBody.render.originalLineWidth = closestBody.render.lineWidth || 1;

            closestBody.render.strokeStyle = '#FF0000'; // Red highlight
            closestBody.render.lineWidth = 3;
            this.highlightedObjectBody = closestBody;
            this.coordinatesDisplay.textContent = `Delete: ${closestBody.label || 'Unnamed Object'}`;
        } else {
            // CoordinatesDisplay is updated by the main mousemove listener
        }
    }
    
    // Delete object at position
    deleteObjectAtPosition(x, y) {
        if (this.highlightedObjectBody) {
            const bodyToDelete = this.highlightedObjectBody;

            // Restore original style before removing
            if (bodyToDelete.render.originalStrokeStyle !== undefined) {
                bodyToDelete.render.strokeStyle = bodyToDelete.render.originalStrokeStyle;
                bodyToDelete.render.lineWidth = bodyToDelete.render.originalLineWidth;
                delete bodyToDelete.render.originalStrokeStyle;
                delete bodyToDelete.render.originalLineWidth;
            }

            Matter.Composite.remove(this.world, bodyToDelete);

            // Remove from editor's tracking if it was an editor-placed object
            const editorObjIndex = this.placedObjects.findIndex(obj => obj.body === bodyToDelete);
            if (editorObjIndex !== -1) {
                this.placedObjects.splice(editorObjIndex, 1);
            }

            // Attempt to remove from global game arrays (ensure these are globally accessible)
            const label = bodyToDelete.label || "";
            if (typeof window.boxStack !== 'undefined' && label.startsWith("Box-")) {
                window.boxStack = window.boxStack.filter(b => b !== bodyToDelete);
            } else if (typeof window.bouncyBallsArray !== 'undefined' && (label.startsWith("Ball-") || label.startsWith("BouncyBall-"))) {
                window.bouncyBallsArray = window.bouncyBallsArray.filter(b => b !== bodyToDelete);
            } else if (typeof window.frogStack !== 'undefined' && label.startsWith("Frog-")) {
                window.frogStack = window.frogStack.filter(b => b !== bodyToDelete);
            } else if (typeof window.foofooStack !== 'undefined' && label.startsWith("Foofoo-")) {
                window.foofooStack = window.foofooStack.filter(b => b !== bodyToDelete);
            } else if (typeof window.forceTrianglesArray !== 'undefined' && label.includes("ForceTriangle")) {
                window.forceTrianglesArray = window.forceTrianglesArray.filter(b => b !== bodyToDelete);
            } else if (typeof window.customStaticPlatformObjects !== 'undefined' && (label.startsWith("CustomPlatform") || label.startsWith("GoatArea-Platform") || label.startsWith("GoatArea-Ramp"))) {
                 window.customStaticPlatformObjects = window.customStaticPlatformObjects.filter(b => b !== bodyToDelete);
            } else if (typeof window.bouncyPlatformObjects !== 'undefined' && label.startsWith("BouncyPlatform")) {
                 window.bouncyPlatformObjects = window.bouncyPlatformObjects.filter(b => b !== bodyToDelete);
            }

            this.updateObjectsList();
            this.highlightedObjectBody = null;
            console.log(`Deleted object by click: ${label}`);
        }
    }
    
    // Place the current object in the world
    placeObject() {
        if (!this.currentObject) return;
        
        const { type, properties, position } = this.currentObject;
        
        // Create the object based on its type
        let object;
        
        try {
            switch (type.name) {
                case 'Box':
                    object = new Box(
                        position.x, 
                        position.y, 
                        properties.size, 
                        properties.label,
                        0 // Color index will be handled by the render property
                    );
                    // Override the color
                    object.body.render.fillStyle = properties.color;
                    break;
                    
                case 'BouncyBall':
                    object = new BouncyBall(
                        position.x,
                        position.y,
                        properties.radius,
                        properties.label,
                        0, // Color index
                        1  // Total balls (not important for editor)
                    );
                    // Override properties
                    object.body.restitution = properties.restitution;
                    object.body.render.fillStyle = properties.color;
                    break;
                    
                case 'Frog':
                    object = new Frog(
                        position.x,
                        position.y,
                        properties.size,
                        properties.label
                    );
                    break;
                    
                case 'Foofoo':
                    object = new Foofoo(
                        position.x,
                        position.y,
                        properties.size,
                        properties.label
                    );
                    break;
                    
                case 'ForceTriangle':
                    // Extract a unique suffix for the label.
                    // The class constructor already adds "ForceTriangle-".
                    // properties.label from form is likely "ForceTriangle-TIMESTAMP"
                    let triangleLabelSuffix = properties.label;
                    if (properties.label.startsWith('ForceTriangle-')) {
                        triangleLabelSuffix = properties.label.substring('ForceTriangle-'.length);
                    }

                    object = new ForceTriangle(
                        position.x,
                        position.y,
                        properties.radius,
                        triangleLabelSuffix, // Use the extracted suffix
                        true, // isStatic
                        properties.color
                    );
                    // Store force magnitude for later use
                    object.body.forceMagnitude = properties.forceMagnitude;

                    break;
                    
                case 'Platform':
                    object = new CustomPlatform(
                        position.x,
                        position.y,
                        properties.width,
                        properties.height,
                        properties.label, // Full label
                        properties.color
                    );
                    break;
                    
                case 'BouncyPlatform':
                    object = new BouncyPlatform(
                        position.x,
                        position.y,
                        properties.width,
                        properties.height,
                        properties.label, // Full label
                        properties.restitution,
                        properties.color
                    );
                    break;
            }
            
            // Clear the preview object now that we are placing the real one.
            this.clearPreviewObject();

            // Add to world if not already added
            if (object && object.addToWorld && typeof object.addToWorld === 'function') {
                object.addToWorld(this.world);

                // If it's a ForceTriangle and the game's array exists, add it
                if (type.name === 'ForceTriangle' && typeof window.forceTrianglesArray !== 'undefined') {
                    window.forceTrianglesArray.push(object.body);
                }
            }
            // Store the placed object
            this.placedObjects.push({
                id: Date.now(),
                type: type.name,
                properties: properties,
                position: position,
                body: object.body
            });
            
            // Update the objects list
            this.updateObjectsList();
            
            console.log(`Placed ${type.name} at (${Math.round(position.x)}, ${Math.round(position.y)})`);
        } catch (error) {
            console.error('Error placing object:', error);
            alert(`Error placing object: ${error.message}`);
        }
    }
    
    // Update the list of placed objects
    updateObjectsList() {
        const listElement = document.getElementById('placed-objects-list');
        if (!listElement) return;
        
        listElement.innerHTML = '';
        
        if (this.placedObjects.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'No objects placed yet';
            emptyMessage.style.fontStyle = 'italic';
            listElement.appendChild(emptyMessage);
            return;
        }
        
        this.placedObjects.forEach(obj => {
            const listItem = document.createElement('li');
            listItem.style.marginBottom = '5px';
            listItem.style.display = 'flex';
            listItem.style.justifyContent = 'space-between';
            listItem.style.alignItems = 'center';
            
            // Object info
            const objectInfo = document.createElement('span');
            objectInfo.textContent = `${obj.type}: ${obj.properties.label}`;
            objectInfo.title = `Position: (${Math.round(obj.position.x)}, ${Math.round(obj.position.y)})`;
            listItem.appendChild(objectInfo);
            
            // Controls
            const controls = document.createElement('div');
            
            // Delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '❌';
            deleteButton.title = 'Delete';
            deleteButton.style.marginLeft = '5px';
            deleteButton.style.background = 'none';
            deleteButton.style.border = 'none';
            deleteButton.style.color = '#f44336';
            deleteButton.style.cursor = 'pointer';
            deleteButton.addEventListener('click', () => this.deleteObject(obj.id));
            
            controls.appendChild(deleteButton);
            listItem.appendChild(controls);
            
            listElement.appendChild(listItem);
        });
    }
    
    // Delete an object
    deleteObject(id) {
        const objIndex = this.placedObjects.findIndex(obj => obj.id === id);
        if (objIndex === -1) return;
        
        const obj = this.placedObjects[objIndex];
        
        if (this.highlightedObjectBody === obj.body) {
            if (obj.body.render.originalStrokeStyle !== undefined) {
                obj.body.render.strokeStyle = obj.body.render.originalStrokeStyle;
                obj.body.render.lineWidth = obj.body.render.originalLineWidth;
            }
            this.highlightedObjectBody = null;
        }

        try {
            // Remove from Matter.js world
            if (obj.body) Matter.Composite.remove(this.world, obj.body);
            
            // Remove from our list
            this.placedObjects.splice(objIndex, 1);
            // Update the objects list
            this.updateObjectsList();
            
            console.log(`Deleted ${obj.type}: ${obj.properties.label}`);
        } catch (error) {
            console.error('Error deleting object:', error);
            alert(`Error deleting object: ${error.message}`);
        }
    }
    
    // Clear all objects
    clearAllObjects() {
        if (!confirm(`Are you sure you want to delete ALL non-essential objects from the world?`)) {
            return;
        }
        
        try {
            const NON_DELETABLE_LABELS = [
                "Vita", "Ground1", "Platform2", "Ground2", "GroundHorizontal", 
                "WallLeft", "WallRight", "Ceiling", "BouncyWallLeft"
            ];
            const bodiesToRemove = [];

            Matter.Composite.allBodies(this.world).forEach(body => {
                if (!NON_DELETABLE_LABELS.includes(body.label)) {
                    bodiesToRemove.push(body);
                }
            });

            bodiesToRemove.forEach(body => {
                Matter.Composite.remove(this.world, body);
            });
            
            // Clear the editor's list and any highlight
            this.placedObjects = [];
            this.highlightedObjectBody = null;
            // Update the objects list
            this.updateObjectsList();

            // Clear global game arrays (ensure these are globally accessible in vitachaos_desktop.js)
            if (typeof window.boxStack !== 'undefined') window.boxStack.length = 0;
            if (typeof window.bouncyBallsArray !== 'undefined') window.bouncyBallsArray.length = 0;
            if (typeof window.frogStack !== 'undefined') window.frogStack.length = 0;
            if (typeof window.foofooStack !== 'undefined') window.foofooStack.length = 0;
            if (typeof window.forceTrianglesArray !== 'undefined') window.forceTrianglesArray.length = 0;
            if (typeof window.customStaticPlatformObjects !== 'undefined') window.customStaticPlatformObjects.length = 0;
            if (typeof window.bouncyPlatformObjects !== 'undefined') window.bouncyPlatformObjects.length = 0;
            console.log('All objects cleared');
        } catch (error) {
            console.error('Error clearing objects:', error);
            alert(`Error clearing objects: ${error.message}`);
        }
    }
    
    // Export the level to JSON
    exportLevel() {
        if (this.placedObjects.length === 0) {
            alert('No objects to export. Place some objects first.');
            return;
        }
        
        const levelData = {
            name: prompt('Enter a name for this level:', 'My Custom Level'),
            objects: this.placedObjects.map(obj => {
                // Ensure properties are correctly captured, especially for objects
                // whose properties might be directly on the body (like color from render.fillStyle)
                // For now, we assume obj.properties is sufficiently populated by the editor form.
                // If direct body modifications happen outside the form, this might need adjustment.
                // Example: if color is changed directly on obj.body.render.fillStyle after placement,
                // obj.properties.color might be stale. The current setup mostly relies on initial form properties.

                
                return {
                    type: obj.type,
                    properties: obj.properties,
                    position: obj.position
                };
            })
        };
        
        if (!levelData.name) return; // User cancelled
        
        try {
            // Create a downloadable file
            const dataStr = JSON.stringify(levelData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `vita_chaos_level_${levelData.name.replace(/\s+/g, '_')}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            console.log(`Level exported: ${levelData.name} with ${levelData.objects.length} objects`);
        } catch (error) {
            console.error('Error exporting level:', error);
            alert(`Error exporting level: ${error.message}`);
        }
    }
    
    // Import a level from JSON
    importLevel() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const levelData = JSON.parse(event.target.result);
                    this.loadLevel(levelData);
                } catch (error) {
                    console.error('Error parsing level file:', error);
                    alert('Error loading level file. Please check the file format.');
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // Load a level from data
    loadLevel(levelData) {
        if (!levelData || !levelData.objects || !Array.isArray(levelData.objects)) {
            alert('Invalid level data format');
            return;
        }
        
        try {
            // Clear existing objects
            // Ask for confirmation before clearing for import
            if (this.placedObjects.length > 0 || Matter.Composite.allBodies(this.world).some(b => !(["Vita", "Ground1", "Platform2", "Ground2", "GroundHorizontal", "WallLeft", "WallRight", "Ceiling", "BouncyWallLeft"].includes(b.label)))) {
                if (confirm('Importing a new level will clear the current level. Continue?')) {
                    this.clearAllObjects(); // Clears world and game arrays
                } else {
                    return; // User cancelled import
                }
            }
            
            // Place new objects
            let successCount = 0;
            let errorCount = 0;
            
            levelData.objects.forEach(obj => {
                try {
                    // Find the object type
                    const typeObj = this.objectTypes.find(t => t.name === obj.type);
                    if (!typeObj) {
                        console.warn(`Unknown object type: ${obj.type}`);
                        errorCount++;
                        return;
                    }
                    
                    // Set up the current object
                    this.currentObject = {
                        type: typeObj,
                        properties: obj.properties,
                        position: obj.position
                    };
                    
                    // Place it
                    this.placeObject();
                    successCount++;
                } catch (error) {
                    console.error(`Error placing object ${obj.type}:`, error);
                    errorCount++;
                }
            });
            
            // Reset current object
            this.currentObject = null;
            
            console.log(`Level "${levelData.name}" loaded: ${successCount} objects placed, ${errorCount} errors`);
            alert(`Level "${levelData.name}" loaded successfully with ${successCount} objects.${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
        } catch (error) {
            console.error('Error loading level:', error);
            alert(`Error loading level: ${error.message}`);
        }
    }
}

// Function to integrate the level editor with the game
function initializeLevelEditor(gameConfig, world, render) {
    const editor = new VitaChaosLevelEditor(gameConfig);
    editor.initialize(world, render);
    
    // Create and integrate grid helper
    const gridHelper = createGridHelper(gameConfig.GAME_WIDTH, gameConfig.GAME_HEIGHT, 50);
    
    // Add grid toggle button to editor
    const gridToggleButton = document.createElement('button');
    gridToggleButton.textContent = 'Toggle Grid';
    gridToggleButton.style.padding = '8px';
    gridToggleButton.style.marginTop = '10px';
    gridToggleButton.style.width = '100%';
    gridToggleButton.addEventListener('click', () => gridHelper.toggleGrid());
    
    // Add to editor container
    if (editor.editorContainer) {
        editor.editorContainer.appendChild(document.createElement('hr'));
        editor.editorContainer.appendChild(gridToggleButton);
    }
    
    // Update the coordinates display to show grid coordinates
    const originalMouseMoveHandler = document.onmousemove;
    document.onmousemove = function(e) {
        if (originalMouseMoveHandler) originalMouseMoveHandler(e);
        
        if (editor.editorActive && editor.isDragging && editor.currentObject) {
            const canvas = render.canvas;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const pixelX = (e.clientX - rect.left) * scaleX;
            const pixelY = (e.clientY - rect.top) * scaleY;
            
            // Add grid coordinates to the display
            const gridPos = gridHelper.pixelToGrid(pixelX, pixelY);
            editor.coordinatesDisplay.textContent = `Pixel: (${Math.round(pixelX)}, ${Math.round(pixelY)}) | Grid: (${gridPos.x}, ${gridPos.y})`;
        }
    };
    
    // Update grid when window resizes
    window.addEventListener('resize', () => {
        gridHelper.updateGameDimensions(gameConfig.GAME_WIDTH, gameConfig.GAME_HEIGHT);
    });
    
    return editor;
}