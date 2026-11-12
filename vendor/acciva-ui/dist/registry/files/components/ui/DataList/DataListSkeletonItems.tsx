import type { ReactNode } from "react";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import type { DataListLayout } from "@/components/ui/DataList/types";

interface DataListSkeletonItemsProps {
  count: number;
  layout: DataListLayout;
  renderSkeleton?: (index: number) => ReactNode;
}

export function DataListSkeletonItems({ count, layout, renderSkeleton }: DataListSkeletonItemsProps) {
  const skeletons: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(
      <div
        key={`skeleton-${i}`}
        className={cn(
          "rounded-xl border border-border/50 bg-surface/50 p-4 animate-pulse",
          layout === "grid" ? "h-44" : "h-20",
        )}
      >
        {renderSkeleton ? (
          renderSkeleton(i)
        ) : (
          <VStack spacing="md">
            <HStack spacing="md">
              <div className="size-10 rounded-full bg-muted-foreground/20 shrink-0" />
              <div className="flex flex-col gap-2 w-full">
                <div className="h-4 w-1/3 rounded bg-muted-foreground/20" />
                <div className="h-3 w-1/2 rounded bg-muted-foreground/15" />
              </div>
            </HStack>
            <div className="h-3 w-4/5 rounded bg-muted-foreground/10" />
          </VStack>
        )}
      </div>,
    );
  }
  return skeletons;
}
