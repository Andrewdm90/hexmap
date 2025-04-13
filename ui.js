// --- START OF FILE ui.js ---

import { domRefs } from './dom.js';
import { displayOptions, currentTool, gridCellStates } from './state.js'; // Added gridCellStates
import { setActiveTool } from './tools.js';
import { getGridConfig, generateGrid, renderCellUI } from './grid.js'; // Added renderCellUI

// --- Dark Mode ---
function applyDarkMode(isDark) {
    if (domRefs.body) {
        domRefs.body.classList.toggle('dark-mode', isDark);
    }
    displayOptions.darkMode = isDark;
    localStorage.setItem('darkMode', JSON.stringify(isDark));
}

function setupDarkMode() {
    if (domRefs.darkModeToggle) {
        domRefs.darkModeToggle.checked = displayOptions.darkMode;
        applyDarkMode(displayOptions.darkMode); // Apply initial state
        domRefs.darkModeToggle.addEventListener('change', (e) => {
            applyDarkMode(e.target.checked);
        });
    } else {
        console.warn("Dark mode toggle not found.");
    }
}

// --- Modals ---
function setupModal(modalRef, openBtnRef, closeBtnRef) {
    // Allow openBtnRef to be null for programmatically opened modals
    if (!modalRef || !closeBtnRef) {
        console.warn("Modal references incomplete for setup (modal or close button missing):", modalRef, closeBtnRef);
        return;
    }

    const closeModal = () => modalRef.classList.remove('active');

    if (openBtnRef) { // Only add open listener if button exists
       const openModal = () => modalRef.classList.add('active');
       openBtnRef.addEventListener('click', openModal);
    }

    closeBtnRef.addEventListener('click', closeModal);
    modalRef.addEventListener('click', (e) => {
        if (e.target === modalRef) { // Click outside content
            closeModal();
        }
    });
}

// --- Tabs ---
function setupTabs() {
    if (!domRefs.tabButtonsContainer || !domRefs.tabContents.length) {
        console.warn("Tab elements not found.");
        return;
    }

    domRefs.tabButtonsContainer.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.tab-button');
        if (!clickedButton || clickedButton.classList.contains('active-tab')) {
            return; // Not a button or already active
        }

        const targetTabId = clickedButton.dataset.tab;

        // Deactivate current tab/content
        domRefs.tabButtons.forEach(btn => btn.classList.remove('active-tab'));
        domRefs.tabContents.forEach(content => content.classList.remove('active-tab-content'));

        // Activate new tab/content
        clickedButton.classList.add('active-tab');
        const newContent = document.getElementById(`tab-${targetTabId}`);
        if (newContent) {
            newContent.classList.add('active-tab-content');
        } else {
            console.error(`Tab content not found for id: tab-${targetTabId}`);
        }
    });

    // Initial setup - ensure first tab content is visible if needed
    const firstTabContent = document.querySelector('.tab-content');
    const firstTabButton = document.querySelector('.tab-button');
    if (firstTabContent && !firstTabContent.classList.contains('active-tab-content') && firstTabButton?.classList.contains('active-tab')) {
        firstTabContent.classList.add('active-tab-content');
    }

    // Setup "No Tool" button listener
    if (domRefs.noToolBtn) {
        domRefs.noToolBtn.addEventListener('click', () => {
            setActiveTool('none');
        });
    }
}

// --- Shape Selection UI Update ---
function setupShapeSelectionUI() {
    if (!domRefs.shapeSelect || !domRefs.settingsPanel) return;

    const updateVisibility = () => {
        const isSquare = domRefs.shapeSelect.value === 'square';
        // ONLY toggle the class on the panel for CSS rules to hide orientation
        domRefs.settingsPanel.classList.toggle('shape-square', isSquare);

        // Update label for size input remains the same
        if (domRefs.sizeInput) {
            const sizeLabel = domRefs.sizeInput.previousElementSibling;
            if (sizeLabel) {
                 sizeLabel.textContent = !isSquare ? "Size (Radius, px):" : "Size (Side, px):";
            }
        }
    };

    domRefs.shapeSelect.addEventListener('change', updateVisibility);
    updateVisibility(); // Initial check
}


// --- Eyedropper ---
function setupEyedroppers() {
    if (!window.EyeDropper) {
        console.warn("EyeDropper API not supported in this browser.");
        domRefs.eyedropperBtns?.forEach(btn => btn.style.display = 'none'); // Hide buttons
        return;
    }

    domRefs.eyedropperBtns?.forEach(btn => { // Safety check
        btn.addEventListener('click', async () => {
            const targetColorInputSelector = btn.dataset.targetColor;
            const colorInput = document.querySelector(targetColorInputSelector);
            if (!colorInput) {
                console.error(`Eyedropper target color input not found: ${targetColorInputSelector}`);
                return;
            }

            try {
                const eyeDropper = new EyeDropper();
                const result = await eyeDropper.open();
                colorInput.value = result.sRGBHex;
                // Trigger input event to update hex display and state
                colorInput.dispatchEvent(new Event('input', { bubbles: true }));
            } catch (e) {
                console.log("Eyedropper cancelled or failed.", e);
            }
        });
    });
}

// --- Grid UI Controls ---
function setupGridUIControls() {
    console.log("Setting up Grid UI Controls..."); // Log setup

    // --- Visibility Toggle ---
    if (domRefs.toggleGridUICheck) {
        console.log("Attaching listener to toggleGridUICheck");
        domRefs.toggleGridUICheck.checked = displayOptions.gridUiVisible;
        domRefs.toggleGridUICheck.addEventListener('change', () => {
            displayOptions.gridUiVisible = domRefs.toggleGridUICheck.checked;
            if (domRefs.mapAreaWrapper) {
                domRefs.mapAreaWrapper.classList.toggle('show-grid-ui', displayOptions.gridUiVisible);
            }
        });
        // Apply initial state
         if (domRefs.mapAreaWrapper) {
             domRefs.mapAreaWrapper.classList.toggle('show-grid-ui', displayOptions.gridUiVisible);
         }
    } else {
        console.warn("toggleGridUICheck not found during setup.");
    }

    // --- Font Size Slider ---
    if (domRefs.gridFontSizeSlider && domRefs.gridFontSizeValue) {
        console.log("Attaching listener to gridFontSizeSlider");
        domRefs.gridFontSizeSlider.value = displayOptions.gridUiFontSize;
        domRefs.gridFontSizeValue.textContent = `${displayOptions.gridUiFontSize}px`;
        domRefs.gridFontSizeSlider.addEventListener('input', (e) => {
             console.log("Grid font size slider input event"); // Log event
            displayOptions.gridUiFontSize = parseInt(e.target.value, 10);
            domRefs.gridFontSizeValue.textContent = `${displayOptions.gridUiFontSize}px`; // Update span
             if (domRefs.mapAreaWrapper) {
                domRefs.mapAreaWrapper.style.setProperty('--grid-ui-font-size', `${displayOptions.gridUiFontSize}px`);
            }
        });
         // Apply initial state
        if (domRefs.mapAreaWrapper) {
             domRefs.mapAreaWrapper.style.setProperty('--grid-ui-font-size', `${displayOptions.gridUiFontSize}px`);
         }
    } else {
         console.warn("gridFontSizeSlider or gridFontSizeValue not found during setup.");
    }

    // --- Vertical Position Slider ---
    if (domRefs.gridUiPositionSlider && domRefs.gridUiPositionValue) {
        console.log("Attaching listener to gridUiPositionSlider");
        // Set initial values from state
        domRefs.gridUiPositionSlider.value = displayOptions.gridUiVerticalPosition;
        domRefs.gridUiPositionValue.textContent = `${displayOptions.gridUiVerticalPosition}%`;
        // Apply initial CSS variable state
        if (domRefs.mapAreaWrapper) {
             domRefs.mapAreaWrapper.style.setProperty('--grid-ui-vertical-position', `${displayOptions.gridUiVerticalPosition}%`);
        }
        // Add listener
        domRefs.gridUiPositionSlider.addEventListener('input', (e) => {
            console.log("Grid UI position slider input event");
            const positionPercent = parseInt(e.target.value, 10);
            displayOptions.gridUiVerticalPosition = positionPercent; // Update state
            domRefs.gridUiPositionValue.textContent = `${positionPercent}%`; // Update label
            // Update CSS variable
            if (domRefs.mapAreaWrapper) {
                domRefs.mapAreaWrapper.style.setProperty('--grid-ui-vertical-position', `${positionPercent}%`);
            }
        });
    } else {
        console.warn("gridUiPositionSlider or gridUiPositionValue not found during setup.");
    }

     console.log("Grid UI Controls Setup Complete.");
}

// --- Settings Panel Collapse ---
function setupSettingsCollapse() {
    if (!domRefs.settingsToggle || !domRefs.settingsPanel) return;

    // Function to apply collapsed state (used on load and click)
    const applyCollapseState = (isCollapsed) => {
         if (!domRefs.settingsPanel) return;
         domRefs.settingsPanel.classList.toggle('collapsed', isCollapsed);
         displayOptions.settingsCollapsed = isCollapsed;
    };

    // Add click listener
    domRefs.settingsToggle.addEventListener('click', () => {
        applyCollapseState(!displayOptions.settingsCollapsed); // Toggle state
    });

    // Apply initial state on load
    applyCollapseState(displayOptions.settingsCollapsed);
}

// --- Notes Modal Logic (Moved to UI module) ---

// Setup listeners for the notes modal toolbar buttons
function setupNotesToolbar() {
    if (!domRefs.notesToolbar || !domRefs.notesModalEditor) return;

    domRefs.notesToolbar.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const command = button.dataset.command;
        if (!command) return;

        e.preventDefault(); // Prevent button stealing focus from editor

        if (command === 'insertImage') {
            const url = prompt('Enter image URL:');
            if (url) {
                // Basic validation (very simple)
                if (!url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)) {
                     alert("Warning: URL doesn't look like a standard image type. Trying anyway.");
                }
                 // Use execCommand - browser handles insertion
                 // Focus editor first for command to work reliably
                 domRefs.notesModalEditor.focus();
                 document.execCommand(command, false, url);
            }
        } else {
            // Focus editor first for command to work reliably
            domRefs.notesModalEditor.focus();
            document.execCommand(command, false, null);
        }

         // Ensure focus remains in the editor after button click
         setTimeout(() => domRefs.notesModalEditor.focus(), 0);
    });
}


export function showNotesModal(cellId) {
    if (!domRefs.notesModal || !domRefs.notesModalTitle || !domRefs.notesModalEditor) return;
    currentTool.currentEditingCellId = cellId;
    const [r, c] = cellId.split('_').map(Number);
    const cellNumber = String(c + 1).padStart(2, '0') + String(r + 1).padStart(2, '0');
    domRefs.notesModalTitle.textContent = `Notes for Cell ${cellNumber}`;
    // Use innerHTML for the contenteditable div
    domRefs.notesModalEditor.innerHTML = gridCellStates[cellId]?.notes || ''; // Load existing notes as HTML
    domRefs.notesModal.classList.add('active');
    domRefs.notesModalEditor.focus();
}

function closeNotesModal() {
    if (!domRefs.notesModal || !domRefs.notesModalEditor) return;
    domRefs.notesModal.classList.remove('active');
    currentTool.currentEditingCellId = null;
    domRefs.notesModalEditor.innerHTML = ''; // Clear editor content
}

function saveNotes() {
    const cellId = currentTool.currentEditingCellId;
    if (!cellId || !domRefs.notesModalEditor) return;
    // Get HTML content from the editor
    const newNotesHTML = domRefs.notesModalEditor.innerHTML.trim();

    // Basic "empty" check (might need refinement depending on how browsers handle empty contenteditable)
    const isEmpty = !newNotesHTML || newNotesHTML === '<br>' || newNotesHTML === '<div><br></div>'; // Common empty states

    if (!gridCellStates[cellId]) {
         if(!isEmpty) { // Only create state if there are notes
             gridCellStates[cellId] = { notes: newNotesHTML };
         }
    } else {
         if(!isEmpty) {
             gridCellStates[cellId].notes = newNotesHTML; // Save HTML
         } else {
             delete gridCellStates[cellId].notes; // Remove notes property if empty
             if (Object.keys(gridCellStates[cellId]).length === 0) {
                 delete gridCellStates[cellId]; // Remove cell state if only notes existed
             }
         }
    }

    // Update the note indicator on the grid
    const element = domRefs.gridContainer?.querySelector(`.grid-element[data-cell-id="${cellId}"]`);
    if (element) {
        renderCellUI(element.querySelector('.grid-ui-container'), cellId);
    }
    closeNotesModal();
}


// --- Initialize All UI Components ---
export function initializeUI() {
    setupDarkMode();
    setupModal(domRefs.helpModal, domRefs.helpBtn, domRefs.helpModalCloseBtn);
    setupModal(domRefs.notesModal, null, domRefs.notesModalCloseBtn); // Notes modal opened programmatically
    setupTabs();
    setupShapeSelectionUI();
    setupEyedroppers();
    setupGridUIControls();
    setupSettingsCollapse(); // ADDED CALL
    setupNotesToolbar(); // ADDED CALL
    // Grid generation listener setup
     if (domRefs.rowsInput) domRefs.rowsInput.addEventListener('input', generateGrid);
     if (domRefs.colsInput) domRefs.colsInput.addEventListener('input', generateGrid);
     if (domRefs.sizeInput) domRefs.sizeInput.addEventListener('input', generateGrid);
     if (domRefs.gapInput) domRefs.gapInput.addEventListener('input', generateGrid);
     if (domRefs.shapeSelect) domRefs.shapeSelect.addEventListener('change', generateGrid);
     document.querySelectorAll('input[name="orientation"]').forEach(r => r?.addEventListener('change', generateGrid));
     // Notes save button listener
     if (domRefs.notesModalSaveBtn) domRefs.notesModalSaveBtn.addEventListener('click', saveNotes);

}

// --- Update UI based on loaded state (called after load/init) ---
export function updateUIFromState() {
    // Update dark mode toggle/class
    if (domRefs.darkModeToggle) domRefs.darkModeToggle.checked = displayOptions.darkMode;
    if (domRefs.body) domRefs.body.classList.toggle('dark-mode', displayOptions.darkMode);

    // Update grid UI controls
    if (domRefs.toggleGridUICheck) domRefs.toggleGridUICheck.checked = displayOptions.gridUiVisible;
    if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.toggle('show-grid-ui', displayOptions.gridUiVisible);

    if (domRefs.gridFontSizeSlider) domRefs.gridFontSizeSlider.value = displayOptions.gridUiFontSize;
    if (domRefs.gridFontSizeValue) domRefs.gridFontSizeValue.textContent = `${displayOptions.gridUiFontSize}px`;
    if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.style.setProperty('--grid-ui-font-size', `${displayOptions.gridUiFontSize}px`);

    // Update Position Slider/Value/CSS from loaded state
    if (domRefs.gridUiPositionSlider) domRefs.gridUiPositionSlider.value = displayOptions.gridUiVerticalPosition;
    if (domRefs.gridUiPositionValue) domRefs.gridUiPositionValue.textContent = `${displayOptions.gridUiVerticalPosition}%`;
    if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.style.setProperty('--grid-ui-vertical-position', `${displayOptions.gridUiVerticalPosition}%`);

    // Update Settings Collapse State
    if (domRefs.settingsPanel) {
        domRefs.settingsPanel.classList.toggle('collapsed', displayOptions.settingsCollapsed);
    }

    // Tool controls updated in updateUIForNewGrid
}

// --- Update UI that depends on grid config/state ---
// No changes needed here for the new features in this round
export function updateUIForNewGrid() {
     // Update color picker values from state (in case of load or init)
    if (domRefs.colorPicker) domRefs.colorPicker.value = currentTool.paintColor;
    if (domRefs.colorPickerHex) domRefs.colorPickerHex.value = currentTool.paintColor.toUpperCase();
    if (domRefs.textColorPicker) domRefs.textColorPicker.value = currentTool.textColor;
    if (domRefs.textColorHex) domRefs.textColorHex.value = currentTool.textColor.toUpperCase();
    if (domRefs.penColorPicker) domRefs.penColorPicker.value = currentTool.penColor;
    if (domRefs.penColorHex) domRefs.penColorHex.value = currentTool.penColor.toUpperCase();
    if (domRefs.iconColorizer) domRefs.iconColorizer.value = currentTool.iconColorizerValue;

    // Update sliders and their displays
    if (domRefs.iconSizeSlider && domRefs.iconSizeValue) {
        domRefs.iconSizeSlider.value = currentTool.iconStampSize;
        domRefs.iconSizeValue.textContent = `${currentTool.iconStampSize}px`;
    }
    if (domRefs.iconRotationSlider && domRefs.iconRotationValue) {
        domRefs.iconRotationSlider.value = currentTool.iconStampRotation;
        domRefs.iconRotationValue.textContent = `${currentTool.iconStampRotation}°`;
    }
    if (domRefs.textSizeSlider && domRefs.textSizeValue) {
         domRefs.textSizeSlider.value = currentTool.textSize;
         domRefs.textSizeValue.textContent = `${currentTool.textSize}px`;
    }
    if (domRefs.penThicknessSlider && domRefs.penThicknessValue) {
        domRefs.penThicknessSlider.value = currentTool.penThickness;
        domRefs.penThicknessValue.textContent = `${currentTool.penThickness}px`;
    }

    // Update shape select UI visibility for hex options
    setupShapeSelectionUI();

    // Note: Active tool highlight is handled by setActiveTool, called in main.js init
}

// --- END OF FILE ui.js ---