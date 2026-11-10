import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TEXT_SIZE, resolveResponsive } from "../../../lib/sizing-tokens/index.js";
import { HStack } from "../HStack.js";
export function SliderLabel({ id, label, readout, size }) {
    return (_jsxs(HStack, { justify: "between", spacing: "none", className: resolveResponsive(size, TEXT_SIZE), children: [_jsx("span", { id: id, className: "font-medium text-foreground", children: label }), _jsx("span", { className: "text-muted-foreground", children: readout })] }));
}
