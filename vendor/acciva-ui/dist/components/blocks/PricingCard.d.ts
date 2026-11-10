import type { ReactNode } from "react";
export interface PricingCardProps {
    /** Plan name, rendered as the card's heading. */
    name: string;
    /** Already-formatted price ("$29", "Free"). */
    price: string;
    /** Billing cadence shown after the price ("/ month"). */
    period?: string;
    description?: string;
    features: string[];
    /** Call-to-action label. */
    ctaLabel: string;
    /** Renders the CTA as a link when set; otherwise a button driven by `onSelect`. */
    ctaHref?: string;
    onSelect?: () => void;
    /** Marks the recommended plan: emphasised surface plus a `badge`. */
    highlighted?: boolean;
    /** Short flag on the highlighted plan ("Most popular"). */
    badge?: ReactNode;
    className?: string;
}
export declare function PricingCard({ name, price, period, description, features, ctaLabel, ctaHref, onSelect, highlighted, badge, className, }: PricingCardProps): import("react").JSX.Element;
