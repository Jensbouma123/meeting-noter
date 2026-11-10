import type { SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { BadgeTint, BadgeTone } from "./types.js";
export declare const toneClasses: Record<BadgeTone, string>;
export declare const tintClasses: Record<BadgeTint, {
    surface: string;
    dot: string;
}>;
export declare const dotClasses: Record<BadgeTone, string>;
export declare const chipDotClasses: {
    readonly unselected: "bg-muted-foreground";
    readonly selected: "bg-primary-500 dark:bg-primary-400";
};
export declare const chipStateClasses: {
    readonly unselected: "border-border bg-surface text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:bg-elevation-2 dark:hover:bg-elevation-3 dark:active:bg-elevation-4";
    readonly selected: "border-primary-500 bg-primary-500/10 text-primary-900 hover:bg-primary-500/15 active:bg-primary-500/20 dark:border-primary-400 dark:bg-primary-400/15 dark:text-primary-300";
};
export declare const CHIP_PADDING_RIGHT_WITH_DISMISS: Record<SizeTier, string>;
export declare const CHIP_DISMISS_SIZE: Record<SizeTier, string>;
