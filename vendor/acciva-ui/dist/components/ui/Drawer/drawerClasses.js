import { SURFACE_SHADOW } from "../../../lib/surface-tokens.js";
import { cn } from "../../../lib/utils.js";
const DOCKED_WIDTH_CLASS = {
    peek: "md:w-64",
    half: "md:w-80",
    full: "md:w-96",
};
function panelShapeClass(side, isPersistent, detent) {
    if (isPersistent) {
        return cn("mx-auto w-full rounded-t-2xl border-t md:mx-0 md:h-full! md:rounded-none md:rounded-s-2xl md:border-s md:border-t-0", DOCKED_WIDTH_CLASS[detent]);
    }
    if (side === "bottom")
        return "mx-auto w-full rounded-t-2xl border-t md:max-w-md md:rounded-2xl";
    if (side === "left")
        return "max-w-full rounded-r-2xl border-r";
    return "max-w-full rounded-l-2xl border-l";
}
function closedTransformClass(side, isPersistent) {
    if (side === "bottom") {
        return isPersistent ? "translate-y-full md:translate-x-full md:translate-y-0" : "translate-y-full";
    }
    return side === "left" ? "-translate-x-full" : "translate-x-full";
}
function openTransformClass(isPersistent, isVertical) {
    if (isPersistent)
        return "translate-y-0 md:translate-x-0";
    return isVertical ? "translate-y-0" : "translate-x-0";
}
// `translate`, not `transform`: Tailwind v4's `translate-*` utilities write the
// `translate` property, so a list naming `transform` leaves the slide untransitioned.
// It must stay in the list across the settled boundary — the exit flips `settled` back
// to false and the closed transform in the same commit, and a property that only enters
// the list in that commit has no transition to start from.
function settledTransitionClass(isPersistent, isVertical) {
    if (isPersistent)
        return "transition-[height,opacity,translate] md:transition-[width,opacity,translate]";
    return isVertical ? "transition-[height,opacity,translate]" : "transition-[width,opacity,translate]";
}
/** The `<dialog>` class list: shape, slide, fade and the motion for the current phase. */
export function panelClassName(open, entered, settled, isDragging, isVertical, isPersistent, side, detent, className) {
    return cn("drawer-panel flex overflow-hidden border-border bg-surface text-foreground focus-visible:outline-none", SURFACE_SHADOW.overlay, isVertical ? "flex-col" : "flex-row", panelShapeClass(side, isPersistent, detent), isPersistent && "z-50", !open && "pointer-events-none", 
    // The scrim is the native ::backdrop, faded with the panel and held still mid-drag.
    !isPersistent &&
        cn("backdrop:bg-black/50", entered ? "backdrop:opacity-100" : "backdrop:opacity-0", isDragging ? "backdrop:transition-none" : "backdrop:motion-scrim motion-reduce:backdrop:transition-none"), entered ? openTransformClass(isPersistent, isVertical) : closedTransformClass(side, isPersistent), entered ? "opacity-100" : "opacity-0", isDragging && "transition-none", !isDragging &&
        !settled &&
        (entered ? "motion-sheet-in motion-reduce:transition-none" : "motion-sheet-out motion-reduce:transition-none"), !isDragging &&
        settled &&
        `${settledTransitionClass(isPersistent, isVertical)} motion-spatial ease-sheet motion-reduce:transition-none`, className);
}
