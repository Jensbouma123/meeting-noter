import { type ResponsiveSize, type SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { FileInputMessages } from "./types.js";
interface FileInputTriggerProps {
    variant: "dropzone" | "compact" | "avatar";
    size: ResponsiveSize<SizeTier>;
    multiple: boolean;
    drag: "accept" | "reject" | null;
    invalid: boolean;
    surfaceState: string;
    textClass: string;
    files: readonly File[];
    avatarSrc: string | undefined;
    m: FileInputMessages;
    openPicker: () => void;
}
/** The visible click target for each variant; the native input stays sr-only beside it. */
export declare function FileInputTrigger({ variant, size, multiple, drag, invalid, surfaceState, textClass, files, avatarSrc, m, openPicker, }: FileInputTriggerProps): import("react").JSX.Element;
export {};
