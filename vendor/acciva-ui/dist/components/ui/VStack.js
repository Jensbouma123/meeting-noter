import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { StackBase as Stack } from "./Stack/StackBase.js";
export const VStack = forwardRef(function VStack({ align = "stretch", ...props }, ref) {
    return (_jsx(Stack, { ...props, align: align, direction: "vertical", ref: ref }));
});
