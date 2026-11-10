import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { INSET_PADDING, } from "../Stack/index.js";
/**
 * Block-axis alignment comes from `items-*` and inline-axis alignment from
 * `justify-items-*`, both set on the grid container so no wrapper element is
 * needed per layer.
 */
const ALIGN_CLASS = {
    "top-leading": "items-start justify-items-start",
    top: "items-start justify-items-center",
    "top-trailing": "items-start justify-items-end",
    leading: "items-center justify-items-start",
    center: "items-center justify-items-center",
    trailing: "items-center justify-items-end",
    "bottom-leading": "items-end justify-items-start",
    bottom: "items-end justify-items-center",
    "bottom-trailing": "items-end justify-items-end",
};
/** Every direct child is pinned to the single grid cell, so children overlap. */
const LAYER_CLASS = "*:col-start-1 *:row-start-1";
export const ZStack = forwardRef(function ZStack({ as, align = "center", inset = "none", className, children, ...props }, ref) {
    const Component = (as ?? "div");
    return (_jsx(Component, { ref: ref, className: cn("grid", LAYER_CLASS, ALIGN_CLASS[align], INSET_PADDING[inset], className), ...props, children: children }));
});
