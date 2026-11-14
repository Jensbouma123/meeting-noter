import { jsx as _jsx } from "react/jsx-runtime";
import { Search } from "lucide-react";
import { Input } from "../Input/index.js";
export function DataListSearchField({ inputId, query, placeholder, statusRegionId, onQueryChange, }) {
    return (_jsx("div", { className: "flex-1 min-w-44 max-w-sm", children: _jsx(Input, { id: inputId, type: "search", size: "sm", value: query, onChange: (e) => onQueryChange(e.target.value), placeholder: placeholder, "aria-label": placeholder, "aria-describedby": statusRegionId, leadingIcon: _jsx(Search, { "aria-hidden": "true" }) }) }));
}
