import { clampCropRect, initialCropRect } from "../../../lib/image/index.js";
import { clamp } from "../../../lib/utils.js";
export function useCropEdits({ image, aspect, aspectOptions, onAspectChange, value, onChange, setInnerRect, minSize, zoom, zoomProp, setInnerZoom, minZoom, maxZoom, onZoomChange, setCenter, view, }) {
    const commit = (next) => {
        if (!image)
            return;
        const clamped = clampCropRect(next, image.width, image.height, aspect, minSize);
        if (value === undefined)
            setInnerRect(clamped);
        onChange?.(clamped);
        return clamped;
    };
    const setZoom = (next) => {
        const rounded = Math.round(clamp(next, minZoom, maxZoom) * 10) / 10;
        if (zoomProp === undefined)
            setInnerZoom(rounded);
        onZoomChange?.(rounded);
        setCenter(null);
    };
    // Keyboard edits keep the box on screen when zoomed in by shifting the view the least amount.
    const reveal = (next) => {
        if (!next || zoom <= 1)
            return;
        const shift = (c, half, start, size) => start < c - half ? start + half : start + size > c + half ? start + size - half : c;
        setCenter(view.clampCenter({
            x: shift(view.viewCenter.x, view.halfView.x, next.x, next.width),
            y: shift(view.viewCenter.y, view.halfView.y, next.y, next.height),
        }));
    };
    const selectAspect = (key) => {
        const next = aspectOptions?.find((option) => String(option) === key);
        if (next === undefined || !image)
            return;
        onAspectChange?.(next);
        const recentred = clampCropRect(initialCropRect(image.width, image.height, next), image.width, image.height, next, minSize);
        if (value === undefined)
            setInnerRect(recentred);
        onChange?.(recentred);
        setCenter(null);
    };
    return { commit, setZoom, reveal, selectAspect };
}
