import type { MouseEvent, ReactElement } from "react";
import { Tooltip } from "@/components/ui/Tooltip/index";

/** Wraps the element in a tooltip. `tooltip` arrives already gated on a real label. */
export function withTooltip(element: ReactElement, tooltip: string | undefined, ownsLongPress: boolean): ReactElement {
  if (tooltip === undefined) return element;
  return <Tooltip content={tooltip} longPress={!ownsLongPress}>{element}</Tooltip>;
}

// An <a> cannot be `disabled`; it is taken out of the tab order and its activation is
// swallowed instead, so a loading/disabled link is inert for pointer AND keyboard users.
export function inertClick(event: MouseEvent<HTMLElement>): void {
  event.preventDefault();
}
