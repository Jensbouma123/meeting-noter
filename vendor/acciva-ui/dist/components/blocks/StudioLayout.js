import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { FRAME_MAX_WIDTH, STICKY_PANEL_MAX_HEIGHT, STICKY_PANEL_TOP, STUDIO_SIDEBAR_WIDTH, } from "../../lib/layout-tokens.js";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "../../lib/surface-tokens.js";
import { cn } from "../../lib/utils.js";
import { SPACING_GAP } from "../ui/Stack/index.js";
/**
 * The shell both studios share: a configuration sidebar that sticks under the nav
 * header and scrolls its own overflow, beside a fluid main column. Mobile-first —
 * the two stack until `lg`, where there is finally room to sit side by side.
 *
 * Every length comes from `layout-tokens.ts` and the sidebar's surface is the
 * `raised` role from `surface-tokens.ts`, so a studio page never names a width, a
 * viewport height, a radius or a shadow of its own.
 */
export const StudioLayout = forwardRef(function StudioLayout({ sidebar, sidebarLabel, sidebarWidth = "lg", maxWidth = "studio", mainClassName, mainStyle, className, children, ...props }, ref) {
    return (_jsxs("div", { ref: ref, className: cn("mx-auto flex w-full flex-col lg:flex-row lg:items-start lg:gap-8", FRAME_MAX_WIDTH[maxWidth], SPACING_GAP.xl, className), ...props, children: [_jsx("aside", { "aria-label": sidebarLabel, className: cn("flex w-full flex-col p-4 sm:p-6 lg:sticky lg:shrink-0 lg:overflow-y-auto", SPACING_GAP.xl, SURFACE_RADIUS.raised, SURFACE_FILL.raised, SURFACE_SHADOW.raised, STICKY_PANEL_TOP, STICKY_PANEL_MAX_HEIGHT, STUDIO_SIDEBAR_WIDTH[sidebarWidth]), children: sidebar }), _jsx("div", { className: cn("flex min-w-0 flex-1 flex-col", SPACING_GAP["2xl"], mainClassName), style: mainStyle, children: children })] }));
});
