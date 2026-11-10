export type RadiusScale = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
export declare const RADIUS_MAP: Record<RadiusScale, {
    rem: string;
    label: string;
    px: string;
}>;
export declare const DEFAULT_RADIUS: RadiusScale;
/** The single length every `rounded-*` utility is a multiple of. */
export declare const RADIUS_BASE_VARIABLE = "--radius-base";
/**
 * Tailwind's own radius namespace, re-expressed as multiples of the base so the
 * whole scale moves together when the base does. At the default `md` base
 * (0.5rem) every step lands on the exact value Tailwind ships, so re-deriving
 * the scale is invisible until the user actually moves it. `--radius` is the
 * bare `rounded` utility; `rounded-full` stays a pill and is not on the scale.
 */
export declare const RADIUS_STEP_RATIOS: readonly (readonly [name: string, ratio: number])[];
export type RadiusVariable = {
    readonly name: string;
    readonly value: string;
};
export declare function radiusVariables(): RadiusVariable[];
