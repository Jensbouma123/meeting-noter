import type { MouseEvent, MouseEventHandler } from "react";
import type { useLongPress } from "@/lib/use-long-press";

type Press = ReturnType<typeof useLongPress>;
type Handler = (e: never) => void;

const KEYS = ["onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onContextMenu"] as const;

/** Long-press handlers chained after the caller's own pointer handlers (`own` = the rest props). */
export function chainPress(press: Press, own: object) {
  return Object.fromEntries(
    KEYS.map((key) => [
      key,
      (e: never) => {
        (own as Record<string, Handler | undefined>)[key]?.(e);
        (press[key] as Handler)(e);
      },
    ]),
  );
}

/** The click that follows a fired long press is dropped (SC 2.5.2). */
export function chainClick(press: Press, onClick: unknown) {
  return (e: MouseEvent<HTMLElement>) => {
    if (press.consumeClick()) {
      e.preventDefault();
      return;
    }
    (onClick as MouseEventHandler<HTMLElement> | undefined)?.(e);
  };
}
