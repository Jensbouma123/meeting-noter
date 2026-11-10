import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { columnCellClass } from "./utils.js";
export function DataListRowContent({ columns, template, item, index }) {
    return (_jsx("div", { className: "grid items-center gap-3", style: { gridTemplateColumns: template }, children: columns.map((column) => (_jsxs("div", { className: columnCellClass(column), children: [_jsxs("span", { className: "sr-only", children: [column.header, ": "] }), column.cell(item, index)] }, column.key))) }));
}
