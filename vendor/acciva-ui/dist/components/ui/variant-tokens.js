import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
export const VARIANT_ICON = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
};
export const VARIANT_POLITENESS = {
    info: "polite",
    success: "polite",
    warning: "assertive",
    danger: "assertive",
};
export const VARIANT_ACCENT_TEXT = {
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
};
// A background fill, not a border colour: the base layer's unlayered `* { border-color }`
// beats every layered border utility, so a `border-{variant}` accent renders grey.
export const VARIANT_ACCENT_BAR = {
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
};
export const VARIANT_ACCENT_BORDER_LEFT = {
    info: "border-l-info",
    success: "border-l-success",
    warning: "border-l-warning",
    danger: "border-l-danger",
};
export const VARIANT_TINT_BG = {
    info: "bg-info/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    danger: "bg-danger/10",
};
