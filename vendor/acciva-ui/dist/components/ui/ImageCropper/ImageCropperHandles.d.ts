import type { KeyboardEvent } from "react";
import type { CropRect } from "../../../lib/image/index.js";
import type { CropCorner, ImageCropperMessages, Size } from "./types.js";
type ImageCropperHandlesProps = {
    image: Size;
    rect: CropRect;
    minSize: number;
    inert: boolean;
    messages: ImageCropperMessages;
    onCornerKeyDown: (corner: CropCorner) => (event: KeyboardEvent<HTMLDivElement>) => void;
};
export declare function ImageCropperHandles({ image, rect, minSize, inert, messages, onCornerKeyDown }: ImageCropperHandlesProps): import("react").JSX.Element;
export {};
