import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
export type CardVariant = "default" | "elevated" | "bordered" | "ghost" | "inset" | "interactive" | "selectable";
export type CardPadding = "none" | "sm" | "md" | "lg";
/** `single` renders a radio (one card per `name` wins), `multiple` renders a checkbox. */
export type CardSelectionMode = "single" | "multiple";
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: CardPadding;
    children?: ReactNode;
    /**
     * @deprecated Use `variant="interactive"`. Still applies the hover/press affordance on top of
     * whichever `variant` is set, so existing callers keep their current rendering unchanged.
     */
    interactive?: boolean;
    /** Renders the card as a real `<a href>` — a navigation card, with link semantics (SC 4.1.2). */
    href?: string;
    target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
    rel?: string;
    /** Merges the card's styling into the single child element (e.g. a framework `<Link>`). */
    asChild?: boolean;
    /** `variant="selectable"` only — the checked state of the underlying radio/checkbox. */
    selected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    selectionMode?: CardSelectionMode;
    /** `variant="selectable"` with `selectionMode="single"` — the shared radio group name. */
    name?: string;
    value?: string;
    disabled?: boolean;
    /**
     * Draws a brand-coloured inset ring around the card, on any `variant` or render mode. It is
     * purely visual: no role, focus or keyboard change, and no motion. Ring and content must still
     * carry the meaning on their own (SC 1.4.1). A `selected` card already shows the same ring.
     */
    highlighted?: boolean;
}
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
    action?: ReactNode;
}
