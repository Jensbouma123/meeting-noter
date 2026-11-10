import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { ImageCropperProps, Point, Size } from "./types.js";
type CropSourceOptions = {
    source: Blob;
    aspect: CropAspect;
    defaultValue?: CropRect;
    onLoad?: ImageCropperProps["onLoad"];
    onError?: ImageCropperProps["onError"];
};
export declare function useCropSource({ source, aspect, defaultValue, onLoad, onError }: CropSourceOptions): {
    url: string | undefined;
    image: Size | undefined;
    failed: boolean;
    innerRect: CropRect | undefined;
    setInnerRect: import("react").Dispatch<import("react").SetStateAction<CropRect | undefined>>;
    center: Point | null;
    setCenter: import("react").Dispatch<import("react").SetStateAction<Point | null>>;
};
export {};
