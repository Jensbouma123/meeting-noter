import { jsx as _jsx } from "react/jsx-runtime";
import { Tooltip } from "../Tooltip/index.js";
/** Wraps the element in a tooltip. `tooltip` arrives already gated on a real label. */
export function withTooltip(element, tooltip, ownsLongPress) {
    if (tooltip === undefined)
        return element;
    return _jsx(Tooltip, { content: tooltip, longPress: !ownsLongPress, children: element });
}
// An <a> cannot be `disabled`; it is taken out of the tab order and its activation is
// swallowed instead, so a loading/disabled link is inert for pointer AND keyboard users.
export function inertClick(event) {
    event.preventDefault();
}
