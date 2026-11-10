import { isDtcgToken } from "../../tokens/index.js";
const MAX_ALIAS_DEPTH = 8;
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
