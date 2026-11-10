import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../lib/utils.js";
// Fixed opacity multipliers, not tokens. Mirrored in apple/Sources/AccivaUI/Components/HeatCell.swift.
const stepClasses = [
    "bg-brand-foreground/20",
    "bg-brand-foreground/40",
    "bg-brand-foreground/60",
    "bg-brand-foreground/80",
    "bg-brand-foreground",
];
function stepFor(intensity) {
    const clamped = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 0;
    return Math.min(stepClasses.length - 1, Math.floor(clamped * stepClasses.length));
}
/**
 * One heatmap cell. With `label` it is an image with a text alternative; without, it is decorative
 * and the grid must be explained in text (SC 1.4.1, 1.1.1).
 */
export function HeatCell({ intensity = 0, isEmpty = false, label, className, ...props }) {
    const fill = isEmpty ? "bg-border-subtle" : stepClasses[stepFor(intensity)];
    const labelled = label !== undefined;
    return (_jsx("span", { ...props, role: labelled ? "img" : undefined, "aria-label": label, "aria-hidden": labelled ? undefined : "true", className: cn("block aspect-square w-full rounded-sm", fill, className) }));
}
