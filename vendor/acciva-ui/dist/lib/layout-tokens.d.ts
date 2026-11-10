/**
 * Page-shell lengths: content ceilings, sidebar widths and viewport-relative
 * heights. Framework-agnostic and React-free, so `Frame` and the studio shells
 * read the same scale a SwiftUI port would.
 *
 * Every table is a literal `Record` — Tailwind's JIT scanner only generates
 * class names it can see statically.
 */
/** Readable-width ceilings a frame can clamp its content to. */
export type FrameMaxWidth = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "7xl" | "studio" | "prose" | "full" | "none";
/**
 * `xs`–`7xl` are Tailwind's own container stops (20rem–80rem). `studio` is the
 * one stop above them: 100rem / 1600px, the width the two studio shells
 * hand-rolled as `max-w-[1600px]`. It is expressed as an arbitrary value here
 * because a token file is the one place that is allowed to name a raw length.
 */
export declare const FRAME_MAX_WIDTH: Record<FrameMaxWidth, string>;
/** Width of a studio's config sidebar. Mobile-first: full width until `lg`. */
export type StudioSidebarWidth = "md" | "lg";
/**
 * `md` holds at 380px from `lg` up; `lg` widens to 420px at `xl`, which is what
 * both studios ship today (`lg:w-[380px] xl:w-[420px]`) — so adopting the token
 * is a no-op at `sidebarWidth="lg"`.
 */
export declare const STUDIO_SIDEBAR_WIDTH: Record<StudioSidebarWidth, string>;
/**
 * Height budget for a panel that sticks under the nav header and scrolls its own
 * overflow. The subtracted offsets are the header height plus its breathing
 * room; they are named here so the two studios and the docs shell cannot drift.
 */
export declare const STICKY_PANEL_MAX_HEIGHT = "lg:max-h-[calc(100vh-5rem)]";
/** Full-bleed shell that fills the viewport below the nav header. */
export declare const VIEWPORT_SHELL_HEIGHT = "h-[calc(100vh-6rem)]";
/** Offset a `sticky` panel parks at, matched to the nav header's height. */
export declare const STICKY_PANEL_TOP = "lg:top-16";
/**
 * Height of the `Sidebar` desktop rail. Pairs with `STICKY_PANEL_TOP`: the rail
 * parks 4rem below the viewport top under the `h-16` nav header, so it fills
 * exactly the remaining viewport (`100vh` minus the same 4rem) and scrolls its
 * own overflow instead of stranding items behind the header.
 */
export declare const SIDEBAR_RAIL_HEIGHT = "lg:h-[calc(100vh-4rem)]";
