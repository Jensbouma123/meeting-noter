## Composition Blocks

### 36. AppShell
- **Import:** `import { AppShell } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Root responsive application layout coordinating NavHeader, Sidebar, BottomNav, and main content. `searchItems` feeds the default `NavHeader`. Optional `header`/`sidebar` slots (both `ReactNode`) let a consuming app swap the header or add a rail beside `<main>`; `startAside` (wins over `sidebar`) and `endAside` place rails before/after `<main>`; `bottomNav` (a `BottomNav`) and `bottomDrawer` (a `BottomNavDrawer`, ignored without `bottomNav`) render after `<main>` in visual-stack order and pad `<main>` to clear both until `bottomNavHideAt` (match the bar's `hideAt`, default `md`); omit all to keep the original header-only layout byte-identical. Renders a leading "Skip to main content" link targeting `<main id="main">` (`skipLink={false}` to omit).
- **Apple:** `AccivaAppShell` + `AccivaAppShellTab` (`apple/Sources/AccivaUI/Components/AppShell/`): themed adaptive `AccivaAppTabs`, one `AccivaPageChrome` stack per tab, `.inspectorSlot`, `.sheetSlot` (medium/large detents), `.toasts(_:)`. Use once as a scene's root; never nest a `NavigationStack` in tab content.
- **Spec:** `.agents/components/AppShell.md`

### 37. DataTable
- **Import:** `import { DataTable } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Structured table supporting sorting, filtering, selection, and pagination.
- **Spec:** `.agents/components/DataTable.md`

### 38. FilterBar
- **Import:** `import { FilterBar } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Search, filter chips, and sorting controls for lists and tables. Active filters render as `Badge variant="chip" selected` with a sibling dismiss button, each named `Remove <filter> filter` — never a raw `<button>` inside a tone `Badge`.
- **Spec:** `.agents/components/FilterBar.md`

### 39. NavHeader
- **Import:** `import { NavHeader } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Application top bar with brand logo, search input, actions, and theme switch; below `lg:` its menu button opens a left `Drawer` holding the nav tree. `searchItems` (`{ slug, title, group }[]`) feeds the search box (its results panel is capped at the viewport below the header minus `--overlay-gutter` and scrolls inside) and the drawer's docs tree — omit it and both are dropped, so the library bundles no docs index (`AppShell` forwards its own `searchItems`). Optional `logo`/`primaryLinks`/`actions` props override the brand mark, the docs link list, and add a trailing app-controls slot; `homeHref`/`brandLabel` rebrand the link target and name; `menu={false}` plus a `startActions` trigger lets a host drive its own drawer with no internal `Drawer` mounted. Link icons are optional and a per-link `isActive` wins over the route match — omit all props to keep today's hardcoded docs header.
- **Spec:** `.agents/components/NavHeader.md`

### 40. NavTree
- **Import:** `import { NavTree } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Generic three-level collapsible navigation tree (group, item, variant) with one auto-expanding group and a search-mode expand-all override. Pass a flat `items: NavTreeItem[]` instead of `groups` for an ungrouped list.
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load; Up/Down arrows hop between links and toggles.
- **Spec:** `.agents/components/NavTree.md`

### 41. SettingsSheet
- **Import:** `import { SettingsSheet } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Slide-over settings drawer for configuring application preferences. Fixed right-edge panel on native `<dialog>` (a right-side `Drawer`, no drag handle or swipe grabber by design) — for a resizable sheet use `Drawer` with `draggable`.
- **Gotcha:** initial focus goes to the first content control (`data-autofocus` wins, close button last); focus returns to the opener on close; Escape and light dismiss are native. Same initial-focus rule in Modal, Drawer, Popover, ConfirmDialog; Popover releases Tab at its ends (closes, focus to trigger).
- **Spec:** `.agents/components/SettingsSheet.md`

### 42. Sidebar
- **Import:** `import { Sidebar } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Desktop icon-only navigation rail plus a mobile off-canvas drawer, both driven from one flat `SidebarItem[]`. The desktop rail supports `ArrowUp`/`ArrowDown`/`Home`/`End` to move focus between items in addition to normal Tab order. The rail sticks under the `h-16` nav header and scrolls its own overflow from layout tokens (`className` overrides it); a per-item `isActive` overrides the pathname-derived `aria-current` match. `mobileNav={false}` drops the mobile drawer (`mobileOpen`/`onMobileClose` are optional); `icon` is a component or rendered node. `onReorder` (`SidebarReorderMove` `{from, to}`, consumer-owned order) adds a per-row Move up/Move down menu and Alt+ArrowUp/Down, announced politely.
- **Apple:** `AccivaSidebar` + `AccivaSidebarItem` (`apple/Sources/AccivaUI/Components/Sidebar/Sidebar.swift`) — a sidebar-style `List(selection:)` for a `NavigationSplitView` column; the consumer owns the `Binding<Value?>` selection; no icon-only rail. `onReorder` (`AccivaReorderMove`) is native `reorderable()` on iOS/macOS/visionOS 27 and `onMove` below; "Move up"/"Move down" accessibility actions on every platform.
- **Spec:** `.agents/components/Sidebar.md`

### 43. StatCard
- **Import:** `import { StatCard } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Metric KPI summary card showing primary values, trend indicators, and subtitles. `tone="primary" | "secondary" | "accent" | "success"` colours the icon chip — use it instead of hand-rolling a metric tile. Two distinct sublines: `delta` (numeric trend, coloured by sign, inline beside the value) and `footnote` (static muted qualifier below it, e.g. "34 gated pairs verified") — reach for `footnote` rather than dropping a bespoke tile's caption when migrating onto this component.
- **Apple:** `AccivaStatCard` + `AccivaStatCardGrid` (`apple/Sources/AccivaUI/Components/StatCard/StatCard.swift`) — same `tone`/`delta`/`deltaLabel`/`footnote`; optional `systemImage` SF Symbol; one VoiceOver element that speaks the trend ("Down 4% vs last month"); not interactive — wrap in `AccivaCard(action:)` for a tappable tile. Grid is 1 column compact, 2 regular.
- **Spec:** `.agents/components/StatCard.md`

### 44. StudioLayout
- **Import:** `import { StudioLayout } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Two-column tool-page shell — a named, sticky, self-scrolling configuration sidebar beside a fluid output column. Owns the shell's `maxWidth`, sidebar width, sticky offset and scroll budget from `layout-tokens.ts`, so a studio page never writes `max-w-[…]`, `w-[…px]` or `max-h-[calc(…)]`.
- **Spec:** `.agents/components/StudioLayout.md`

### 45. NotificationCenter
- **Import:** `import { NotificationCenter } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Notification inbox card with unread-count badge, mark-all-read action, and per-item dismiss/select callbacks over caller-owned `NotificationItem[]`. Empty list renders an `EmptyState`.
- **Spec:** `.agents/components/NotificationCenter.md`

### 46. CheckoutSummary
- **Import:** `import { CheckoutSummary } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Cart/order summary card — line items with quantities and pre-formatted prices, a `dl` breakdown (optional subtotal/shipping/tax plus always-on total), and a full-width checkout button with loading state.
- **Spec:** `.agents/components/CheckoutSummary.md`

### 47. TeamList
- **Import:** `import { TeamList } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Team roster card — avatar/name/role/email rows, member-count badge, invite action, and per-member remove buttons with member-specific accessible names. Empty roster renders an `EmptyState` with the invite action.
- **Spec:** `.agents/components/TeamList.md`

### 48. ActivityFeed
- **Import:** `import { ActivityFeed } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Presentational recent-activity card — actor avatar, "actor action" line, timestamp, optional tone tag per event in a real `<ol>`. No interaction, no pagination; wrap in your own live region if events stream.
- **Spec:** `.agents/components/ActivityFeed.md`

### 49. PricingCard
- **Import:** `import { PricingCard } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** One pricing plan tile — name, price and cadence, feature checklist and a CTA; `highlighted` + `badge` marks the recommended plan. Lay several in a `Grid`.
- **Spec:** `.agents/components/PricingCard.md`

### 50. LoginCard
- **Import:** `import { LoginCard } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Sign-in card — optional social providers, email + password form, form-level `error`, `loading` and a `footer` slot. Reports credentials through `onSubmit`; never talks to a backend.
- **Spec:** `.agents/components/LoginCard.md`

### 51. ProfileHeader
- **Import:** `import { ProfileHeader } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Person/account header — avatar, name, subtitle, bio, badges, a stats row and an `actions` slot.
- **Spec:** `.agents/components/ProfileHeader.md`

### 52. OrderStatusCard
- **Import:** `import { OrderStatusCard } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Order tracking tile — status badge, ordered fulfilment timeline (placed → delivered, or cancelled), summary, ETA and actions.
- **Spec:** `.agents/components/OrderStatusCard.md`

---
