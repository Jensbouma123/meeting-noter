import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * A `<li>` row for blocks whose rows carry buttons. Mirrors `RowList.Item` layout, but
 * the action controls sit in their own trailing group instead of inside an inert slot.
 */
export function ActionRow({ leading, title, meta, trailing, actions }) {
    return (_jsxs("li", { className: "flex min-h-11 items-center gap-3 py-2", children: [leading ? _jsx("span", { className: "flex shrink-0 items-center", children: leading }) : null, _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block wrap-break-word text-sm font-medium text-foreground", children: title }), meta ? (_jsx("span", { className: "block wrap-break-word text-xs text-muted-foreground", children: meta })) : null] }), trailing || actions ? (_jsxs("span", { className: "flex shrink-0 items-center gap-2", children: [trailing, actions] })) : null] }));
}
