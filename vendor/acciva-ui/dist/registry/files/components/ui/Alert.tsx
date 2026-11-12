"use client";

import { X } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/index";
import { cn } from "@/lib/utils";
import {
  type SemanticVariant,
  VARIANT_ACCENT_BAR,
  VARIANT_ACCENT_TEXT,
  VARIANT_ICON,
  VARIANT_POLITENESS,
  VARIANT_TINT_BG,
} from "@/components/ui/variant-tokens";

export type AlertVariant = SemanticVariant;
export type AlertLiveRole = "alert" | "status";
export type AlertLayout = "card" | "banner" | "inline";

// Layout changes the box, never the semantics: the live-region role, the decorative icon and
// the `text-foreground` body copy (the pairing measured for SC 1.4.3) are identical in all three.
// The box is `relative overflow-hidden` so the straight accent bar below is clipped to the
// rounded corners instead of bending along them. Padding on the bar's side is widened by the
// bar's width so the content sits where it did when the bar was a border.
const LAYOUT_BOX: Record<AlertLayout, string> = {
  card: "relative gap-3 overflow-hidden rounded-xl py-4 pr-4 pl-5",
  banner: "relative gap-3 overflow-hidden rounded-none px-4 py-3",
  inline: "relative gap-2 overflow-hidden rounded-lg py-2 pr-3 pl-3.5",
};

const LAYOUT_BAR: Record<AlertLayout, string> = {
  card: "inset-y-0 left-0 w-1",
  banner: "inset-x-0 bottom-0 h-px",
  inline: "inset-y-0 left-0 w-0.5",
};

const LAYOUT_ICON_SIZE: Record<AlertLayout, string> = {
  card: "size-5",
  banner: "size-5",
  inline: "size-4",
};

const LAYOUT_TITLE_TEXT: Record<AlertLayout, string> = {
  card: "font-semibold text-foreground",
  banner: "font-semibold text-foreground",
  inline: "text-xs font-semibold text-foreground",
};

const LAYOUT_BODY_TEXT: Record<AlertLayout, string> = {
  card: "text-sm text-foreground",
  banner: "text-sm text-foreground",
  inline: "text-xs text-foreground",
};

// Errors/urgent interruptions must interrupt (assertive); confirmations and
// non-urgent updates should not (polite) — derived from the same politeness map Toast
// uses, so the two components never drift on which variants are urgent.
function politenessToRole(politeness: "polite" | "assertive"): AlertLiveRole {
  return politeness === "assertive" ? "alert" : "status";
}

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  layout?: AlertLayout;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;
  role?: AlertLiveRole;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    className,
    variant = "info",
    layout = "card",
    title,
    children,
    icon,
    dismissible = false,
    onDismiss,
    action,
    role,
    ...props
  },
  ref,
) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      ref={ref}
      role={role ?? politenessToRole(VARIANT_POLITENESS[variant])}
      className={cn("flex", LAYOUT_BOX[layout], VARIANT_TINT_BG[variant], className)}
      {...props}
    >
      <span aria-hidden="true" className={cn("absolute", LAYOUT_BAR[layout], VARIANT_ACCENT_BAR[variant])} />
      <span aria-hidden="true" className={cn("shrink-0", VARIANT_ACCENT_TEXT[variant])}>
        {icon ?? <Icon className={LAYOUT_ICON_SIZE[layout]} />}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className={LAYOUT_TITLE_TEXT[layout]}>{title}</p> : null}
        <div className={LAYOUT_BODY_TEXT[layout]}>{children}</div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
      {dismissible ? (
        <Button iconOnly tooltip="Dismiss" variant="ghost" size="xs" onClick={onDismiss} className="-m-1 shrink-0">
          <X />
        </Button>
      ) : null}
    </div>
  );
});
