import type { ChangeEvent } from "react";
import type { FileInputConfig, FileRejection, FileRejectionReason } from "./types.js";
import type { FileInputState } from "./useFileInputState.js";
export declare function useFileInputPipeline(state: FileInputState, c: FileInputConfig): {
    reject: (file: File, reason: FileRejectionReason) => FileRejection;
    finish: (base: readonly File[], pairs: [original: File, result: File][], rejected: FileRejection[], removed: File[], cropped?: File) => void;
    addFiles: (incoming: File[]) => void;
    removeAt: (index: number) => void;
    clearAll: () => void;
    onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
};
