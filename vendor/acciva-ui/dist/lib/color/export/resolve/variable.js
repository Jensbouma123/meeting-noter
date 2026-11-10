const LAYER_SEGMENTS = new Set(["primitive", "semantic", "component"]);
const MODE_SEGMENTS = new Set(["light", "dark"]);
function kebab(segment) {
    return segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
/**
 * `color.primitive.brand.500` -> `--color-brand-500`,
 * `color.semantic.dark.background.canvas` -> `--color-background-canvas`.
 * The layer and mode segments are dropped: a mode is expressed by the CSS
 * selector the declaration sits in, not by the property name.
 */
export function cssVariableName(path) {
    const segments = path.filter((segment, index) => !(index === 1 && LAYER_SEGMENTS.has(segment)) && !(index === 2 && MODE_SEGMENTS.has(segment)));
    return `--${segments.map(kebab).join("-")}`;
}
