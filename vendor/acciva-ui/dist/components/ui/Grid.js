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
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../lib/utils.js";
import { INSET_PADDING, SPACING_GAP, } from "./Stack.js";
/**
 * Widest column count `columns` accepts. Seven is the floor a calendar needs — a
 * week is the most common fixed grid in the library — and eight covers a dense
 * icon or swatch picker at `sm:` and up.
 */
const MAX_COLUMNS = 8;
// Every class below is written out in full: the Tailwind scanner reads source text,
// so a built string like `grid-cols-${n}` would compile to no CSS at all.
const SIZE_TO_COL = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
};
const SIZE_TO_COL_SM = {
    1: "sm:grid-cols-1",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
    6: "sm:grid-cols-6",
    7: "sm:grid-cols-7",
    8: "sm:grid-cols-8",
};
const SIZE_TO_COL_MD = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
    7: "md:grid-cols-7",
    8: "md:grid-cols-8",
};
const SIZE_TO_COL_LG = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
    5: "lg:grid-cols-5",
    6: "lg:grid-cols-6",
    7: "lg:grid-cols-7",
    8: "lg:grid-cols-8",
};
const SIZE_TO_COL_XL = {
    1: "xl:grid-cols-1",
    2: "xl:grid-cols-2",
    3: "xl:grid-cols-3",
    4: "xl:grid-cols-4",
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
    7: "xl:grid-cols-7",
    8: "xl:grid-cols-8",
};
const clampColumns = (count) => Math.min(Math.max(count, 1), MAX_COLUMNS);
const SIZE_TO_MIN_WIDTH = {
    xxs: "min-w-12",
    xs: "min-w-16",
    sm: "min-w-20",
    md: "min-w-24",
    lg: "min-w-32",
    xl: "min-w-40",
    "2xl": "min-w-48",
    "3xl": "min-w-56",
};
const ALIGN_MAP = {
    leading: "items-start",
    center: "items-center",
    trailing: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};
export const Grid = forwardRef(function Grid(_a, ref) {
    var _b;
    var { columns = 1, spacing = "md", align = "stretch", minItemWidth, inset = "none", className, children } = _a, props = __rest(_a, ["columns", "spacing", "align", "minItemWidth", "inset", "className", "children"]);
    const isResponsive = typeof columns === "object";
    const baseCols = isResponsive ? ((_b = columns.base) !== null && _b !== void 0 ? _b : 1) : columns;
    const columnClasses = [
        SIZE_TO_COL[clampColumns(baseCols)],
        isResponsive && columns.sm ? SIZE_TO_COL_SM[clampColumns(columns.sm)] : undefined,
        isResponsive && columns.md ? SIZE_TO_COL_MD[clampColumns(columns.md)] : undefined,
        isResponsive && columns.lg ? SIZE_TO_COL_LG[clampColumns(columns.lg)] : undefined,
        isResponsive && columns.xl ? SIZE_TO_COL_XL[clampColumns(columns.xl)] : undefined,
    ].filter((c) => c !== undefined);
    const autoFitClass = minItemWidth ? SIZE_TO_MIN_WIDTH[minItemWidth] : undefined;
    return (_jsx("div", Object.assign({ ref: ref, className: cn("grid", SPACING_GAP[spacing], ALIGN_MAP[align], INSET_PADDING[inset], ...columnClasses, autoFitClass, className) }, props, { children: children })));
});
