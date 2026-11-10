import type { HeadingAlign, HeadingFont, HeadingSize, HeadingTruncate, HeadingVariant, HeadingWeight } from "./types.js";
export declare const headingSizeClasses: Record<HeadingSize, string>;
export declare const headingWeightClasses: Record<HeadingWeight, string>;
export declare const headingAlignClasses: Record<HeadingAlign, string>;
export declare const headingVariantClasses: Record<HeadingVariant, string>;
export declare const headingFontClasses: Record<HeadingFont, string>;
export declare function getTruncateClass(truncate?: HeadingTruncate): string;
