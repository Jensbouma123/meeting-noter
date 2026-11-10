const ASPECT_LABELS = {
    free: "Free",
    "1:1": "Square",
    "4:3": "4:3",
    "16:9": "16:9",
    circle: "Circle",
};
export const DEFAULT_MESSAGES = {
    zoom: "Zoom",
    aspect: "Aspect ratio",
    aspectLabel: (aspect) => (typeof aspect === "number" ? `${aspect.toFixed(2)}:1` : ASPECT_LABELS[aspect]),
    instructions: "Arrow keys move the crop area. Shift moves further.",
    handle: (corner) => `Resize from ${corner}`,
    valueText: (rect) => `${rect.width} by ${rect.height} pixels at ${rect.x}, ${rect.y}`,
    loading: "Loading image…",
    error: "This image can't be cropped",
};
// DOM order is the Tab order the spec fixes: TL, TR, BR, BL.
export const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];
export const ARROWS = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};
