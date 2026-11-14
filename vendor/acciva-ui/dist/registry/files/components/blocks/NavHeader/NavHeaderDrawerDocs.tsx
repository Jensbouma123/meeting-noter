import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type KeyboardEvent } from "react";
import { HStack } from "@/components/ui/HStack";
import { Input } from "@/components/ui/Input/index";
import { VStack } from "@/components/ui/VStack";
import { NavTree } from "@/components/blocks/NavTree";
import type { NavTreeSection } from "@/components/blocks/NavTree";
import { MAX_SEARCH_RESULTS, docHref, isActive, type NavSearchItem } from "@/components/blocks/NavHeader/NavHeaderData";

interface NavHeaderDrawerDocsProps {
  items: NavSearchItem[];
  closeMenu: () => void;
}

/** Buckets entries by `group`, keeping first-seen order, as NavTree sections. */
function toSections(items: NavSearchItem[]): NavTreeSection[] {
  const sections: NavTreeSection[] = [];
  for (const { slug, title, group } of items) {
    const entry = sections.find((section) => section.heading === group);
    const item = { href: docHref(slug), label: title };
    if (entry) entry.items.push(item);
    else sections.push({ heading: group, items: [item] });
  }
  return sections;
}

export function NavHeaderDrawerDocs({ items, closeMenu }: NavHeaderDrawerDocsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileQuery, setMobileQuery] = useState("");

  const allSections = useMemo(() => toSections(items), [items]);
  const filteredDocs = useMemo(() => {
    const needle = mobileQuery.trim().toLowerCase();
    if (!needle) return [];
    return items
      .filter((s) => s.title.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [mobileQuery, items]);
  const filtering = mobileQuery.trim() !== "";
  const sections = useMemo(() => (filtering ? toSections(filteredDocs) : allSections), [filtering, filteredDocs, allSections]);

  // Render-phase reset on route change, as in `useNavHeaderDrawer`.
  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    if (mobileQuery !== "") setMobileQuery("");
  }

  const handleFilterKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && filteredDocs.length > 0) {
      event.preventDefault();
      router.push(docHref(filteredDocs[0].slug));
      setMobileQuery("");
      closeMenu();
    }
  };

  const activeHref = items.map((s) => docHref(s.slug)).find((href) => isActive(pathname, href));

  return (
    <VStack spacing="md" className="border-t border-border pt-6">
      <HStack spacing="sm" justify="between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentation
        </span>
        <Link
          href="/"
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
        onKeyDown={handleFilterKeyDown}
        leadingIcon={<Search className="size-4 text-muted-foreground" />}
        clearable
        onClear={() => setMobileQuery("")}
        autoComplete="off"
      />

      {filtering && filteredDocs.length === 0 ? (
        <p className="px-1 py-2 text-sm text-muted-foreground">
          No components match &ldquo;{mobileQuery}&rdquo;
        </p>
      ) : (
        <NavTree aria-label="Documentation" arrowHint={false} sections={sections} activeHref={activeHref} />
      )}
    </VStack>
  );
}
