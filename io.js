// --- START OF FILE io.js ---

import { domRefs, ctx } from './dom.js';
import {
    gridCellStates,
    iconInstanceStates, textInstanceStates, drawingPathStates, // Import textInstanceStates
    loadedIconDefinitions, displayOptions, currentTool, resetAllState
} from './state.js';
import { getGridConfig, generateGrid } from './grid.js';
import { renderIconGallery } from './icon_tools.js';
import { renderAllOverlays, setActiveTool } from './tools.js';
import { updateUIFromState, updateUIForNewGrid } from './ui.js';

// --- Setup IO Buttons ---
// ... (remains unchanged) ...
export function setupIOListeners() {
    console.log("Setting up IO Listeners...");
    if (domRefs.saveBtn) {
         console.log("Attaching listener to saveBtn");
         domRefs.saveBtn.addEventListener('click', saveMapData);
    } else console.warn("saveBtn not found.");

    if (domRefs.loadBtn) {
         console.log("Attaching listener to loadBtn");
         domRefs.loadBtn.addEventListener('click', () => {
             console.log("Load button clicked, triggering file input");
             domRefs.loadFile?.click();
         });
    } else console.warn("loadBtn not found.");

    if (domRefs.loadFile) {
         console.log("Attaching listener to loadFile");
         domRefs.loadFile.addEventListener('change', loadMapData);
    } else console.warn("loadFile input not found.");

    if (domRefs.exportNotesBtn) {
         console.log("Attaching listener to exportNotesBtn");
         domRefs.exportNotesBtn.addEventListener('click', exportNotes);
    } else console.warn("exportNotesBtn not found.");

    if (domRefs.exportPngBtn) {
         console.log("Attaching listener to exportPngBtn");
         domRefs.exportPngBtn.addEventListener('click', exportMapImage);
    } else console.warn("exportPngBtn not found.");
     console.log("IO Listeners Setup Complete.");
}

// --- Save Map Data ---
// ... (remains unchanged) ...
function saveMapData() {
    console.log("saveMapData triggered");
    try {
        const config = getGridConfig();
        const saveData = {
            version: 1,
            config: config,
            display: displayOptions,
            cellStates: gridCellStates,
            iconInstances: iconInstanceStates,
            textInstances: textInstanceStates,
            drawingPaths: drawingPathStates,
            loadedIcons: loadedIconDefinitions,
        };

        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        link.download = `gridmap_${config.baseShape}_${config.rows}x${config.cols}_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("Map data saved.");
    } catch (error) {
        console.error("Save error:", error);
        alert(`Save failed: ${error.message}`);
    }
}

// --- Load Map Data ---
// ... (remains unchanged) ...
function loadMapData(event) {
    console.log("loadMapData triggered by file input change");
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.includes('json')) {
        alert("Invalid file type. Please select a JSON file.");
        event.target.value = null;
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);

            if (!loadedData || !loadedData.config || !loadedData.cellStates) {
                throw new Error("Invalid map file structure.");
            }
            if (loadedData.version !== 1) {
                 console.warn(`Loading map data from version ${loadedData.version}. Current version is 1. Compatibility issues may occur.`);
            }

            resetAllState();
            updateControlsFromConfig(loadedData.config);
            Object.assign(displayOptions, loadedData.display || {});
            Object.assign(gridCellStates, loadedData.cellStates || {});
            iconInstanceStates.splice(0, iconInstanceStates.length, ...(loadedData.iconInstances || []));
            textInstanceStates.splice(0, textInstanceStates.length, ...(loadedData.textInstances || []));
            drawingPathStates.splice(0, drawingPathStates.length, ...(loadedData.drawingPaths || []));
            loadedIconDefinitions.splice(0, loadedIconDefinitions.length, ...(loadedData.loadedIcons || []));

            currentTool.selectedIconId = null;
            currentTool.currentEditingCellId = null;
            currentTool.type = 'none';

            updateUIFromState();
            updateUIForNewGrid();
            generateGrid();
            renderIconGallery();
            renderAllOverlays();
            setActiveTool('none');

            alert("Map loaded successfully!");

        } catch (error) {
            console.error("Load error:", error);
            alert(`Load failed: ${error.message}. Resetting map.`);
            resetAllState();
            updateControlsFromConfig(getGridConfig());
            updateUIFromState();
            updateUIForNewGrid();
            generateGrid();
            renderIconGallery();
            renderAllOverlays();
            setActiveTool('none');
        } finally {
            if (event.target) event.target.value = null;
        }
    };
    reader.onerror = () => {
        alert("Error reading file.");
        event.target.value = null;
    };
    reader.readAsText(file);
}

// Helper to update HTML controls based on loaded config data
// ... (remains unchanged) ...
function updateControlsFromConfig(config) {
    if (!config) return;
    console.log("Updating controls from config:", config);
    if (domRefs.rowsInput) domRefs.rowsInput.value = config.rows || 10;
    if (domRefs.colsInput) domRefs.colsInput.value = config.cols || 12;
    if (domRefs.sizeInput) domRefs.sizeInput.value = config.size || (config.baseShape === 'square' ? 50 : 45);
    if (domRefs.gapInput) domRefs.gapInput.value = config.gap ?? 3;

    let shapeValue = config.baseShape || 'hexagon';
    if (shapeValue === 'hexagon' && config.subShape && config.subShape !== 'rectangle') {
        shapeValue = config.subShape;
    }
    if (domRefs.shapeSelect) domRefs.shapeSelect.value = shapeValue;

    if (config.baseShape === 'hexagon' && config.orientation) {
        const orientRadio = document.querySelector(`input[name="orientation"][value="${config.orientation}"]`);
        if (orientRadio) orientRadio.checked = true;
    } else {
         const flatOrientRadio = document.querySelector(`input[name="orientation"][value="flat"]`);
        if (flatOrientRadio) flatOrientRadio.checked = true;
    }
}


// --- Export Notes ---
// ... (remains unchanged) ...
function exportNotes() {
    console.log("exportNotes triggered");
    let noteCount = 0;
    let htmlContent = `<!DOCTYPE html>...`; // Content as before
    const sortedKeys = Object.keys(gridCellStates).sort((a, b) => { /* ... sorting ... */ });

    sortedKeys.forEach(cellId => {
        const state = gridCellStates[cellId];
        const notesHTML = state?.notes;
        const isEmpty = !notesHTML || notesHTML.trim().length === 0 || notesHTML.trim() === '<br>' || notesHTML.trim() === '<div><br></div>';

        if (!isEmpty) {
            const [r, c] = cellId.split('_').map(Number);
            const cellNumber = String(c + 1).padStart(2, '0') + String(r + 1).padStart(2, '0');
            htmlContent += `
    <div class="note-entry">
        <h3>Cell ${cellNumber} (Row ${r + 1}, Col ${c + 1})</h3>
        <div class="note-content">
            ${notesHTML}
        </div>
    </div>
`;
            noteCount++;
        }
    });

    if (noteCount === 0) {
        alert("No notes found to export.");
        return;
    }
    htmlContent += `</body></html>`;

    try {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        link.download = `gridmap_notes_${timestamp}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log("Notes exported as HTML.");
    } catch (error) {
        console.error("Notes export error:", error);
        alert(`Failed to export notes: ${error.message}`);
    }
}

// --- Export Map as PNG ---
async function exportMapImage() {
    console.log("exportMapImage triggered");
    if (!domRefs.mapAreaWrapper || !domRefs.gridContainer || !domRefs.drawingCanvas || !domRefs.iconLayer || !domRefs.textLayer || typeof html2canvas === 'undefined') {
        alert("Cannot export image: Required elements or library missing.");
        console.error("html2canvas library or essential map elements not found.");
        return;
    }

    console.log("Preparing image export...");
    alert("Preparing image export... This might take a moment for large maps.");

    // --- Store Original Styles & State ---
    const wrapper = domRefs.mapAreaWrapper;
    const grid = domRefs.gridContainer;
    const originalStyles = { /* ... store styles ... */
        overflow: wrapper.style.overflow, border: wrapper.style.border,
        width: wrapper.style.width, height: wrapper.style.height,
        maxWidth: wrapper.style.maxWidth
    };
    const scrollX = wrapper.scrollLeft; const scrollY = wrapper.scrollTop;
    const wasGridUiVisible = displayOptions.gridUiVisible;

    // --- Prepare for Capture ---
    const computedWrapperStyle = getComputedStyle(wrapper);
    const paddingLeft = parseFloat(computedWrapperStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedWrapperStyle.paddingRight) || 0;
    const paddingTop = parseFloat(computedWrapperStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedWrapperStyle.paddingBottom) || 0;
    const fullWidth = grid.offsetWidth + paddingLeft + paddingRight;
    const fullHeight = grid.offsetHeight + paddingTop + paddingBottom;

    // Temporarily resize wrapper
    wrapper.style.width = `${fullWidth}px`; wrapper.style.height = `${fullHeight}px`;
    wrapper.style.overflow = 'hidden'; wrapper.style.border = 'none';
    wrapper.style.maxWidth = 'none'; wrapper.scrollLeft = 0; wrapper.scrollTop = 0;

    // Create SVG overlay
    const svgExportOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgExportOverlay.setAttribute('width', fullWidth); svgExportOverlay.setAttribute('height', fullHeight);
    svgExportOverlay.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgExportOverlay.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgExportOverlay.style.position = 'absolute'; svgExportOverlay.style.top = '0px';
    svgExportOverlay.style.left = '0px'; svgExportOverlay.style.zIndex = '15';
    svgExportOverlay.style.pointerEvents = 'none'; svgExportOverlay.id = 'temp-svg-export-overlay';
    wrapper.appendChild(svgExportOverlay);

    // Get UI styles
    const uiFontSize = displayOptions.gridUiFontSize;
    const uiFontFamily = 'monospace'; const textFontFamily = 'sans-serif';
    let uiTextColor = '#333'; let uiBgColor = 'rgba(255, 255, 255, 0.7)';
    try { /* ... get computed UI styles ... */
        const tempStyleGetter = document.createElement('div'); tempStyleGetter.style.display = 'none';
        domRefs.body.appendChild(tempStyleGetter);
        const computedBodyStyle = getComputedStyle(domRefs.body);
        uiTextColor = computedBodyStyle.getPropertyValue('--grid-ui-text').trim() || '#333';
        uiBgColor = computedBodyStyle.getPropertyValue('--grid-ui-bg').trim() || 'rgba(255, 255, 255, 0.7)';
        domRefs.body.removeChild(tempStyleGetter);
    } catch(e) { console.warn("Could not compute UI styles via temp element, using defaults.", e);}
    const uiPositionPercent = displayOptions.gridUiVerticalPosition;
    const uiPaddingLR = 3; const uiPaddingTB = 1; const uiBorderRadius = 2;
    const stampedTextPaddingLR = 4; const stampedTextPaddingTB = 1;

    const allGridElements = grid.querySelectorAll('.grid-element');
    const originalDisplayStyles = new Map();

    // --- Draw Backgrounds and UI Text into SVG ---
    allGridElements.forEach(element => {
        try {
            // ... (get styles, position, cellId etc) ...
            const style = window.getComputedStyle(element);
            const width = parseFloat(style.width); const height = parseFloat(style.height);
            const left = element.offsetLeft + grid.offsetLeft;
            const top = element.offsetTop + grid.offsetTop;
            const bgColor = style.backgroundColor || 'transparent';
            const isHex = element.classList.contains('hexagon');
            const isPointy = isHex && element.classList.contains('hexagon--pointy');
            const cellId = element.dataset.cellId;

            originalDisplayStyles.set(element, element.style.display);
            element.style.display = 'none';

            // Draw background shape
            let shape;
            if (isHex) { /* ... create polygon ... */
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                let points = '';
                if (isPointy) points = `${width * 0.5} 0, ${width} ${height * 0.25}, ${width} ${height * 0.75}, ${width * 0.5} ${height}, 0 ${height * 0.75}, 0 ${height * 0.25}`;
                else points = `${width * 0.25} 0, ${width * 0.75} 0, ${width} ${height * 0.5}, ${width * 0.75} ${height}, ${width * 0.25} ${height}, 0 ${height * 0.5}`;
                shape.setAttribute('points', points);
            } else { /* ... create rect ... */
                shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                shape.setAttribute('width', width); shape.setAttribute('height', height);
            }
            shape.setAttribute('fill', bgColor);
            shape.setAttribute('transform', `translate(${left}, ${top})`);
            svgExportOverlay.appendChild(shape);

            // Draw UI Text & Background if needed
            if (wasGridUiVisible && cellId) { /* ... draw background rect and text ... */
                const [r, c] = cellId.split('_').map(Number); const cellNumber = String(c + 1).padStart(2, '0') + String(r + 1).padStart(2, '0');
                const textBaselineY = top + height * (1 - uiPositionPercent / 100); const textCenterX = left + width / 2;
                const notes = gridCellStates[cellId]?.notes; const hasNotes = typeof notes === 'string' && notes.trim().length > 0 && notes.trim() !== '<br>' && notes.trim() !== '<div><br></div>';
                const noteIndicatorText = hasNotes ? ' 📓' : ''; const fullText = cellNumber + noteIndicatorText;
                const approxCharWidth = uiFontSize * 0.65; const bgWidth = (fullText.length * approxCharWidth) + (uiPaddingLR * 2);
                const bgHeight = uiFontSize + (uiPaddingTB * 2); const bgX = textCenterX - bgWidth / 2; const bgY = textBaselineY - bgHeight + uiPaddingTB;

                const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bgRect.setAttribute('x', bgX); bgRect.setAttribute('y', bgY); bgRect.setAttribute('width', bgWidth); bgRect.setAttribute('height', bgHeight);
                bgRect.setAttribute('fill', uiBgColor); bgRect.setAttribute('rx', uiBorderRadius); bgRect.setAttribute('ry', uiBorderRadius);
                svgExportOverlay.appendChild(bgRect);

                const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                textElement.setAttribute('x', textCenterX); textElement.setAttribute('y', textBaselineY);
                textElement.setAttribute('fill', uiTextColor); textElement.setAttribute('font-size', `${uiFontSize}px`);
                textElement.setAttribute('font-family', uiFontFamily); textElement.setAttribute('text-anchor', 'middle');
                textElement.setAttribute('dominant-baseline', 'text-bottom');
                textElement.textContent = fullText;
                svgExportOverlay.appendChild(textElement);
            }
        } catch (e) { /* ... error handling ... */ }
    });

    // Add Drawing Canvas content to SVG overlay
    try { /* ... add canvas image ... */
        if (domRefs.drawingCanvas.width > 0 && domRefs.drawingCanvas.height > 0 && drawingPathStates.length > 0) {
            const canvasDataUrl = domRefs.drawingCanvas.toDataURL('image/png');
            const canvasImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            canvasImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', canvasDataUrl);
            canvasImage.setAttribute('x', paddingLeft); canvasImage.setAttribute('y', paddingTop);
            canvasImage.setAttribute('width', domRefs.drawingCanvas.width); canvasImage.setAttribute('height', domRefs.drawingCanvas.height);
            svgExportOverlay.appendChild(canvasImage);
            console.log("Drawing canvas added to SVG overlay.");
        } else { console.log("Drawing canvas empty/zero-sized, skipping."); }
    } catch (e) { console.error("Error converting/adding drawing canvas:", e); }

    // --- Draw Icons into SVG Overlay ---
    iconInstanceStates.forEach(stampedIcon => {
        const loadedIconData = loadedIconDefinitions.find(icon => icon.id === stampedIcon.iconId);
        if (!loadedIconData) return;

        const iconImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        const imgX = paddingLeft + stampedIcon.x - stampedIcon.width / 2;
        const imgY = paddingTop + stampedIcon.y - stampedIcon.height / 2;
        iconImage.setAttribute('x', imgX); iconImage.setAttribute('y', imgY);
        iconImage.setAttribute('width', stampedIcon.width); iconImage.setAttribute('height', stampedIcon.height);

        if (loadedIconData.type === 'svg') {
             try { /* ... set SVG href ... */
                const svgDataURL = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(loadedIconData.svgString)))}`;
                iconImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', svgDataURL);
             } catch (error) { /* ... handle error ... */ return; }
        } else { /* ... set raster href ... */
             iconImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', loadedIconData.dataURL);
        }

        const centerX = imgX + stampedIcon.width / 2;
        const centerY = imgY + stampedIcon.height / 2;
        iconImage.setAttribute('transform', `rotate(${stampedIcon.rotation || 0} ${centerX} ${centerY})`);

        // --- REMOVED Style application for color/intensity ---
        // Icons will render with original colors in export
        // iconImage.setAttribute('style', 'opacity: 1;'); // Optional: Explicitly set opacity to 1 if needed

        svgExportOverlay.appendChild(iconImage);
    });
    console.log("Icons added to SVG overlay.");

    // --- Draw Text into SVG Overlay ---
    textInstanceStates.forEach(textState => {
        // ... (create background rect for text) ...
        const textX = paddingLeft + textState.x; const textY = paddingTop + textState.y;
        const textFontSize = textState.fontSize || 14;
        const approxCharWidth = textFontSize * 0.6; const textWidth = textState.text.length * approxCharWidth;
        const bgHeight = textFontSize + stampedTextPaddingTB * 2; const bgWidth = textWidth + stampedTextPaddingLR * 2;
        const bgX = textX; const bgY = textY - stampedTextPaddingTB;

        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', bgX); bgRect.setAttribute('y', bgY); bgRect.setAttribute('width', bgWidth); bgRect.setAttribute('height', bgHeight);
        bgRect.setAttribute('fill', uiBgColor); bgRect.setAttribute('rx', uiBorderRadius); bgRect.setAttribute('ry', uiBorderRadius);
        svgExportOverlay.appendChild(bgRect);

        // ... (create text element) ...
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', textX + stampedTextPaddingLR); textElement.setAttribute('y', textY + textFontSize);
        textElement.setAttribute('fill', textState.color || uiTextColor); textElement.setAttribute('font-size', `${textFontSize}px`);
        textElement.setAttribute('font-family', textFontFamily);
        textElement.setAttribute('dominant-baseline', 'text-bottom');
        textElement.textContent = textState.text;
        svgExportOverlay.appendChild(textElement);
    });
    console.log("Stamped text added to SVG overlay.");


    // --- Hide original overlay layers ---
    const originalIconLayerDisplay = domRefs.iconLayer.style.display;
    const originalTextLayerDisplay = domRefs.textLayer.style.display;
    const originalDrawingCanvasDisplay = domRefs.drawingCanvas.style.display;
    domRefs.iconLayer.style.display = 'none';
    domRefs.textLayer.style.display = 'none';
    domRefs.drawingCanvas.style.display = 'none';

    // Allow rendering time
    await new Promise(resolve => setTimeout(resolve, 350));

    try {
        const options = { /* ... options ... */
            allowTaint: true, useCORS: true, scale: window.devicePixelRatio || 2,
            backgroundColor: getComputedStyle(domRefs.body).backgroundColor,
            width: fullWidth, height: fullHeight, x: 0, y: 0,
            ignoreElements: (element) => {
                 // Ignore hidden elements/layers
                 return (element.classList.contains('grid-element') && element.style.display === 'none') ||
                        element === domRefs.iconLayer || element === domRefs.textLayer || element === domRefs.drawingCanvas;
            }
        };
        console.log("html2canvas options:", options);

        // Capture the mapAreaWrapper
        const canvas = await html2canvas(wrapper, options);

        // Generate and download image
        const imageURL = canvas.toDataURL('image/png');
        const link = document.createElement('a'); /* ... download link ... */
        link.href = imageURL; const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const config = getGridConfig(); link.download = `gridmap_export_${config.baseShape}_${timestamp}.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        console.log("Map exported as PNG.");

    } catch (error) { /* ... error handling ... */
        console.error("PNG Export Error (html2canvas):", error);
        alert(`Failed to export map as PNG: ${error.message}. Check console for details.`);
    } finally {
        // --- Cleanup (always runs) ---
        console.log("Cleaning up after export attempt...");
        if (document.getElementById('temp-svg-export-overlay')) { svgExportOverlay.remove(); }
        // Restore original elements/layers
        allGridElements.forEach(element => {
            if (originalDisplayStyles.has(element)) { element.style.display = originalDisplayStyles.get(element); }
            else { element.style.display = ''; }
        });
        domRefs.iconLayer.style.display = originalIconLayerDisplay;
        domRefs.textLayer.style.display = originalTextLayerDisplay;
        domRefs.drawingCanvas.style.display = originalDrawingCanvasDisplay;
        // Restore wrapper styles and scroll
        wrapper.style.width = originalStyles.width; wrapper.style.height = originalStyles.height;
        wrapper.style.overflow = originalStyles.overflow; wrapper.style.border = originalStyles.border;
        wrapper.style.maxWidth = originalStyles.maxWidth; wrapper.scrollLeft = scrollX; wrapper.scrollTop = scrollY;
        // Restore grid UI visibility class
        if(wrapper) { wrapper.classList.toggle('show-grid-ui', wasGridUiVisible); }
        console.log("Cleanup complete.");
        // --- End Cleanup ---
    }
}