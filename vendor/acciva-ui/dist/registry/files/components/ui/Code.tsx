import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** `plain` inherits the surrounding size and recolours; `pill` is a bordered chip. */
export type CodeVariant = "plain" | "pill";

const VARIANT_CLASS: Record<CodeVariant, string> = {
  plain: "text-link-foreground",
  pill: "rounded border border-border bg-elevation-2 px-1.5 py-0.5 text-foreground",
};

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /** Plain coloured text, or a bordered pill. */
  variant?: CodeVariant;
}

export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { variant = "plain", className, ...props },
  ref,
) {
  return (
    <code
      ref={ref}
      className={cn("font-mono break-words", VARIANT_CLASS[variant], className)}
      {...props}
    />
  );
});
