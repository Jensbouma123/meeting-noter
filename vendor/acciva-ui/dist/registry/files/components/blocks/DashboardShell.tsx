"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppShell, MAIN_ID, SkipLink } from "@/components/blocks/AppShell";
import { NavHeader } from "@/components/blocks/NavHeader";
import { Sidebar, type SidebarItem } from "@/components/blocks/Sidebar";
import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface DashboardShellProps {
  /** Convenience default: builds the built-in `Sidebar` from a flat item list. Ignored when `sidebar` is given. */
  sidebarItems?: SidebarItem[];
  /** Renders in place of the built-in `Sidebar`, e.g. a custom icon rail. Takes precedence over `sidebarItems`. */
  sidebar?: ReactNode;
  children: ReactNode;
  header?: ReactNode;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  className?: string;
  mainClassName?: string;
  /** Set `false` to omit the injected floating mobile nav trigger. Defaults to `true`. */
  showMobileTrigger?: boolean;
  /** Set `false` to omit the default `p-4 sm:p-6 lg:p-8` main padding. Defaults to `true`. */
  mainPadding?: boolean;
}

export function DashboardShell({
  sidebarItems,
  sidebar,
  children,
  header,
  mobileOpen,
  onMobileOpenChange,
  className,
  mainClassName,
  showMobileTrigger = true,
  mainPadding = true,
}: DashboardShellProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = mobileOpen !== undefined;
  const isMobileOpen = isControlled ? mobileOpen : internalOpen;

  const handleMobileOpen = () => {
    if (onMobileOpenChange) {
      onMobileOpenChange(true);
    } else {
      setInternalOpen(true);
    }
  };

  const handleMobileClose = () => {
    if (onMobileOpenChange) {
      onMobileOpenChange(false);
    } else {
      setInternalOpen(false);
    }
  };

  return (
    <HStack spacing="none" align="stretch" className={cn("min-h-screen bg-background", className)}>
      <SkipLink />
      {sidebar ?? (
        <Sidebar
          items={sidebarItems ?? []}
          mobileOpen={isMobileOpen}
          onMobileClose={handleMobileClose}
        />
      )}
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        {header ? (
          <VStack spacing="none" className="min-h-screen">
            {header}
            <main id={MAIN_ID} tabIndex={-1} className={cn("flex-1 focus:outline-none", mainPadding && "p-4 sm:p-6 lg:p-8", mainClassName)}>
              {children}
            </main>
          </VStack>
        ) : (
          <AppShell skipLink={false}>
            {children}
          </AppShell>
        )}
        {/* Fixed-positioned, so DOM order is free: after the header keeps Tab order top-to-bottom (SC 2.4.3). */}
        {showMobileTrigger ? (
          <div className="fixed bottom-6 left-6 z-30 lg:hidden">
            <Button
              variant="secondary"
              size="md"
              iconOnly
              tooltip="Open navigation"
              onClick={handleMobileOpen}
              className="shadow-lg touch-target-44"
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
          </div>
        ) : null}
      </div>
    </HStack>
  );
}
