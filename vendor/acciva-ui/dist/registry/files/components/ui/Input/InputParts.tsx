import type { ReactNode } from "react";
import {
  CONTROL_HEIGHT,
  ICON_SCALE_CLASS,
  INPUT_ICON_INSET,
  INPUT_PADDING_X,
  TEXT_SIZE,
  resolveResponsive,
  type ResponsiveSize,
  type SizeTier,
} from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { ADDON_RADIUS_LEADING, ADDON_RADIUS_TRAILING } from "@/components/ui/Input/constants";

interface InputLabelProps {
  id: string;
  label: string;
  required?: boolean;
  size: ResponsiveSize<SizeTier>;
}

export function InputLabel({ id, label, required, size }: InputLabelProps) {
  return (
    <label htmlFor={id} className={cn("font-medium text-foreground", resolveResponsive(size, TEXT_SIZE))}>
      {label}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
}

interface InputAddonProps {
  id?: string;
  side: "leading" | "trailing";
  size: ResponsiveSize<SizeTier>;
  disabled?: boolean;
  children: ReactNode;
}

export function InputAddon({ id, side, size, disabled, children }: InputAddonProps) {
  const radius = side === "leading" ? ADDON_RADIUS_LEADING : ADDON_RADIUS_TRAILING;
  return (
    <span
      id={id}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap border border-border bg-elevation-2 text-muted-foreground",
        resolveResponsive(size, CONTROL_HEIGHT),
        resolveResponsive(size, INPUT_PADDING_X),
        resolveResponsive(size, TEXT_SIZE),
        resolveResponsive(size, ICON_SCALE_CLASS),
        disabled && "opacity-60",
        resolveResponsive(size, radius),
        side === "leading" ? "-mr-px" : "-ml-px",
      )}
    >
      {children}
    </span>
  );
}

export function InputLeadingIcon({ size, children }: { size: ResponsiveSize<SizeTier>; children: ReactNode }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
        resolveResponsive(size, INPUT_ICON_INSET),
        resolveResponsive(size, ICON_SCALE_CLASS),
      )}
    >
      {children}
    </span>
  );
}

interface InputMessagesProps {
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
  /** Set only while the character counter is shown. */
  charCountId?: string;
  count: number;
  maxLength?: number;
}

export function InputMessages({ hint, error, hintId, errorId, charCountId, count, maxLength }: InputMessagesProps) {
  return (
    <HStack justify="between" spacing="sm">
      <div className="min-w-0 flex-1">
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger animate-fade-in">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>

      {charCountId ? (
        <span
          id={charCountId}
          aria-live="polite"
          className={cn(
            "shrink-0 text-xs font-mono tabular-nums",
            maxLength !== undefined && count > maxLength ? "font-semibold text-danger" : "text-muted-foreground",
          )}
        >
          {count}
          {maxLength !== undefined ? ` / ${maxLength}` : ""}
        </span>
      ) : null}
    </HStack>
  );
}
