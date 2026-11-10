var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { cn } from "../../lib/utils.js";
/** GitHub-style strip length: 5 blocks per stat, split by share of additions. */
export const DIFF_STAT_BLOCKS = 5;
/**
 * How many of the 5 strip blocks use the additions (success) fill. The rest use the
 * deletions (danger) fill; with no changes at all every block uses the neutral track.
 * Shared with Swift `AccivaDiffStat.filledBlocks` — keep the two in sync.
 */
export function diffStatAddedBlocks(additions, deletions) {
    const total = Math.max(0, additions) + Math.max(0, deletions);
    if (total === 0)
        return 0;
    return Math.round((DIFF_STAT_BLOCKS * Math.max(0, additions)) / total);
}
function pluralize(count, singular) {
    return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
/**
 * GitHub-style `+additions / -deletions` counts plus a 5-block strip. Read-only: the
 * counts are text so the strip's colour is never the only channel (SC 1.4.1), the strip
 * is `aria-hidden`, and the whole stat carries one `role="img"` name (SC 4.1.2, 1.1.1).
 */
export function DiffStat(_a) {
    var { additions, deletions, className } = _a, props = __rest(_a, ["additions", "deletions", "className"]);
    const safeAdditions = Math.max(0, Math.floor(additions));
    const safeDeletions = Math.max(0, Math.floor(deletions));
    const total = safeAdditions + safeDeletions;
    const addedBlocks = diffStatAddedBlocks(safeAdditions, safeDeletions);
    return (_jsxs("span", Object.assign({ role: "img", "aria-label": `${pluralize(safeAdditions, "addition")}, ${pluralize(safeDeletions, "deletion")}`, className: cn("inline-flex shrink-0 items-center gap-1.5", className) }, props, { children: [_jsxs("span", { className: "font-medium tabular-nums", children: [_jsxs("span", { className: "text-success", children: ["+", safeAdditions] }), "\u2009/\u2009", _jsxs("span", { className: "text-danger", children: ["\u2212", safeDeletions] })] }), _jsx("span", { "aria-hidden": "true", className: "inline-flex items-center gap-0.5", children: Array.from({ length: DIFF_STAT_BLOCKS }, (_, index) => (_jsx("span", { className: cn("size-2 rounded-sm", total === 0
                        ? "bg-border-control"
                        : index < addedBlocks
                            ? "bg-success"
                            : "bg-danger") }, index))) })] })));
}
