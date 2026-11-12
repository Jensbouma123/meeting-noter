import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/Input/index";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { MAX_SEARCH_RESULTS, NAV_IDLE, docHref, type NavSearchItem } from "@/components/blocks/NavHeader/NavHeaderData";
import { useScrollActiveOption } from "@/components/blocks/NavHeader/useScrollActiveOption";

export function NavHeaderSearch({ items }: { items: NavSearchItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-search-listbox`;
  const optionId = (index: number) => `${baseId}-search-option-${index}`;

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return items.filter((s) => s.title.toLowerCase().includes(needle)).slice(0, MAX_SEARCH_RESULTS);
  }, [query, items]);

  const [previousQuery, setPreviousQuery] = useState(query);
  if (previousQuery !== query) {
    setPreviousQuery(query);
    if (activeIndex !== 0) setActiveIndex(0);
  }

  const commitSearch = (index: number) => {
    const section = results[index];
    if (!section) return;
    router.push(docHref(section.slug));
    setQuery("");
    setSearchOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (results.length === 0) return;
        event.preventDefault();
        setSearchOpen(true);
        const step = event.key === "ArrowDown" ? 1 : results.length - 1;
        setActiveIndex((current) => (current + step) % results.length);
        break;
      }
      case "Enter":
        if (!searchOpen || results.length === 0) return;
        event.preventDefault();
        commitSearch(activeIndex);
        break;
      case "Escape":
        if (!searchOpen) return;
        event.preventDefault();
        setSearchOpen(false);
        break;
      case "Tab":
        // Let focus move on, but don't leave the listbox open behind it (SC 2.1.1).
        setSearchOpen(false);
        break;
      default:
    }
  };

  useScrollActiveOption(listRef, searchOpen, activeIndex);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [searchOpen]);

  return (
    <div ref={searchRef} className="relative w-32 sm:w-44 md:w-56 lg:w-64">
      <Input
        aria-label="Search components"
        placeholder="Search…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setSearchOpen(true);
        }}
        onKeyDown={handleSearchKeyDown}
        leadingIcon={<Search className="size-4" />}
        role="combobox"
        aria-expanded={searchOpen && results.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={searchOpen && results.length > 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
      />

      {searchOpen && query.trim() ? (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className={cn(
            "absolute right-0 top-full z-40 mt-1 max-h-nav-search w-full overflow-y-auto overscroll-contain p-1 animate-fade-in",
            SURFACE_RADIUS.overlay,
            SURFACE_FILL.overlay,
            SURFACE_SHADOW.overlay,
          )}
        >
          {results.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              No components match &ldquo;{query}&rdquo;
            </p>
          ) : (
            results.map((section, index) => (
              <div
                key={section.slug}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commitSearch(index)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-2 text-sm transition-colors motion-feedback",
                  index === activeIndex
                    ? "bg-primary-100 text-primary-900"
                    : NAV_IDLE,
                )}
              >
                {section.title}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
