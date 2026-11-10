import type { CropRect } from "../../../lib/image/index.js";
import type { Point, Size } from "./types.js";
type CropViewOptions = {
    image: Size | undefined;
    rect: CropRect | undefined;
    zoom: number;
    center: Point | null;
};
export declare function useCropView({ image, rect, zoom, center }: CropViewOptions): {
    setStage: import("react").Dispatch<import("react").SetStateAction<HTMLDivElement | null>>;
    stageSize: Size;
    scale: number;
    halfView: {
        x: number;
        y: number;
    };
    clampCenter: (point: Point) => Point;
    viewCenter: Point;
};
export {};
