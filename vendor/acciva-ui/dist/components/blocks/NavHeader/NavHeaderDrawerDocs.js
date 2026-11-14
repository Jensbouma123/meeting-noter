import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { HStack } from "../../ui/HStack.js";
import { Input } from "../../ui/Input/index.js";
import { VStack } from "../../ui/VStack.js";
import { NavTree } from "../NavTree.js";
import { MAX_SEARCH_RESULTS, docHref, isActive } from "./NavHeaderData.js";
/** Buckets entries by `group`, keeping first-seen order, as NavTree sections. */
function toSections(items) {
    const sections = [];
    for (const { slug, title, group } of items) {
        const entry = sections.find((section) => section.heading === group);
        const item = { href: docHref(slug), label: title };
        if (entry)
            entry.items.push(item);
        else
            sections.push({ heading: group, items: [item] });
    }
    return sections;
}
export function NavHeaderDrawerDocs({ items, closeMenu }) {
    const router = useRouter();
    const pathname = usePathname();
    const [mobileQuery, setMobileQuery] = useState("");
    const allSections = useMemo(() => toSections(items), [items]);
    const filteredDocs = useMemo(() => {
        const needle = mobileQuery.trim().toLowerCase();
        if (!needle)
            return [];
        return items
            .filter((s) => s.title.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
            .slice(0, MAX_SEARCH_RESULTS);
    }, [mobileQuery, items]);
    const filtering = mobileQuery.trim() !== "";
    const sections = useMemo(() => (filtering ? toSections(filteredDocs) : allSections), [filtering, filteredDocs, allSections]);
    // Render-phase reset on route change, as in `useNavHeaderDrawer`.
    const [previousPathname, setPreviousPathname] = useState(pathname);
    if (previousPathname !== pathname) {
        setPreviousPathname(pathname);
        if (mobileQuery !== "")
            setMobileQuery("");
    }
    const handleFilterKeyDown = (event) => {
        if (event.key === "Enter" && filteredDocs.length > 0) {
            event.preventDefault();
            router.push(docHref(filteredDocs[0].slug));
            setMobileQuery("");
            closeMenu();
        }
    };
    const activeHref = items.map((s) => docHref(s.slug)).find((href) => isActive(pathname, href));
    return (_jsxs(VStack, { spacing: "md", className: "border-t border-border pt-6", children: [_jsxs(HStack, { spacing: "sm", justify: "between", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: "Documentation" }), _jsx(Link, { href: "/", className: "focus-ring rounded-md text-xs font-medium text-primary-700 transition-colors motion-feedback hover:text-primary-800 active:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 dark:active:text-primary-200", children: "View all" })] }), _jsx(Input, { "aria-label": "Filter documentation", placeholder: "Jump to component\u2026", value: mobileQuery, onChange: (event) => setMobileQuery(event.target.value), onKeyDown: handleFilterKeyDown, leadingIcon: _jsx(Search, { className: "size-4 text-muted-foreground" }), clearable: true, onClear: () => setMobileQuery(""), autoComplete: "off" }), filtering && filteredDocs.length === 0 ? (_jsxs("p", { className: "px-1 py-2 text-sm text-muted-foreground", children: ["No components match \u201C", mobileQuery, "\u201D"] })) : (_jsx(NavTree, { "aria-label": "Documentation", arrowHint: false, sections: sections, activeHref: activeHref }))] }));
}
