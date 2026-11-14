import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input/index";

interface DataListSearchFieldProps {
  inputId: string;
  query: string;
  placeholder: string;
  statusRegionId: string;
  onQueryChange: (query: string) => void;
}

export function DataListSearchField({
  inputId,
  query,
  placeholder,
  statusRegionId,
  onQueryChange,
}: DataListSearchFieldProps) {
  return (
    <div className="flex-1 min-w-44 max-w-sm">
      <Input
        id={inputId}
        type="search"
        size="sm"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-describedby={statusRegionId}
        leadingIcon={<Search aria-hidden="true" />}
      />
    </div>
  );
}
