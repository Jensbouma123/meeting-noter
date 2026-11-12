"use client";

import { createContext, useContext } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";
import type { TabsOrientation, TabsVariant } from "@/components/ui/Tabs/types";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
  size: ResponsiveSize<SizeTier>;
  variant: TabsVariant;
  orientation: TabsOrientation;
  draggable: boolean;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be used within <Tabs>`);
  return ctx;
}
