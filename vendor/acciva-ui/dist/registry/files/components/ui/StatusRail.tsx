import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type StatusRailTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StatusRailOrientation = "vertical" | "horizontal";

export interface StatusRailProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  tone?: StatusRailTone;
  orientation?: StatusRailOrientation;
  /** `vertical` only — insets the bar from the parent's top and bottom by one spacing step. */
  inset?: boolean;
}

const toneClasses: Record<StatusRailTone, string> = {
  neutral: "bg-border-control",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/**
 * Decorative edge accent. The parent must be `relative`. It is always `aria-hidden`, so the state
 * it signals must also be text or a named icon in the same surface (SC 1.4.1).
 */
export function StatusRail({
  tone = "neutral",
  orientation = "vertical",
  inset = true,
  className,
  ...props
}: StatusRailProps) {
  return (
    <span
      {...props}
      aria-hidden="true"
      role={undefined}
      className={cn(
        "pointer-events-none absolute",
        toneClasses[tone],
        orientation === "vertical"
          ? cn("start-0 w-status-rail", inset ? "inset-y-1" : "inset-y-0")
          : "inset-x-0 top-0 h-status-rail",
        className,
      )}
    />
  );
}
