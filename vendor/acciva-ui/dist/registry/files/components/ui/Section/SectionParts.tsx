import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Heading } from "@/components/ui/Heading/index";
import type { SectionHeaderSize } from "@/components/ui/Section/SectionTypes";

const DESCRIPTION_TEXT: Record<SectionHeaderSize, string> = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-sm",
  "2xl": "text-base",
};

interface SectionHeaderProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level: 2 | 3 | 4;
  headerSize: SectionHeaderSize;
  headingId?: string;
}

export function SectionHeader({
  title,
  description,
  actions,
  level,
  headerSize,
  headingId,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {Boolean(title || description) && (
        <div className="flex flex-col gap-1">
          {title && (
            <Heading id={headingId} level={level} size={headerSize} weight="semibold">
              {title}
            </Heading>
          )}
          {description && (
            <p className={cn(DESCRIPTION_TEXT[headerSize], "text-muted-foreground")}>
              {description}
            </p>
          )}
        </div>
      )}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
