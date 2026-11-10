import { useMemo } from "react";
import { clampCropRect } from "../../../lib/image/index.js";
export function useCropRect({ image, value, innerRect, aspect, minSizeProp }) {
    const minSize = image ? Math.min(minSizeProp, image.width, image.height) : minSizeProp;
    const rawRect = value ?? innerRect;
    const rect = useMemo(() => (image && rawRect ? clampCropRect(rawRect, image.width, image.height, aspect, minSize) : undefined), [image, rawRect, aspect, minSize]);
    return { minSize, rect };
}
