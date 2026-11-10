import type { FileInputCropConfig, FileInputMessages, FileItemState } from "./types.js";
interface FileInputListProps {
    files: readonly File[];
    states: (FileItemState | undefined)[];
    previews: ReadonlyMap<File, string>;
    iconClass: string;
    textClass: string;
    m: FileInputMessages;
    cropConfig?: FileInputCropConfig;
    disabled: boolean;
    removeAt: (index: number) => void;
    openRecrop: (file: File) => void;
}
export declare function FileInputList({ files, states, previews, iconClass, textClass, m, cropConfig, disabled, removeAt, openRecrop, }: FileInputListProps): import("react").JSX.Element;
export {};
