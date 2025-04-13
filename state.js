// --- START OF FILE state.js ---

// --- State Management ---

// Holds the state of individual grid cells (color, notes)
// Format: { "r_c": { color: "#...", notes: "..." } }
export let gridCellStates = {};

// Holds the state of stamped icons on the map
// Format: [{ id, iconId (ref to loaded), x, y, width, height, rotation, colorFilterValue, intensity }, ...] // Added intensity
export let iconInstanceStates = [];

// Holds the state of stamped text elements
// Format: [{ id, text, x, y, fontSize, color }, ...]
export let textInstanceStates = [];

// Holds the state of drawn paths
// Format: [{ color, thickness, isEraser, points: [{x,y},...] }, ...]
export let drawingPathStates = [];

// Collection of loaded icon definitions (SVG, PNG, JPG)
// Format: [{ id: uniqueId, name: fileName, type: 'svg'/'raster', svgString: '...', dataURL: '...', aspectRatio: ratio }, ...]
export let loadedIconDefinitions = [];

// --- Tool State ---
// Defines the currently active editing tool and its relevant properties
export let currentTool = {
    type: 'none', // 'paint', 'erase', 'stamp', 'deleteIcon', 'textStamp', 'textDelete', 'draw', 'drawErase', 'none'
    paintColor: '#9dcd58',
    penColor: '#6375EE',
    penThickness: 5,
    isDrawing: false,
    isErasing: false, // For drawing eraser
    currentPath: null, // For drawing tool
    textValue: '',
    textSize: 14,
    textColor: '#000000',
    selectedIconId: null, // ID of the icon selected from the gallery
    iconStampSize: 30, // Base size from slider
    iconStampRotation: 0,
    iconColorizerValue: '#ffffff', // Default white (no tint)
    iconColorFilter: '', // CSS filter string generated from colorizerValue (Currently unused, handled in rendering)
    iconColorIntensity: 50, // CHANGED: Default intensity to 50
    calculatedStampSize: { width: 30, height: 30 }, // Adjusted for aspect ratio
    currentEditingCellId: null, // Tracks which cell's notes are being edited
};

// --- Display State ---
export let displayOptions = {
    gridUiVisible: true,
    gridUiFontSize: 10,
    gridUiVerticalPosition: 10,
    settingsCollapsed: false,
    darkMode: false,
};


// --- State Initialization ---
export function initializeState() {
    // Load dark mode preference from localStorage
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedDarkMode = localStorage.getItem('darkMode');
    displayOptions.darkMode = savedDarkMode !== null ? JSON.parse(savedDarkMode) : prefersDark;

    // Reset other states to default
    gridCellStates = {};
    iconInstanceStates = [];
    textInstanceStates = [];
    drawingPathStates = [];
    loadedIconDefinitions = [];
    currentTool.type = 'none'; // Start with no tool selected
    currentTool.selectedIconId = null;
    currentTool.currentEditingCellId = null; // Reset editing cell ID

    // Reset tool-specific settings to default values
    currentTool.paintColor = '#9dcd58';
    currentTool.penColor = '#6375EE';
    currentTool.penThickness = 5;
    currentTool.textValue = '';
    currentTool.textSize = 14;
    currentTool.textColor = '#000000';
    currentTool.iconStampSize = 30;
    currentTool.iconStampRotation = 0;
    currentTool.iconColorizerValue = '#ffffff';
    currentTool.iconColorIntensity = 50; // CHANGED: Initialize intensity to 50
    currentTool.calculatedStampSize = { width: 30, height: 30 };

    // Reset display options (except dark mode, which was loaded)
    displayOptions.gridUiVisible = true;
    displayOptions.gridUiFontSize = 10;
    displayOptions.gridUiVerticalPosition = 10;
    displayOptions.settingsCollapsed = false;

    console.log("Initial State:", { currentTool, displayOptions });
}

// --- State Persistence (Example Functions - currently unused by main save/load) ---
// These could be used for more granular state saving if needed

export function saveState() {
    // Example: Save state to localStorage (can be adapted for file saving)
    localStorage.setItem('gridCellStates', JSON.stringify(gridCellStates));
    localStorage.setItem('iconInstanceStates', JSON.stringify(iconInstanceStates));
    // ... save other states ...
    localStorage.setItem('darkMode', JSON.stringify(displayOptions.darkMode));
    console.log("State potentially saved to localStorage (example)");
}

export function loadState() {
    // Example: Load state from localStorage
    const savedCells = localStorage.getItem('gridCellStates');
    if (savedCells) gridCellStates = JSON.parse(savedCells);

    const savedIcons = localStorage.getItem('iconInstanceStates');
    if (savedIcons) iconInstanceStates = JSON.parse(savedIcons);

    // ... load other states ...

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) displayOptions.darkMode = JSON.parse(savedDarkMode);

    console.log("State potentially loaded from localStorage (example)");
}


// --- State Reset Function (used by IO load on failure or explicit reset) ---
export function resetAllState() {
    // Clear map content state
    gridCellStates = {};
    iconInstanceStates.splice(0, iconInstanceStates.length); // Clear array in place
    textInstanceStates.splice(0, textInstanceStates.length);
    drawingPathStates.splice(0, drawingPathStates.length);
    loadedIconDefinitions.splice(0, loadedIconDefinitions.length);

    // Reset tool state
    currentTool.selectedIconId = null;
    currentTool.type = 'none'; // Reset tool to none
    currentTool.currentEditingCellId = null;
    // Reset tool settings to defaults
    currentTool.paintColor = '#9dcd58';
    currentTool.penColor = '#6375EE';
    currentTool.penThickness = 5;
    currentTool.textValue = '';
    currentTool.textSize = 14;
    currentTool.textColor = '#000000';
    currentTool.iconStampSize = 30;
    currentTool.iconStampRotation = 0;
    currentTool.iconColorizerValue = '#ffffff';
    currentTool.iconColorIntensity = 50; // CHANGED: Reset intensity to 50
    currentTool.calculatedStampSize = { width: 30, height: 30 };


    // Reset display options (except dark mode, keep user preference)
    displayOptions.gridUiVisible = true;
    displayOptions.gridUiFontSize = 10;
    displayOptions.gridUiVerticalPosition = 10;
    displayOptions.settingsCollapsed = false;

    console.log("All dynamic map state reset.");
}

// --- Update Specific State ---

// Call this when the icon colorizer input changes
// Note: Currently this only updates the state value. The actual application
// (e.g., via CSS filter or other means) happens during rendering in icon_tools.js
export function updateIconColorFilter(hexColor) {
    currentTool.iconColorizerValue = hexColor;
    // The iconColorFilter CSS string itself isn't directly used currently.
    // Rendering logic in icon_tools.js uses iconColorizerValue.
    console.log("Updated icon colorizer state value to:", hexColor);
}

// --- END OF FILE state.js ---