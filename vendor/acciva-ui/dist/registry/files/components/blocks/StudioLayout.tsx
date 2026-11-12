import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import {
  FRAME_MAX_WIDTH,
  STICKY_PANEL_MAX_HEIGHT,
  STICKY_PANEL_TOP,
  STUDIO_SIDEBAR_WIDTH,
  type FrameMaxWidth,
  type StudioSidebarWidth,
} from "@/lib/layout-tokens";
import { SURFACE_FILL, SURFACE_RADIUS, SURFACE_SHADOW } from "@/lib/surface-tokens";
import { cn } from "@/lib/utils";
import { SPACING_GAP } from "@/components/ui/Stack/index";

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
export const StudioLayout = forwardRef<HTMLDivElement, StudioLayoutProps>(function StudioLayout(
  {
    sidebar,
    sidebarLabel,
    sidebarWidth = "lg",
    maxWidth = "studio",
    mainClassName,
    mainStyle,
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto flex w-full flex-col lg:flex-row lg:items-start lg:gap-8",
        FRAME_MAX_WIDTH[maxWidth],
        SPACING_GAP.xl,
        className,
      )}
      {...props}
    >
      <aside
        aria-label={sidebarLabel}
        className={cn(
          "flex w-full flex-col p-4 sm:p-6 lg:sticky lg:shrink-0 lg:overflow-y-auto",
          SPACING_GAP.xl,
          SURFACE_RADIUS.raised,
          SURFACE_FILL.raised,
          SURFACE_SHADOW.raised,
          STICKY_PANEL_TOP,
          STICKY_PANEL_MAX_HEIGHT,
          STUDIO_SIDEBAR_WIDTH[sidebarWidth],
        )}
      >
        {sidebar}
      </aside>

      <div
        className={cn("flex min-w-0 flex-1 flex-col", SPACING_GAP["2xl"], mainClassName)}
        style={mainStyle}
      >
        {children}
      </div>
    </div>
  );
});
