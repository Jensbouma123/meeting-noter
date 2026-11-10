import { type CropAspect, type CropRect } from "../../../lib/image/index.js";
import type { CropSession, FileInputConfig } from "./types.js";
import type { useFileInputPipeline } from "./useFileInputPipeline.js";
import type { FileInputState } from "./useFileInputState.js";
type Pipeline = Pick<ReturnType<typeof useFileInputPipeline>, "reject" | "finish">;
export declare function useFileInputCrop(state: FileInputState, c: FileInputConfig, { reject, finish }: Pipeline): {
    cancelCrop: () => void;
    applyCrop: () => Promise<void>;
    openRecrop: (file: File) => void;
    cropError: (session: CropSession) => void;
    onAspectChange: (aspect: CropAspect) => void;
    onLoad: (dims: {
        width: number;
        height: number;
    }) => void;
    onRectChange: (rect: CropRect) => void;
};
export {};
