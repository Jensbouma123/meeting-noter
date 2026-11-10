export declare const SIZE_TIERS: readonly ["xxs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
export type SizeTier = (typeof SIZE_TIERS)[number];
export type Breakpoint = "sm" | "md" | "lg";
export type ResponsiveSize<T extends string> = T | ({
    base: T;
} & Partial<Record<Breakpoint, T>>);
export declare function resolveResponsive<T extends string>(size: ResponsiveSize<T>, map: Record<T, string>): string;
export declare const SIZE_LABELS: Record<SizeTier, string>;
