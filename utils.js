// --- Utility Functions ---

// Calculate SVG aspect ratio from string
export function calculateSvgAspectRatio(svgString) {
    if (typeof svgString !== 'string' || !svgString) return 1; // Default if no string

    try {
        // Prefer viewBox for aspect ratio
        const viewBoxMatch = svgString.match(/viewBox=["']([\d.\s-]+)["']/i);
        if (viewBoxMatch && viewBoxMatch[1]) {
            const dims = viewBoxMatch[1].trim().split(/\s+/);
            if (dims.length === 4) {
                const width = parseFloat(dims[2]);
                const height = parseFloat(dims[3]);
                if (width > 0 && height > 0) {
                    return width / height;
                }
            }
        }

        // Fallback to width/height attributes
        const widthMatch = svgString.match(/width=["']([\d.]+)p?x?["']/i);
        const heightMatch = svgString.match(/height=["']([\d.]+)p?x?["']/i);
        if (widthMatch && widthMatch[1] && heightMatch && heightMatch[1]) {
            const width = parseFloat(widthMatch[1]);
            const height = parseFloat(heightMatch[1]);
            if (width > 0 && height > 0) {
                return width / height;
            }
        }
    } catch (error) {
        console.error("Error parsing SVG for aspect ratio:", error);
    }

    return 1; // Default aspect ratio if parsing fails or attributes missing
}

// --- Potential future utils ---
// e.g., Debounce function, color conversion functions, etc.