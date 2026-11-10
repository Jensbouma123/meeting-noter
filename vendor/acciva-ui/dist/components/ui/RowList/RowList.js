import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import { cn } from "../../../lib/utils.js";
import { RowListItem } from "./RowListItem.js";
const RowListRoot = forwardRef(function RowList({ divided = false, className, ...props }, ref) {
    return (_jsx("ul", { ref: ref, className: cn("m-0 list-none p-0", divided && "divide-y divide-border", className), ...props }));
});
export const RowList = Object.assign(RowListRoot, { Item: RowListItem });
