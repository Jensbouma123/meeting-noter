import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { CardHeaderProps } from "@/components/ui/Card/types";

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, children, action, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("flex items-start justify-between gap-4 pb-3", className)} {...props}>
      <div className="space-y-1 min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
});

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, children, ...props },
  ref,
) {
  return (
    <h3 ref={ref} className={cn("text-base sm:text-lg font-semibold text-foreground tracking-tight", className)} {...props}>
      {children}
    </h3>
  );
});

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, children, ...props }, ref) {
    return (
      <p ref={ref} className={cn("text-xs sm:text-sm text-muted-foreground", className)} {...props}>
        {children}
      </p>
    );
  },
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("text-sm text-foreground", className)} {...props}>
      {children}
    </div>
  );
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("flex items-center justify-between gap-3 pt-4 border-t border-border/60", className)} {...props}>
      {children}
    </div>
  );
});
