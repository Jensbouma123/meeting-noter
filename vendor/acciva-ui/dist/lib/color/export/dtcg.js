import { formatOklch, hexToOklch } from "../space.js";
import { cssVariableName } from "./resolve.js";
import { isDtcgToken } from "../tokens.js";
/**
 * Rebuilds a group with the `$value` of every token whose CSS variable name is
 * in `overrides` replaced by that hex, serialised as `oklch()`. Insertion order
 * is preserved so an override never reshuffles the emitted JSON.
 */
function overrideGroup(node, path, overrides) {
    const rebuilt = {};
    for (const key of Object.keys(node)) {
        const child = node[key];
        if (child === undefined)
            continue;
        if (key.startsWith("$")) {
            rebuilt[key] = child;
            continue;
        }
        const childPath = [...path, key];
        if (!isDtcgToken(child)) {
            rebuilt[key] = overrideGroup(child, childPath, overrides);
            continue;
        }
        const overrideHex = overrides[cssVariableName(childPath)];
        rebuilt[key] =
            overrideHex === undefined
                ? child
                : Object.assign(Object.assign({}, child), { $value: formatOklch(hexToOklch(overrideHex)) });
    }
    return rebuilt;
}
function withOverrides(doc, overrides) {
    return Object.assign(Object.assign({}, doc), { color: Object.assign(Object.assign({}, doc.color), { semantic: {
                light: overrideGroup(doc.color.semantic.light, ["color", "semantic", "light"], overrides.light),
                dark: overrideGroup(doc.color.semantic.dark, ["color", "semantic", "dark"], overrides.dark),
            }, component: {
                light: overrideGroup(doc.color.component.light, ["color", "component", "light"], overrides.light),
                dark: overrideGroup(doc.color.component.dark, ["color", "component", "dark"], overrides.dark),
            } }) });
}
function hasEntries(overrides) {
    if (overrides === undefined)
        return false;
    return Object.keys(overrides.light).length > 0 || Object.keys(overrides.dark).length > 0;
}
/** Serialises the graph as a W3C DTCG 2025.10 JSON document. */
export function exportDtcgJson(doc, overrides) {
    const serialisable = hasEntries(overrides) ? withOverrides(doc, overrides) : doc;
    return `${JSON.stringify(serialisable, null, 2)}\n`;
}
