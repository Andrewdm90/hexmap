import { domRefs } from './dom.js';
import { currentTool, textInstanceStates } from './state.js';


// --- Render Stamped Text ---
export function renderTextElements() {
    if (!domRefs.textLayer) return;
    domRefs.textLayer.innerHTML = ''; // Clear previous text elements

    textInstanceStates.forEach(textState => {
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

        domRefs.textLayer.appendChild(textDiv);
    });
}

// --- Setup Text Tool Listeners ---
export function setupTextToolControls() {
    console.log("Setting up Text Tool Controls..."); // Log setup
    if (domRefs.textSizeSlider && domRefs.textSizeValue) {
         console.log("Attaching listener to textSizeSlider");
        domRefs.textSizeSlider.addEventListener('input', (e) => {
             console.log("Text size slider input event"); // Log event
            currentTool.textSize = parseInt(e.target.value, 10);
            // Update the span directly here
            domRefs.textSizeValue.textContent = `${currentTool.textSize}px`;
        });
        // Set initial display
        domRefs.textSizeValue.textContent = `${currentTool.textSize}px`;
    } else {
         console.warn("textSizeSlider or textSizeValue not found during setup.");
    }
    // Text input and color picker listeners handled in tools.js setupToolListeners
    console.log("Text Tool Controls Setup Complete.");
}