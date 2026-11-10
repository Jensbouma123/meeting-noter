"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu } from "lucide-react";
import { useState } from "react";
import { AppShell, MAIN_ID, SkipLink } from "./AppShell.js";
import { Sidebar } from "./Sidebar.js";
import { Button } from "../ui/Button/index.js";
import { HStack } from "../ui/HStack.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function DashboardShell({ sidebarItems, sidebar, children, header, mobileOpen, onMobileOpenChange, className, mainClassName, showMobileTrigger = true, mainPadding = true, }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = mobileOpen !== undefined;
    const isMobileOpen = isControlled ? mobileOpen : internalOpen;
    const handleMobileOpen = () => {
        if (onMobileOpenChange) {
            onMobileOpenChange(true);
        }
        else {
            setInternalOpen(true);
        }
    };
    const handleMobileClose = () => {
        if (onMobileOpenChange) {
            onMobileOpenChange(false);
        }
        else {
            setInternalOpen(false);
        }
    };
    return (_jsxs(HStack, { spacing: "none", align: "stretch", className: cn("min-h-screen bg-background", className), children: [_jsx(SkipLink, {}), sidebar ?? (_jsx(Sidebar, { items: sidebarItems ?? [], mobileOpen: isMobileOpen, onMobileClose: handleMobileClose })), _jsxs("div", { className: "relative flex min-h-screen min-w-0 flex-1 flex-col", children: [header ? (_jsxs(VStack, { spacing: "none", className: "min-h-screen", children: [header, _jsx("main", { id: MAIN_ID, tabIndex: -1, className: cn("flex-1 focus:outline-none", mainPadding && "p-4 sm:p-6 lg:p-8", mainClassName), children: children })] })) : (_jsx(AppShell, { skipLink: false, children: children })), showMobileTrigger ? (_jsx("div", { className: "fixed bottom-6 left-6 z-30 lg:hidden", children: _jsx(Button, { variant: "secondary", size: "md", iconOnly: true, tooltip: "Open navigation", onClick: handleMobileOpen, className: "shadow-lg touch-target-44", children: _jsx(Menu, { "aria-hidden": "true", className: "size-5" }) }) })) : null] })] }));
}
