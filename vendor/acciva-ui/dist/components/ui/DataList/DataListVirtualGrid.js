import { jsx as _jsx } from "react/jsx-runtime";
import { VirtualList } from "../VirtualList/index.js";
import { cn } from "../../../lib/utils.js";
import { DEFAULT_ITEM_HEIGHT_GRID, DEFAULT_VIRTUAL_HEIGHT, toVirtualRole } from "./utils.js";
export function DataListVirtualGrid({ props, view, virtualListRef }) {
    const { itemHeight, height = DEFAULT_VIRTUAL_HEIGHT, overscan = 4, dynamic = false, arrowHint, interactive = true, listClassName } = props;
    return (_jsx(VirtualList, { listRef: virtualListRef, items: view.virtualRows, itemHeight: typeof itemHeight === "number"
            ? itemHeight
            : DEFAULT_ITEM_HEIGHT_GRID, height: height, overscan: overscan, dynamic: dynamic, role: toVirtualRole(view.resolvedContainerRole), itemRole: "presentation", "aria-label": view.ariaLabel, "aria-labelledby": view.ariaLabelledBy, "aria-describedby": view.ariaDescribedBy, arrowHint: arrowHint, interactive: interactive, className: cn("focus-ring rounded-xl border border-border bg-background p-3", listClassName), renderItem: view.renderVirtualGridRow, getItemKey: (_, rowIdx) => `row-${rowIdx}` }));
}
