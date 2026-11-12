import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import { VStack } from "@/components/ui/VStack";

export function DataListLoading() {
  return (
    <VStack spacing="md" align="center" justify="center" className="h-48 w-full text-muted-foreground">
      <Loader2 className="size-7 animate-spin text-primary-500" />
      <span className="text-sm">Loading items...</span>
    </VStack>
  );
}

interface DataListEmptyProps {
  message: string;
  searchQuery: string;
  onClearSearch: () => void;
}

export function DataListEmpty({ message, searchQuery, onClearSearch }: DataListEmptyProps) {
  return (
    <VStack
      spacing="sm"
      align="center"
      justify="center"
      inset="xl"
      className="h-48 w-full rounded-xl border border-dashed border-border bg-surface/30 text-center"
    >
      <span className="text-sm font-medium text-foreground">{message}</span>
      {searchQuery && (
        <Button variant="outline" size="sm" onClick={onClearSearch} className="mt-2 text-xs">
          Clear filter
        </Button>
      )}
    </VStack>
  );
}
