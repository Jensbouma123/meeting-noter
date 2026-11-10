import type { SidebarIcon } from "./SidebarTypes.js";
/**
 * `display: contents` keeps the wrapper out of the box model, so a caller-supplied
 * component gets the exact size classes the rail/drawer applies while an
 * already-rendered node keeps its own — both stay `aria-hidden` since the link's own
 * `aria-label`/text carries the accessible name.
 */
export declare function SidebarGlyph({ icon, className }: {
    icon: SidebarIcon;
    className: string;
}): import("react").JSX.Element;
/**
 * Per-row reorder menu. Move up / Move down are rendered only where they apply, so the
 * first row has no Move up and the last row no Move down (as AccivaSidebar does).
 */
export declare function SidebarReorderMenu({ label, index, total, onMove, }: {
    label: string;
    index: number;
    total: number;
    onMove: (from: number, to: number) => void;
}): import("react").JSX.Element;
