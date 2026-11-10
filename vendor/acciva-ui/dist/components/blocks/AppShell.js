import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HStack } from "../../components/ui/HStack.js";
import { VStack } from "../../components/ui/VStack.js";
import { cn } from "../../lib/utils.js";
import { NavHeader } from "./NavHeader.js";
export function AppShell({ children, header, searchItems, sidebar, startAside, endAside }) {
    const resolvedStartAside = startAside !== null && startAside !== void 0 ? startAside : sidebar;
    const hasAside = Boolean(resolvedStartAside || endAside);
    const main = (_jsx("main", { className: cn("flex-1 p-4 sm:p-6 lg:p-8", hasAside ? "min-w-0" : undefined), children: children }));
    return (_jsxs(VStack, { spacing: "none", className: "min-h-screen bg-background", children: [header !== null && header !== void 0 ? header : _jsx(NavHeader, { searchItems: searchItems }), hasAside ? (_jsxs(HStack, { spacing: "none", align: "stretch", className: "min-h-0 flex-1", children: [resolvedStartAside, main, endAside] })) : (main)] }));
}
