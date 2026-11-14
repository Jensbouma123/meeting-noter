"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type Ref,
  type ReactElement,
  type ReactNode,
} from "react";
import { mergeRefs } from "@/lib/mergeRefs";
import { composeSlotProps } from "@/lib/slot-props";
import { cn } from "@/lib/utils";

export interface ListItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** Primary line, rendered as text. */
  title: string;
  /** Secondary muted line; omitted renders a single-line row. */
  subtitle?: string;
  /** Leading slot: icon, avatar, or check glyph. Must be inert. */
  leading?: ReactNode;
  /** Trailing slot: chip, badge, count, or chevron. Must be inert. */
  trailing?: ReactNode;
  /** Single-select state: selected fill + `aria-current` (`"page"` in link mode). Ignored when `checked` is set. */
  selected?: boolean;
  /** Multi-select state: switches the row to `role="checkbox"` with `aria-checked`. Wins over `selected`. Button mode only. */
  checked?: boolean;
  /** Outline indent levels; each level is one `xl` spacing step. */
  depth?: number;
  /**
   * Link mode: merge the row onto its single child element (an `<a>` or router `Link`)
   * instead of rendering a `<button>`. The row content replaces the child's children.
   */
  asChild?: boolean;
  /**
   * `rail` is an icon-only square row: only `leading` shows, `title` becomes the accessible
   * name (and the visually-hidden text), `subtitle`/`trailing`/`depth` are not rendered.
   */
  density?: "default" | "rail";
}

const rowClass = cn(
  "focus-ring motion-feedback flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
  "hover:bg-primary-500/8 dark:hover:bg-primary-400/15",
  "active:bg-primary-500/15",
  "disabled:cursor-not-allowed disabled:opacity-60",
);
// Square 44px target (SC 2.5.8), icon centred; no padding so the square stays square.
const railClass = "size-11 min-h-11 w-11 justify-center gap-0 px-0 py-0";
const activeClass = "bg-primary-500/10 dark:bg-primary-500/15";

export const ListItem = forwardRef<HTMLButtonElement, ListItemProps>(function ListItem(
  {
    title,
    subtitle,
    leading,
    trailing,
    selected,
    checked,
    depth = 0,
    density = "default",
    asChild = false,
    type = "button",
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const rail = density === "rail";
  const rowStyle = {
    // Token-derived indent: one xl spacing step (6 units) per outline level.
    paddingInlineStart: !rail && depth > 0 ? `calc(var(--spacing) * 6 * ${depth} + var(--spacing) * 3)` : undefined,
    ...style,
  };
  const content = rail ? (
    <>
      {leading ? <span aria-hidden="true" className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="sr-only">{title}</span>
    </>
  ) : (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </>
  );

  if (asChild) {
    if (!isValidElement(children)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[ListItem] `asChild` requires exactly one React element child to merge into.");
      }
      return null;
    }
    const child = children as ReactElement<Record<string, unknown>>;
    // A link row is navigation, not a form control: `type`, `disabled` and `checked` stay off it.
    const { disabled: _disabled, ...linkRest } = rest;
    return cloneElement(child, {
      ...composeSlotProps(child.props, linkRest),
      ref: mergeRefs<HTMLElement>(ref as Ref<HTMLElement>, child.props.ref as Ref<HTMLElement> | undefined),
      "aria-current": selected ? "page" : (child.props["aria-current"] as string | undefined),
      "data-selected": selected || undefined,
      className: cn(rowClass, rail && railClass, selected && activeClass, className, child.props.className as string | undefined),
      style: { ...rowStyle, ...(child.props.style as object | undefined) },
      children: content,
    });
  }

  const checkable = checked !== undefined;
  const isActive = checkable ? checked : selected === true;

  return (
    <button
      ref={ref}
      type={type}
      role={checkable ? "checkbox" : undefined}
      aria-checked={checkable ? checked : undefined}
      aria-current={!checkable && selected ? "true" : undefined}
      data-selected={isActive || undefined}
      className={cn(rowClass, rail && railClass, isActive && activeClass, className)}
      style={rowStyle}
      {...rest}
    >
      {content}
    </button>
  );
});
