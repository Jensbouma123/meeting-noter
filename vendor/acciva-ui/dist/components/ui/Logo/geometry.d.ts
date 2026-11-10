import type { LogoSize, LogoVariant } from "./types.js";
export declare function resolveHeight(size: LogoSize): number;
export declare function getDimensions(variant: LogoVariant, size: LogoSize): {
    width: number;
    height: number;
    viewBox: string;
};
