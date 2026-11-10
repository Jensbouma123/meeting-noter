import { type HTMLAttributes, type ReactNode } from "react";
import { type FrameMaxWidth, type StudioSidebarWidth } from "../../lib/layout-tokens.js";
export interface StudioLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Configuration controls for the studio; becomes the sticky `<aside>`. */
    sidebar: ReactNode;
    /** Accessible name for the sidebar landmark — every studio has more than one region. */
    sidebarLabel: string;
    /** `md` holds at 380px from `lg` up; `lg` widens to 420px once there is `xl` room. */
    sidebarWidth?: StudioSidebarWidth;
    /** Content ceiling for the whole shell. */
    maxWidth?: FrameMaxWidth;
    /** Styling for the fluid main column only — a CVD simulation filter, for instance. */
    mainClassName?: string;
    mainStyle?: HTMLAttributes<HTMLDivElement>["style"];
    /** The studio's own panels. */
    children: ReactNode;
}
/**
 * The shell both studios share: a configuration sidebar that sticks under the nav
 * header and scrolls its own overflow, beside a fluid main column. Mobile-first —
 * the two stack until `lg`, where there is finally room to sit side by side.
 *
 * Every length comes from `layout-tokens.ts` and the sidebar's surface is the
 * `raised` role from `surface-tokens.ts`, so a studio page never names a width, a
 * viewport height, a radius or a shadow of its own.
 */
export declare const StudioLayout: import("react").ForwardRefExoticComponent<StudioLayoutProps & import("react").RefAttributes<HTMLDivElement>>;
