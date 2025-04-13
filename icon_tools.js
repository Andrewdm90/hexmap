// --- START OF FILE icon_tools.js ---

import { domRefs } from './dom.js';
import { loadedIconDefinitions, currentTool, iconInstanceStates } from './state.js';
import { calculateSvgAspectRatio } from './utils.js';
import { setActiveTool } from './tools.js'; // To deselect tool if needed

// --- Icon Loading ---
function setupIconLoader() {
    if (domRefs.loadIconBtn && domRefs.iconFile) {
        domRefs.loadIconBtn.addEventListener('click', () => domRefs.iconFile.click());
        domRefs.iconFile.addEventListener('change', handleIconLoad);
    }
}

async function handleIconLoad(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const loadPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            const fileType = file.type;
            const reader = new FileReader();

            reader.onload = (e) => {
                const result = e.target.result;
                if (!result) {
                    console.error(`Read error (no result): ${file.name}`);
                    return reject(new Error(`Read error: ${file.name}`));
                }

                const iconId = Date.now() + Math.random(); // Simple unique ID
                const iconName = file.name.replace(/\.(svg|png|jpe?g)$/i, '');
                let newIconData = { id: iconId, name: iconName };

                if (fileType.includes('svg')) {
                    newIconData.type = 'svg';
                    newIconData.svgString = result;
                    newIconData.aspectRatio = calculateSvgAspectRatio(result);
                } else if (fileType.includes('png') || fileType.includes('jpeg')) {
                    newIconData.type = 'raster';
                    newIconData.dataURL = result; // Store Data URL for raster
                    // Calculate aspect ratio for raster images
                    const img = new Image();
                    img.onload = () => {
                         newIconData.aspectRatio = img.naturalWidth / img.naturalHeight;
                         resolve(newIconData); // Resolve after aspect ratio is calculated
                    };
                    img.onerror = () => {
                         console.error(`Error loading image ${file.name} to get dimensions.`);
                         newIconData.aspectRatio = 1; // Default aspect ratio on error
                        resolve(newIconData);
                    }
                    img.src = result;
                    // IMPORTANT: Don't resolve yet for raster, wait for img.onload
                    return; // Exit Promise executor until image loads
                } else {
                    console.warn(`Skipping unsupported file type: ${file.name} (${fileType})`);
                     reject(new Error(`Unsupported type: ${file.name}`)); // Reject promise for unsupported types
                     return; // Stop processing this file
                }
                 // Resolve directly for SVG or if raster handling failed before img load
                 if (newIconData.type === 'svg') {
                    resolve(newIconData);
                 }
            };

            reader.onerror = () => {
                console.error(`Read error: ${file.name}`);
                reject(new Error(`Read error: ${file.name}`));
            };

            // Read based on type
            if (fileType.includes('svg')) {
                reader.readAsText(file);
            } else if (fileType.includes('png') || fileType.includes('jpeg')) {
                reader.readAsDataURL(file);
            }
        });
    });

    try {
        const loadedIcons = await Promise.allSettled(loadPromises);
        let firstSuccessfulIconId = null;

        loadedIcons.forEach(result => {
             if (result.status === 'fulfilled' && result.value) {
                loadedIconDefinitions.push(result.value);
                if (!firstSuccessfulIconId) {
                    firstSuccessfulIconId = result.value.id;
                }
            } else if (result.status === 'rejected') {
                 console.warn("Failed to load an icon:", result.reason);
             }
        });

        console.log("Loaded Icon Definitions:", loadedIconDefinitions);
        renderIconGallery(); // Refresh gallery AFTER all icons are processed

        // Select the first successfully loaded icon
        if (firstSuccessfulIconId) {
            selectIconForStamping(firstSuccessfulIconId);
        }

    } catch (error) {
        console.error("Error processing loaded icons:", error);
        alert("An error occurred while loading icons. Check console for details.");
         renderIconGallery();
    } finally {
        if (event.target) event.target.value = null;
    }
}


// --- Icon Gallery Rendering & Interaction ---
export function renderIconGallery() {
    if (!domRefs.iconGallery) return;
    domRefs.iconGallery.innerHTML = ''; // Clear gallery
    loadedIconDefinitions.forEach(iconData => {
        const galleryItem = document.createElement('div');
        galleryItem.classList.add('gallery-icon');
        galleryItem.dataset.iconId = iconData.id;
        galleryItem.title = `Select: ${iconData.name}`;

        const img = document.createElement('img');
        if (iconData.type === 'svg') {
            try {
                 img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(iconData.svgString)))}`;
            } catch (error) { console.error("Error encoding gallery SVG:", error); img.alt = "Error"; }
        } else { // raster
            img.src = iconData.dataURL;
        }
        img.alt = iconData.name;
        galleryItem.appendChild(img);

        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('gallery-delete-button');
        deleteBtn.textContent = '❌'; // Set emoji
        deleteBtn.title = `Delete ${iconData.name} from gallery`;
        deleteBtn.dataset.deleteIconId = String(iconData.id);
        galleryItem.appendChild(deleteBtn);

        if (iconData.id === currentTool.selectedIconId) {
            galleryItem.classList.add('selected');
        }

        domRefs.iconGallery.appendChild(galleryItem);
    });
}

// Handle clicks within the icon gallery (selection or deletion)
export function handleIconGalleryClick(e) {
    const deleteButton = e.target.closest('.gallery-delete-button');
    const galleryIcon = e.target.closest('.gallery-icon');

    if (deleteButton) {
        e.stopPropagation();
        const iconIdToDeleteStr = deleteButton.dataset.deleteIconId;
        console.log("Delete button clicked for ID string:", iconIdToDeleteStr);
        if (iconIdToDeleteStr) {
             const iconIdToDelete = parseFloat(iconIdToDeleteStr);
             deleteIconFromGallery(iconIdToDelete);
        }
    } else if (galleryIcon) {
        const iconIdStr = galleryIcon.dataset.iconId;
         console.log("Gallery icon clicked for ID string:", iconIdStr);
        if (iconIdStr) {
             const iconId = parseFloat(iconIdStr);
             selectIconForStamping(iconId);
        }
    }
}

function deleteIconFromGallery(iconId) {
    if (!confirm("Are you sure you want to delete this icon from the gallery? This cannot be undone.")) {
        return;
    }
    console.log("Deleting icon with ID:", iconId, typeof iconId);
    console.log("Current definitions:", loadedIconDefinitions.map(i => `${i.id} (${typeof i.id})`));

    // Remove from loaded definitions (ensure type consistency for comparison)
    const filteredDefinitions = loadedIconDefinitions.filter(icon => icon.id !== iconId);
    loadedIconDefinitions.splice(0, loadedIconDefinitions.length, ...filteredDefinitions); // Modify original array
    console.log("Definitions after delete:", loadedIconDefinitions);

    // If the deleted icon was selected, deselect it
    if (currentTool.selectedIconId === iconId) {
        console.log("Deselecting deleted icon");
        currentTool.selectedIconId = null;
        setActiveTool('none');
    }

    renderIconGallery();
    updateIconPreview();
}


// --- Icon Selection & Preview ---
function selectIconForStamping(iconId) {
    console.log("Selecting icon ID:", iconId, typeof iconId);
    currentTool.selectedIconId = iconId;
    // Update size/rotation based on the selected icon's aspect ratio and current slider values
    updateIconSize(domRefs.iconSizeSlider ? parseInt(domRefs.iconSizeSlider.value, 10) : 30);
    updateIconRotation(domRefs.iconRotationSlider ? parseInt(domRefs.iconRotationSlider.value, 10) : 0);
    updateIconColorStateAndPreview(domRefs.iconColorizer ? domRefs.iconColorizer.value : '#ffffff');
    updateIconIntensity(domRefs.iconColorIntensitySlider ? parseInt(domRefs.iconColorIntensitySlider.value, 10) : 80); // Also update intensity

    renderIconGallery(); // Update selection highlight in the gallery
    updateIconPreview(); // Update the main preview
}

// --- Update Icon Size State & Preview ---
export function updateIconSize(sliderValue) {
    console.log(`Updating icon size to: ${sliderValue}`);
    currentTool.iconStampSize = parseInt(sliderValue, 10);
    if (domRefs.iconSizeValue) domRefs.iconSizeValue.textContent = `${currentTool.iconStampSize}px`;
     else console.warn("iconSizeValue span not found for update!");

    const selectedIconData = loadedIconDefinitions.find(icon => icon.id === currentTool.selectedIconId);
    const aspectRatio = selectedIconData ? (selectedIconData.aspectRatio || 1) : 1;

    if (aspectRatio >= 1) {
        currentTool.calculatedStampSize.width = currentTool.iconStampSize;
        currentTool.calculatedStampSize.height = Math.max(1, currentTool.iconStampSize / aspectRatio);
    } else {
        currentTool.calculatedStampSize.width = Math.max(1, currentTool.iconStampSize * aspectRatio);
        currentTool.calculatedStampSize.height = currentTool.iconStampSize;
    }

    updateIconPreview();
}

// --- Update Icon Rotation State & Preview ---
export function updateIconRotation(sliderValue) {
    console.log(`Updating icon rotation to: ${sliderValue}`);
    currentTool.iconStampRotation = parseInt(sliderValue, 10);
     if (domRefs.iconRotationValue) domRefs.iconRotationValue.textContent = `${currentTool.iconStampRotation}°`;
     else console.warn("iconRotationValue span not found for update!");
    updateIconPreview();
}


// --- Update Icon Colorizer State & Preview ---
export function updateIconColorStateAndPreview(hexColor) {
    console.log(`Updating icon colorizer to: ${hexColor}`);
    currentTool.iconColorizerValue = hexColor;
    // --- Update hex input field ---
    if (domRefs.iconColorizerHex) {
        domRefs.iconColorizerHex.value = hexColor.toUpperCase();
    }
    updateIconPreview(); // Update preview with new colorization
}

// --- Update Icon Intensity State & Preview ---
function updateIconIntensity(sliderValue) {
    const intensity = parseInt(sliderValue, 10);
    console.log(`Updating icon intensity to: ${intensity}%`);
    currentTool.iconColorIntensity = intensity;
    if (domRefs.iconColorIntensityValue) {
        domRefs.iconColorIntensityValue.textContent = `${intensity}%`;
    } else {
        console.warn("iconColorIntensityValue span not found for update!");
    }
    updateIconPreview(); // Update preview with new intensity
}


// --- Update Main Icon Preview Area ---
export function updateIconPreview() {
    if (!domRefs.iconPreview) return;
    const selectedIconData = loadedIconDefinitions.find(icon => icon.id === currentTool.selectedIconId);
    domRefs.iconPreview.innerHTML = '';

    if (selectedIconData) {
        const img = document.createElement('img');

        if (selectedIconData.type === 'svg') {
             try {
                 img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(selectedIconData.svgString)))}`;
             } catch (error) { console.error("Preview error encoding SVG:", error); img.alt = "Err"; }

             // Apply color tint filter based on intensity
             const colorValue = currentTool.iconColorizerValue;
             const intensity = currentTool.iconColorIntensity; // 0-100
             if (colorValue && colorValue !== '#ffffff' && colorValue !== '#FFFFFF') {
                 // --- CHANGE START: Modify drop-shadow based on intensity ---
                 // Map intensity (0-100) to blur radius (e.g., 0-8px)
                 const maxBlur = 8; // Adjust max blur as desired
                 const blurRadius = (maxBlur * (intensity / 100)).toFixed(1); // Calculate blur
                 // Apply filter with calculated blur
                 img.style.filter = `drop-shadow(0 0 ${blurRadius}px ${colorValue}) drop-shadow(0 0 ${blurRadius}px ${colorValue})`;
                 // REMOVE opacity change: img.style.opacity = intensity / 100;
                 img.style.opacity = 1; // Ensure icon itself is fully visible
                 // --- CHANGE END ---
             } else {
                 img.style.filter = 'none';
                 img.style.opacity = 1; // Full opacity if not colorizing
             }

        } else { // raster
            img.src = selectedIconData.dataURL;
            img.style.filter = 'none'; // No filter for raster
            img.style.opacity = 1; // Always full opacity for raster
        }
        img.alt = selectedIconData.name;
        img.style.width = `${currentTool.calculatedStampSize.width}px`;
        img.style.height = `${currentTool.calculatedStampSize.height}px`;
        img.style.transform = `rotate(${currentTool.iconStampRotation}deg)`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';

        domRefs.iconPreview.appendChild(img);
    }
}


// --- Render Stamped Icons on Map ---
export function renderIcons() {
    if (!domRefs.iconLayer) return;
    domRefs.iconLayer.innerHTML = '';

    iconInstanceStates.forEach(stampedIcon => {
        const loadedIconData = loadedIconDefinitions.find(icon => icon.id === stampedIcon.iconId);
        if (!loadedIconData) {
             console.warn(`Icon definition missing for stamped icon ID: ${stampedIcon.iconId}`);
            return;
        }

        const img = document.createElement('img');
        if (loadedIconData.type === 'svg') {
             try {
                 img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(loadedIconData.svgString)))}`;
             } catch (error) { console.error("Error encoding SVG string for map:", error); img.alt = "Error"; }
             // Apply color tint filter AND adjust based on intensity
             const colorValue = stampedIcon.colorFilterValue;
             const intensity = stampedIcon.intensity ?? 50; // Use stored intensity or default to 50
             if (colorValue && colorValue !== '#ffffff' && colorValue !== '#FFFFFF') {
                  // --- CHANGE START: Modify drop-shadow based on intensity ---
                 const maxBlur = 8;
                 const blurRadius = (maxBlur * (intensity / 100)).toFixed(1);
                 img.style.filter = `drop-shadow(0 0 ${blurRadius}px ${colorValue}) drop-shadow(0 0 ${blurRadius}px ${colorValue})`;
                 // REMOVE opacity change: img.style.opacity = intensity / 100;
                 img.style.opacity = 1; // Ensure icon itself is fully visible
                 // --- CHANGE END ---
             } else {
                  img.style.filter = 'none';
                  img.style.opacity = 1;
             }
        } else { // raster
            img.src = loadedIconData.dataURL;
             img.style.filter = 'none';
             img.style.opacity = 1;
        }
        img.alt = loadedIconData.name;
        img.style.transform = `rotate(${stampedIcon.rotation || 0}deg)`;

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


// --- Initialize Icon Tool Specific Listeners ---
// ... (setupIconToolControls remains the same as previous version) ...
export function setupIconToolControls() {
    console.log("Setting up Icon Tool Controls...");
    setupIconLoader();

    // Size Slider
    if (domRefs.iconSizeSlider) {
        console.log("Attaching listener to iconSizeSlider");
        domRefs.iconSizeSlider.addEventListener('input', (e) => updateIconSize(e.target.value));
    } else console.warn("iconSizeSlider not found.");

    // Rotation Slider
    if (domRefs.iconRotationSlider) {
        console.log("Attaching listener to iconRotationSlider");
        domRefs.iconRotationSlider.addEventListener('input', (e) => updateIconRotation(e.target.value));
    } else console.warn("iconRotationSlider not found.");

    // Colorizer Picker
    if (domRefs.iconColorizer) {
        console.log("Attaching listener to iconColorizer");
        domRefs.iconColorizer.addEventListener('input', (e) => updateIconColorStateAndPreview(e.target.value));
        // Set initial hex value display as well
        if (domRefs.iconColorizerHex) {
             domRefs.iconColorizerHex.value = domRefs.iconColorizer.value.toUpperCase();
        }
    } else console.warn("iconColorizer not found.");

    // Intensity Slider
    if (domRefs.iconColorIntensitySlider) {
        console.log("Attaching listener to iconColorIntensitySlider");
        domRefs.iconColorIntensitySlider.addEventListener('input', (e) => updateIconIntensity(e.target.value));
        // Set initial display from state
        updateIconIntensity(currentTool.iconColorIntensity); // Call this AFTER state is initialized
    } else console.warn("iconColorIntensitySlider not found during setup.");

    console.log("Icon Tool Controls Setup Complete.");
}

// --- END OF FILE icon_tools.js ---