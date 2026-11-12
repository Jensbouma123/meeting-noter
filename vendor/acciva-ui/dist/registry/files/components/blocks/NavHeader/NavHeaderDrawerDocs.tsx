import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { HStack } from "@/components/ui/HStack";
import { Input } from "@/components/ui/Input/index";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { MAX_SEARCH_RESULTS, docHref, isActive, navRowClass, type NavSearchItem } from "@/components/blocks/NavHeader/NavHeaderData";

interface NavHeaderDrawerDocsProps {
  items: NavSearchItem[];
  closeMenu: () => void;
}

export function NavHeaderDrawerDocs({ items, closeMenu }: NavHeaderDrawerDocsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileQuery, setMobileQuery] = useState("");

  // Grouped once per `items` identity; the drawer renders this tree while no filter is typed.
  const docGroups = useMemo(
    () =>
      items.reduce<{ group: string; sections: NavSearchItem[] }[]>((groups, section) => {
        const entry = groups.find((candidate) => candidate.group === section.group);
        if (entry) entry.sections.push(section);
        else groups.push({ group: section.group, sections: [section] });
        return groups;
      }, []),
    [items],
  );

  const filteredDocs = useMemo(() => {
    const needle = mobileQuery.trim().toLowerCase();
    if (!needle) return [];
    return items
      .filter((s) => s.title.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [mobileQuery, items]);

  // Render-phase reset on route change, as in `useNavHeaderDrawer`.
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    if (mobileQuery !== "") setMobileQuery("");
  }

  const handleMobileFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && filteredDocs.length > 0) {
      event.preventDefault();
      router.push(docHref(filteredDocs[0].slug));
      setMobileQuery("");
      closeMenu();
    }
  };

  const docLink = (section: NavSearchItem, extra: string, children: ReactNode) => {
    const href = docHref(section.slug);
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        onClick={closeMenu}
        aria-current={active ? "page" : undefined}
        className={navRowClass(active, extra)}
      >
        {children}
      </Link>
    );
  };

  return (
    <VStack spacing="md" className="border-t border-border pt-6">
      <HStack spacing="sm" justify="between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentation
        </span>
        <Link
          href="/"
          onClick={closeMenu}
          className="focus-ring rounded-md text-xs font-medium text-primary-700 transition-colors motion-feedback hover:text-primary-800 active:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 dark:active:text-primary-200"
        >
          View all
        </Link>
      </HStack>

      <Input
        aria-label="Filter documentation"
        placeholder="Jump to component…"
        value={mobileQuery}
        onChange={(event) => setMobileQuery(event.target.value)}
        onKeyDown={handleMobileFilterKeyDown}
        leadingIcon={<Search className="size-4 text-muted-foreground" />}
        clearable
        onClear={() => setMobileQuery("")}
        autoComplete="off"
      />

      {mobileQuery.trim() ? (
        filteredDocs.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No components match &ldquo;{mobileQuery}&rdquo;
          </p>
        ) : (
          <VStack as="ul" spacing="xs">
            {filteredDocs.map((section) => (
              <li key={section.slug}>
                {docLink(
                  section,
                  "justify-between gap-2 text-sm",
                  <>
                    <span className="truncate">{section.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{section.group}</span>
                  </>,
                )}
              </li>
            ))}
          </VStack>
        )
      ) : (
        <VStack as="ul" spacing="lg">
          {docGroups.map((entry) => (
            <li key={entry.group}>
              <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {entry.group}
              </h2>
              <VStack as="ul" spacing="xs">
                {entry.sections.map((section) => (
                  <li key={section.slug}>
                    {docLink(section, "text-sm", <span className="truncate">{section.title}</span>)}
                  </li>
                ))}
              </VStack>
            </li>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
