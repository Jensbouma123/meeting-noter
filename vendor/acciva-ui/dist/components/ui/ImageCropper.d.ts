import { type HTMLAttributes } from "react";
import { type CropAspect, type CropRect, type ImageProcessErrorCode } from "../../lib/image/index.js";
export type CropCorner = "top-left" | "top-right" | "bottom-right" | "bottom-left";
export interface ImageCropperMessages {
    zoom: string;
    aspect: string;
    aspectLabel: (aspect: CropAspect) => string;
    instructions: string;
    handle: (corner: CropCorner) => string;
    valueText: (rect: CropRect) => string;
    loading: string;
    error: string;
}
export interface ImageCropperProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children" | "onLoad" | "onError"> {
    source: Blob;
    value?: CropRect;
    defaultValue?: CropRect;
    onChange?: (rect: CropRect) => void;
    aspect?: CropAspect;
    aspectOptions?: readonly CropAspect[];
    onAspectChange?: (aspect: CropAspect) => void;
    zoom?: number;
    defaultZoom?: number;
    onZoomChange?: (zoom: number) => void;
    minZoom?: number;
    maxZoom?: number;
    /** Smallest crop edge in source pixels; never larger than the image. */
    minSize?: number;
    onLoad?: (info: {
        width: number;
        height: number;
    }) => void;
    onError?: (code: ImageProcessErrorCode) => void;
    label?: string;
    messages?: Partial<ImageCropperMessages>;
    disabled?: boolean;
    className?: string;
}
export declare const ImageCropper: import("react").ForwardRefExoticComponent<ImageCropperProps & import("react").RefAttributes<HTMLDivElement>>;
