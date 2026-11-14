import { BADGE_PALETTES } from "./constants.js";
import { ROLE_VARIABLES, SOLVABLE_ROLES, badgeBackgroundVariable } from "./roles.js";
// Strict `#rgb` / `#rrggbb`: the only form `hexToRgb` accepts, so a value that
// passes here can never throw downstream.
const HEX_VALUE_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const isHexValue = (value) => HEX_VALUE_RE.test(value);
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
                hex: isHexValue(overrideVal) ? overrideVal : entry.hex,
                literal: overrideVal,
            };
        }
        return entry;
    });
    // A new variable with no hex form has no `hex` to store; its literal still
    // reaches the DOM through the override map, so it is skipped here.
    const existingVarNames = new Set(baseTokens.variables.map((v) => v.name));
    for (const [key, val] of overrideEntries) {
        if (!existingVarNames.has(key) && isHexValue(val)) {
            variables.push({ name: key, hex: val, literal: val });
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
                if (isHexValue(val))
                    scales[paletteName][step] = val;
            }
        }
    }
    const read = (name, fallback) => {
        const val = overrides[name];
        return val !== undefined && isHexValue(val) ? val : fallback;
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
