// --- START OF FILE grid.js ---

// --- Imports ---
import { domRefs } from './dom.js';
import { gridCellStates, displayOptions, currentTool } from './state.js';
import { showNotesModal } from './ui.js';
import { renderAllOverlays } from './tools.js';

// --- Configuration Reading ---
// *** ADD export KEYWORD HERE ***
export function getGridConfig() {
    const shapeValue = domRefs.shapeSelect?.value || 'hexagon';
    const isSquare = shapeValue === 'square';

    // Determine base shape and subshape (for hexagons)
    const baseShape = isSquare ? 'square' : 'hexagon';
    const subShape = isSquare ? 'rectangle' : (shapeValue === 'hexagon' ? 'rectangle' : shapeValue); // Default hex subshape

    // Read orientation only if hexagon
    const orientationEl = document.querySelector('input[name="orientation"]:checked');
    const orientation = (baseShape === 'hexagon' && orientationEl) ? orientationEl.value : 'flat'; // Default flat

    return {
        rows: parseInt(domRefs.rowsInput?.value, 10) || 1,
        cols: parseInt(domRefs.colsInput?.value, 10) || 1,
        size: parseInt(domRefs.sizeInput?.value, 10) || (isSquare ? 50 : 45), // Size means side/radius
        gap: parseInt(domRefs.gapInput?.value, 10) || 3,
        baseShape: baseShape, // 'hexagon' or 'square'
        subShape: subShape,   // 'rectangle', 'triangle-up', 'hexagon-shape', etc.
        orientation: orientation, // 'flat' or 'pointy' (only for hexagons)
    };
}

// --- Geometry Calculations ---
function calculateLayout(config) {
    const { size, gap, orientation, rows, cols, baseShape } = config;
    const SQRT3 = Math.sqrt(3);

    let elementWidth, elementHeight; // Hex or Square dimensions
    let horizontalSpacing, verticalSpacing;
    let applyRowOffset = false, applyColOffset = false; // For hex staggering

    if (baseShape === 'hexagon') {
        const radius = size; // For hexagons, size is radius
        if (orientation === 'pointy') {
            elementWidth = SQRT3 * radius;
            elementHeight = 2 * radius;
            horizontalSpacing = elementWidth + gap;
            verticalSpacing = elementHeight * 0.75 + gap;
            applyRowOffset = true;
        } else { // flat
            elementWidth = 2 * radius;
            elementHeight = SQRT3 * radius;
            horizontalSpacing = elementWidth * 0.75 + gap;
            verticalSpacing = elementHeight + gap;
            applyColOffset = true;
        }
    } else { // square
        elementWidth = size; // For squares, size is side length
        elementHeight = size;
        horizontalSpacing = elementWidth + gap;
        verticalSpacing = elementHeight + gap;
        // No offsetting needed for simple square grid
    }

    // --- Grid Centering Logic ---
    const totalGridVisualWidth = cols * horizontalSpacing; // Approximate visual width
    const totalGridVisualHeight = rows * verticalSpacing; // Approximate visual height

    const midRow = (rows - 1) / 2;
    const midCol = (cols - 1) / 2;

    // Geometric center based on spacing
    let gridCenterX = midCol * horizontalSpacing + elementWidth / 2;
    let gridCenterY = midRow * verticalSpacing + elementHeight / 2;

    // Adjust center for hex staggering (only if baseShape is hexagon)
    if (baseShape === 'hexagon') {
        if (orientation === 'pointy' && applyRowOffset && Math.floor(midRow) % 2 !== 0) {
             gridCenterX += horizontalSpacing / 2;
        } else if (orientation === 'flat' && applyColOffset && Math.floor(midCol) % 2 !== 0) {
            gridCenterY += verticalSpacing / 2;
        }
    }

    // Circle shape radius calculation (approximation based on visual size)
    const radiusPixels = (Math.min(totalGridVisualHeight, totalGridVisualWidth) / 2) * 0.95;

    return {
        elementWidth, elementHeight, horizontalSpacing, verticalSpacing,
        applyRowOffset, applyColOffset,
        midRow, midCol, gridCenterX, gridCenterY, radiusPixels
    };
}

// --- Element Creation (Hex or Square with UI) ---
function createGridElement(r, c, config, layout) {
    const { baseShape, orientation } = config;
    const { elementWidth, elementHeight, horizontalSpacing, verticalSpacing, applyRowOffset, applyColOffset } = layout;
    const cellId = `${r}_${c}`; // Internal ID (0-based)
    const colStr = String(c + 1).padStart(2, '0');
    const rowStr = String(r + 1).padStart(2, '0');
    const cellNumber = `${colStr}${rowStr}`; // Formatted display number

    // --- Calculate position ---
    let xPos = c * horizontalSpacing;
    let yPos = r * verticalSpacing;

    if (baseShape === 'hexagon') {
        if (orientation === 'pointy' && applyRowOffset && r % 2 !== 0) {
            xPos += horizontalSpacing / 2;
        } else if (orientation === 'flat' && applyColOffset && c % 2 !== 0) {
            yPos += verticalSpacing / 2;
        }
    } // No offset needed for squares

    // --- Create grid element div ---
    const element = document.createElement('div');
    element.classList.add('grid-element'); // Base class
    element.dataset.cellId = cellId; // Store internal ID
    element.style.width = `${elementWidth}px`;
    element.style.height = `${elementHeight}px`;
    element.style.left = `${xPos}px`;
    element.style.top = `${yPos}px`;

    // Add shape-specific class
    if (baseShape === 'hexagon') {
        element.classList.add('hexagon');
        element.classList.add(orientation === 'pointy' ? 'hexagon--pointy' : 'hexagon--flat');
    } else {
        element.classList.add('square');
    }

    // --- Create UI container ---
    const uiContainer = document.createElement('div');
    uiContainer.classList.add('grid-ui-container');
    uiContainer.dataset.cellId = cellId; // Link UI to cell

    // Cell Number Span (Clickable for Notes)
    const numberSpan = document.createElement('span');
    numberSpan.classList.add('cell-number');
    numberSpan.textContent = cellNumber;
    numberSpan.title = `Edit Notes for Cell ${cellNumber}`;
    numberSpan.addEventListener('click', (e) => {
        // *** ADD LOGGING ***
        console.log(`Cell number clicked for ${cellId}. Current tool: '${currentTool.type}'`);
        // *** END LOGGING ***

        // Only allow opening notes if no specific tool is active
        if (currentTool.type === 'none') {
             e.stopPropagation(); // Prevent grid element click
             console.log(`Opening notes for ${cellId}`); // Log action
             showNotesModal(cellId); // Call the imported function
        } else {
            console.log(`Tool '${currentTool.type}' active, notes disabled.`);
             // Optionally provide visual feedback here (e.g., subtle animation)
        }
    });

    // Note Exists Indicator
    const noteIndicator = document.createElement('span');
    noteIndicator.classList.add('note-indicator');
    noteIndicator.innerHTML = '📓';
    noteIndicator.title = "Notes exist for this cell";
    noteIndicator.style.display = 'none'; // Hidden initially

    // Append UI elements
    uiContainer.appendChild(numberSpan);
    uiContainer.appendChild(noteIndicator);
    element.appendChild(uiContainer);

    // Apply initial state (color, notes indicator)
    applyCellState(element, cellId);
    renderCellUI(uiContainer, cellId); // Render note indicator state

    return { element, xPos, yPos };
}

// --- Render Cell UI (Shows/Hides Note Indicator) ---
export function renderCellUI(uiContainer, cellId) {
    if (!uiContainer) {
        const element = domRefs.gridContainer?.querySelector(`.grid-element[data-cell-id="${cellId}"]`);
        if (element) {
            uiContainer = element.querySelector('.grid-ui-container');
        }
    }
    if (!uiContainer) return;

    const noteIndicator = uiContainer.querySelector('.note-indicator');
    if (!noteIndicator) return;

    const notesValue = gridCellStates[cellId]?.notes;
    // Check if notesValue is a string AND its trimmed length is greater than 0 AND it's not just placeholder HTML
    const hasNotes = typeof notesValue === 'string' && notesValue.trim().length > 0 && notesValue.trim() !== '<br>' && notesValue.trim() !== '<div><br></div>';
    noteIndicator.style.display = hasNotes ? 'inline-block' : 'none';
}

// --- Apply Cell State (Color) ---
export function applyCellState(element, cellId) {
    if (!element) return;
    element.style.backgroundColor = gridCellStates[cellId]?.color || ''; // Use default CSS color if null/undefined
}

// --- Shape Filtering Logic ---
function shouldRenderElement(r, c, config, layout) {
    const { rows, cols, baseShape, subShape, orientation } = config;
    const { midRow, midCol, gridCenterX, gridCenterY, radiusPixels, elementWidth, elementHeight, horizontalSpacing, verticalSpacing, applyRowOffset, applyColOffset } = layout;

    // If square, subshape is always rectangle for filtering
    const filterShape = baseShape === 'square' ? 'rectangle' : subShape;

    switch (filterShape) {
        case 'rectangle': return true;
        // Hexagon sub-shapes
        case 'triangle-up': { const colsInThisRow = cols - r; if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
        case 'triangle-down': { const colsInThisRow = r + 1; if (colsInThisRow > cols) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
        case 'hexagon-shape': { const rowDistFromMid = Math.abs(r - midRow); let colsInThisRow = cols - Math.ceil(rowDistFromMid); colsInThisRow = Math.max(0, colsInThisRow); if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
        case 'rhombus': { const rowDistFromMid = Math.abs(r - midRow); let colsInThisRow = cols - Math.floor(rowDistFromMid * 2); colsInThisRow = Math.max(0, colsInThisRow); if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
        case 'circle': {
            // Calculate center of the current element
            let xPos = c * horizontalSpacing; let yPos = r * verticalSpacing;
            if (baseShape === 'hexagon') {
                 if (orientation === 'pointy' && applyRowOffset && r % 2 !== 0) xPos += horizontalSpacing / 2;
                 if (orientation === 'flat' && applyColOffset && c % 2 !== 0) yPos += verticalSpacing / 2;
            } // No offset for squares
            const elemCenterX = xPos + elementWidth / 2;
            const elemCenterY = yPos + elementHeight / 2;
            const distSq = (elemCenterX - gridCenterX)**2 + (elemCenterY - gridCenterY)**2;
            return distSq <= radiusPixels**2;
        }
        default: return true; // Default to rectangle if subshape unknown
    }
}

// --- Grid Generation ---
export function generateGrid() {
    console.log("Generating grid...");
    if (!domRefs.gridContainer || !domRefs.mapAreaWrapper || !domRefs.drawingCanvas || !domRefs.iconLayer || !domRefs.textLayer) {
        console.error("Cannot generate grid: Essential DOM refs missing.");
        return;
    }

    const previousScrollTop = domRefs.mapAreaWrapper.scrollTop;
    const previousScrollLeft = domRefs.mapAreaWrapper.scrollLeft;
    domRefs.gridContainer.innerHTML = ''; // Clear grid container

    const config = getGridConfig();
    const layout = calculateLayout(config);
    let maxLeft = 0, maxTop = 0;

    // Apply global UI settings from state
    domRefs.mapAreaWrapper.classList.toggle('show-grid-ui', displayOptions.gridUiVisible);
    domRefs.mapAreaWrapper.style.setProperty('--grid-ui-font-size', `${displayOptions.gridUiFontSize}px`);
    // Apply vertical position from state as well
    domRefs.mapAreaWrapper.style.setProperty('--grid-ui-vertical-position', `${displayOptions.gridUiVerticalPosition}%`);


    // Create grid elements
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            if (shouldRenderElement(r, c, config, layout)) {
                const { element, xPos, yPos } = createGridElement(r, c, config, layout);
                domRefs.gridContainer.appendChild(element);
                // Update max dimensions based on hex bounding box position + dimensions
                maxLeft = Math.max(maxLeft, xPos + layout.elementWidth);
                maxTop = Math.max(maxTop, yPos + layout.elementHeight);
            }
        }
    }

    // Calculate final dimensions needed for wrapper and overlays
    // Add gap to ensure content isn't clipped right at the edge
    const finalWidth = maxLeft + config.gap;
    const finalHeight = maxTop + config.gap;

    // Apply dimensions to grid container (for clipping/sizing overlays correctly)
    domRefs.gridContainer.style.width = `${finalWidth}px`;
    domRefs.gridContainer.style.height = `${finalHeight}px`;

    // Resize overlays relative to the grid container size
    domRefs.drawingCanvas.width = finalWidth;
    domRefs.drawingCanvas.height = finalHeight;
    domRefs.drawingCanvas.style.width = `${finalWidth}px`;
    domRefs.drawingCanvas.style.height = `${finalHeight}px`;

    domRefs.iconLayer.style.width = `${finalWidth}px`;
    domRefs.iconLayer.style.height = `${finalHeight}px`;

    domRefs.textLayer.style.width = `${finalWidth}px`;
    domRefs.textLayer.style.height = `${finalHeight}px`;

    // Re-render overlays (icons, text, drawing) as grid size changed
    renderAllOverlays();

    // Restore scroll position
    domRefs.mapAreaWrapper.scrollTop = previousScrollTop;
    domRefs.mapAreaWrapper.scrollLeft = previousScrollLeft;
    console.log("Grid generation complete.");
}

// --- END OF FILE grid.js ---