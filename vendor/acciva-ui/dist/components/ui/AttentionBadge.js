import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Columns2, Lock, MessageCircleQuestionMark, TriangleAlert } from "lucide-react";
import { Badge } from "./Badge/index.js";
import { ICON_SIZE_CLASS } from "../../lib/sizing-tokens/index.js";
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
export function AttentionBadge({ reason, display = "label", size = "sm", label, decorative = false, className, ...props }) {
    const { tone, Icon, label: defaultLabel } = REASONS[reason];
    const text = label?.trim() || defaultLabel;
    if (display === "indicator") {
        return (_jsx("span", { ...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": text }), ...props, className: cn("inline-flex shrink-0 items-center justify-center rounded-full bg-surface p-0.5", INDICATOR_ICON_CLASS[tone], className), children: _jsx(Icon, { "aria-hidden": "true", className: ICON_SIZE_CLASS[size] }) }));
    }
    return (_jsxs(Badge, { variant: tone === "info" ? "neutral" : tone, size: size, className: cn("shrink-0 whitespace-nowrap", tone === "info" && INFO_BADGE_CLASS, className), ...props, children: [_jsx(Icon, { "aria-hidden": "true" }), text] }));
}
