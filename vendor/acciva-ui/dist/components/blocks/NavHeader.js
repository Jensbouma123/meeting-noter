"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BookOpen, Layers, LayoutGrid, Menu, Moon, Palette, Search, Sun, Type, X, } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, } from "react";
import { Badge } from "../../components/ui/Badge.js";
import { Button } from "../../components/ui/Button.js";
import { Drawer } from "../../components/ui/Drawer.js";
import { HStack } from "../../components/ui/HStack.js";
import { Input } from "../../components/ui/Input.js";
import { Logo } from "../../components/ui/Logo.js";
import { VStack } from "../../components/ui/VStack.js";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW, } from "../../lib/surface-tokens.js";
import { useTheme } from "../../lib/theme-context.js";
import { cn } from "../../lib/utils.js";
const PRIMARY_NAV_LINKS = [
    { label: "Docs", href: "/", icon: BookOpen },
    { label: "Gallery", href: "/gallery", icon: LayoutGrid },
    { label: "Examples", href: "/examples", icon: Layers },
    { label: "Color Studio", href: "/color-studio", icon: Palette },
    { label: "Typography Studio", href: "/typography-studio", icon: Type },
];
const NO_SEARCH_ITEMS = [];
const MAX_SEARCH_RESULTS = 8;
/** Panel width. `maxSize` alone collapses all three detents onto it — a fixed-width panel. */
const DRAWER_WIDTH_PX = 320;
const DOCS_ROOTS = ["/components", "/getting-started", "/icons", "/sizing"];
function matchesPrefix(pathname, href) {
    return pathname === href || Boolean(pathname === null || pathname === void 0 ? void 0 : pathname.startsWith(`${href}/`));
}
function isActive(pathname, href) {
    if (href === "/")
        return pathname === "/" || DOCS_ROOTS.some((root) => matchesPrefix(pathname, root));
    return matchesPrefix(pathname, href);
}
function docHref(slug) {
    return `/components/${slug}`;
}
export function NavHeader({ logo, primaryLinks, actions, searchItems = NO_SEARCH_ITEMS, search = true, themeToggle = true, menu = true, startActions, homeHref = "/", brandLabel = "ACCIVA UI", } = {}) {
    const { toggleMode } = useTheme();
    const pathname = usePathname();
    const router = useRouter();
    const navLinks = primaryLinks !== null && primaryLinks !== void 0 ? primaryLinks : PRIMARY_NAV_LINKS;
    const hasSearchItems = searchItems.length > 0;
    // Grouped once per `searchItems` identity; the drawer renders this tree while no filter is typed.
    const docGroups = useMemo(() => searchItems.reduce((groups, section) => {
        const entry = groups.find((candidate) => candidate.group === section.group);
        if (entry)
            entry.sections.push(section);
        else
            groups.push({ group: section.group, sections: [section] });
        return groups;
    }, []), [searchItems]);
    const resolveActive = (link) => { var _a; return (_a = link.isActive) !== null && _a !== void 0 ? _a : isActive(pathname, link.href); };
    const [menuOpen, setMenuOpen] = useState(false);
    const drawerId = useId();
    const [mobileQuery, setMobileQuery] = useState("");
    const [query, setQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const searchRef = useRef(null);
    const baseId = useId();
    const listboxId = `${baseId}-search-listbox`;
    const optionId = useCallback((index) => `${baseId}-search-option-${index}`, [baseId]);
    const results = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle)
            return [];
        return searchItems
            .filter((section) => section.title.toLowerCase().includes(needle))
            .slice(0, MAX_SEARCH_RESULTS);
    }, [query, searchItems]);
    const filteredDocs = useMemo(() => {
        const needle = mobileQuery.trim().toLowerCase();
        if (!needle)
            return [];
        return searchItems
            .filter((section) => section.title.toLowerCase().includes(needle) ||
            section.group.toLowerCase().includes(needle))
            .slice(0, MAX_SEARCH_RESULTS);
    }, [mobileQuery, searchItems]);
    const [previousQuery, setPreviousQuery] = useState(query);
    if (previousQuery !== query) {
        setPreviousQuery(query);
        if (activeIndex !== 0)
            setActiveIndex(0);
    }
    const closeSearch = useCallback(() => setSearchOpen(false), []);
    const commitSearch = useCallback((index) => {
        const section = results[index];
        if (!section)
            return;
        router.push(docHref(section.slug));
        setQuery("");
        closeSearch();
    }, [results, router, closeSearch]);
    const handleSearchKeyDown = (event) => {
        switch (event.key) {
            case "ArrowDown":
                if (results.length === 0)
                    return;
                event.preventDefault();
                setSearchOpen(true);
                setActiveIndex((current) => (current + 1) % results.length);
                break;
            case "ArrowUp":
                if (results.length === 0)
                    return;
                event.preventDefault();
                setSearchOpen(true);
                setActiveIndex((current) => (current - 1 + results.length) % results.length);
                break;
            case "Enter":
                if (!searchOpen || results.length === 0)
                    return;
                event.preventDefault();
                commitSearch(activeIndex);
                break;
            case "Escape":
                if (!searchOpen)
                    return;
                event.preventDefault();
                closeSearch();
                break;
            default:
        }
    };
    useEffect(() => {
        if (!searchOpen)
            return;
        const onPointerDown = (event) => {
            var _a;
            if (!((_a = searchRef.current) === null || _a === void 0 ? void 0 : _a.contains(event.target)))
                closeSearch();
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [searchOpen, closeSearch]);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    // A route change dismisses the drawer. It is a transition derived from a changed
    // value, not a synchronisation with an external system, so it runs in the render
    // phase like the `activeIndex` reset above — an effect here would paint the new
    // route with the drawer still up for a frame and trips `react-hooks/set-state-in-effect`.
    const [previousPathname, setPreviousPathname] = useState(pathname);
    if (previousPathname !== pathname) {
        setPreviousPathname(pathname);
        if (menuOpen)
            setMenuOpen(false);
        if (mobileQuery !== "")
            setMobileQuery("");
    }
    const handleMobileFilterKeyDown = (event) => {
        if (event.key === "Enter" && filteredDocs.length > 0) {
            event.preventDefault();
            router.push(docHref(filteredDocs[0].slug));
            setMobileQuery("");
            closeMenu();
        }
    };
    const docLinkClass = (href) => cn("touch-target-44 focus-ring flex min-h-11 items-center rounded-lg px-3 py-2 text-sm transition-colors motion-feedback", isActive(pathname, href)
        ? "bg-primary-500/15 font-semibold text-primary-800 dark:text-primary-300"
        : "text-foreground hover:bg-elevation-3 active:bg-elevation-4");
    return (_jsxs("header", { className: "sticky top-0 z-30 border-b border-border bg-background backdrop-blur-sm", children: [_jsxs(HStack, { spacing: "sm", className: "h-16 px-4 sm:gap-3 sm:px-6", children: [startActions, menu ? (_jsx(HStack, { spacing: "none", children: _jsx("button", { type: "button", onClick: () => setMenuOpen((open) => !open), "aria-label": "Toggle primary navigation", "aria-expanded": menuOpen, "aria-controls": drawerId, className: "touch-target-44 focus-ring flex size-9 items-center justify-center rounded-md text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99] lg:hidden", children: _jsxs("span", { className: "relative flex size-5 items-center justify-center", "aria-hidden": "true", children: [_jsx(Menu, { className: cn("absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none", menuOpen ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100") }), _jsx(X, { className: cn("absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none", menuOpen ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75") })] }) }) })) : null, _jsx(Link, { href: homeHref, "aria-label": brandLabel, className: "focus-ring flex shrink-0 items-center rounded-md font-semibold text-foreground", children: logo !== null && logo !== void 0 ? logo : _jsx(Logo, { variant: "responsive", size: "md" }) }), navLinks.length > 0 ? (_jsx("nav", { "aria-label": "Primary", className: "hidden lg:flex lg:items-center lg:gap-1", children: navLinks.map((link) => {
                            const active = resolveActive(link);
                            return (_jsx(Link, { href: link.href, "aria-current": active ? "page" : undefined, className: cn("focus-ring rounded-md px-3 py-2 text-sm font-medium transition-colors motion-feedback", active
                                    ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                                    : "text-foreground hover:bg-elevation-3 active:bg-elevation-4"), children: link.label }, link.href));
                        }) })) : null, _jsxs(HStack, { spacing: "sm", className: "ml-auto min-w-0", children: [search && hasSearchItems ? (_jsxs("div", { ref: searchRef, className: "relative w-32 sm:w-44 md:w-56 lg:w-64", children: [_jsx(Input, { "aria-label": "Search components", placeholder: "Search\u2026", value: query, onChange: (event) => {
                                            setQuery(event.target.value);
                                            setSearchOpen(true);
                                        }, onFocus: () => {
                                            if (query.trim())
                                                setSearchOpen(true);
                                        }, onKeyDown: handleSearchKeyDown, leadingIcon: _jsx(Search, { className: "size-4" }), role: "combobox", "aria-expanded": searchOpen && results.length > 0, "aria-controls": listboxId, "aria-autocomplete": "list", "aria-activedescendant": searchOpen && results.length > 0 ? optionId(activeIndex) : undefined, autoComplete: "off" }), searchOpen && query.trim() ? (_jsx("div", { id: listboxId, role: "listbox", "aria-label": "Search results", className: cn("absolute right-0 top-full z-40 mt-1 w-full overflow-hidden p-1 animate-fade-in", SURFACE_RADIUS.overlay, SURFACE_FILL.overlay, SURFACE_SHADOW.overlay), children: results.length === 0 ? (_jsxs("p", { className: "px-2.5 py-2 text-sm text-muted-foreground", children: ["No components match \u201C", query, "\u201D"] })) : (results.map((section, index) => (_jsx("div", { id: optionId(index), role: "option", "aria-selected": index === activeIndex, onMouseEnter: () => setActiveIndex(index), onClick: () => commitSearch(index), className: cn("cursor-pointer rounded-md px-2.5 py-2 text-sm transition-colors motion-feedback", index === activeIndex
                                                ? "bg-primary-100 text-primary-900"
                                                : "text-foreground hover:bg-elevation-3 active:bg-elevation-4"), children: section.title }, section.slug)))) })) : null] })) : null, themeToggle ? (_jsxs(Button, { variant: "outline", size: "md", iconOnly: true, tooltip: "Toggle color theme", onClick: toggleMode, className: "touch-target-44", children: [_jsx(Moon, { className: "theme-icon-light" }), _jsx(Sun, { className: "theme-icon-dark" })] })) : null, actions] })] }), menu ? (_jsx(Drawer, { open: menuOpen, onOpenChange: setMenuOpen, modality: "modal", side: "left", maxSize: DRAWER_WIDTH_PX, handleLabel: "Navigation drawer width", "aria-label": "Primary navigation", children: _jsxs(VStack, { id: drawerId, spacing: "xl", children: [_jsxs(HStack, { spacing: "sm", justify: "between", className: "-mx-4 -mt-4 border-b border-border px-4 py-2", children: [_jsx(Link, { href: homeHref, onClick: closeMenu, "aria-label": brandLabel, className: "focus-ring flex min-w-0 items-center rounded-md", children: logo !== null && logo !== void 0 ? logo : _jsx(Logo, { variant: "full", size: "md" }) }), _jsx("button", { type: "button", onClick: closeMenu, "aria-label": "Close navigation menu", className: cn("touch-target-44 focus-ring flex size-11 shrink-0 items-center justify-center text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99]", SURFACE_RADIUS.control), children: _jsx(X, { className: "size-5" }) })] }), _jsxs(VStack, { as: "nav", "aria-label": "Mobile Navigation", spacing: "xl", children: [navLinks.length > 0 ? (_jsx(VStack, { as: "ul", spacing: "xs", children: navLinks.map((link) => {
                                        const active = resolveActive(link);
                                        const Icon = link.icon;
                                        return (_jsx("li", { children: _jsxs(Link, { href: link.href, onClick: closeMenu, "aria-current": active ? "page" : undefined, className: cn("touch-target-44 focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors motion-feedback", active
                                                    ? "bg-primary-500/15 font-semibold text-primary-800 dark:text-primary-300"
                                                    : "text-foreground hover:bg-elevation-3 active:bg-elevation-4"), children: [Icon ? (_jsx(Icon, { className: cn("size-5 shrink-0", active ? "text-primary-600 dark:text-primary-400" : "text-muted-foreground") })) : null, _jsx("span", { className: "truncate", children: link.label })] }) }, link.href));
                                    }) })) : null, hasSearchItems ? (_jsxs(VStack, { spacing: "md", className: "border-t border-border pt-6", children: [_jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Documentation" }), _jsx(Link, { href: "/", onClick: closeMenu, className: "focus-ring rounded-md text-xs font-medium text-primary-700 transition-colors motion-feedback hover:text-primary-800 active:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 dark:active:text-primary-200", children: "View all" })] }), _jsx(Input, { "aria-label": "Filter documentation", placeholder: "Jump to component\u2026", value: mobileQuery, onChange: (event) => setMobileQuery(event.target.value), onKeyDown: handleMobileFilterKeyDown, leadingIcon: _jsx(Search, { className: "size-4 text-muted-foreground" }), clearable: true, onClear: () => setMobileQuery(""), autoComplete: "off" }), mobileQuery.trim() ? (filteredDocs.length === 0 ? (_jsxs("p", { className: "px-1 py-2 text-sm text-muted-foreground", children: ["No components match \u201C", mobileQuery, "\u201D"] })) : (_jsx(VStack, { as: "ul", spacing: "xs", children: filteredDocs.map((section) => (_jsx("li", { children: _jsxs(Link, { href: docHref(section.slug), onClick: closeMenu, "aria-current": isActive(pathname, docHref(section.slug)) ? "page" : undefined, className: cn(docLinkClass(docHref(section.slug)), "justify-between gap-2"), children: [_jsx("span", { className: "truncate", children: section.title }), _jsx("span", { className: "shrink-0 text-xs text-muted-foreground", children: section.group })] }) }, section.slug))) }))) : (_jsx(VStack, { as: "ul", spacing: "lg", children: docGroups.map((entry) => (_jsxs("li", { children: [_jsx("h2", { className: "px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: entry.group }), _jsx(VStack, { as: "ul", spacing: "xs", children: entry.sections.map((section) => (_jsx("li", { children: _jsx(Link, { href: docHref(section.slug), onClick: closeMenu, "aria-current": isActive(pathname, docHref(section.slug)) ? "page" : undefined, className: docLinkClass(docHref(section.slug)), children: _jsx("span", { className: "truncate", children: section.title }) }) }, section.slug))) })] }, entry.group))) }))] })) : null] }), _jsx("div", { className: "-mx-4 -mb-4 border-t border-border bg-elevation-1 px-4 pb-safe", children: _jsxs(VStack, { spacing: "sm", className: "py-4", children: [themeToggle ? (_jsxs(Button, { variant: "outline", size: "md", onClick: toggleMode, className: "touch-target-44 min-h-11 w-full", children: [_jsx(Moon, { className: "theme-icon-light" }), _jsx(Sun, { className: "theme-icon-dark" }), _jsx("span", { children: "Toggle theme" })] })) : null, _jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsxs("a", { href: "https://github.com/Jensbouma123/acciva-ui", target: "_blank", rel: "noreferrer noopener", "aria-label": "GitHub repository", className: "touch-target-44 focus-ring flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 hover:text-foreground active:text-foreground", children: [_jsx("svg", { className: "size-4 shrink-0", viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" }) }), _jsx("span", { children: "GitHub" })] }), _jsx(Badge, { variant: "neutral", size: "sm", children: "v0.1.0" })] })] }) })] }) })) : null] }));
}
