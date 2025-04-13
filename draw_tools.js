import { domRefs, ctx } from './dom.js';
import { currentTool, drawingPathStates } from './state.js';

// --- Update Pen Preview ---
export function updatePenPreview() {
    // console.log("Updating pen preview"); // Can add log here if needed
    if (!domRefs.penPreview || !domRefs.penThicknessValue) {
         console.warn("Pen preview elements missing for update.");
         return;
    }
    const thickness = Math.max(1, currentTool.penThickness);
    domRefs.penPreview.style.width = `${thickness}px`;
    domRefs.penPreview.style.height = `${thickness}px`;
    domRefs.penPreview.style.backgroundColor = currentTool.penColor;
    domRefs.penThicknessValue.textContent = `${currentTool.penThickness}px`; // Update the span text
}

// --- Drawing Event Handlers ---
export function handleDrawingStart(e) {
    if (currentTool.type !== 'draw' && currentTool.type !== 'drawErase') return;
    if (currentTool.isDrawing || !ctx) return; // Prevent multiple starts, ensure context

    currentTool.isDrawing = true;
    // isErasing state is set by setActiveTool

    const rect = domRefs.drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left; // Use clientX for consistency across browsers
    const y = e.clientY - rect.top;

    currentTool.currentPath = {
        color: currentTool.penColor,
        thickness: currentTool.penThickness,
        isEraser: currentTool.isErasing,
        points: [{ x, y }]
    };

    ctx.globalCompositeOperation = currentTool.isErasing ? 'destination-out' : 'source-over';
    ctx.strokeStyle = currentTool.isErasing ? '#000000' : currentTool.penColor; // Eraser color doesn't matter
    ctx.lineWidth = currentTool.penThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
     console.log("Draw start:", currentTool.currentPath);
}

export function handleDrawingMove(e) {
    if (!currentTool.isDrawing || !ctx || !currentTool.currentPath) return;

    const rect = domRefs.drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentTool.currentPath.points.push({ x, y });

    // Draw segment by segment for immediate feedback
    ctx.lineTo(x, y);
    ctx.stroke();
    // Start a new sub-path from the current point to avoid weird joins on fast moves
    ctx.beginPath();
    ctx.moveTo(x, y);
}

export function handleDrawingEnd() {
    if (!currentTool.isDrawing || !ctx) return;

     console.log("Draw end. Path points:", currentTool.currentPath?.points.length);

    if (currentTool.currentPath && currentTool.currentPath.points.length > 1) {
        // Optional: Smooth the path here if desired (e.g., using Catmull-Rom or similar)
        drawingPathStates.push(currentTool.currentPath);
        console.log("Path added:", drawingPathStates);
    } else {
         console.log("Path too short, discarded.");
    }

    currentTool.isDrawing = false;
    currentTool.currentPath = null;
    ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
    // No need to clear canvas, just pushing the final path state. renderDrawingPaths handles redraw.
}

// --- Render Drawn Paths ---
export function renderDrawingPaths() {
    if (!ctx || !domRefs.drawingCanvas) return;

    ctx.clearRect(0, 0, domRefs.drawingCanvas.width, domRefs.drawingCanvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    drawingPathStates.forEach(path => {
        if (!path.points || path.points.length < 2) return;

        ctx.lineWidth = path.thickness;
        ctx.strokeStyle = path.isEraser ? '#000000' : path.color; // Color ignored for destination-out
        ctx.globalCompositeOperation = path.isEraser ? 'destination-out' : 'source-over';

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
    });

    // Reset composite operation after drawing all paths
    ctx.globalCompositeOperation = 'source-over';
}

// --- Setup Draw Tool Listeners ---
export function setupDrawToolControls() {
    console.log("Setting up Draw Tool Controls..."); // Log setup
     if (domRefs.penThicknessSlider) {
          console.log("Attaching listener to penThicknessSlider");
         domRefs.penThicknessSlider.addEventListener('input', (e) => {
             console.log("Pen thickness slider input event"); // Log event
            currentTool.penThickness = parseInt(e.target.value, 10);
            updatePenPreview();
         });
         // Set initial state by calling updatePenPreview after potentially setting thickness
         // updatePenPreview(); // Called in main.js now
     } else {
         console.warn("penThicknessSlider not found during setup.");
     }
     // Color picker listeners handled in tools.js setupToolListeners
     console.log("Draw Tool Controls Setup Complete.");
}