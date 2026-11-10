import { formatOklch, oklchToHex, } from "../color/index.js";
import { APP_PALETTES, STATUS_PALETTES, TAILWIND_STEPS, } from "./constants.js";
import { DERIVED_VARIABLES } from "./derived-variables.js";
/**
 * The flat properties every component styles against. Elevation follows the
 * engine's ladder: in light mode the canvas is the *darkest* surface and layers
 * rise toward white, which is what makes a raised hover state visible without a
 * shadow.
 */
const SEMANTIC_VARIABLES = [
    { name: "--background", group: "background", role: "canvas" },
    { name: "--surface", group: "background", role: "surface" },
    { name: "--foreground", group: "foreground", role: "primary" },
    { name: "--muted-foreground", group: "foreground", role: "secondary" },
    { name: "--border", group: "border", role: "default" },
    { name: "--focus-ring", group: "border", role: "focus" },
    { name: "--success", group: "status", role: "success" },
    { name: "--warning", group: "status", role: "warning" },
    { name: "--danger", group: "status", role: "danger" },
    { name: "--info", group: "status", role: "info" },
    { name: "--elevation-0", group: "background", role: "canvas" },
    { name: "--elevation-1", group: "background", role: "surface" },
    { name: "--elevation-2", group: "background", role: "raised" },
    { name: "--elevation-3", group: "background", role: "overlay" },
    { name: "--elevation-4", group: "background", role: "dialog" },
];
function roleOf(roles, spec) {
    switch (spec.group) {
        case "background":
            return roles.background[spec.role];
        case "foreground":
            return roles.foreground[spec.role];
        case "border":
            return roles.border[spec.role];
        case "status":
            return roles.status[spec.role];
    }
}
function variable(name, color) {
    return { name, hex: oklchToHex(color), literal: formatOklch(color) };
}
/** `--color-<palette>-<stop>`, identical in both modes: a ramp has no mode. */
export function paletteVariables(palette) {
    const variables = [];
    const paletteNames = [
        ...APP_PALETTES,
        ...STATUS_PALETTES,
    ];
    for (const name of paletteNames) {
        for (const stop of TAILWIND_STEPS) {
            variables.push(variable(`--color-${name}-${stop}`, palette.ramps[name][palette.aliases[stop]]));
        }
    }
    return variables;
}
export function semanticVariables(palette, mode) {
    const roles = palette.roles[mode];
    return [
        ...SEMANTIC_VARIABLES.map((spec) => variable(spec.name, roleOf(roles, spec).color)),
        ...DERIVED_VARIABLES.map((spec) => variable(spec.name, spec.pick(palette, mode))),
    ];
}
