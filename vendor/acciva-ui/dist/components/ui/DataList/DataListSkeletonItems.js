import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HStack } from "../HStack.js";
import { VStack } from "../VStack.js";
import { cn } from "../../../lib/utils.js";
export function DataListSkeletonItems({ count, layout, renderSkeleton }) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
        skeletons.push(_jsx("div", { className: cn("rounded-xl border border-border/50 bg-surface/50 p-4 animate-pulse", layout === "grid" ? "h-44" : "h-20"), children: renderSkeleton ? (renderSkeleton(i)) : (_jsxs(VStack, { spacing: "md", children: [_jsxs(HStack, { spacing: "md", children: [_jsx("div", { className: "size-10 rounded-full bg-muted-foreground/20 shrink-0" }), _jsxs("div", { className: "flex flex-col gap-2 w-full", children: [_jsx("div", { className: "h-4 w-1/3 rounded bg-muted-foreground/20" }), _jsx("div", { className: "h-3 w-1/2 rounded bg-muted-foreground/15" })] })] }), _jsx("div", { className: "h-3 w-4/5 rounded bg-muted-foreground/10" })] })) }, `skeleton-${i}`));
    }
    return skeletons;
}
