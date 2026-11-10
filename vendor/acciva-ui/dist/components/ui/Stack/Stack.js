import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { StackBase } from "./StackBase.js";
import { directionClass } from "./StackTokens.js";
// ---------------------------------------------------------------------------
// Stack (full primitive: single or per-breakpoint direction)
// ---------------------------------------------------------------------------
export const Stack = forwardRef(function Stack({ direction = "vertical", ...props }, ref) {
    return (_jsx(StackBase, { ...props, directionClass: directionClass(direction), ref: ref }));
});
