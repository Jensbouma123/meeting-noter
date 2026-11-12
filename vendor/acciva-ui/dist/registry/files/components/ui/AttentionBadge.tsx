import { Columns2, Lock, MessageCircleQuestionMark, TriangleAlert, type LucideIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge/index";
import { ICON_SIZE_CLASS, type SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export type AttentionReason = "grill" | "compare" | "permission" | "stuck";
export type AttentionBadgeSize = Extract<SizeTier, "xxs" | "xs" | "sm" | "md">;

export interface AttentionBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onSelect"> {
  reason: AttentionReason;
  display?: "label" | "indicator";
  size?: AttentionBadgeSize;
  /** Overrides the reason text (localisation); never blank. */
  label?: string;
  /** `indicator` only — hides it when adjacent text already states the reason. */
  decorative?: boolean;
}

type Tone = Extract<BadgeTone, "warning" | "danger"> | "info";

const REASONS: Record<AttentionReason, { tone: Tone; Icon: LucideIcon; label: string }> = {
  grill: { tone: "warning", Icon: MessageCircleQuestionMark, label: "Awaiting grill answers" },
  compare: { tone: "info", Icon: Columns2, label: "Awaiting compare verdict" },
  permission: { tone: "danger", Icon: Lock, label: "Awaiting permission decision" },
  stuck: { tone: "warning", Icon: TriangleAlert, label: "Session needs action" },
};

// `Badge` has no info tone; the same tint recipe, built from the info ramp, overrides its neutral.
const INFO_BADGE_CLASS =
  "bg-info/10 text-info-900 border-info/20 dark:bg-info/15 dark:text-info-300 dark:border-info/30";

const INDICATOR_ICON_CLASS: Record<Tone, string> = {
  warning: "text-warning",
  info: "text-info",
  danger: "text-danger",
};

export function AttentionBadge({
  reason,
  display = "label",
  size = "sm",
  label,
  decorative = false,
  className,
  ...props
}: AttentionBadgeProps) {
  const { tone, Icon, label: defaultLabel } = REASONS[reason];
  const text = label?.trim() || defaultLabel;

  if (display === "indicator") {
    return (
      <span
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": text })}
        {...props}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-surface p-0.5",
          INDICATOR_ICON_CLASS[tone],
          className,
        )}
      >
        <Icon aria-hidden="true" className={ICON_SIZE_CLASS[size]} />
      </span>
    );
  }

  return (
    <Badge
      variant={tone === "info" ? "neutral" : tone}
      size={size}
      className={cn("shrink-0 whitespace-nowrap", tone === "info" && INFO_BADGE_CLASS, className)}
      {...props}
    >
      <Icon aria-hidden="true" />
      {text}
    </Badge>
  );
}
