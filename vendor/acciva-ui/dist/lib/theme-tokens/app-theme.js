import { BADGE_PALETTES } from "./constants.js";
import { paletteVariables, semanticVariables } from "./semantic-variables.js";
import { ROLE_VARIABLES, SOLVABLE_ROLES, badgeBackgroundVariable } from "./roles.js";
function roleColorsFrom(read) {
    const colors = {};
    for (const role of SOLVABLE_ROLES)
        colors[role] = read(ROLE_VARIABLES[role]);
    return colors;
}
function badgeBackgroundsFrom(read) {
    const fills = {};
    for (const name of BADGE_PALETTES)
        fills[name] = read(badgeBackgroundVariable(name));
    return fills;
}
/** The cheap half: picks one mode's roles out of an already-built palette. */
export function resolveAppTheme(palette, mode) {
    const semantic = semanticVariables(palette, mode);
    const byName = new Map(semantic.map((entry) => [entry.name, entry.hex]));
    const read = (name) => byName.get(name) ?? "#000000";
    return {
        ...palette,
        mode,
        primary: read(ROLE_VARIABLES.action),
        secondary: read(ROLE_VARIABLES["action-secondary"]),
        accent: read(ROLE_VARIABLES["action-accent"]),
        background: read("--background"),
        surface: read("--surface"),
        foreground: read("--foreground"),
        mutedForeground: read("--muted-foreground"),
        border: read("--border"),
        focusRing: read("--focus-ring"),
        success: read("--success"),
        warning: read("--warning"),
        danger: read("--danger"),
        info: read("--info"),
        elevation: [
            read("--elevation-0"),
            read("--elevation-1"),
            read("--elevation-2"),
            read("--elevation-3"),
            read("--elevation-4"),
        ],
        roleColors: roleColorsFrom(read),
        badgeBackgrounds: badgeBackgroundsFrom(read),
        variables: [...paletteVariables(palette), ...semantic],
    };
}
