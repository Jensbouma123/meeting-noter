import { forwardRef } from "react";
import { FRAME_MAX_WIDTH } from "@/lib/layout-tokens";
import { cn } from "@/lib/utils";
import { Heading } from "@/components/ui/Heading/index";
import type { PageHeaderProps } from "@/components/ui/PageHeader/types";

export const PageHeader = forwardRef<HTMLElement, PageHeaderProps>(function PageHeader(
  { title, description, eyebrow, actions, maxWidth = "3xl", className, ...props },
  ref,
) {
  return (
    <header
      ref={ref}
      className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}
      {...props}
    >
      <div className={cn("flex min-w-0 flex-col gap-1", FRAME_MAX_WIDTH[maxWidth])}>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <Heading level={1} size="3xl">
          {title}
        </Heading>
        {description && <p className="text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
});
