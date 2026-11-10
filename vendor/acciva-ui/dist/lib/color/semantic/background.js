import { surfaceRole } from "./roles.js";
import { SCALES } from "./tables.js";
const ELEVATION_DESCRIPTIONS = [
    "00dp page canvas",
    "01dp cards and containers",
    "03dp raised buttons and elevated cards",
    "08dp nav drawers and tooltips",
    "24dp dialogs, modals and popovers",
];
export function buildBackgroundRoles(surface, mode) {
    const scale = SCALES[mode];
    const elevation = scale.elevation;
    return {
        canvas: surfaceRole(surface, elevation[0], `${mode} ${ELEVATION_DESCRIPTIONS[0]}`),
        surface: surfaceRole(surface, elevation[1], `${mode} ${ELEVATION_DESCRIPTIONS[1]}`),
        raised: surfaceRole(surface, elevation[2], `${mode} ${ELEVATION_DESCRIPTIONS[2]}`),
        overlay: surfaceRole(surface, elevation[3], `${mode} ${ELEVATION_DESCRIPTIONS[3]}`),
        dialog: surfaceRole(surface, elevation[4], `${mode} ${ELEVATION_DESCRIPTIONS[4]}`),
        inverse: surfaceRole(surface, scale.inverseBackground, "Inverted surface for tooltips and high-emphasis banners"),
    };
}
