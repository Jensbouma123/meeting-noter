import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { INSET_PADDING, SPACING_GAP } from "@/components/ui/Stack/index";
import { SectionHeader } from "@/components/ui/Section/SectionParts";
import type { SectionProps } from "@/components/ui/Section/SectionTypes";

export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  {
    title,
    description,
    actions,
    level = 2,
    headerSize = "lg",
    spacing = "md",
    inset = "none",
    className,
    children,
    ...props
  },
  ref,
) {
  const headingId = props.id ? `${props.id}-heading` : undefined;
  const hasHeader = Boolean(title || description || actions);

  return (
    <section
      ref={ref}
      className={cn(
        "flex flex-col",
        SPACING_GAP[spacing],
        INSET_PADDING[inset],
        className,
      )}
      aria-labelledby={title && headingId ? headingId : undefined}
      {...props}
    >
      {hasHeader && (
        <SectionHeader
          title={title}
          description={description}
          actions={actions}
          level={level}
          headerSize={headerSize}
          headingId={headingId}
        />
      )}
      {children && <div>{children}</div>}
    </section>
  );
});
