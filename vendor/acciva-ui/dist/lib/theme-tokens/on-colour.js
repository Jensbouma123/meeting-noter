import { contrastRatio, hexToOklch, oklchToHex } from "../color/index.js";
import { ACTION_STEP } from "./constants.js";
export function stopColor(palette, name, stop) {
    return palette.ramps[name][palette.aliases[stop]];
}
/**
 * The two candidates an on-colour is solved from. White is preferred whenever
 * it clears WCAG 2.2 AA SC 1.4.3 (4.5:1) against the fill; otherwise the fill
 * is light and black is the colour that clears it. The choice is a function of
 * the fill, measured per mode — never an assumed white.
 */
const ON_COLOUR_LIGHT = "#ffffff";
const ON_COLOUR_DARK = "#000000";
export function solveOnColour(fill) {
    return hexToOklch(contrastRatio(ON_COLOUR_LIGHT, fill) >= 4.5 ? ON_COLOUR_LIGHT : ON_COLOUR_DARK);
}
export function onActionFill(name) {
    return (palette) => solveOnColour(oklchToHex(stopColor(palette, name, ACTION_STEP)));
}
export function onStatusFill(name) {
    return (palette, mode) => solveOnColour(oklchToHex(palette.roles[mode].status[name].color));
}
