// --- DOM Element References and Initialization ---

export let domRefs = {}; // Holds references to all needed DOM elements
export let ctx = null; // Holds the 2D rendering context for the canvas

// Function to populate domRefs and initialize canvas context
export function initializeDOM() {
    console.log("Populating DOM references...");
    try {
        domRefs = {
            body: document.body,
            // Top Bar
            darkModeToggle: document.getElementById('darkModeToggle'),
            helpBtn: document.getElementById('helpBtn'),
            // Settings Panel
            settingsPanel: document.querySelector('.settings-panel'),
            rowsInput: document.getElementById('rows'),
            colsInput: document.getElementById('cols'),
            sizeInput: document.getElementById('size'),
            gapInput: document.getElementById('gap'),
            shapeSelect: document.getElementById('shape'),
            orientationGroup: document.querySelector('.control-group.hex-only'),
            settingsPanel: document.getElementById('settings-panel'),     // Already exists, ensure ID is set
            settingsToggle: document.getElementById('settings-toggle'), // ADDED
            settingsContent: document.querySelector('#settings-panel .panel-content'), // ADDED
            // Editor Panel Tabs
            editorPanel: document.querySelector('.editor-panel'),
            tabButtonsContainer: document.querySelector('.tab-buttons'),
            tabButtons: document.querySelectorAll('.tab-button'),
            tabContents: document.querySelectorAll('.tab-content'),
            noToolBtn: document.getElementById('noToolBtn'),
            currentToolDisplay: document.getElementById('current-tool-display'), // ADDED
            // Paint Tab
            colorBtn: document.getElementById('colorBtn'),
            colorPicker: document.getElementById('colorPicker'),
            colorPickerHex: document.getElementById('colorPickerHex'),
            eraserBtn: document.getElementById('eraserBtn'),
            // Icon Tab
            stampBtn: document.getElementById('stampBtn'),
            deleteIconBtn: document.getElementById('deleteIconBtn'),
            loadIconBtn: document.getElementById('loadIconBtn'),
            iconFile: document.getElementById('iconFile'),
            iconSizeSlider: document.getElementById('iconSize'),
            iconSizeValue: document.getElementById('iconSizeValue'),
            iconRotationSlider: document.getElementById('iconRotation'),
            iconRotationValue: document.getElementById('iconRotationValue'),
            iconColorizer: document.getElementById('iconColorizer'),
            iconGalleryWrapper: document.getElementById('icon-gallery-wrapper'),
            iconGallery: document.getElementById('icon-gallery'),
            iconPreview: document.getElementById('iconPreview'),
            iconColorizerHex: document.getElementById('iconColorizerHex'),         // ADDED
            iconColorIntensitySlider: document.getElementById('iconColorIntensity'), // ADDED
            iconColorIntensityValue: document.getElementById('iconColorIntensityValue'), // ADDED
            // Text Tab
            textStampBtn: document.getElementById('textStampBtn'),
            textInput: document.getElementById('textInput'),
            textDeleteBtn: document.getElementById('textDeleteBtn'),
            textSizeSlider: document.getElementById('textSize'),
            textSizeValue: document.getElementById('textSizeValue'),
            textColorPicker: document.getElementById('textColor'),
            textColorHex: document.getElementById('textColorHex'),
            // Draw Tab
            drawBtn: document.getElementById('drawBtn'),
            penColorPicker: document.getElementById('penColor'),
            penColorHex: document.getElementById('penColorHex'),
            drawEraseBtn: document.getElementById('drawEraseBtn'),
            penThicknessSlider: document.getElementById('penThickness'),
            penThicknessValue: document.getElementById('penThicknessValue'),
            penPreview: document.getElementById('penPreview'),
            // Options Tab
            toggleGridUICheck: document.getElementById('toggleGridUI'),
            gridFontSizeSlider: document.getElementById('gridFontSize'),
            gridFontSizeValue: document.getElementById('gridFontSizeValue'),
            saveBtn: document.getElementById('saveBtn'),
            loadBtn: document.getElementById('loadBtn'),
            loadFile: document.getElementById('loadFile'),
            exportNotesBtn: document.getElementById('exportNotesBtn'),
            exportPngBtn: document.getElementById('exportPngBtn'),
            gridUiPositionSlider: document.getElementById('gridUiPositionSlider'), // ADDED
            gridUiPositionValue: document.getElementById('gridUiPositionValue'),   // ADDED
            // Eyedropper Buttons (handled via class)
            eyedropperBtns: document.querySelectorAll('.eyedropper-btn'),
            // Map Area
            mapAreaWrapper: document.getElementById('map-area-wrapper'),
            gridContainer: document.getElementById('grid-container'),
            drawingCanvas: document.getElementById('drawing-canvas'),
            iconLayer: document.getElementById('icon-layer'),
            textLayer: document.getElementById('text-layer'),
            // Modals
            notesModal: document.getElementById('notes-modal'),
            notesModalTitle: document.getElementById('notes-modal-title'),
            notesModalEditor: document.getElementById('notes-modal-editor'), // CHANGED from notesModalTextarea
            notesToolbar: document.querySelector('.notes-toolbar'),        // ADDED
            notesModalSaveBtn: document.getElementById('notes-modal-save'),
            notesModalCloseBtn: document.getElementById('notes-modal-close'),
            helpModal: document.getElementById('help-modal'),
            helpModalCloseBtn: document.getElementById('help-modal-close'),
            // Tool Buttons Collection (used for highlighting)
            toolButtons: document.querySelectorAll('.tool-button'), // All buttons that act as tools
        };

        // --- Check for critical missing elements ---
        const criticalRefs = [
            domRefs.mapAreaWrapper, domRefs.gridContainer, domRefs.drawingCanvas,
            domRefs.iconLayer, domRefs.textLayer, domRefs.rowsInput, domRefs.colsInput,
            domRefs.sizeInput, domRefs.gapInput, domRefs.shapeSelect, domRefs.settingsPanel, domRefs.editorPanel
        ];
        const missingCritical = criticalRefs.some(ref => !ref);
        if (missingCritical) {
            console.error("CRITICAL DOM elements missing! Cannot proceed.");
            // Find exactly which are missing for better logging
            Object.keys(domRefs).forEach(key => {
                if (criticalRefs.includes(domRefs[key]) && !domRefs[key]) {
                    console.error(`Missing critical element: ${key} (Expected ID/Selector didn't match?)`);
                }
            });
            alert("Error: Core page structure missing. Cannot start the editor.");
            return false; // Indicate failure
        }

        // --- Initialize Canvas Context ---
        if (domRefs.drawingCanvas) {
            ctx = domRefs.drawingCanvas.getContext('2d');
            if (!ctx) {
                console.error("Failed to get 2D context from canvas.");
                alert("Error: Cannot initialize drawing context.");
                return false; // Indicate failure
            }
        } else {
            // This case is covered by the critical check above, but good to be explicit
            console.error("Drawing canvas element not found!");
            return false; // Indicate failure
        }

        console.log("DOM references populated successfully.");
        return true; // Indicate success

    } catch (error) {
        console.error("Error during DOM initialization:", error);
        alert("A critical error occurred while setting up the page elements.");
        return false; // Indicate failure
    }
}

// --- Helper functions for DOM manipulation ---

export function updateSliderValue(sliderElement, displayElement, unit = 'px') {
    if (sliderElement && displayElement) {
        displayElement.textContent = `${sliderElement.value}${unit}`;
    }
}

export function updateHexColorInput(colorPickerElement, hexInputElement) {
     if(colorPickerElement && hexInputElement) {
         hexInputElement.value = colorPickerElement.value.toUpperCase();
     }
}

export function setHexColorInput(hexInputElement, hexColor) {
    if (hexInputElement) {
        hexInputElement.value = hexColor.toUpperCase();
    }
}

// Add/Remove Class helper
export function toggleCssClass(element, className, force) {
    if(element) {
        element.classList.toggle(className, force);
    }
}