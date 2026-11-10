import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HStack } from "../../ui/HStack.js";
import { Input } from "../../ui/Input/index.js";
import { VStack } from "../../ui/VStack.js";
import { MAX_SEARCH_RESULTS, docHref, isActive, navRowClass } from "./NavHeaderData.js";
export function NavHeaderDrawerDocs({ items, closeMenu }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileQuery, setMobileQuery] = useState("");
    // Grouped once per `items` identity; the drawer renders this tree while no filter is typed.
    const docGroups = useMemo(() => items.reduce((groups, section) => {
        const entry = groups.find((candidate) => candidate.group === section.group);
        if (entry)
            entry.sections.push(section);
        else
            groups.push({ group: section.group, sections: [section] });
        return groups;
    }, []), [items]);
    const filteredDocs = useMemo(() => {
        const needle = mobileQuery.trim().toLowerCase();
        if (!needle)
            return [];
        return items
            .filter((s) => s.title.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
            .slice(0, MAX_SEARCH_RESULTS);
    }, [mobileQuery, items]);
    // Render-phase reset on route change, as in `useNavHeaderDrawer`.
    const [previousPathname, setPreviousPathname] = useState(pathname);
    if (previousPathname !== pathname) {
        setPreviousPathname(pathname);
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
    const docLink = (section, extra, children) => {
        const href = docHref(section.slug);
        const active = isActive(pathname, href);
        return (_jsx(Link, { href: href, onClick: closeMenu, "aria-current": active ? "page" : undefined, className: navRowClass(active, extra), children: children }));
    };
    return (_jsxs(VStack, { spacing: "md", className: "border-t border-border pt-6", children: [_jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Documentation" }), _jsx(Link, { href: "/", onClick: closeMenu, className: "focus-ring rounded-md text-xs font-medium text-primary-700 transition-colors motion-feedback hover:text-primary-800 active:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 dark:active:text-primary-200", children: "View all" })] }), _jsx(Input, { "aria-label": "Filter documentation", placeholder: "Jump to component\u2026", value: mobileQuery, onChange: (event) => setMobileQuery(event.target.value), onKeyDown: handleMobileFilterKeyDown, leadingIcon: _jsx(Search, { className: "size-4 text-muted-foreground" }), clearable: true, onClear: () => setMobileQuery(""), autoComplete: "off" }), mobileQuery.trim() ? (filteredDocs.length === 0 ? (_jsxs("p", { className: "px-1 py-2 text-sm text-muted-foreground", children: ["No components match \u201C", mobileQuery, "\u201D"] })) : (_jsx(VStack, { as: "ul", spacing: "xs", children: filteredDocs.map((section) => (_jsx("li", { children: docLink(section, "justify-between gap-2 text-sm", _jsxs(_Fragment, { children: [_jsx("span", { className: "truncate", children: section.title }), _jsx("span", { className: "shrink-0 text-xs text-muted-foreground", children: section.group })] })) }, section.slug))) }))) : (_jsx(VStack, { as: "ul", spacing: "lg", children: docGroups.map((entry) => (_jsxs("li", { children: [_jsx("h2", { className: "px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: entry.group }), _jsx(VStack, { as: "ul", spacing: "xs", children: entry.sections.map((section) => (_jsx("li", { children: docLink(section, "text-sm", _jsx("span", { className: "truncate", children: section.title })) }, section.slug))) })] }, entry.group))) }))] }));
}
