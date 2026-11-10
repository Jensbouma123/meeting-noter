import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { type ResponsiveSize, type SizeTier } from "../../lib/sizing-tokens.js";
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ButtonSize = SizeTier;
export interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    variant?: ButtonVariant;
    size?: ResponsiveSize<SizeTier>;
    loading?: boolean;
    leadingIcon?: ReactNode;
    trailingIcon?: ReactNode;
    children?: ReactNode;
    /**
     * Renders a real `<a href>` instead of a `<button>`. Navigation is a link, never a button —
     * this is what stops callers nesting a Button inside a router `<Link>` (WCAG 2.2 SC 4.1.2).
     */
    href?: string;
    target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
    rel?: string;
    download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
    /**
     * Renders no element of its own: the styling, icon slots and props are merged into the single
     * child element instead (e.g. a framework `<Link>`), so the child keeps its own semantics.
     */
    asChild?: boolean;
}
/**
 * `tooltip` is REQUIRED whenever `iconOnly` is true: it is the only text an icon-only
 * button carries, so it doubles as the hover/focus tooltip and as the accessible name
 * (`aria-label` falls back to it). A blank tooltip is a hard authoring error.
 */
export type ButtonProps = ButtonBaseProps & ({
    iconOnly: true;
    tooltip: string;
} | {
    iconOnly?: false;
    tooltip?: string;
});
export declare const Button: import("react").ForwardRefExoticComponent<ButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
