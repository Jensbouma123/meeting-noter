"use client";

import type { ReactNode } from "react";
import { DropdownMenuContext } from "@/components/ui/DropdownMenu/DropdownMenuContext";
import { useDropdownMenuState } from "@/components/ui/DropdownMenu/useDropdownMenuState";

export interface DropdownMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const value = useDropdownMenuState(controlledOpen, defaultOpen, onOpenChange);

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownMenuContext.Provider>
  );
}
