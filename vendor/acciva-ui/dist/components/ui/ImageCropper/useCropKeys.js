import { aspectRatio } from "../../../lib/image/index.js";
import { clamp } from "../../../lib/utils.js";
import { ARROWS } from "./constants.js";
import { resizeRect } from "./geometry.js";
export function useCropKeys({ image, rect, aspect, minSize, inert, commit, reveal }) {
    const stepFor = (event) => {
        const base = image ? Math.max(1, Math.round(Math.min(image.width, image.height) / 100)) : 1;
        return event.shiftKey ? base * 10 : base;
    };
    const handleBoxKeyDown = (event) => {
        if (inert || !image || !rect)
            return;
        const maxX = image.width - rect.width;
        const maxY = image.height - rect.height;
        const arrow = ARROWS[event.key];
        const step = stepFor(event);
        const jumps = {
            Home: { x: 0 },
            End: { x: maxX },
            PageUp: { y: 0 },
            PageDown: { y: maxY },
        };
        const change = arrow ? { x: rect.x + arrow[0] * step, y: rect.y + arrow[1] * step } : jumps[event.key];
        if (!change)
            return;
        event.preventDefault();
        const moved = { ...rect, ...change };
        reveal(commit({
            ...moved,
            x: clamp(moved.x, 0, maxX),
            y: clamp(moved.y, 0, maxY),
        }));
    };
    const handleCornerKeyDown = (corner) => (event) => {
        const arrow = ARROWS[event.key];
        if (inert || !image || !rect || !arrow)
            return;
        event.preventDefault();
        const step = stepFor(event);
        const point = {
            x: (corner.endsWith("left") ? rect.x : rect.x + rect.width) + arrow[0] * step,
            y: (corner.startsWith("top") ? rect.y : rect.y + rect.height) + arrow[1] * step,
        };
        const ratio = aspectRatio(aspect);
        reveal(commit(resizeRect(rect, corner, point, image, ratio, minSize, arrow[0] ? "x" : "y")));
    };
    return { handleBoxKeyDown, handleCornerKeyDown };
}
