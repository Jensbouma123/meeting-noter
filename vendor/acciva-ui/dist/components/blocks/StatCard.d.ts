import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
export type StatCardTone = "primary" | "secondary" | "accent" | "success";
export interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    tone?: StatCardTone;
    delta?: number;
    deltaLabel?: string;
    /**
     * Static qualifier for the value ("34 gated pairs verified"), rendered muted below it. It is
     * not a trend: `delta` owns direction and keeps its own success/danger colour, so a footnote
     * never competes with it for the same signal (SC 1.4.1).
     */
    footnote?: ReactNode;
}
export declare function StatCard({ label, value, icon: Icon, tone, delta, deltaLabel, footnote, }: StatCardProps): import("react").JSX.Element;
export declare function StatCardGrid({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
