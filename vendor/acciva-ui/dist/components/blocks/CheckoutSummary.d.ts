export interface CheckoutLineItem {
    id: string;
    name: string;
    detail?: string;
    quantity: number;
    price: string;
}
export interface CheckoutSummaryProps {
    items: readonly CheckoutLineItem[];
    title?: string;
    subtotalLabel?: string;
    subtotal?: string;
    shippingLabel?: string;
    shipping?: string;
    taxLabel?: string;
    tax?: string;
    totalLabel?: string;
    total: string;
    checkoutLabel?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    isCheckingOut?: boolean;
    onCheckout?: () => void;
    className?: string;
}
export declare function CheckoutSummary({ items, title, subtotalLabel, subtotal, shippingLabel, shipping, taxLabel, tax, totalLabel, total, checkoutLabel, emptyTitle, emptyDescription, isCheckingOut, onCheckout, className, }: CheckoutSummaryProps): import("react").JSX.Element;
