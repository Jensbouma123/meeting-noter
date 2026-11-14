import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** The trigger's `anchor-name`, which the top-layer panel positions against. */
export const anchorNameFor = (listboxId) => `--ss-${listboxId.replace(/[^\w-]/g, "")}`;
export function OptionAdornment({ icon }) {
    if (!icon)
        return null;
    return (_jsx("span", { "aria-hidden": "true", className: "flex size-4 shrink-0 items-center justify-center text-muted-foreground", children: icon }));
}
/** Wraps the first case-insensitive `query` match in `<mark>` by plain string slicing — never HTML parsing. */
export function highlightMatch(label, query) {
    if (!query)
        return label;
    const start = label.toLowerCase().indexOf(query);
    if (start === -1)
        return label;
    const end = start + query.length;
    return (_jsxs(_Fragment, { children: [label.slice(0, start), _jsx("mark", { className: "bg-primary-500/15 text-primary-900 dark:bg-primary-400/25 dark:text-primary-200 rounded-xs px-0.5 font-semibold", children: label.slice(start, end) }), label.slice(end)] }));
}
