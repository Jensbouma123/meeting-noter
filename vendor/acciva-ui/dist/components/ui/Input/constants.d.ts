import type { InputHTMLAttributes } from "react";
import type { SizeTier } from "../../../lib/sizing-tokens/index.js";
export declare const DEFAULT_AUTOCOMPLETE: Partial<Record<string, string>>;
export declare function defaultInputMode(type: string, step: InputHTMLAttributes<HTMLInputElement>["step"]): InputHTMLAttributes<HTMLInputElement>["inputMode"];
export declare const DOUBLE_TRAILING_PADDING: Record<SizeTier, string>;
export declare const ADDON_RADIUS_LEADING: Record<SizeTier, string>;
export declare const ADDON_RADIUS_TRAILING: Record<SizeTier, string>;
export declare const ADDON_JOIN_CLASSES: {
    readonly none: "";
    readonly leading: "rounded-l-none";
    readonly trailing: "rounded-r-none";
    readonly both: "rounded-none";
};
export declare const CLEAR_BUTTON_SIZE: Record<SizeTier, string>;
