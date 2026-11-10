/**
 * `color.primitive.brand.500` -> `--color-brand-500`,
 * `color.semantic.dark.background.canvas` -> `--color-background-canvas`.
 * The layer and mode segments are dropped: a mode is expressed by the CSS
 * selector the declaration sits in, not by the property name.
 */
export declare function cssVariableName(path: readonly string[]): string;
