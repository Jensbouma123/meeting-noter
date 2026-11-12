import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";

export type KbdProps = HTMLAttributes<HTMLElement>;

export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd(
  { className, ...props },
  ref,
) {
  return (
    <kbd
      ref={ref}
      className={cn(
        "inline-block rounded border border-border bg-elevation-2 px-2 py-0.5 font-mono leading-normal text-foreground",
        TEXT_SIZE.xxs,
        className,
      )}
      {...props}
    />
  );
});
