var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Columns2, Lock, MessageCircleQuestionMark, TriangleAlert } from "lucide-react";
import { Badge } from "../../components/ui/Badge.js";
import { ICON_SIZE_CLASS } from "../../lib/sizing-tokens.js";
import { cn } from "../../lib/utils.js";
const REASONS = {
    grill: { tone: "warning", Icon: MessageCircleQuestionMark, label: "Awaiting grill answers" },
    compare: { tone: "info", Icon: Columns2, label: "Awaiting compare verdict" },
    permission: { tone: "danger", Icon: Lock, label: "Awaiting permission decision" },
    stuck: { tone: "warning", Icon: TriangleAlert, label: "Session needs action" },
};
// `Badge` has no info tone; the same tint recipe, built from the info ramp, overrides its neutral.
const INFO_BADGE_CLASS = "bg-info/10 text-info-900 border-info/20 dark:bg-info/15 dark:text-info-300 dark:border-info/30";
const INDICATOR_ICON_CLASS = {
    warning: "text-warning",
    info: "text-info",
    danger: "text-danger",
};
export function AttentionBadge(_a) {
    var { reason, display = "label", size = "sm", label, decorative = false, className } = _a, props = __rest(_a, ["reason", "display", "size", "label", "decorative", "className"]);
    const { tone, Icon, label: defaultLabel } = REASONS[reason];
    const text = (label === null || label === void 0 ? void 0 : label.trim()) || defaultLabel;
    if (display === "indicator") {
        return (_jsx("span", Object.assign({}, (decorative ? { "aria-hidden": true } : { role: "img", "aria-label": text }), props, { className: cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface p-0.5", INDICATOR_ICON_CLASS[tone], className), children: _jsx(Icon, { "aria-hidden": "true", className: ICON_SIZE_CLASS[size] }) })));
    }
    return (_jsxs(Badge, Object.assign({ variant: tone === "info" ? "neutral" : tone, size: size, className: cn("shrink-0 whitespace-nowrap", tone === "info" && INFO_BADGE_CLASS, className) }, props, { children: [_jsx(Icon, { "aria-hidden": "true" }), text] })));
}
