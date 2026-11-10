import { useCallback, useEffect, useState } from "react";
import { clamp } from "../../../lib/utils.js";
export function useCropView({ image, rect, zoom, center }) {
    const [stage, setStage] = useState(null);
    const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
    useEffect(() => {
        if (!stage)
            return;
        const measure = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
        measure();
        if (typeof ResizeObserver === "undefined")
            return;
        const observer = new ResizeObserver(measure);
        observer.observe(stage);
        return () => observer.disconnect();
    }, [stage]);
    const scale = image ? Math.min(stageSize.width / image.width, stageSize.height / image.height) * zoom : 0;
    const halfView = scale ? { x: stageSize.width / (2 * scale), y: stageSize.height / (2 * scale) } : { x: 0, y: 0 };
    const clampCenter = useCallback((point) => {
        if (!image)
            return point;
        const axis = (value, half, extent) => extent <= 2 * half ? extent / 2 : clamp(value, half, extent - half);
        return {
            x: axis(point.x, halfView.x, image.width),
            y: axis(point.y, halfView.y, image.height),
        };
    }, [image, halfView.x, halfView.y]);
    const viewCenter = clampCenter(center ?? (rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : { x: 0, y: 0 }));
    return { setStage, stageSize, scale, halfView, clampCenter, viewCenter };
}
