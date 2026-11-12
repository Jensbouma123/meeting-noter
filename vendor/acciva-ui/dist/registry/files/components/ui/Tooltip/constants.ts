// `elevation-3` is the engine's own overlay level (see `buildSemanticRoles`), so the bubble
// floats above cards and modals — which already sit at `surface` — in both themes, and inverts
// with the mode instead of staying dark in light mode. The arrow repeats it verbatim: any
// opacity or shade difference makes the arrow read as a separate, darker chip.
export const TOOLTIP_FILL = "bg-elevation-3 border-border";
