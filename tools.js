// --- START OF FILE tools.js ---

import { domRefs, ctx } from './dom.js';
import {
    currentTool, gridCellStates, iconInstanceStates, textInstanceStates,
    displayOptions // Import displayOptions if needed here, otherwise remove
} from './state.js';
import { applyCellState, renderCellUI } from './grid.js';
import { renderIcons, updateIconPreview, handleIconGalleryClick, updateIconColorStateAndPreview } from './icon_tools.js'; // Added updateIconColorStateAndPreview
import { renderTextElements } from './text_tools.js';
import { renderDrawingPaths, handleDrawingStart, handleDrawingMove, handleDrawingEnd, updatePenPreview } from './draw_tools.js';

// --- Tool Activation ---

// Helper mapping for user-friendly tool names
const toolDisplayNames = {
    paint: "Paint Cell",
    erase: "Erase Cell Color",
    stamp: "Stamp Icon",
    deleteIcon: "Delete Stamped Icon",
    textStamp: "Stamp Text",
    textDelete: "Delete Stamped Text",
    draw: "Draw Line",
    drawErase: "Drawing Eraser",
    none: "None (Select Cell/Notes)",
};

export function setActiveTool(toolType, options = {}) {
    console.log(`Activating tool: ${toolType}`);
    const previousTool = currentTool.type;

    // Ensure toolType is valid, default to 'none' if not
    const validToolType = toolDisplayNames.hasOwnProperty(toolType) ? toolType : 'none';
    currentTool.type = validToolType;

    // --- Update Tool Display Span ---
    if (domRefs.currentToolDisplay) {
        domRefs.currentToolDisplay.textContent = `Tool: ${toolDisplayNames[currentTool.type] || 'Unknown'}`;
    }

    // --- Reset UI Feedback & Layer States ---
    domRefs.toolButtons?.forEach(btn => btn.classList.remove('active-tool'));
    domRefs.mapAreaWrapper?.classList.remove(
        'paint-mode', 'erase-mode', 'stamp-mode', 'delete-icon-mode',
        'text-stamp-mode', 'delete-text-mode', 'drawing-mode', 'no-tool-mode'
    );
    // Reset pointer events and cursors for all layers
    if(domRefs.gridContainer) domRefs.gridContainer.style.pointerEvents = 'none';
    if(domRefs.drawingCanvas) { domRefs.drawingCanvas.style.pointerEvents = 'none'; domRefs.drawingCanvas.style.cursor = 'default'; }
    if(domRefs.iconLayer) { domRefs.iconLayer.style.pointerEvents = 'none'; domRefs.iconLayer.style.cursor = 'default'; }
    if(domRefs.textLayer) { domRefs.textLayer.style.pointerEvents = 'none'; domRefs.textLayer.style.cursor = 'default'; }
    if(domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.style.cursor = 'default';


    // --- Activate Specific Tool ---
    switch (currentTool.type) {
        case 'paint':
            if (domRefs.colorBtn) domRefs.colorBtn.classList.add('active-tool');
            if (domRefs.gridContainer) domRefs.gridContainer.style.pointerEvents = 'auto';
             if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('paint-mode');
            break;
        case 'erase':
            if (domRefs.eraserBtn) domRefs.eraserBtn.classList.add('active-tool');
             if (domRefs.gridContainer) domRefs.gridContainer.style.pointerEvents = 'auto';
             if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('erase-mode');
            break;
        case 'stamp':
             if (!currentTool.selectedIconId) {
                 alert("Select an icon from the gallery first.");
                 setActiveTool('none');
                 return;
             }
            if (domRefs.stampBtn) domRefs.stampBtn.classList.add('active-tool');
            if (domRefs.iconLayer) { domRefs.iconLayer.style.pointerEvents = 'auto'; domRefs.iconLayer.style.cursor = 'copy'; }
             if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('stamp-mode');
            updateIconPreview();
            break;
        case 'deleteIcon':
            if (domRefs.deleteIconBtn) domRefs.deleteIconBtn.classList.add('active-tool');
            if (domRefs.iconLayer) { domRefs.iconLayer.style.pointerEvents = 'auto'; domRefs.iconLayer.style.cursor = 'crosshair'; }
            if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('delete-icon-mode');
            break;
        case 'textStamp':
             if (!currentTool.textValue.trim()) {
                 alert("Enter some text in the text tool panel first.");
                 setActiveTool('none');
                 return;
             }
            if (domRefs.textStampBtn) domRefs.textStampBtn.classList.add('active-tool');
            if (domRefs.textLayer) { domRefs.textLayer.style.pointerEvents = 'auto'; domRefs.textLayer.style.cursor = 'text'; }
             if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('text-stamp-mode');
            break;
        case 'textDelete':
            if (domRefs.textDeleteBtn) domRefs.textDeleteBtn.classList.add('active-tool');
            if (domRefs.textLayer) { domRefs.textLayer.style.pointerEvents = 'auto'; domRefs.textLayer.style.cursor = 'crosshair'; }
            if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('delete-text-mode');
            break;
        case 'draw':
        case 'drawErase':
            const activeBtn = currentTool.type === 'draw' ? domRefs.drawBtn : domRefs.drawEraseBtn;
            if (activeBtn) activeBtn.classList.add('active-tool');
            if (domRefs.drawingCanvas) { domRefs.drawingCanvas.style.pointerEvents = 'auto'; domRefs.drawingCanvas.style.cursor = 'crosshair'; }
            if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('drawing-mode');
            currentTool.isErasing = (currentTool.type === 'drawErase');
            break;
        case 'none':
        default:
            if (domRefs.noToolBtn) domRefs.noToolBtn.classList.add('active-tool');
             if (domRefs.gridContainer) domRefs.gridContainer.style.pointerEvents = 'auto';
             if (domRefs.mapAreaWrapper) domRefs.mapAreaWrapper.classList.add('no-tool-mode');
            break;
    }
     // console.log("Active Tool State:", currentTool);
}

// --- Map Interaction Logic ---

// Main handler for clicks on the grid elements (hex/square)
function handleGridElementClick(e) {
    const targetElement = e.target.closest('.grid-element');
    if (!targetElement) return;

    const cellId = targetElement.dataset.cellId;
    if (!cellId) return;

    switch (currentTool.type) {
        case 'paint':
            if (!gridCellStates[cellId]) gridCellStates[cellId] = {};
            gridCellStates[cellId].color = currentTool.paintColor;
            applyCellState(targetElement, cellId);
            break;
        case 'erase':
            if (gridCellStates[cellId]) {
                delete gridCellStates[cellId].color;
                if (Object.keys(gridCellStates[cellId]).length === 0) {
                    delete gridCellStates[cellId];
                }
            }
            applyCellState(targetElement, cellId);
            break;
        case 'none':
            console.log(`Clicked cell ${cellId} with no tool active.`);
            break;
    }
}

// Main handler for clicks on OVERLAY layers (icons, text)
function handleOverlayClick(e) {
    const layer = e.currentTarget;
    const rect = layer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log(`Overlay click on ${layer.id} at (${x}, ${y}). Tool: ${currentTool.type}`);

    // --- Icon Stamping ---
    if (currentTool.type === 'stamp' && layer === domRefs.iconLayer) {
        if (!currentTool.selectedIconId) return;
        const newIcon = {
            id: Date.now() + Math.random(),
            iconId: currentTool.selectedIconId,
            x: x,
            y: y,
            width: currentTool.calculatedStampSize.width,
            height: currentTool.calculatedStampSize.height,
            rotation: currentTool.iconStampRotation,
            colorFilterValue: currentTool.iconColorizerValue,
            intensity: currentTool.iconColorIntensity // ADDED intensity
        };
        iconInstanceStates.push(newIcon);
        renderIcons();
    }
    // --- Icon Deletion ---
    else if (currentTool.type === 'deleteIcon' && layer === domRefs.iconLayer) {
        const clickedIconDiv = e.target.closest('.stamped-icon');
        if (clickedIconDiv?.dataset.stampedId) {
            const idToDelete = parseFloat(clickedIconDiv.dataset.stampedId);
            const newIconStates = iconInstanceStates.filter(icon => icon.id !== idToDelete);
            iconInstanceStates.splice(0, iconInstanceStates.length, ...newIconStates);
            renderIcons();
        }
    }
    // --- Text Stamping ---
    else if (currentTool.type === 'textStamp' && layer === domRefs.textLayer) {
        if (!currentTool.textValue.trim()) return;
        const newText = {
            id: Date.now() + Math.random(),
            text: currentTool.textValue,
            x: x,
            y: y,
            fontSize: currentTool.textSize,
            color: currentTool.textColor
        };
        textInstanceStates.push(newText);
        renderTextElements();
    }
    // --- Text Deletion ---
    else if (currentTool.type === 'textDelete' && layer === domRefs.textLayer) {
        const clickedTextDiv = e.target.closest('.stamped-text');
        if (clickedTextDiv?.dataset.textId) {
            const idToDelete = parseFloat(clickedTextDiv.dataset.textId);
            const newTextStates = textInstanceStates.filter(txt => txt.id !== idToDelete);
            textInstanceStates.splice(0, textInstanceStates.length, ...newTextStates);
            renderTextElements();
        }
    }
}

// --- Notes Modal (Imported from ui.js, only definition needed here) ---
// Logic moved to ui.js, ensure showNotesModal is imported there if called from grid.js
export { showNotesModal } from './ui.js'; // Re-export if needed by other modules via tools.js


// --- Render All Overlays ---
export function renderAllOverlays() {
    renderDrawingPaths();
    renderIcons();
    renderTextElements();
}


// --- Setup Listeners related to tools and map interaction ---
export function setupToolListeners() {
    // Grid Element Interaction
    if (domRefs.gridContainer) {
        domRefs.gridContainer.addEventListener('click', handleGridElementClick);
    }

    // Overlay Layer Interaction
    if (domRefs.iconLayer) {
        domRefs.iconLayer.addEventListener('click', handleOverlayClick);
    }
     if (domRefs.textLayer) {
        domRefs.textLayer.addEventListener('click', handleOverlayClick);
    }

    // Drawing Canvas Interaction
    if (domRefs.drawingCanvas) {
        domRefs.drawingCanvas.addEventListener('mousedown', handleDrawingStart);
        domRefs.drawingCanvas.addEventListener('mousemove', handleDrawingMove);
        domRefs.drawingCanvas.addEventListener('mouseup', handleDrawingEnd);
        domRefs.drawingCanvas.addEventListener('mouseout', handleDrawingEnd);
    }

    // Notes Modal Buttons (Listeners now likely in ui.js where modal logic resides)
    // if (domRefs.notesModalSaveBtn) { ... }

     // Icon Gallery Interaction (Deletion and Selection)
     if (domRefs.iconGallery) {
         domRefs.iconGallery.addEventListener('click', handleIconGalleryClick);
     }

    // --- Tool Control Listeners (Color pickers, sliders, text inputs) ---
    // Paint Tool
    if (domRefs.colorBtn) domRefs.colorBtn.addEventListener('click', () => setActiveTool('paint'));
    if (domRefs.eraserBtn) domRefs.eraserBtn.addEventListener('click', () => setActiveTool('erase'));
    if (domRefs.colorPicker) {
        domRefs.colorPicker.addEventListener('input', (e) => {
            currentTool.paintColor = e.target.value;
             if(domRefs.colorPickerHex) domRefs.colorPickerHex.value = e.target.value.toUpperCase();
        });
         if(domRefs.colorPickerHex) domRefs.colorPickerHex.value = domRefs.colorPicker.value.toUpperCase();
    }

    // --- Hex Input Listeners ---
    [
        { hexInput: domRefs.colorPickerHex, colorPicker: domRefs.colorPicker, stateProp: 'paintColor' },
        { hexInput: domRefs.textColorHex, colorPicker: domRefs.textColorPicker, stateProp: 'textColor' },
        { hexInput: domRefs.penColorHex, colorPicker: domRefs.penColorPicker, stateProp: 'penColor' },
        { hexInput: domRefs.iconColorizerHex, colorPicker: domRefs.iconColorizer, stateProp: 'iconColorizerValue' } // ADDED iconColorizer pair
    ].forEach(pair => {
        if (pair.hexInput && pair.colorPicker) {
            // Attach 'input' listener
            pair.hexInput.addEventListener('input', (e) => {
                const newValue = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(newValue)) {
                    pair.colorPicker.value = newValue;
                    currentTool[pair.stateProp] = newValue;
                    pair.colorPicker.dispatchEvent(new Event('input', { bubbles: true }));
                    if (pair.stateProp === 'penColor' && typeof updatePenPreview === 'function') {
                        updatePenPreview();
                    }
                    // If icon colorizer hex changes, update icon preview
                    if (pair.stateProp === 'iconColorizerValue' && typeof updateIconColorStateAndPreview === 'function') {
                         updateIconColorStateAndPreview(newValue); // Call the specific update function
                    }
                }
            });
            // Attach 'change' listener for final validation
            pair.hexInput.addEventListener('change', (e) => {
                 const newValue = e.target.value;
                 if (!/^#[0-9A-F]{6}$/i.test(newValue)) {
                      e.target.value = pair.colorPicker.value.toUpperCase();
                 }
            });
            // Set initial hex value from color picker
             pair.hexInput.value = pair.colorPicker.value.toUpperCase();
        }
    });


    // Icon Tool (Button listeners set up tool)
    if (domRefs.stampBtn) domRefs.stampBtn.addEventListener('click', () => setActiveTool('stamp'));
    if (domRefs.deleteIconBtn) domRefs.deleteIconBtn.addEventListener('click', () => setActiveTool('deleteIcon'));
    // Icon loading/slider listeners handled in icon_tools.js setupIconToolControls

    // Text Tool
    if (domRefs.textStampBtn) domRefs.textStampBtn.addEventListener('click', () => setActiveTool('textStamp'));
    if (domRefs.textDeleteBtn) domRefs.textDeleteBtn.addEventListener('click', () => setActiveTool('textDelete'));
    if (domRefs.textInput) {
        domRefs.textInput.addEventListener('input', (e) => {
            currentTool.textValue = e.target.value;
        });
    }
    if (domRefs.textColorPicker) {
        domRefs.textColorPicker.addEventListener('input', (e) => {
            currentTool.textColor = e.target.value;
             if(domRefs.textColorHex) domRefs.textColorHex.value = e.target.value.toUpperCase();
        });
         if(domRefs.textColorHex) domRefs.textColorHex.value = domRefs.textColorPicker.value.toUpperCase();
    }
    // Text slider listener handled in text_tools.js setupTextToolControls


    // Draw Tool
    if (domRefs.drawBtn) domRefs.drawBtn.addEventListener('click', () => setActiveTool('draw'));
    if (domRefs.drawEraseBtn) domRefs.drawEraseBtn.addEventListener('click', () => setActiveTool('drawErase'));
    if (domRefs.penColorPicker) {
        domRefs.penColorPicker.addEventListener('input', (e) => {
            currentTool.penColor = e.target.value;
            updatePenPreview(); // Update preview directly
            if(domRefs.penColorHex) domRefs.penColorHex.value = e.target.value.toUpperCase();
        });
         if(domRefs.penColorHex) domRefs.penColorHex.value = domRefs.penColorPicker.value.toUpperCase();
    }
    // Pen thickness slider listener handled in draw_tools.js setupDrawToolControls

}

// --- END OF FILE tools.js ---