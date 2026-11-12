"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/Badge/index";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { HStack } from "@/components/ui/HStack";
import { Input } from "@/components/ui/Input/index";
import { Select, type SelectOption } from "@/components/ui/Select/index";
import { Stack } from "@/components/ui/Stack/index";
import { VStack } from "@/components/ui/VStack";

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortOptions: SelectOption[];
  sortValue: string | null;
  onSortChange: (value: string) => void;
  activeFilters?: string[];
  onRemoveFilter?: (filter: string) => void;
  onOpenFilters?: () => void;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  sortOptions,
  sortValue,
  onSortChange,
  activeFilters = [],
  onRemoveFilter,
  onOpenFilters,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const mobileFilterId = useId();

  return (
    <Card padding="sm">
      <VStack spacing="md">
        <Stack direction={{ base: "vertical", sm: "horizontal" }} spacing="sm">
          <div className="flex-1">
            <Input
              placeholder="Search…"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              leadingIcon={<Search />}
            />
          </div>
          <HStack spacing="sm">
            <Button
              variant="outline"
              size="md"
              className="sm:hidden"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-controls={mobileFilterId}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
            <div className="hidden w-48 sm:block">
              <Select options={sortOptions} value={sortValue} onChange={onSortChange} placeholder="Sort by" aria-label="Sort by" />
            </div>
            {onOpenFilters ? (
              <Button variant="outline" size="md" className="hidden sm:inline-flex" onClick={onOpenFilters}>
                <SlidersHorizontal className="size-4" />
                More filters
              </Button>
            ) : null}
          </HStack>
        </Stack>

        {expanded ? (
          <div id={mobileFilterId} className="sm:hidden">
            <Select options={sortOptions} value={sortValue} onChange={onSortChange} placeholder="Sort by" aria-label="Sort by" />
          </div>
        ) : null}

        {activeFilters.length > 0 ? (
          <HStack spacing="sm" wrap>
            {activeFilters.map((filter) =>
              onRemoveFilter ? (
                <Badge
                  key={filter}
                  variant="chip"
                  selected
                  onDismiss={() => onRemoveFilter(filter)}
                  dismissLabel={`Remove ${filter} filter`}
                >
                  {filter}
                </Badge>
              ) : (
                <Badge key={filter} variant="chip" selected>
                  {filter}
                </Badge>
              ),
            )}
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );
}
