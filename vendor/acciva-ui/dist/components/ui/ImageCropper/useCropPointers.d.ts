import { type PointerEvent as ReactPointerEvent } from "react";
import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { Point, Size } from "./types.js";
type CropPointersOptions = {
    image: Size | undefined;
    rect: CropRect | undefined;
    aspect: CropAspect;
    minSize: number;
    inert: boolean;
    scale: number;
    zoom: number;
    viewCenter: Point;
    clampCenter: (point: Point) => Point;
    setCenter: (center: Point | null) => void;
    setZoom: (next: number) => void;
    commit: (next: CropRect) => CropRect | undefined;
};
export declare function useCropPointers({ image, rect, aspect, minSize, inert, scale, zoom, viewCenter, clampCenter, setCenter, setZoom, commit, }: CropPointersOptions): {
    dragging: boolean;
    handlePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    handlePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    handlePointerEnd: (event: ReactPointerEvent<HTMLDivElement>) => void;
};
export {};
