"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";
import { Logo } from "@/components/ui/Logo/index";
import { cn } from "@/lib/utils";
import { useThemeMode } from "@jensbouma123/acciva-ui/theme";
import { NAV_IDLE, NO_SEARCH_ITEMS, PRIMARY_NAV_LINKS, resolveNavLinkActive } from "@/components/blocks/NavHeader/NavHeaderData";
import { NavHeaderDrawer } from "@/components/blocks/NavHeader/NavHeaderDrawer";
import { NavHeaderMenuToggle } from "@/components/blocks/NavHeader/NavHeaderParts";
import { NavHeaderSearch } from "@/components/blocks/NavHeader/NavHeaderSearch";
import type { NavHeaderProps } from "@/components/blocks/NavHeader/NavHeaderProps";

export type { NavHeaderProps };
export type { NavSearchItem, PrimaryNavIcon, PrimaryNavLink } from "@/components/blocks/NavHeader/NavHeaderData";

export function NavHeader({
  logo,
  primaryLinks,
  actions,
  searchItems = NO_SEARCH_ITEMS,
  search = true,
  themeToggle = true,
  menu = true,
  startActions,
  homeHref = "/",
  brandLabel = "ACCIVA UI",
}: NavHeaderProps = {}) {
  const { toggleMode } = useThemeMode();
  const pathname = usePathname();
  const navLinks = primaryLinks ?? PRIMARY_NAV_LINKS;
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerId = useId();

  // A route change dismisses the drawer. It is a transition derived from a changed
  // value, not a synchronisation with an external system, so it runs in the render
  // phase — an effect would paint the new route with the drawer still up for a frame
  // and trips `react-hooks/set-state-in-effect`.
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background backdrop-blur-sm">
      {/* `sm:gap-3` widens the bar's own `spacing="sm"` above the phone breakpoint;
          spacing is a single tier, so the wider step stays a responsive override. */}
      <HStack spacing="sm" className="h-16 px-4 sm:gap-3 sm:px-6">
        {startActions}
        {menu ? (
          <NavHeaderMenuToggle
            open={menuOpen}
            controls={drawerId}
            onToggle={() => setMenuOpen((open) => !open)}
          />
        ) : null}

        <Link
          href={homeHref}
          aria-label={logo ? brandLabel : undefined}
          className="focus-ring flex shrink-0 items-center rounded-md font-semibold text-foreground"
        >
          {logo ?? <Logo variant="responsive" size="md" aria-label={brandLabel} />}
        </Link>

        {/* Raw flex: the row only exists from `lg` up, and `hidden`/`lg:flex` is a
            display toggle no `Stack` prop can express. Omitted entirely when the
            host passes an empty link list, so no empty landmark ships. */}
        {navLinks.length > 0 ? (
          <nav aria-label="Primary" className="hidden lg:flex lg:items-center lg:gap-1">
            {navLinks.map((link) => {
              const active = resolveNavLinkActive(link, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring rounded-md px-3 py-2 text-sm font-medium transition-colors motion-feedback",
                    active
                      ? "bg-primary-500/15 text-primary-800 dark:text-primary-300"
                      : NAV_IDLE,
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <HStack spacing="sm" className="ml-auto min-w-0">
          {search && searchItems.length > 0 ? <NavHeaderSearch items={searchItems} /> : null}

          {/*
            The toggle and the search Input are one row of `control`-role surfaces,
            so they share the role's treatment: the same bordered fill
            (`SURFACE_FILL.control`), the same `CONTROL_RADIUS` corner at size `md`,
            and no shadow. `variant="ghost"` gave it neither a border nor a
            matching resting surface, which is what made it read as a lifted tile
            beside a bordered field. `control` carries no resting shadow, so the
            button adds none.
          */}
          {themeToggle ? (
          <Button
            variant="outline"
            size="md"
            iconOnly
            tooltip="Toggle color theme"
            onClick={toggleMode}
            className="touch-target-44"
          >
            <Moon className="theme-icon-light" />
            <Sun className="theme-icon-dark" />
          </Button>
          ) : null}
          {actions}
        </HStack>
      </HStack>

      {menu ? (
        <NavHeaderDrawer
          open={menuOpen}
          onOpenChange={setMenuOpen}
          id={drawerId}
          searchItems={searchItems}
          navLinks={navLinks}
          logo={logo}
          homeHref={homeHref}
          brandLabel={brandLabel}
          themeToggle={themeToggle}
        />
      ) : null}
    </header>
  );
}
