"use client";

import { Loader2 } from "lucide-react";
import { cloneElement, forwardRef, isValidElement, useCallback, useRef, type AnchorHTMLAttributes, type MouseEventHandler, type MutableRefObject, type ReactElement, type ReactNode } from "react";
import { useMissingLabelWarning } from "@/lib/a11y-dev";
import { useLongPress } from "@/lib/use-long-press";
import { inertClick, withTooltip } from "@/components/ui/Button/ButtonParts";
import { chainClick, chainPress } from "@/components/ui/Button/pressHandlers";
import { buttonRootClass } from "@/components/ui/Button/classes";
import { composeSlotProps } from "@/lib/slot-props";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/Button/types";
import { useButtonWarning } from "@/components/ui/Button/useButtonWarning";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    leadingIcon,
    trailingIcon,
    iconOnly = false,
    tooltip,
    children,
    href,
    target,
    rel,
    download,
    asChild = false,
    onClick,
    onLongPress,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const hasTooltip = typeof tooltip === "string" && tooltip.trim().length > 0;
  useButtonWarning(iconOnly, hasTooltip);

  // Loading always keeps exactly one icon slot occupied by the spinner: the side that
  // actually has an icon, defaulting to leading when both or neither are set.
  const spinnerTrailing = loading && !leadingIcon && Boolean(trailingIcon);
  const spinner = <Loader2 className="animate-spin" aria-hidden="true" />;
  const leadingSlot = loading && !spinnerTrailing ? spinner : leadingIcon;
  const trailingSlot = spinnerTrailing ? spinner : loading ? null : trailingIcon;

  const inert = Boolean(disabled) || loading;
  const innerRef = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node as HTMLButtonElement | null);
      else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node as HTMLButtonElement | null;
    },
    [ref],
  );
  useMissingLabelWarning("Button", innerRef);
  const press = useLongPress(Boolean(onLongPress) && !inert, () => onLongPress?.());
  const pressProps = onLongPress ? chainPress(press, props) : undefined;
  const handleClick = onLongPress ? chainClick(press, onClick) : onClick;

  const rootClassName = buttonRootClass(variant, size, iconOnly, className);
  const shownTooltip = hasTooltip ? tooltip : undefined;
  const label = ariaLabel ?? (iconOnly ? tooltip : undefined);

  if (asChild) {
    if (!isValidElement(children)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Button] `asChild` requires exactly one React element child to merge into.");
      }
      return null;
    }
    const child = children as ReactElement<Record<string, unknown>>;
    return withTooltip(
      cloneElement(child, {
        ...composeSlotProps(child.props, { ...props, ...pressProps, onClick: handleClick }),
        ref: setRef,
        className: cn(rootClassName, child.props.className as string | undefined),
        "aria-label": label ?? (child.props["aria-label"] as string | undefined),
        "aria-busy": loading || undefined,
        "aria-disabled": inert || undefined,
        tabIndex: inert ? -1 : (child.props.tabIndex as number | undefined),
        ...(inert && { onClick: inertClick }),
        children: (
          <>
            {leadingSlot}
            {child.props.children as ReactNode}
            {trailingSlot}
          </>
        ),
      }),
      shownTooltip,
      !!onLongPress,
    );
  }
  if (typeof href === "string") {
    // An external target without `rel` leaks window.opener to the destination.
    return withTooltip(
      <a
        ref={setRef}
        href={inert ? undefined : href}
        target={target}
        rel={rel ?? (target === "_blank" ? "noopener noreferrer" : undefined)}
        download={download}
        role={inert ? "link" : undefined}
        tabIndex={inert ? -1 : undefined}
        aria-busy={loading || undefined}
        aria-disabled={inert || undefined}
        aria-label={label}
        onClick={inert ? inertClick : (handleClick as MouseEventHandler<HTMLAnchorElement> | undefined)}
        className={rootClassName}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        {...(pressProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {leadingSlot}
        {children}
        {trailingSlot}
      </a>,
      shownTooltip,
      !!onLongPress,
    );
  }
  return withTooltip(
    <button
      ref={setRef}
      disabled={inert}
      aria-busy={loading || undefined}
      aria-label={label}
      onClick={handleClick as MouseEventHandler<HTMLButtonElement> | undefined}
      className={rootClassName}
      {...props}
      {...pressProps}
    >
      {leadingSlot}
      {children}
      {trailingSlot}
    </button>,
    shownTooltip,
    !!onLongPress,
  );
});
