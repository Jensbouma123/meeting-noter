import { oklchToHex } from "../../space/index.js";
import { isDtcgToken } from "../../tokens/index.js";
import { parseOklchLiteral, resolveLiteral } from "./literal.js";
import { cssVariableName } from "./variable.js";
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
