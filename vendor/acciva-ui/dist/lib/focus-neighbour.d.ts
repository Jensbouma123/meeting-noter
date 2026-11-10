/**
 * Before a list item is removed, move focus to its next (else previous) sibling's
 * control matching `selector`, so focus is not dropped to `<body>` (SC 2.4.3).
 */
export declare function focusNeighbour(trigger: HTMLElement, selector: string): void;
