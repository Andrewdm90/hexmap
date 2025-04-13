import { initializeDOM, domRefs } from './dom.js';
import { initializeState, saveState, loadState } from './state.js';
import { initializeUI, updateUIForNewGrid, updateUIFromState } from './ui.js'; // Added updateUIFromState
import { generateGrid } from './grid.js';
import { renderAllOverlays, setupToolListeners, setActiveTool } from './tools.js'; // Import setActiveTool
import { setupIconToolControls, renderIconGallery } from './icon_tools.js'; // Import setup and render
import { setupDrawToolControls, updatePenPreview } from './draw_tools.js';   // Import setup and updatePenPreview
import { setupTextToolControls } from './text_tools.js';   // Import setup
import { setupIOListeners } from './io.js';             // Import setup

// --- Initialization ---
function initializeApp() {
    console.log("Initializing App...");
    // 1. Find DOM elements and initialize context
    if (!initializeDOM()) {
        console.error("DOM initialization failed. Aborting.");
        return;
    }
    console.log("DOM Initialized.");

    // 2. Initialize application state
    initializeState();
    console.log("State Initialized.");

    // 3. Set up General UI event listeners (dark mode, tabs, modals, etc.)
    initializeUI();
    console.log("UI Initialized.");

    // 4. Set up specific tool listeners (sliders, color pickers within tools)
    console.log("Setting up Tool Listeners...");
    setupToolListeners(); // General map interactions, tool activation buttons
    setupIconToolControls(); // Icon size, rotation, colorizer sliders/pickers + Load button
    setupDrawToolControls(); // Draw thickness slider
    setupTextToolControls(); // Text size slider
    setupIOListeners();      // Save, Load, Export buttons
    console.log("Tool Listeners Initialized.");

    // 5. Perform initial UI updates, grid generation and rendering
    try {
        console.log("Performing initial UI updates and grid generation...");
        updateUIFromState();    // Apply loaded dark mode, grid UI settings etc.
        updateUIForNewGrid();   // Update tool controls (pickers, sliders) to initial values
        updatePenPreview();     // Update pen preview explicitly after state might be set
        renderIconGallery();    // Render empty gallery initially
        generateGrid();         // Generate initial grid/overlays
        setActiveTool('none');  // Explicitly set initial tool to 'none' and update UI
        console.log("Initial Grid Generated and Rendered.");
    } catch (error) {
        console.error("Error during initial setup/generation:", error);
        alert("Failed to initialize the editor interface. Please check the console for errors.");
        return;
    }

    console.log("Hex Map Editor Initialized Successfully.");
}

// --- Start ---
// Wait for the DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired
    initializeApp();
}