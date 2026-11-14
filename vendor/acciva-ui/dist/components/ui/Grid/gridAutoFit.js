/**
 * Track minimum for each `minItemWidth` tier, in Tailwind spacing units. Matches the
 * `min-w-*` scale (`min-w-24` = `calc(var(--spacing) * 24)`), so auto-fit tracks and
 * the tokenised spacing scale stay in step.
 */
const TRACK_UNITS = {
    xxs: 12,
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    "2xl": 48,
    "3xl": 56,
};
/** Auto-fit column template: as many tracks as fit, each at least the tier's minimum. */
export function autoFitTemplate(size) {
    return `repeat(auto-fit, minmax(calc(var(--spacing) * ${TRACK_UNITS[size]}), 1fr))`;
}
