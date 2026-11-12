"use client";

import { useId, type ReactNode } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";
import type { TabsOrientation, TabsVariant } from "@/components/ui/Tabs/types";
import { TabsContext } from "@/components/ui/Tabs/useTabsContext";

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  size?: ResponsiveSize<SizeTier>;
  variant?: TabsVariant;
  orientation?: TabsOrientation;
  /** Horizontal only: a drag starting on the selected tab slides the selection. */
  draggable?: boolean;
}

export function Tabs({
  value,
  onValueChange,
  children,
  className,
  size = "md",
  variant = "pill",
  orientation = "horizontal",
  draggable = true,
}: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, baseId, size, variant, orientation, draggable }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}
