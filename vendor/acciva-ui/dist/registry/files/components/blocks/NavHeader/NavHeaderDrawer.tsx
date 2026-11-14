import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer/index";
import { HStack } from "@/components/ui/HStack";
import { Logo } from "@/components/ui/Logo/index";
import { NavTree } from "@/components/blocks/NavTree";
import { VStack } from "@/components/ui/VStack";
import { SURFACE_RADIUS } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { DRAWER_WIDTH_PX, resolveNavLinkActive, type NavSearchItem, type PrimaryNavLink } from "@/components/blocks/NavHeader/NavHeaderData";
import { NavHeaderDrawerDocs } from "@/components/blocks/NavHeader/NavHeaderDrawerDocs";
import { NavHeaderDrawerFooter } from "@/components/blocks/NavHeader/NavHeaderDrawerFooter";

interface NavHeaderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  searchItems: NavSearchItem[];
  navLinks: PrimaryNavLink[];
  logo?: ReactNode;
  homeHref: string;
  brandLabel: string;
  themeToggle: boolean;
}

export function NavHeaderDrawer({
  open,
  onOpenChange,
  id,
  searchItems,
  navLinks,
  logo,
  homeHref,
  brandLabel,
  themeToggle,
}: NavHeaderDrawerProps) {
  const pathname = usePathname();
  const closeMenu = () => onOpenChange(false);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      modality="modal"
      side="left"
      maxSize={DRAWER_WIDTH_PX}
      handleLabel="Navigation drawer width"
      aria-label="Primary navigation"
    >
      <VStack id={id} spacing="xl">
        <HStack
          spacing="sm"
          justify="between"
          className="-mx-4 -mt-4 border-b border-border px-4 py-2"
        >
          <Link
            href={homeHref}
            onClick={closeMenu}
            aria-label={logo ? brandLabel : undefined}
            className="focus-ring flex min-w-0 items-center rounded-md"
          >
            {logo ?? <Logo variant="full" size="md" aria-label={brandLabel} />}
          </Link>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation menu"
            className={cn(
              "touch-target-44 focus-ring flex size-11 shrink-0 items-center justify-center text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99]",
              SURFACE_RADIUS.control,
            )}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </HStack>

        {/* Closes on any link activation (SC 3.2.2: navigating is the expected result). */}
        <div onClickCapture={(event) => { if ((event.target as Element).closest("a")) closeMenu(); }}>
          <VStack spacing="xl">
            {navLinks.length > 0 ? (
              <NavTree
                aria-label="Mobile Navigation"
                arrowHint={false}
                activeHref={navLinks.find((link) => resolveNavLinkActive(link, pathname))?.href}
                items={navLinks.map(({ href, label, icon: Icon }) => ({
                  href,
                  label,
                  icon: Icon ? <Icon className="size-5" /> : undefined,
                }))}
              />
            ) : null}

            {searchItems.length > 0 ? <NavHeaderDrawerDocs items={searchItems} closeMenu={closeMenu} /> : null}
          </VStack>
        </div>

        <NavHeaderDrawerFooter themeToggle={themeToggle} />
      </VStack>
    </Drawer>
  );
}
