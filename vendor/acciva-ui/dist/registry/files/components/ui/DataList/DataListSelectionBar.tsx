import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";

interface DataListSelectionBarProps {
  selectedCount: number;
  itemCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}

export function DataListSelectionBar({ selectedCount, itemCount, onSelectAll, onClear }: DataListSelectionBarProps) {
  return (
    <HStack spacing="sm" className="rounded-lg bg-surface px-3 py-1.5 border border-border text-xs">
      <span className="font-medium text-foreground">
        {selectedCount > 0 ? (
          <>
            <span className="text-primary-800 dark:text-primary-300 font-semibold">{selectedCount}</span> of{" "}
            {itemCount} selected
          </>
        ) : (
          "0 selected"
        )}
      </span>
      <div className="h-4 w-px bg-border" />
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onSelectAll}
        disabled={itemCount === 0 || selectedCount === itemCount}
      >
        Select all
      </Button>
      {selectedCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          Clear
        </Button>
      )}
    </HStack>
  );
}
