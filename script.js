document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let hexStates = {}; // { "r_c": { color: "#...", notes: "..." } }
    let iconStates = []; // Stamped icons on map: { id, iconId (ref to loaded), x, y, width, height }
    let textStates = []; // Stamped text elements: { id, text, x, y, fontSize, color }
    let drawingPaths = []; // Drawn paths: { color, thickness, isEraser, points: [{x,y},...] }

    // Collection of loaded SVG definitions
    let loadedIcons = []; // { id: uniqueId, name: fileName, svgString: data, aspectRatio: ratio }
    let selectedIconId = null; // ID of the icon selected from the gallery

    // Global Display Settings State
    let hexUiVisible = true; // Controls visibility of hex numbers/note icons
    let hexUiFontSize = 9;   // Font size for hex numbers/note icons

    // Tool State
    let currentEditorTool = { type: 'color', value: '#9dcd58' }; // Default tool: Paint Hexes
    let currentStampSize = { width: 30, height: 30 }; // Size for next icon stamp
    let currentPenState = {
        color: '#E53935', thickness: 3, isDrawing: false, isErasing: false, currentPath: null
    };
    let currentTextState = { // State for the text stamping tool
        text: '', fontSize: 14, color: '#000000'
    };
    let currentEditingHexId = null; // Tracks which hex's notes are being edited in the modal

    // --- DOM Element References ---
    const domRefs = {
        container: document.getElementById('honeycomb-container'),
        mapAreaWrapper: document.getElementById('map-area-wrapper'), // Wrapper includes overlays
        drawingCanvas: document.getElementById('drawing-canvas'),   // Drawing layer
        iconLayer: document.getElementById('icon-layer'),         // Icon layer
        textLayer: document.getElementById('text-layer'),         // Stamped Text layer
        // Grid Controls
        rowsInput: document.getElementById('rows'),
        colsInput: document.getElementById('cols'),
        sizeInput: document.getElementById('size'),
        gapInput: document.getElementById('gap'),
        shapeSelect: document.getElementById('shape'),
        // Editor Controls - Hex
        colorPicker: document.getElementById('colorPicker'),
        colorBtn: document.getElementById('colorBtn'),
        eraserBtn: document.getElementById('eraserBtn'),
        // Editor Controls - Icon
        loadIconBtn: document.getElementById('loadIconBtn'),
        iconFile: document.getElementById('iconFile'),
        iconSizeSlider: document.getElementById('iconSize'),
        iconSizeValue: document.getElementById('iconSizeValue'),
        iconPreview: document.getElementById('iconPreview'),
        stampBtn: document.getElementById('stampBtn'),
        deleteIconBtn: document.getElementById('deleteIconBtn'),
        iconGallery: document.getElementById('icon-gallery'),
         // Editor Controls - Free Text
        textStampBtn: document.getElementById('textStampBtn'),
        textInput: document.getElementById('textInput'),
        textSizeSlider: document.getElementById('textSize'),
        textSizeValue: document.getElementById('textSizeValue'),
        textColorPicker: document.getElementById('textColor'),
        textDeleteBtn: document.getElementById('textDeleteBtn'),
        // Editor Controls - Draw
        drawBtn: document.getElementById('drawBtn'),
        penColorPicker: document.getElementById('penColor'),
        penThicknessSlider: document.getElementById('penThickness'),
        penThicknessValue: document.getElementById('penThicknessValue'),
        penPreview: document.getElementById('penPreview'),
        drawEraseBtn: document.getElementById('drawEraseBtn'),
         // Display Options
        toggleHexUiCheck: document.getElementById('toggleHexUI'),
        hexFontSizeSlider: document.getElementById('hexFontSize'),
        hexFontSizeValue: document.getElementById('hexFontSizeValue'),
         // Notes Modal
        notesModal: document.getElementById('notes-modal'),
        notesModalTitle: document.getElementById('notes-modal-title'),
        notesModalTextarea: document.getElementById('notes-modal-textarea'),
        notesModalSaveBtn: document.getElementById('notes-modal-save'),
        notesModalCloseBtn: document.getElementById('notes-modal-close'),
        // IO Controls
        saveBtn: document.getElementById('saveBtn'),
        loadBtn: document.getElementById('loadBtn'),
        loadFile: document.getElementById('loadFile'),
        // Tool Buttons Collection
        toolButtons: document.querySelectorAll('.tool-button'),
    };

    // Canvas Context
    const ctx = domRefs.drawingCanvas.getContext('2d');

    // --- Configuration Reading ---
    function getGridConfig() {
        return {
            rows: parseInt(domRefs.rowsInput.value, 10) || 1,
            cols: parseInt(domRefs.colsInput.value, 10) || 1,
            sideLength: parseInt(domRefs.sizeInput.value, 10) || 30,
            gap: parseInt(domRefs.gapInput.value, 10) || 0,
            shape: domRefs.shapeSelect.value,
            orientation: document.querySelector('input[name="orientation"]:checked').value,
        };
    }

    // --- Geometry Calculations ---
    function calculateLayout(config) {
        const { sideLength, gap, orientation, rows, cols } = config;
        const dimension = sideLength * 2;
        const hexWidth = dimension;
        const hexHeight = dimension;

        let horizontalSpacing, verticalSpacing;
        let applyRowOffset, applyColOffset;

        if (orientation === 'pointy') {
             horizontalSpacing = hexWidth + gap;
             verticalSpacing = hexHeight * 0.75 + gap;
             applyRowOffset = true; applyColOffset = false;
        } else { // flat
             horizontalSpacing = hexWidth * 0.75 + gap;
             verticalSpacing = hexHeight + gap;
             applyRowOffset = false; applyColOffset = true;
        }

        const midRow = (rows - 1) / 2; const midCol = (cols - 1) / 2;
        let gridCenterX = midCol * horizontalSpacing + hexWidth / 2;
        let gridCenterY = midRow * verticalSpacing + hexHeight / 2;

        if (orientation === 'pointy' && applyRowOffset && Math.floor(midRow) % 2 !== 0) gridCenterX += horizontalSpacing / 2;
        else if (orientation === 'flat' && applyColOffset && Math.floor(midCol) % 2 !== 0) gridCenterY += verticalSpacing / 2;

        const totalGridWidth = cols * horizontalSpacing + (hexWidth * 0.25);
        const totalGridHeight = rows * verticalSpacing + (hexHeight * 0.25);
        const radiusPixels = (Math.min(totalGridHeight, totalGridWidth) / 2) * 0.95;

        return {
            hexWidth, hexHeight, horizontalSpacing, verticalSpacing,
            applyRowOffset, applyColOffset,
            midRow, midCol, gridCenterX, gridCenterY, radiusPixels
        };
    }

    // --- Hex Creation (Adds Number/Notes UI) ---
    function createHexElement(r, c, config, layout) {
        const { orientation } = config;
        const { hexWidth, hexHeight, horizontalSpacing, verticalSpacing, applyRowOffset, applyColOffset } = layout;
        const hexId = `${r}_${c}`; // Internal ID (0-based)
        const colStr = String(c + 1).padStart(2, '0'); // Display number (1-based)
        const rowStr = String(r + 1).padStart(2, '0'); // Display number (1-based)
        const hexNumber = `${colStr}${rowStr}`; // Formatted display number

        // Calculate position
        let xPos = 0; let yPos = 0;
        if (orientation === 'pointy') {
            xPos = c * horizontalSpacing; yPos = r * verticalSpacing;
            if (applyRowOffset && r % 2 !== 0) xPos += horizontalSpacing / 2;
        } else { /* flat */
            xPos = c * horizontalSpacing; yPos = r * verticalSpacing;
            if (applyColOffset && c % 2 !== 0) yPos += verticalSpacing / 2;
        }

        // Create hexagon div
        const hexagon = document.createElement('div');
        hexagon.classList.add('hexagon');
        hexagon.classList.add(orientation === 'pointy' ? 'hexagon--pointy' : 'hexagon--flat');
        hexagon.dataset.hexId = hexId; // Store internal ID
        hexagon.style.setProperty('--hex-width', `${hexWidth}px`);
        hexagon.style.setProperty('--hex-height', `${hexHeight}px`);
        hexagon.style.left = `${xPos}px`;
        hexagon.style.top = `${yPos}px`;

        // --- Create container for UI elements inside the hex ---
        const uiContainer = document.createElement('div');
        uiContainer.classList.add('hex-ui-container');
        uiContainer.dataset.hexId = hexId;

        // Hex Number Span (Now Clickable for Notes)
        const numberSpan = document.createElement('span');
        numberSpan.classList.add('hex-number'); // Keep class for styling
        numberSpan.textContent = hexNumber;
        numberSpan.title = `Edit Notes for Hex ${hexNumber}`; // Tooltip
        // *** Attach listener to the number span ***
        numberSpan.addEventListener('click', (e) => {
            // Do not allow opening notes if a drawing tool is active
            if (currentEditorTool.type === 'draw' || currentEditorTool.type === 'drawErase') {
                 console.log("Drawing tool active, notes disabled.");
                 return;
            }
            e.stopPropagation(); // Prevent hex background click
            showNotesModal(hexId);
        });

        // Note Exists Indicator (Book Emoji - 📓)
        const noteIndicator = document.createElement('span');
        noteIndicator.classList.add('note-indicator');
        noteIndicator.innerHTML = '📓'; // 📓 Book emoji
        noteIndicator.title = "Notes exist for this hex";
        noteIndicator.style.display = 'none'; // Hide initially

        // Append elements in desired order (Number then Indicator)
        uiContainer.appendChild(numberSpan);
        uiContainer.appendChild(noteIndicator);
        // Append the UI container to the main hexagon div
        hexagon.appendChild(uiContainer);

        // Apply initial color state
        applyHexState(hexagon, hexId);
        // Apply initial note indicator state
        renderHexTextUI(uiContainer, hexId);
        // Add main click listener for hex painting/erasing
        hexagon.addEventListener('click', handleHexClick);

        return { hexagon, xPos, yPos };
    }

    // --- Render Hex UI (Shows/Hides Note Indicator) ---
    function renderHexTextUI(uiContainer, hexId) {
        // Find the container if not passed directly (e.g., after saving notes)
        if (!uiContainer) {
            const hexElement = domRefs.container.querySelector(`.hexagon[data-hex-id="${hexId}"]`);
            if (hexElement) {
                uiContainer = hexElement.querySelector('.hex-ui-container');
            }
        }
        if (!uiContainer) return; // Exit if container not found

        const noteIndicator = uiContainer.querySelector('.note-indicator');
        if (!noteIndicator) return; // Exit if indicator element not found

        // *** CORRECTED CHECK ***
        // Get the notes value safely using optional chaining
        const notesValue = hexStates[hexId]?.notes;
        // Check if notesValue is a string AND its trimmed length is greater than 0
        const hasNotes = typeof notesValue === 'string' && notesValue.trim().length > 0;
        // *** END OF CORRECTION ***

        // Use 'inline-block' to allow margin/spacing around the emoji
        noteIndicator.style.display = hasNotes ? 'inline-block' : 'none';
    }

    // --- Shape Logic ---
    function shouldRenderHex(r, c, config, layout) {
         const { rows, cols, shape } = config;
         const { midRow, midCol, gridCenterX, gridCenterY, radiusPixels, hexWidth, hexHeight, horizontalSpacing, verticalSpacing, applyRowOffset, applyColOffset } = layout;

         switch (shape) {
             case 'rectangle': return true;
             case 'triangle-up': { const colsInThisRow = cols - r; if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
             case 'triangle-down': { const colsInThisRow = r + 1; if (colsInThisRow > cols) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
             case 'hexagon': { const rowDistFromMid = Math.abs(r - midRow); let colsInThisRow = cols - Math.ceil(rowDistFromMid); colsInThisRow = Math.max(0, colsInThisRow); if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
             case 'rhombus': { const rowDistFromMid = Math.abs(r - midRow); let colsInThisRow = cols - Math.floor(rowDistFromMid * 2); colsInThisRow = Math.max(0, colsInThisRow); if (colsInThisRow <= 0) return false; const startCol = Math.floor((cols - colsInThisRow) / 2); return (c >= startCol && c < startCol + colsInThisRow); }
             case 'circle': {
                  let xPos = c * horizontalSpacing; let yPos = r * verticalSpacing;
                  if (config.orientation === 'pointy' && applyRowOffset && r % 2 !== 0) xPos += horizontalSpacing / 2;
                  if (config.orientation === 'flat' && applyColOffset && c % 2 !== 0) yPos += verticalSpacing / 2;
                  const hexCenterX = xPos + hexWidth / 2; const hexCenterY = yPos + hexHeight / 2;
                  const distSq = (hexCenterX - gridCenterX)**2 + (hexCenterY - gridCenterY)**2;
                  return distSq <= radiusPixels**2;
             }
             default: return true;
         }
    }

    // --- Grid Generation ---
    function generateHoneycomb() {
        const previousScrollTop = domRefs.mapAreaWrapper.scrollTop;
        const previousScrollLeft = domRefs.mapAreaWrapper.scrollLeft;
        domRefs.container.innerHTML = ''; // Clear hex container

        const config = getGridConfig();
        const layout = calculateLayout(config);
        let maxLeft = 0, maxTop = 0;

        // Apply global hex UI settings before creating hexes
        updateHexUiVisibility();
        updateHexUiFontSize();

        // Create hex elements
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (shouldRenderHex(r, c, config, layout)) {
                    // createHexElement now includes UI setup and renderHexTextUI call
                    const { hexagon, xPos, yPos } = createHexElement(r, c, config, layout);
                    domRefs.container.appendChild(hexagon);
                    maxLeft = Math.max(maxLeft, xPos + layout.hexWidth);
                    maxTop = Math.max(maxTop, yPos + layout.hexHeight);
                }
            }
        }

        // Calculate final dimensions needed for wrapper and overlays
        const finalWidth = maxLeft + config.gap;
        const finalHeight = maxTop + config.gap;

        // Apply dimensions to wrapper AND overlay layers
        domRefs.mapAreaWrapper.style.width = `${finalWidth}px`;
        domRefs.mapAreaWrapper.style.height = `${finalHeight}px`;
        // Resize canvas drawing surface *and* element style
        domRefs.drawingCanvas.width = finalWidth; domRefs.drawingCanvas.height = finalHeight;
        domRefs.drawingCanvas.style.width = `${finalWidth}px`; domRefs.drawingCanvas.style.height = `${finalHeight}px`;
        // Resize icon layer style
        domRefs.iconLayer.style.width = `${finalWidth}px`; domRefs.iconLayer.style.height = `${finalHeight}px`;
        // Resize text layer style
        domRefs.textLayer.style.width = `${finalWidth}px`; domRefs.textLayer.style.height = `${finalHeight}px`;

        // Redraw overlays based on current state
        renderDrawingPaths();
        renderIcons();
        renderTextElements(); // Render stamped text elements

        // Restore scroll position
        domRefs.mapAreaWrapper.scrollTop = previousScrollTop;
        domRefs.mapAreaWrapper.scrollLeft = previousScrollLeft;
    }

    // --- Hex State Management (Apply Color Only) ---
    function applyHexState(hexagonElement, hexId) {
        // Apply color state
        hexagonElement.style.backgroundColor = hexStates[hexId]?.color || '';
        // Note indicator state is handled by renderHexTextUI
    }

    // --- Icon Rendering (Stamped Icons on Map) ---
    function renderIcons() {
        domRefs.iconLayer.innerHTML = ''; // Clear existing icons
        iconStates.forEach(stampedIcon => {
            const loadedIconData = loadedIcons.find(icon => icon.id === stampedIcon.iconId);
            if (!loadedIconData) return; // Skip if base icon isn't loaded

            const img = document.createElement('img');
            try {
                 const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(loadedIconData.svgString)))}`;
                 img.src = svgDataUrl;
            } catch (error) { console.error("Error encoding SVG string:", error); img.alt = "Error"; }
            img.alt = loadedIconData.name;

            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('stamped-icon');
            iconWrapper.dataset.stampedId = stampedIcon.id;
            iconWrapper.style.left = `${stampedIcon.x - stampedIcon.width / 2}px`;
            iconWrapper.style.top = `${stampedIcon.y - stampedIcon.height / 2}px`;
            iconWrapper.style.width = `${stampedIcon.width}px`;
            iconWrapper.style.height = `${stampedIcon.height}px`;
            iconWrapper.title = loadedIconData.name;
            iconWrapper.appendChild(img);
            domRefs.iconLayer.appendChild(iconWrapper);
        });
    }

    // --- Icon Gallery Rendering ---
    function renderIconGallery() {
        domRefs.iconGallery.innerHTML = ''; // Clear gallery
        loadedIcons.forEach(iconData => {
            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-icon');
            galleryItem.dataset.iconId = iconData.id;
            galleryItem.title = `Select: ${iconData.name}`;

            const img = document.createElement('img');
             try {
                 img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(iconData.svgString)))}`;
                 img.alt = iconData.name;
             } catch (error) { console.error("Error encoding gallery SVG:", error); img.alt = "Error"; }
            galleryItem.appendChild(img);

            if (iconData.id === selectedIconId) galleryItem.classList.add('selected');

            galleryItem.addEventListener('click', () => selectIconForStamping(iconData.id));
            domRefs.iconGallery.appendChild(galleryItem);
        });
        updateIconPreview(); // Update main preview after gallery render
    }

    // --- Stamped Text Rendering ---
    function renderTextElements() {
        domRefs.textLayer.innerHTML = ''; // Clear previous text elements
        textStates.forEach(textState => {
            const textDiv = document.createElement('div');
            textDiv.classList.add('stamped-text');
            textDiv.dataset.textId = textState.id; // For deletion
            textDiv.textContent = textState.text;
            // Position top-left corner at the stored coordinates
            textDiv.style.left = `${textState.x}px`;
            textDiv.style.top = `${textState.y}px`;
            textDiv.style.fontSize = `${textState.fontSize}px`;
            textDiv.style.color = textState.color;
            textDiv.title = `Text: ${textState.text}`; // Tooltip for hover

            // No click listener needed on the element itself unless implementing edit later
            domRefs.textLayer.appendChild(textDiv);
        });
    }

    // --- Drawing Rendering ---
    function renderDrawingPaths() {
        ctx.clearRect(0, 0, domRefs.drawingCanvas.width, domRefs.drawingCanvas.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';

        drawingPaths.forEach(path => {
            if (!path.points || path.points.length < 2) return;
            ctx.lineWidth = path.thickness;
            ctx.strokeStyle = path.isEraser ? '#000000' : path.color; // Color ignored for destination-out
            ctx.globalCompositeOperation = path.isEraser ? 'destination-out' : 'source-over';
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
            ctx.stroke();
        });
        ctx.globalCompositeOperation = 'source-over'; // Reset
    }


    // --- Event Handlers ---

    // Hex Clicking (Paint/Erase Color)
    function handleHexClick(e) {
        // Prevent hex color change if clicking on the number span (handled separately)
        if (e.target.classList.contains('hex-number')) {
            return;
        }

        if (currentEditorTool.type !== 'color' && currentEditorTool.type !== 'erase') return;

        const clickedHexagon = e.currentTarget;
        const hexId = clickedHexagon.dataset.hexId;
        if (!hexStates[hexId]) hexStates[hexId] = {};

        if (currentEditorTool.type === 'color') hexStates[hexId].color = currentEditorTool.value;
        else if (currentEditorTool.type === 'erase') delete hexStates[hexId].color;

        applyHexState(clickedHexagon, hexId);
    }

    // Icon Loading
    function handleIconLoad(event) {
        const files = event.target.files; if (!files || files.length === 0) return;
        let firstIconId = null;
        Array.from(files).forEach((file, index) => {
            if (!file.type || !file.type.includes('svg')) { console.warn(`Skipping non-SVG: ${file.name}`); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                const svgString = e.target.result; if (!svgString) { console.error(`Read error: ${file.name}`); return; }
                const iconId = Date.now() + index + Math.random();
                const newIcon = { id: iconId, name: file.name.replace(/\.svg$/i, ''), svgString: svgString, aspectRatio: calculateSvgAspectRatio(svgString) };
                loadedIcons.push(newIcon);
                if (index === 0) firstIconId = iconId;
                // Render and select after all files processed
                if (firstIconId && newIcon.id === firstIconId) {
                    setTimeout(() => { selectIconForStamping(firstIconId); renderIconGallery(); }, 0);
                } else if (index === files.length -1 && !firstIconId) { // Handle single non-first file load case
                     setTimeout(() => renderIconGallery(), 0);
                }
            };
            reader.onerror = () => console.error(`Read error: ${file.name}`);
            reader.readAsText(file);
        });
        event.target.value = null;
    }

    // Helper to calculate SVG aspect ratio
    function calculateSvgAspectRatio(svgString) {
         const viewBoxMatch = svgString.match(/viewBox=["']([\d\.\-\s]+)["']/);
         if (viewBoxMatch?.[1]) {
             const dims = viewBoxMatch[1].trim().split(/\s+/);
             if (dims.length === 4) {
                  const width = parseFloat(dims[2]); const height = parseFloat(dims[3]);
                  if (width > 0 && height > 0) return width / height;
             }
         }
         const widthMatch = svgString.match(/width=["']([\d\.]+)p?x?["']/);
         const heightMatch = svgString.match(/height=["']([\d\.]+)p?x?["']/);
         if (widthMatch?.[1] && heightMatch?.[1]) {
             const width = parseFloat(widthMatch[1]); const height = parseFloat(heightMatch[1]);
             if (width > 0 && height > 0) return width / height;
         }
         return 1; // Default
    }

    // Icon Selection from Gallery
    function selectIconForStamping(iconId) {
        selectedIconId = iconId;
        updateIconSize(parseInt(domRefs.iconSizeSlider.value, 10)); // Recalculate size based on new aspect ratio
        renderIconGallery(); // Update selection highlight
        // updateIconPreview is called by updateIconSize
    }

    // Update Main Icon Preview
    function updateIconPreview() {
        const selectedIconData = loadedIcons.find(icon => icon.id === selectedIconId);
        domRefs.iconPreview.innerHTML = '';
        if (selectedIconData) {
             try {
                const img = document.createElement('img');
                img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(selectedIconData.svgString)))}`;
                img.style.width = `${currentStampSize.width}px`; img.style.height = `${currentStampSize.height}px`;
                img.style.maxWidth = `100%`; img.style.maxHeight = `100%`; img.style.objectFit = `contain`;
                domRefs.iconPreview.appendChild(img);
             } catch(error){ console.error("Preview error:", error); domRefs.iconPreview.textContent = "Err"; }
        }
    }

    // Icon Size Update (Slider)
    function updateIconSize(sliderValue) {
        const baseSize = parseInt(sliderValue, 10);
        domRefs.iconSizeValue.textContent = `${baseSize}px`;
        const selectedIconData = loadedIcons.find(icon => icon.id === selectedIconId);
        const aspectRatio = selectedIconData ? selectedIconData.aspectRatio : 1;
        if (aspectRatio >= 1) { // Wider or square
            currentStampSize.width = baseSize; currentStampSize.height = Math.max(1, baseSize / aspectRatio);
        } else { // Taller
            currentStampSize.width = Math.max(1, baseSize * aspectRatio); currentStampSize.height = baseSize;
        }
        updateIconPreview();
    }

    // Update Pen Preview Circle
    function updatePenPreview() {
        const thickness = Math.max(1, currentPenState.thickness);
        domRefs.penPreview.style.width = `${thickness}px`; domRefs.penPreview.style.height = `${thickness}px`;
        domRefs.penPreview.style.backgroundColor = currentPenState.color;
        domRefs.penThicknessValue.textContent = `${currentPenState.thickness}px`;
    }

    // General Click Interaction on Map Overlays (Handles Stamping/Deleting Icons & Text)
    function handleMapAreaInteraction(e) {
        // Use currentTarget to get coordinates relative to the layer that was clicked (iconLayer or textLayer)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
        const y = e.clientY - rect.top + e.currentTarget.scrollTop;

        // --- Icon Stamping ---
        if (currentEditorTool.type === 'stamp' && e.currentTarget === domRefs.iconLayer) {
            if (!selectedIconId) { alert("Select an icon first."); return; }
            const newIcon = { id: Date.now() + Math.random(), iconId: selectedIconId, x, y, width: currentStampSize.width, height: currentStampSize.height };
            iconStates.push(newIcon);
            renderIcons();
        }
        // --- Icon Deletion ---
        else if (currentEditorTool.type === 'deleteIcon' && e.currentTarget === domRefs.iconLayer) {
            const clickedIconDiv = e.target.closest('.stamped-icon');
            if (clickedIconDiv?.dataset.stampedId) {
                const idToDelete = parseFloat(clickedIconDiv.dataset.stampedId);
                iconStates = iconStates.filter(icon => icon.id !== idToDelete);
                renderIcons();
            }
        }
         // --- Text Stamping ---
        else if (currentEditorTool.type === 'textStamp' && e.currentTarget === domRefs.textLayer) {
            const textToStamp = currentTextState.text.trim();
            if (!textToStamp) { alert("Enter text first."); return; }
            const newText = { id: Date.now() + Math.random(), text: textToStamp, x, y, fontSize: currentTextState.fontSize, color: currentTextState.color };
            textStates.push(newText);
            renderTextElements();
        }
        // --- Text Deletion ---
        else if (currentEditorTool.type === 'textDelete' && e.currentTarget === domRefs.textLayer) {
             const clickedTextDiv = e.target.closest('.stamped-text');
             if (clickedTextDiv?.dataset.textId) {
                 const idToDelete = parseFloat(clickedTextDiv.dataset.textId);
                 textStates = textStates.filter(txt => txt.id !== idToDelete);
                 renderTextElements();
             }
        }
    }

    // --- Drawing Event Handlers ---
     function handleDrawingStart(e) {
         if ((currentEditorTool.type !== 'draw' && currentEditorTool.type !== 'drawErase') || currentPenState.isDrawing) return;
         currentPenState.isDrawing = true;
         currentPenState.isErasing = (currentEditorTool.type === 'drawErase');
         const x = e.offsetX; const y = e.offsetY;
         currentPenState.currentPath = { color: currentPenState.color, thickness: currentPenState.thickness, isEraser: currentPenState.isErasing, points: [{ x, y }] };
         ctx.globalCompositeOperation = currentPenState.isErasing ? 'destination-out' : 'source-over';
         ctx.strokeStyle = currentPenState.isErasing ? '#000000' : currentPenState.color;
         ctx.lineWidth = currentPenState.thickness;
         ctx.lineCap = 'round'; ctx.lineJoin = 'round';
         ctx.beginPath(); ctx.moveTo(x, y);
     }
     function handleDrawingMove(e) {
         if (!currentPenState.isDrawing) return;
         const x = e.offsetX; const y = e.offsetY;
         currentPenState.currentPath.points.push({ x, y });
         ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
     }
     function handleDrawingEnd() {
         if (!currentPenState.isDrawing) return;
         currentPenState.isDrawing = false;
         if (currentPenState.currentPath?.points.length > 1) {
             drawingPaths.push(currentPenState.currentPath);
         }
         currentPenState.currentPath = null;
         ctx.globalCompositeOperation = 'source-over'; // Reset composite op
     }

    // --- Notes Modal Logic ---
    function showNotesModal(hexId) {
        currentEditingHexId = hexId;
        const [r, c] = hexId.split('_').map(Number); // Get 0-based row/col
        const hexNumber = String(c + 1).padStart(2, '0') + String(r + 1).padStart(2, '0'); // Format 1-based number
        domRefs.notesModalTitle.textContent = `Notes for Hex ${hexNumber}`;
        domRefs.notesModalTextarea.value = hexStates[hexId]?.notes || ''; // Load existing notes
        domRefs.notesModal.classList.add('active');
        domRefs.notesModalTextarea.focus();
    }
    function closeNotesModal() {
        domRefs.notesModal.classList.remove('active');
        currentEditingHexId = null;
        domRefs.notesModalTextarea.value = '';
    }
    function saveNotes() {
        if (!currentEditingHexId) return;
        const newNotes = domRefs.notesModalTextarea.value;
        if (!hexStates[currentEditingHexId]) hexStates[currentEditingHexId] = {}; // Ensure state object exists
        hexStates[currentEditingHexId].notes = newNotes;
        renderHexTextUI(null, currentEditingHexId); // Update indicator on the specific hex
        closeNotesModal();
    }

    // --- Hex UI Display Control Logic ---
    function toggleHexUiVisibility() {
        hexUiVisible = domRefs.toggleHexUiCheck.checked;
        updateHexUiVisibility();
    }
    function updateHexUiVisibility() {
        domRefs.mapAreaWrapper.classList.toggle('show-hex-ui', hexUiVisible);
    }
    function changeHexUiFontSize(event) {
        hexUiFontSize = parseInt(event.target.value, 10);
        domRefs.hexFontSizeValue.textContent = `${hexUiFontSize}px`;
        updateHexUiFontSize();
    }
    function updateHexUiFontSize() {
         domRefs.mapAreaWrapper.style.setProperty('--hex-ui-font-size', `${hexUiFontSize}px`);
    }


    // --- Update Active Tool State ---
    function updateEditorTool(type, value = null) {
        currentEditorTool.type = type;

        // --- Reset UI Feedback & Layer States ---
        domRefs.toolButtons.forEach(btn => btn.classList.remove('active-tool'));
        domRefs.mapAreaWrapper.classList.remove('delete-icon-mode');
        domRefs.textLayer.classList.remove('delete-text-mode');
        domRefs.mapAreaWrapper.classList.remove('drawing-mode'); // *** REMOVE drawing mode class ***

        domRefs.drawingCanvas.style.pointerEvents = 'none'; domRefs.drawingCanvas.style.cursor = 'default';
        domRefs.iconLayer.style.pointerEvents = 'none'; domRefs.iconLayer.style.cursor = 'default';
        domRefs.textLayer.style.pointerEvents = 'none'; domRefs.textLayer.style.cursor = 'default';
        domRefs.container.style.pointerEvents = 'auto'; // Hexes clickable by default
        domRefs.mapAreaWrapper.style.cursor = 'default';

        // --- Activate Specific Tool ---
        switch (type) {
             case 'color':
                currentEditorTool.value = value || domRefs.colorPicker.value; domRefs.colorPicker.value = currentEditorTool.value;
                domRefs.colorBtn.classList.add('active-tool'); break;
             case 'erase': domRefs.eraserBtn.classList.add('active-tool'); break;
             case 'stamp':
                 if (!selectedIconId) { alert("Select icon first."); updateEditorTool('color'); return; }
                 domRefs.stampBtn.classList.add('active-tool');
                 domRefs.iconLayer.style.pointerEvents = 'auto'; domRefs.iconLayer.style.cursor = 'copy';
                 domRefs.container.style.pointerEvents = 'none'; break;
             case 'deleteIcon':
                 domRefs.deleteIconBtn.classList.add('active-tool');
                 domRefs.iconLayer.style.pointerEvents = 'auto'; domRefs.iconLayer.style.cursor = 'crosshair';
                 domRefs.mapAreaWrapper.classList.add('delete-icon-mode');
                 domRefs.container.style.pointerEvents = 'none'; break;
            case 'draw':
            case 'drawErase':
                currentPenState.color = domRefs.penColorPicker.value; currentPenState.thickness = parseInt(domRefs.penThicknessSlider.value, 10); updatePenPreview();
                if(type === 'draw') domRefs.drawBtn.classList.add('active-tool'); else domRefs.drawEraseBtn.classList.add('active-tool');
                domRefs.drawingCanvas.style.pointerEvents = 'auto'; domRefs.drawingCanvas.style.cursor = 'crosshair';
                domRefs.container.style.pointerEvents = 'none';
                domRefs.mapAreaWrapper.classList.add('drawing-mode'); // *** ADD drawing mode class ***
                break;
            case 'textStamp':
                currentTextState.text = domRefs.textInput.value; currentTextState.fontSize = parseInt(domRefs.textSizeSlider.value, 10); currentTextState.color = domRefs.textColorPicker.value;
                domRefs.textStampBtn.classList.add('active-tool');
                domRefs.textLayer.style.pointerEvents = 'auto'; domRefs.textLayer.style.cursor = 'text';
                domRefs.container.style.pointerEvents = 'none'; break;
            case 'textDelete':
                 domRefs.textDeleteBtn.classList.add('active-tool');
                 domRefs.textLayer.style.pointerEvents = 'auto'; domRefs.textLayer.style.cursor = 'crosshair';
                 domRefs.textLayer.classList.add('delete-text-mode');
                 domRefs.container.style.pointerEvents = 'none'; break;
        }
    }

    // --- IO Functions ---
    function saveMapData() {
        try {
            const config = getGridConfig();
            const saveData = {
                params: config,
                states: hexStates, // Includes notes
                icons: iconStates,
                drawing: drawingPaths,
                loadedIcons: loadedIcons,
                text: textStates, // Stamped text
                display: { // Display options
                    hexUiVisible: hexUiVisible,
                    hexUiFontSize: hexUiFontSize
                }
            };
            const jsonString = JSON.stringify(saveData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `hexmap_${config.shape}_${config.rows}x${config.cols}_save.json`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log("Map data saved.");
        } catch (error) { console.error("Save error:", error); alert("Save failed."); }
    }

    function loadMapData(event) {
        const file = event.target.files[0]; if (!file) return;
        if (!file.type || !file.type.includes('json')) { alert("Select JSON file."); event.target.value = null; return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const loadedData = JSON.parse(e.target.result);
                if (!loadedData?.params || !loadedData?.states) throw new Error("Invalid file structure.");

                // Apply grid params and hex states (incl. notes)
                updateControlsAndState(loadedData);

                // Load overlays and definitions
                iconStates = loadedData.icons || [];
                drawingPaths = loadedData.drawing || [];
                loadedIcons = loadedData.loadedIcons || [];
                textStates = loadedData.text || []; // Load text
                selectedIconId = null;

                // Load display options
                const display = loadedData.display || {};
                hexUiVisible = display.hexUiVisible !== undefined ? display.hexUiVisible : true;
                hexUiFontSize = display.hexUiFontSize || 9;
                domRefs.toggleHexUiCheck.checked = hexUiVisible;
                domRefs.hexFontSizeSlider.value = hexUiFontSize;
                domRefs.hexFontSizeValue.textContent = `${hexUiFontSize}px`;

                // Regenerate grid and render everything
                generateHoneycomb();
                renderIconGallery();

                alert("Map loaded successfully!");
            } catch (error) {
                console.error("Load error:", error); alert(`Load failed: ${error.message}. Resetting.`);
                resetAllState();
                generateHoneycomb(); renderIconGallery();
            } finally { event.target.value = null; }
        };
        reader.onerror = () => { alert("Error reading file."); event.target.value = null; };
        reader.readAsText(file);
    }

    // Update Controls and Hex State (Notes included in hexStates)
    function updateControlsAndState(loadedData) {
        const params = loadedData.params;
        domRefs.rowsInput.value = params.rows || 10;
        domRefs.colsInput.value = params.cols || 12;
        domRefs.sizeInput.value = params.sideLength || 30;
        domRefs.gapInput.value = params.gap ?? 3;
        domRefs.shapeSelect.value = params.shape || 'rectangle';
        const orient = params.orientation || 'flat';
        // Ensure the querySelector finds the element before setting 'checked'
        const orientRadio = document.querySelector(`input[name="orientation"][value="${orient}"]`);
        if (orientRadio) orientRadio.checked = true;
        else document.querySelector(`input[name="orientation"][value="flat"]`).checked = true; // Fallback
        hexStates = loadedData.states || {}; // Load hex states (color, notes)
    }

    // Helper to reset all dynamic state
    function resetAllState() {
        hexStates = {}; iconStates = []; drawingPaths = []; loadedIcons = []; textStates = [];
        selectedIconId = null;
        // Reset display options
        hexUiVisible = true; hexUiFontSize = 9;
        domRefs.toggleHexUiCheck.checked = hexUiVisible;
        domRefs.hexFontSizeSlider.value = hexUiFontSize;
        domRefs.hexFontSizeValue.textContent = `${hexUiFontSize}px`;
        // Clear UI elements
        domRefs.iconGallery.innerHTML = ''; domRefs.iconPreview.innerHTML = '';
        // Render empty state
        renderIcons(); renderDrawingPaths(); renderTextElements(); updateHexUiVisibility(); updateHexUiFontSize();
    }

    // --- Setup Functions ---
    function setupEventListeners() {
        // Grid Controls
        [domRefs.rowsInput, domRefs.colsInput, domRefs.sizeInput, domRefs.gapInput].forEach(i => i.addEventListener('input', generateHoneycomb));
        domRefs.shapeSelect.addEventListener('change', generateHoneycomb);
        document.querySelectorAll('input[name="orientation"]').forEach(r => r.addEventListener('change', generateHoneycomb));

        // Editor Controls - Hex Tools
        domRefs.colorPicker.addEventListener('input', (e) => { if (currentEditorTool.type === 'color') currentEditorTool.value = e.target.value; });
        domRefs.colorBtn.addEventListener('click', () => updateEditorTool('color', domRefs.colorPicker.value));
        domRefs.eraserBtn.addEventListener('click', () => updateEditorTool('erase'));

        // Editor Controls - Icon Tools
        domRefs.loadIconBtn.addEventListener('click', () => domRefs.iconFile.click());
        domRefs.iconFile.addEventListener('change', handleIconLoad);
        domRefs.iconSizeSlider.addEventListener('input', (e) => updateIconSize(e.target.value));
        domRefs.stampBtn.addEventListener('click', () => updateEditorTool('stamp'));
        domRefs.deleteIconBtn.addEventListener('click', () => updateEditorTool('deleteIcon'));

        // Editor Controls - Free Text Tools
        domRefs.textStampBtn.addEventListener('click', () => updateEditorTool('textStamp'));
        domRefs.textDeleteBtn.addEventListener('click', () => updateEditorTool('textDelete'));
        domRefs.textInput.addEventListener('input', (e) => currentTextState.text = e.target.value);
        domRefs.textSizeSlider.addEventListener('input', (e) => { currentTextState.fontSize = parseInt(e.target.value, 10); domRefs.textSizeValue.textContent = `${currentTextState.fontSize}px`; });
        domRefs.textColorPicker.addEventListener('input', (e) => currentTextState.color = e.target.value);

        // Editor Controls - Draw Tools
        domRefs.drawBtn.addEventListener('click', () => updateEditorTool('draw'));
        domRefs.drawEraseBtn.addEventListener('click', () => updateEditorTool('drawErase'));
        domRefs.penColorPicker.addEventListener('input', (e) => { currentPenState.color = e.target.value; updatePenPreview(); });
        domRefs.penThicknessSlider.addEventListener('input', (e) => { currentPenState.thickness = parseInt(e.target.value, 10); updatePenPreview(); });

        // Display Options Controls
        domRefs.toggleHexUiCheck.addEventListener('change', toggleHexUiVisibility);
        domRefs.hexFontSizeSlider.addEventListener('input', changeHexUiFontSize);

        // Notes Modal Controls
        domRefs.notesModalCloseBtn.addEventListener('click', closeNotesModal);
        domRefs.notesModalSaveBtn.addEventListener('click', saveNotes);
        domRefs.notesModal.addEventListener('click', (e) => { if (e.target === domRefs.notesModal) closeNotesModal(); });

        // Map Area Interaction Listeners
        domRefs.iconLayer.addEventListener('click', handleMapAreaInteraction);
        domRefs.textLayer.addEventListener('click', handleMapAreaInteraction);
        domRefs.drawingCanvas.addEventListener('mousedown', handleDrawingStart);
        domRefs.drawingCanvas.addEventListener('mousemove', handleDrawingMove);
        domRefs.drawingCanvas.addEventListener('mouseup', handleDrawingEnd);
        domRefs.drawingCanvas.addEventListener('mouseout', handleDrawingEnd); // End draw if leaves canvas

        // IO Controls
        domRefs.saveBtn.addEventListener('click', saveMapData);
        domRefs.loadBtn.addEventListener('click', () => domRefs.loadFile.click());
        domRefs.loadFile.addEventListener('change', loadMapData);

        // --- Initial UI Updates ---
        updateIconSize(domRefs.iconSizeSlider.value); // Set initial icon preview size
        updatePenPreview(); // Set initial pen preview size/color
        domRefs.textSizeValue.textContent = `${currentTextState.fontSize}px`; // Init text size display
        domRefs.hexFontSizeValue.textContent = `${hexUiFontSize}px`; // Init hex UI size display
    }

    // --- Initialization ---
    function initializeApp() {
        setupEventListeners();
        updateEditorTool('color', domRefs.colorPicker.value); // Set initial tool
        generateHoneycomb(); // Generate initial grid/overlays
        renderIconGallery(); // Render empty gallery
        console.log("Hex Map Editor Initialized.");
    }

    // --- Start ---
    initializeApp();

}); // --- End of DOMContentLoaded ---