import { Inbox } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptyStateSize = "sm" | "md";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  /**
   * `"sm"` is the dense in-panel treatment, `"md"` the full-page one. It moves
   * padding, icon, and type together, so it is one tier — not a flag.
   */
  size?: EmptyStateSize;
  /**
   * @deprecated Use `size="sm"`. Kept working so no caller breaks; it loses to
   * `size` when both are set and will be removed in a future major.
   */
  compact?: boolean;
}

const ROOT_PADDING: Record<EmptyStateSize, string> = {
  sm: "py-6 px-4",
  md: "py-12 px-6",
};

const ICON_FRAME: Record<EmptyStateSize, string> = {
  sm: "size-10 mb-3",
  md: "size-14 mb-4",
};

const ICON_SIZE: Record<EmptyStateSize, string> = {
  sm: "size-5",
  md: "size-7",
};

const TITLE_TEXT: Record<EmptyStateSize, string> = {
  sm: "text-sm",
  md: "text-base sm:text-lg",
};

const DESCRIPTION_TEXT: Record<EmptyStateSize, string> = {
  sm: "text-xs",
  md: "text-sm",
};

const ACTIONS_MARGIN: Record<EmptyStateSize, string> = {
  sm: "mt-4",
  md: "mt-6",
};

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  {
    icon,
    title,
    description,
    action,
    secondaryAction,
    size,
    compact = false,
    className,
    ...props
  },
  ref,
) {
  const resolvedSize: EmptyStateSize = size ?? (compact ? "sm" : "md");

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        ROOT_PADDING[resolvedSize],
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-2xl bg-elevation-2 text-muted-foreground",
          ICON_FRAME[resolvedSize],
        )}
      >
        {icon ?? <Inbox className={ICON_SIZE[resolvedSize]} />}
      </div>

      <h3 className={cn("font-semibold text-foreground tracking-tight", TITLE_TEXT[resolvedSize])}>
        {title}
      </h3>

      {description ? (
        <p className={cn("text-muted-foreground max-w-sm mt-1.5", DESCRIPTION_TEXT[resolvedSize])}>
          {description}
        </p>
      ) : null}

      {(action || secondaryAction) ? (
        <div className={cn("flex flex-wrap items-center justify-center gap-3", ACTIONS_MARGIN[resolvedSize])}>
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
});
