import type { ReactNode } from "react";
export type OrderStatus = "placed" | "packed" | "shipped" | "delivered" | "cancelled";
export interface OrderStatusCardProps {
    /** Order reference shown in the heading ("#10482"). */
    orderId: string;
    status: OrderStatus;
    /** Already-formatted summary line ("3 items · $84.20"). */
    summary?: string;
    /** Estimated delivery or a status note ("Arrives Thu, 12 Mar"). */
    eta?: string;
    /** Action slot (Track package, Cancel order). */
    actions?: ReactNode;
    /** Convenience: renders a "Track order" link button when set and the order is not final. */
    trackHref?: string;
    className?: string;
}
export declare function OrderStatusCard({ orderId, status, summary, eta, actions, trackHref, className, }: OrderStatusCardProps): import("react").JSX.Element;
