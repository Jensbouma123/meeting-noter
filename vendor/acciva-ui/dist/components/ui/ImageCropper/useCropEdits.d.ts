import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { ImageCropperProps, Point, Size } from "./types.js";
type CropEditOptions = {
    image: Size | undefined;
    aspect: CropAspect;
    aspectOptions: ImageCropperProps["aspectOptions"];
    onAspectChange: ImageCropperProps["onAspectChange"];
    value: CropRect | undefined;
    onChange: ImageCropperProps["onChange"];
    setInnerRect: (rect: CropRect) => void;
    minSize: number;
    zoom: number;
    zoomProp: number | undefined;
    setInnerZoom: (zoom: number) => void;
    minZoom: number;
    maxZoom: number;
    onZoomChange: ImageCropperProps["onZoomChange"];
    setCenter: (center: Point | null) => void;
    view: {
        halfView: Point;
        viewCenter: Point;
        clampCenter: (point: Point) => Point;
    };
};
export declare function useCropEdits({ image, aspect, aspectOptions, onAspectChange, value, onChange, setInnerRect, minSize, zoom, zoomProp, setInnerZoom, minZoom, maxZoom, onZoomChange, setCenter, view, }: CropEditOptions): {
    commit: (next: CropRect) => CropRect | undefined;
    setZoom: (next: number) => void;
    reveal: (next: CropRect | undefined) => void;
    selectAspect: (key: string) => void;
};
export {};
