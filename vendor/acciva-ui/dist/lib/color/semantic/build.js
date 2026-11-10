import { buildAccentRoles } from "./accent.js";
import { buildBackgroundRoles } from "./background.js";
import { buildBorderRoles } from "./border.js";
import { buildForegroundRoles } from "./foreground.js";
import { buildStatusRoles } from "./status.js";
import { SCALES } from "./tables.js";
import { buildSurfaceScale, seedHue } from "./surface.js";
/**
 * Maps a full ramp set onto context-aware roles for one theme mode. Dark mode
 * is derived independently from the same primitives — it is never an inversion
 * of the light roles.
 *
 * Roles that WCAG 2.2 AA gates are solved against the colours they are actually
 * rendered on, in the order those colours become available: tinted backgrounds
 * before the text and borders that sit on them, fills before the focus ring
 * that outlines them. Roles WCAG does not regulate — `border.subtle`,
 * `foreground.disabled`, the hover and subtle fills — keep their intent step.
 */
export function buildSemanticRoles(ramps, mode, surface = buildSurfaceScale(seedHue(ramps))) {
    const scale = SCALES[mode];
    const background = buildBackgroundRoles(surface, mode);
    const accent = buildAccentRoles(ramps, scale, background);
    const border = buildBorderRoles(ramps, surface, scale, background, accent);
    const foreground = buildForegroundRoles(ramps, scale, background);
    const status = buildStatusRoles(ramps, scale, background);
    return { background, foreground, border, accent, status };
}
