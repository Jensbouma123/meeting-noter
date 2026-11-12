import type { ReactNode } from "react";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import type { BottomNavHideAt } from "@/components/ui/BottomNav/BottomNavTypes";
import { NavHeader, type NavSearchItem } from "@/components/blocks/NavHeader";

export interface AppShellProps {
  children: ReactNode;
  /** Replaces the default `<NavHeader />`. Omit to keep today's hardcoded header. */
  header?: ReactNode;
  /** Forwarded to the default `<NavHeader />` as its `searchItems`; ignored when `header` is given. */
  searchItems?: NavSearchItem[];
  /** Renders beside `<main>`, e.g. an icon rail or `Sidebar`. Alias for `startAside`; omitted by default. */
  sidebar?: ReactNode;
  /** Renders before `<main>`, outside its padding. Takes precedence over `sidebar` when both are given. */
  startAside?: ReactNode;
  /** Renders after `<main>`, outside its padding, e.g. a contextual/inspector rail. Omitted by default. */
  endAside?: ReactNode;
  /** Set `false` to omit the leading "Skip to main content" link, e.g. when a parent shell renders its own. Defaults to `true`. */
  skipLink?: boolean;
  /** A `BottomNav`, rendered last. `<main>` gets bottom padding for the bar (SC 2.4.11). */
  bottomNav?: ReactNode;
  /** A `BottomNavDrawer`, rendered after `<main>` and before `bottomNav`. Ignored without `bottomNav`. */
  bottomDrawer?: ReactNode;
  /** Must match the `BottomNav`'s `hideAt` (default `"md"`): from that breakpoint the bottom padding drops back to the plain `<main>` padding. */
  bottomNavHideAt?: BottomNavHideAt;
}

const MAIN_PADDING = "p-4 sm:p-6 lg:p-8";
// With a bar, the bottom padding clears `--safe-bottom-nav` + `--bottom-nav-drawer-peek` and
// `bottomNavHideAt` hands it back to the plain padding at the bar's breakpoint (mobile-first).
const MAIN_PADDING_WITH_NAV =
  "px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 pb-safe-nav-drawer scroll-pb-safe-nav-drawer";
export const NAV_HIDE_PADDING: Record<BottomNavHideAt, string> = {
  never: "",
  sm: "sm:pb-6 sm:scroll-pb-0 lg:pb-8",
  md: "md:pb-6 md:scroll-pb-0 lg:pb-8",
  lg: "lg:pb-8 lg:scroll-pb-0",
  xl: "xl:pb-8 xl:scroll-pb-0",
};

export const MAIN_ID = "main";

/** First tab stop: jumps past the header/nav to `<main id="main">` (SC 2.4.1). */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_ID}`}
      className="focus-ring sr-only rounded-md bg-surface px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to main content
    </a>
  );
}

export function AppShell({
  children,
  header,
  searchItems,
  sidebar,
  startAside,
  endAside,
  skipLink = true,
  bottomNav,
  bottomDrawer,
  bottomNavHideAt = "md",
}: AppShellProps) {
  const resolvedStartAside = startAside ?? sidebar;
  const hasAside = Boolean(resolvedStartAside || endAside);

  const main = (
    <main
      id={MAIN_ID}
      tabIndex={-1}
      className={cn("flex-1 focus:outline-none", bottomNav ? [MAIN_PADDING_WITH_NAV, NAV_HIDE_PADDING[bottomNavHideAt]] : MAIN_PADDING, hasAside ? "min-w-0" : undefined)}
    >
      {children}
    </main>
  );

  return (
    <VStack spacing="none" className="min-h-screen bg-background">
      {skipLink ? <SkipLink /> : null}
      {header ?? <NavHeader searchItems={searchItems} />}
      {hasAside ? (
        <HStack spacing="none" align="stretch" className="min-h-0 flex-1">
          {resolvedStartAside}
          {main}
          {endAside}
        </HStack>
      ) : (
        main
      )}
      {/* DOM order = visual stack: page → drawer → bar (SC 1.3.2, 2.4.3). */}
      {bottomNav ? bottomDrawer : null}
      {bottomNav}
    </VStack>
  );
}
