import { type RGBA } from "../../../lib/color/formats/index.js";
type EyeDropperConstructor = new () => {
    open: () => Promise<{
        sRGBHex: string;
    }>;
};
export declare function useEyeDropper(enabled: boolean, onPick: (rgba: RGBA) => void): {
    EyeDropperApi: EyeDropperConstructor | undefined;
    pickFromScreen: () => void;
};
export {};
