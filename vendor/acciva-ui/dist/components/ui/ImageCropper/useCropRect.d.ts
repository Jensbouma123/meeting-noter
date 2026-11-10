import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { Size } from "./types.js";
type CropRectOptions = {
    image: Size | undefined;
    value: CropRect | undefined;
    innerRect: CropRect | undefined;
    aspect: CropAspect;
    minSizeProp: number;
};
export declare function useCropRect({ image, value, innerRect, aspect, minSizeProp }: CropRectOptions): {
    minSize: number;
    rect: CropRect | undefined;
};
export {};
