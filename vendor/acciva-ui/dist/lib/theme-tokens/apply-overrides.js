import { BADGE_PALETTES } from "./constants.js";
import { ROLE_VARIABLES, SOLVABLE_ROLES, badgeBackgroundVariable } from "./roles.js";
/**
 * Applies CSS variable overrides to an AppTheme, updating its variables,
 * primitive shade scales (e.g. `--color-primary-800`), and semantic role fields.
 */
export function applyThemeOverrides(baseTokens, overrides) {
    const overrideEntries = Object.entries(overrides);
    if (overrideEntries.length === 0)
        return baseTokens;
    const overridesMap = new Map(overrideEntries);
    const variables = baseTokens.variables.map((entry) => {
        const overrideVal = overridesMap.get(entry.name);
        if (overrideVal !== undefined) {
            return {
                name: entry.name,
                hex: overrideVal.startsWith("#") ? overrideVal : entry.hex,
                literal: overrideVal,
            };
        }
        return entry;
    });
    const existingVarNames = new Set(baseTokens.variables.map((v) => v.name));
    for (const [key, val] of overrideEntries) {
        if (!existingVarNames.has(key)) {
            variables.push({
                name: key,
                hex: val.startsWith("#") ? val : val,
                literal: val,
            });
        }
    }
    const scales = {};
    for (const [paletteName, paletteScale] of Object.entries(baseTokens.scales)) {
        scales[paletteName] = { ...paletteScale };
    }
    for (const [key, val] of overrideEntries) {
        const match = /^--color-([a-z]+)-(\d+)$/.exec(key);
        if (match) {
            const [, paletteName, stepStr] = match;
            const step = Number(stepStr);
            if (paletteName in scales && step in scales[paletteName]) {
                scales[paletteName][step] = val.startsWith("#") ? val : val;
            }
        }
    }
    const read = (name, fallback) => {
        const val = overrides[name];
        return val && val.startsWith("#") ? val : fallback;
    };
    // The dedicated button property wins; the primitive step stays honoured so a
    // hand-authored `--color-primary-500` override still moves the action fill.
    const primary = read(ROLE_VARIABLES.action, read("--color-primary-500", baseTokens.primary));
    const secondary = read(ROLE_VARIABLES["action-secondary"], read("--color-secondary-500", baseTokens.secondary));
    const accent = read(ROLE_VARIABLES["action-accent"], read("--color-accent-500", baseTokens.accent));
    const roleColors = {};
    for (const role of SOLVABLE_ROLES) {
        roleColors[role] = read(ROLE_VARIABLES[role], baseTokens.roleColors[role]);
    }
    roleColors.action = primary;
    roleColors["action-secondary"] = secondary;
    roleColors["action-accent"] = accent;
    const badgeBackgrounds = {};
    for (const name of BADGE_PALETTES) {
        badgeBackgrounds[name] = read(badgeBackgroundVariable(name), baseTokens.badgeBackgrounds[name]);
    }
    return {
        ...baseTokens,
        scales: scales,
        primary,
        secondary,
        accent,
        background: read("--background", baseTokens.background),
        surface: read("--surface", baseTokens.surface),
        foreground: read("--foreground", baseTokens.foreground),
        mutedForeground: read("--muted-foreground", baseTokens.mutedForeground),
        border: read("--border", baseTokens.border),
        focusRing: read("--focus-ring", baseTokens.focusRing),
        success: read("--success", baseTokens.success),
        warning: read("--warning", baseTokens.warning),
        danger: read("--danger", baseTokens.danger),
        info: read("--info", baseTokens.info),
        elevation: [
            read("--elevation-0", baseTokens.elevation[0]),
            read("--elevation-1", baseTokens.elevation[1]),
            read("--elevation-2", baseTokens.elevation[2]),
            read("--elevation-3", baseTokens.elevation[3]),
            read("--elevation-4", baseTokens.elevation[4]),
        ],
        roleColors,
        badgeBackgrounds,
        variables,
    };
}
