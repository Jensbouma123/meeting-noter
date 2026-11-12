import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ChangeEvent,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
} from "react";
import { composeSlotProps } from "@/lib/slot-props";
import { cn } from "@/lib/utils";
import { HIGHLIGHT_RING, INTERACTIVE_AFFORDANCE, SELECTED_SURFACE, paddingClasses, surfaceClasses, type CardSurface } from "@/components/ui/Card/cardClasses";
import type { CardProps } from "@/components/ui/Card/types";

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    interactive = false,
    padding = "md",
    className,
    children,
    href,
    target,
    rel,
    asChild = false,
    selected,
    onSelectedChange,
    selectionMode = "single",
    name,
    value,
    disabled = false,
    highlighted = false,
    ...props
  },
  ref,
) {
  const surface: CardSurface = variant === "interactive" ? "default" : variant;
  const isLink = typeof href === "string";
  const carriesAffordance = interactive || variant === "interactive" || isLink || asChild;

  const surfaceClassName = cn(
    "relative rounded-xl transition-all motion-feedback",
    surfaceClasses[surface],
    paddingClasses[padding],
    carriesAffordance && INTERACTIVE_AFFORDANCE,
    highlighted && HIGHLIGHT_RING,
    className,
  );

  if (variant === "selectable") {
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onSelectedChange?.(event.currentTarget.checked);
    };

    return (
      <label
        ref={ref as unknown as Ref<HTMLLabelElement>}
        className={cn("relative block", disabled ? "cursor-not-allowed" : "cursor-pointer")}
        {...(props as HTMLAttributes<HTMLLabelElement>)}
      >
        <input
          type={selectionMode === "multiple" ? "checkbox" : "radio"}
          name={name}
          value={value}
          checked={selected}
          disabled={disabled}
          onChange={handleChange}
          className="peer sr-only"
        />
        <span
          className={cn(
            "relative block rounded-xl transition-all motion-feedback focus-within:outline-none",
            surfaceClasses.selectable,
            paddingClasses[padding],
            !disabled && INTERACTIVE_AFFORDANCE,
            highlighted && !selected && HIGHLIGHT_RING,
            "peer-checked:border-primary-500 peer-checked:ring-1 peer-checked:ring-primary-500 peer-checked:bg-primary-500/10",
            "dark:peer-checked:border-primary-400 dark:peer-checked:ring-primary-400 dark:peer-checked:bg-primary-400/15",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
            selected && SELECTED_SURFACE,
            className,
          )}
        >
          {children}
        </span>
      </label>
    );
  }

  if (asChild) {
    if (!isValidElement(children)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Card] `asChild` requires exactly one React element child to merge into.");
      }
      return null;
    }
    const child = children as ReactElement<Record<string, unknown>>;
    return cloneElement(child, {
      ...composeSlotProps(child.props, props),
      ref,
      className: cn("focus-ring", surfaceClassName, child.props.className as string | undefined),
    });
  }

  if (isLink) {
    return (
      <a
        ref={ref as unknown as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        // An external target without `rel` leaks window.opener to the destination.
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        className={cn("focus-ring block", surfaceClassName)}
        {...(props as HTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <div ref={ref} className={surfaceClassName} {...props}>
      {children}
    </div>
  );
});
