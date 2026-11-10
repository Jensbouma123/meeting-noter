import type { SizeTier } from "./tiers.js";
export type TextSizeTier = "3xs" | SizeTier;
export declare const TEXT_SIZE_TIERS: readonly ["3xs", "xxs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
export declare const TEXT_SIZE: Record<TextSizeTier, string>;
