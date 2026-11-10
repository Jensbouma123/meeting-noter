import { formatOklch, hexToOklch, oklchToHex } from "../space.js";
import { isDtcgToken } from "../tokens.js";
const MAX_ALIAS_DEPTH = 8;
const LAYER_SEGMENTS = new Set(["primitive", "semantic", "component"]);
const MODE_SEGMENTS = new Set(["light", "dark"]);
function asGroup(doc) {
    return doc;
}
function lookup(doc, path) {
    let node = asGroup(doc);
    for (const segment of path) {
        if (node === undefined || isDtcgToken(node))
            return undefined;
        node = node[segment];
    }
    return node;
}
export function isAlias(value) {
    return value.startsWith("{") && value.endsWith("}");
}
export function aliasPath(value) {
    return value.slice(1, -1).split(".");
}
export function parseOklchLiteral(value) {
    const match = /^oklch\(\s*([^\s]+)\s+([^\s]+)\s+([^\s)/]+)/i.exec(value.trim());
    if (match === null)
        throw new Error(`Not an oklch() literal: ${value}`);
    const [, rawL, rawC, rawH] = match;
    return {
        l: parseComponent(rawL, 1),
        c: parseComponent(rawC, 0.4),
        h: parseComponent(rawH, 360),
    };
}
function parseComponent(raw, percentReference) {
    if (raw === "none")
        return 0;
    if (raw.endsWith("%"))
        return (Number.parseFloat(raw) / 100) * percentReference;
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
/** Follows an alias chain such as `{color.primitive.brand.500}` to its literal. */
export function resolveLiteral(doc, token) {
    let value = token.$value;
    for (let depth = 0; isAlias(value); depth += 1) {
        if (depth >= MAX_ALIAS_DEPTH)
            throw new Error(`Alias chain too deep at ${token.$value}`);
        const target = lookup(doc, aliasPath(value));
        if (target === undefined || !isDtcgToken(target)) {
            throw new Error(`Unresolvable alias ${value}`);
        }
        value = target.$value;
    }
    return value;
}
function kebab(segment) {
    return segment.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
/**
 * `color.primitive.brand.500` -> `--color-brand-500`,
 * `color.semantic.dark.background.canvas` -> `--color-background-canvas`.
 * The layer and mode segments are dropped: a mode is expressed by the CSS
 * selector the declaration sits in, not by the property name.
 */
export function cssVariableName(path) {
    const segments = path.filter((segment, index) => !(index === 1 && LAYER_SEGMENTS.has(segment)) && !(index === 2 && MODE_SEGMENTS.has(segment)));
    return `--${segments.map(kebab).join("-")}`;
}
function walk(node, prefix, out) {
    for (const key of Object.keys(node)) {
        if (key.startsWith("$"))
            continue;
        const child = node[key];
        if (child === undefined)
            continue;
        if (isDtcgToken(child))
            out.push({ path: [...prefix, key], token: child });
        else
            walk(child, [...prefix, key], out);
    }
}
function flattenGroup(doc, group, prefix) {
    const collected = [];
    walk(group, prefix, collected);
    return collected.map(({ path, token }) => {
        const literal = resolveLiteral(doc, token);
        const color = parseOklchLiteral(literal);
        return {
            path,
            variable: cssVariableName(path),
            token,
            color,
            hex: oklchToHex(color),
            literal,
        };
    });
}
/**
 * Applies per-mode hex overrides to a flattened document, returning a new
 * document where every token whose CSS variable name appears in the overrides
 * map has its `hex` and `literal` replaced by the overridden value.
 *
 * Tokens whose variable name is not in the overrides map are copied verbatim.
 */
export function applyOverrides(doc, overrides) {
    const applyToMode = (mode) => {
        const modeOverrides = overrides[mode];
        if (Object.keys(modeOverrides).length === 0)
            return doc[mode];
        return doc[mode].map((token) => {
            const overrideHex = modeOverrides[token.variable];
            if (overrideHex === undefined)
                return token;
            const color = hexToOklch(overrideHex);
            return Object.assign(Object.assign({}, token), { color, hex: overrideHex, literal: formatOklch(color) });
        });
    };
    return {
        primitive: doc.primitive,
        light: applyToMode("light"),
        dark: applyToMode("dark"),
    };
}
/** Flattens the graph into resolved, CSS-ready declarations grouped by mode. */
export function flattenDocument(doc) {
    return {
        primitive: flattenGroup(doc, doc.color.primitive, ["color", "primitive"]),
        light: [
            ...flattenGroup(doc, doc.color.semantic.light, ["color", "semantic", "light"]),
            ...flattenGroup(doc, doc.color.component.light, ["color", "component", "light"]),
        ],
        dark: [
            ...flattenGroup(doc, doc.color.semantic.dark, ["color", "semantic", "dark"]),
            ...flattenGroup(doc, doc.color.component.dark, ["color", "component", "dark"]),
        ],
    };
}
