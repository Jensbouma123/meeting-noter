import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { SearchCombobox } from "@/components/ui/SearchCombobox/index";
import { docHref, type NavSearchItem } from "@/components/blocks/NavHeader/NavHeaderData";

/** Header search: a SearchCombobox whose options are links into the docs. */
export function NavHeaderSearch({ items }: { items: NavSearchItem[] }) {
  const router = useRouter();
  const options = useMemo(
    () => items.map((s) => ({ value: s.slug, label: s.title, href: docHref(s.slug), keywords: s.group })),
    [items],
  );
  return (
    <SearchCombobox
      aria-label="Search components"
      options={options}
      emptyMessage="No components match"
      onNavigate={(href) => router.push(href)}
      className="w-32 sm:w-44 md:w-56 lg:w-64"
    />
  );
}
