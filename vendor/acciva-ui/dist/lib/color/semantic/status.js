import { gatedRole, hexOf, onColorRole, role } from "./roles.js";
const STATUS_PALETTES = ["success", "warning", "danger", "info"];
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
export function buildStatusRoles(ramps, scale, background) {
    const canvasHex = hexOf(background.canvas);
    const surfaceHex = hexOf(background.surface);
    return STATUS_PALETTES.reduce((accumulator, palette) => {
        const subtle = role(ramps, palette, scale.status.subtle, `${capitalize(palette)} tinted background`);
        const subtleHex = hexOf(subtle);
        const base = gatedRole(ramps, palette, scale.status.base, `${capitalize(palette)} state`, [{ use: "body", contexts: [subtleHex, canvasHex, surfaceHex] }]);
        accumulator[palette] = base;
        accumulator[`${palette}Subtle`] = subtle;
        accumulator[`${palette}Border`] = gatedRole(ramps, palette, scale.status.border, `${capitalize(palette)} border`, [{ use: "ui", contexts: [subtleHex, surfaceHex] }]);
        accumulator[`on${capitalize(palette)}`] = onColorRole(ramps, base, `Text and icons on the ${palette} state`);
        return accumulator;
    }, {});
}
