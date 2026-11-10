import type { KeyboardEvent } from "react";
import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { CropCorner, Size } from "./types.js";
type CropKeysOptions = {
    image: Size | undefined;
    rect: CropRect | undefined;
    aspect: CropAspect;
    minSize: number;
    inert: boolean;
    commit: (next: CropRect) => CropRect | undefined;
    reveal: (next: CropRect | undefined) => void;
};
export declare function useCropKeys({ image, rect, aspect, minSize, inert, commit, reveal }: CropKeysOptions): {
    handleBoxKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
    handleCornerKeyDown: (corner: CropCorner) => (event: KeyboardEvent<HTMLDivElement>) => void;
};
export {};
