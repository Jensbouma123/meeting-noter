import type { ClipboardEvent, DragEvent } from "react";
import type { FileInputConfig } from "./types.js";
import type { FileInputState } from "./useFileInputState.js";
export declare function useFileInputDrop(state: FileInputState, c: FileInputConfig, addFiles: (incoming: File[]) => void): {
    resolvedAccept: string | undefined;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onPaste: (event: ClipboardEvent<HTMLDivElement>) => void;
    openPicker: () => void;
};
