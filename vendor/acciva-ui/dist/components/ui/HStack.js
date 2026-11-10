import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { StackBase as Stack } from "./Stack/StackBase.js";
export const HStack = forwardRef(function HStack({ align = "center", ...props }, ref) {
    return (_jsx(Stack, { ...props, align: align, direction: "horizontal", ref: ref }));
});
