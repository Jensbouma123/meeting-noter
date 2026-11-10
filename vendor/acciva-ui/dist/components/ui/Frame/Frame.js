import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, } from "react";
import { FRAME_MAX_WIDTH } from "../../../lib/layout-tokens.js";
import { cn } from "../../../lib/utils.js";
import { INSET_PADDING } from "../Stack/index.js";
const ALIGN_CLASS = {
    leading: "items-start",
    center: "items-center",
    trailing: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
};
export const Frame = forwardRef(function Frame({ as: Tag = "div", maxWidth = "none", padding = "none", fill = false, center = false, align, className, children, ...props }, ref) {
    const Component = Tag;
    return (_jsx(Component, { ref: ref, className: cn(FRAME_MAX_WIDTH[maxWidth], INSET_PADDING[padding], fill && "w-full h-full", center && "mx-auto", align && ["flex flex-col", ALIGN_CLASS[align]], className), ...props, children: children }));
});
