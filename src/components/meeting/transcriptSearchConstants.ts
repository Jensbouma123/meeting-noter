export const MAX_HIGHLIGHT_RANGES = 1000;
export const ACTIVE_TURN_CLASS = 'mn-search-active-turn';

export const SEARCH_HIGHLIGHT_CSS = `
::highlight(mn-search) { background-color: color-mix(in oklab, var(--color-warning-400) 45%, transparent); color: inherit; }
::highlight(mn-search-active) { background-color: color-mix(in oklab, var(--color-warning-500) 60%, transparent); color: inherit; }
.${ACTIVE_TURN_CLASS} { background-color: color-mix(in oklab, var(--color-warning-400) 8%, transparent); border-radius: 0.5rem; box-shadow: inset 2px 0 0 0 var(--color-warning-500); }
`;
