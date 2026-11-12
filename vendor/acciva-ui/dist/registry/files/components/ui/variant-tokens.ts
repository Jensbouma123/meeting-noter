import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Shared by Alert and Toast so the two read as one feedback system. Lives under ui/
// rather than src/lib/ because it's an implementation detail of these two components,
// not general-purpose framework-agnostic logic.
export type SemanticVariant = "info" | "success" | "warning" | "danger";

export const VARIANT_ICON: Record<SemanticVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export const VARIANT_POLITENESS: Record<SemanticVariant, "polite" | "assertive"> = {
  info: "polite",
  success: "polite",
  warning: "assertive",
  danger: "assertive",
};

export const VARIANT_ACCENT_TEXT: Record<SemanticVariant, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

// A background fill, not a border colour: the base layer's unlayered `* { border-color }`
// beats every layered border utility, so a `border-{variant}` accent renders grey.
export const VARIANT_ACCENT_BAR: Record<SemanticVariant, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export const VARIANT_ACCENT_BORDER_LEFT: Record<SemanticVariant, string> = {
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
};

export const VARIANT_TINT_BG: Record<SemanticVariant, string> = {
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
};
