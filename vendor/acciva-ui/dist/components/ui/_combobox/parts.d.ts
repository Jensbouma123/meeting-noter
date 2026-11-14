import type { ReactNode } from "react";
/** The trigger's `anchor-name`, which the top-layer panel positions against. */
export declare const anchorNameFor: (listboxId: string) => string;
export declare function OptionAdornment({ icon }: {
    icon: ReactNode;
}): import("react").JSX.Element | null;
/** Wraps the first case-insensitive `query` match in `<mark>` by plain string slicing — never HTML parsing. */
export declare function highlightMatch(label: string, query: string): ReactNode;
