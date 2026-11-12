## UI Primitives

### 1. Accordion
- **Import:** `import { Accordion, AccordionItem } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Collapsible stacked panels for disclosing FAQs, multi-step sections, or accordion lists.
- **Variant:** `variant="plain"` is a chrome-less inline disclosure row (no border, fill, radius or dividers) for lists inside a surface. `AccordionTrigger` takes a `trailing` slot (chip or count). Apple: `AccivaAccordion(variant: .plain)`, `AccivaAccordionItem(_:isExpanded:trailing:content:)`.
- **Apple:** `AccivaAccordion` / `AccivaAccordionItem` (`apple/Sources/AccivaUI/Components/Accordion/Accordion.swift`) — a `DisclosureGroup` with a token-styled header and body; each item binds its own `isExpanded` (single mode is the caller's binding); the title is a verbatim `String`.
- **Spec:** `.agents/components/Accordion.md`

### 2. Alert
- **Import:** `import { Alert } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Contextual feedback banner for system alerts, warnings, info, and success messages. `layout="card" | "banner" | "inline"` picks the box: a page/form notice, a flush edge-to-edge announcement, or a compact callout inside another surface.
- **Content slot:** `children` is the body between the title and the `action` slot (rich content allowed). Apple: the body is a verbatim `String` or the caller's `content` view.
- **Apple:** `AccivaAlert` (`apple/Sources/AccivaUI/Components/Alert/Alert.swift`) — same `variant`/`layout`; title/message are verbatim strings, action a view builder, dismiss a labelled ghost `AccivaButton`; `announceOnAppear` posts the VoiceOver announcement; scales with Dynamic Type.
- **Spec:** `.agents/components/Alert.md`

### 3. Avatar
- **Import:** `import { Avatar } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Round identity mark with an image → initials → icon fallback chain. `src` renders a lazy `<img>` named by `name`; a missing or failed image falls back to initials derived from `name`; with no name either it renders `fallback` (default decorative person glyph). Fixed footprint per `size="sm" | "md" | "lg"`.
- **Gotcha:** `src` without `name` is a dev error (nameless image, SC 1.1.1). Inside an already-labelled control pass `aria-hidden` so the avatar stays out of the name computation (SC 4.1.2).
- **Apple:** `AccivaAvatar` (`apple/Sources/AccivaUI/Components/Avatar/Avatar.swift`) — same `size` tiers; image → initials → SF Symbol fallback via `AsyncImage`; `https` image URLs only; decorative when its container is labelled (`.accessibilityHidden`).
- **Spec:** `.agents/components/Avatar.md`

### 4. Badge
- **Import:** `import { Badge } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Status pill, count tag, or category label. Tones are `primary` | `secondary` | `accent` | `success` | `warning` | `danger` | `info` | `neutral` — `info` is the informational/healthy tone (badge info tokens, 4.5:1 in both modes). Every variant except `chip` is a static tone; `variant="chip"` is the interactive form — `selected`/`onSelect` renders a toggle `<button>` with `aria-pressed`, and `onDismiss` appends an icon-only remove button.
- **Tint:** `tint="chart-1" … "chart-8"` fills a tone with a categorical series colour (`--chart-N`) for labels naming a category, not a status. Apple: `AccivaBadgeTint`.
- **Gotcha:** on a dismissible chip `dismissLabel` is **type-required** unless the children are a plain `string` (it derives `Remove <children>`). Generic names ("Remove", "Close", "Remove filter") are rejected in dev — the label must name the chip (SC 4.1.2, SC 2.4.6).
- **Apple:** `AccivaBadge` (`apple/Sources/AccivaUI/Components/Badge/Badge.swift`) — same `variant` tones from `AccivaTokens.Colors.badge*`; `chip` is a native `Button` with `.isSelected`, dismiss is a labelled trailing `Button`; scales with Dynamic Type.
- **Spec:** `.agents/components/Badge.md`

### 5. BottomNav
- **Import:** `import { BottomNav } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Primary bottom navigation bar on mobile viewports (< 5 destinations). Each item is a link (`href`) or an action (`onClick`, plus `expanded`/`controls` to open a panel), so never hand-roll a bottom bar to get a button. `position="fixed" | "static"` and `hideAt="sm" | "md" | "lg" | "xl" | "never"` (defaults `"fixed"`/`"md"`) let the bar leave the fixed layer and stop hiding itself.
- **Gotcha:** inside a container whose width is its own layout's rather than the viewport's (a preview pane, a phone mock, an embedded shell), pass `hideAt="never"` — `md:hidden` is a viewport media query and no ancestor can scope it, so a `className="md:flex!"` override is the smell this prop removes. Add `position="static"` to make the bar a flow sibling of the content instead of an overlay; the scroll region above it then needs no `pb-safe-nav` and the frame needs no `transform-gpu` containing block.
- **Gotcha:** icons are floored to 24px via `[&_svg]:size-6` — pass any lucide size, the bar enforces the minimum. Long labels truncate with ellipsis (full text stays the accessible name), and below ~360px the bar goes icon-only (`sr-only` label + `aria-label`, SC 4.1.2).
- **Spec:** `.agents/components/BottomNav.md`

### 6. Breadcrumbs
- **Import:** `import { Breadcrumbs } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Hierarchical navigation trail showing current page position in application tree.
- **Apple:** `AccivaBreadcrumbs` (`apple/Sources/AccivaUI/Components/Breadcrumbs.swift`) — takes an `AccivaBreadcrumbItem` trail (`title`, `isCurrent`, `action`).
- **Spec:** `.agents/components/Breadcrumbs.md`

### 7. Button
- **Import:** `import { Button } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Interactive trigger with `variant="primary" | "secondary" | "outline" | "ghost" | "danger" | "link"`, sizes, and loading state. `href` renders a real `<a>` (with `target`/`rel`/`download`); `asChild` merges the styling into a single child element, e.g. a framework `<Link>`; the child's own `onClick` runs first (kept, not replaced) and icon sizing hits direct-child svgs only; the `hidden` attribute hides it (global `[hidden]` reset beats `inline-flex`).
- **Gotcha:** `iconOnly` REQUIRES `tooltip` (type error without it). The Button wraps itself in `Tooltip` and derives `aria-label` from `tooltip` — never add your own `Tooltip` around an `iconOnly` Button. Touch long-press (~500ms) shows that tooltip automatically; `onLongPress` replaces it with your action (give that action a non-gesture route too, SC 2.1.1). Missing labels surface as `WARN icon-only-missing-label path:line` from `npm run audit:a11y` (non-blocking; also `.acciva/a11y-warnings.json`) — fix by adding `tooltip`.
- **Gotcha:** navigation is a link, never a button — reach for `href` or `asChild` instead of an `onClick` that routes (SC 4.1.2).
- **Gotcha:** dark-mode `primary` brightens on hover/press, so its label flips to `primary-950` on exactly those states — white would measure 2.5:1 and 1.7:1 against SC 1.4.3's 4.5:1 floor, for every seed. Restyling a filled variant to brighten on interaction owes the same flip; `Button.test.tsx` asserts every variant/state/mode pair against the real `tokens.css` stops.
- **Apple:** `AccivaButton` (`apple/Sources/AccivaUI/Components/Button/Button.swift`) — a native `Button` styled by a `ButtonStyle`; same `variant`/`size` tiers, `loading` and icon-only (needs an accessibility label); text buttons take `AccivaSymbol` or any SF Symbol name (`leadingSystemImageName:`/`trailingSystemImageName:`), icon-only takes `AccivaSymbol` (incl. `.chevronLeft`) or an SF Symbol name string; icons render at `.medium` weight; 44pt hit area on touch tiers; navigation uses `Link`/`NavigationLink`.
- **Spec:** `.agents/components/Button.md`

### AccivaTheme
- **Import:** Apple-only — `View.accivaTheme(_:)`, `accivaChrome()`, `accivaSheetChrome()` (`apple/Sources/AccivaUI/Theme/Theme.swift`); no web export (web themes via CSS tokens).
- **Category:** Utility
- **Purpose:** One token entry point for native chrome: root `.accivaTheme()` sets tint (`brandForeground`), font, foreground and the iOS tab/page-dot colours; `.accivaChrome()` per screen paints nav/tab bars (`surface`, below OS 26 only) and list background; `.accivaSheetChrome()` gives sheets the `surface` fill and `overlay` radius.
- **Gotcha:** bar fills are per-screen in SwiftUI — the root modifier alone does not reach a `NavigationStack`'s bars. The tint is a text accent (white on it fails in dark mode); filled actions use `AccivaButton(.primary)`.
- **Spec:** `.agents/components/AccivaTheme.md`

### AccivaPageSwitcher
- **Import:** Apple-only — `AccivaPageSwitcher`, `View.accivaScopeBar(selection:scopes:)` (`apple/Sources/AccivaUI/Components/PageSwitcher/PageSwitcher.swift`); web counterpart `Tabs`.
- **Category:** Composite
- **Purpose:** Native page switching: swipeable `TabView(.page)` with index dots (iOS/visionOS; segmented fallback on macOS), optional segmented bar, or `.segmented` style; `.accivaScopeBar` wraps `.searchScopes`.
- **Gotcha:** a `.paged` switcher needs a caller-set height; call `.accivaTheme()` for dot colours; not for app-level navigation (use a tab bar).
- **Spec:** `.agents/components/AccivaPageSwitcher.md`

### Glass
- **Import:** Apple-only — `View.accivaGlass(_:in:)` (`apple/Sources/AccivaUI/Support/Glass/Glass.swift`); no web export.
- **Category:** Primitive
- **Purpose:** The one ACCIVA glass recipe: `AccivaGlassRole` (`.chrome` static, `.control` clickable, `.selected` brand tint, `.prominent` full brand, `.accent` full plum for AI-generated secondary emphasis, `.status`/`.identity` hue tints) drawn in any `Shape`, with a solid surface branch under Reduce Transparency / below OS 26 / under the `.accivaSolidSurfaces(true)` app override, and a hairline stroke under Increase Contrast. Tint is 0.10 light / 0.15 dark (`AccivaTokens.Glass`); labels come from `role.label` (white on plum 5.39:1, white on brand 4.77:1, SC 1.4.3).
- **Gotcha:** never glass on glass, never two `prominent`/`accent` surfaces per cluster, and never a hand-picked tint opacity. Plum is never a primary action — brand green owns selected/primary. Setting the solid override is the host app's job (once at its root); components only read it.
- **Apple:** modifier + `AccivaTokens.Glass` + `AccivaGlassRole.label`/`isInteractive`; morphing selection owns its `GlassEffectContainer` + `glassEffectID`.
- **Spec:** `.agents/components/Glass.md`

### IconButton
- **Import:** Apple-only — `AccivaIconButton` / `AccivaIconMenu` / `AccivaIconToggle` (`apple/Sources/AccivaUI/Components/IconButton/IconButton.swift`); no web export.
- **Category:** Primitive
- **Purpose:** Glass toolbar control: `AccivaIconButton(title, systemImage:, badge:, size:, surface:, isOn:)` (28pt `.xs` box, 16pt medium glyph, count badge widens the button; `isOn` = `.isSelected` + `.selected` glass, or brand glyph + `surface` inner fill on `.plain`) and `AccivaIconMenu(title, systemImage:, badge:, size:, surface:, isOn:, content:)` (same chrome as a native `Menu` trigger), plus `AccivaIconToggle(title, systemImage:, onSystemImage:, isOn:, tone:)` (off = control glass, on = status tint + filled symbol + `.isSelected`).
- **Gotcha:** an empty `title` is flagged `icon-only-missing-label` (DEBUG log on Apple; `npm run audit:a11y` WARN for web `IconButton`); `onLongPress` replaces the tooltip popover on hold. `title` is the ONLY accessible name (plus tooltip) — write it as name + state ("Changes — 3 changed files"). `badge` shows only when positive. At most one `isOn` control per cluster. Toolbar clusters only, never on content or on glass.
- **Apple:** `surface: .glass` (control/selected glass) or `.plain` (bare L0 glyph, `foreground` at rest, inner fill on hover or when on); 44pt hit area on touch tiers; press/hover feedback collapses under Reduce Motion.
- **Toolbar placement:** consumer-side only. `visibilityPriority`, `toolbarOverflowMenu`, `topBarPinnedTrailing` and `statusBar` are set by the host's `.toolbar`, which wraps `AccivaIconButton`/`AccivaIconMenu`; AccivaUI ships no `ToolbarContent`.
- **Spec:** `.agents/components/IconButton.md`

### 8. Card
- **Import:** `import { Card } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Container surface with elevation (0–4), token-driven borders, and padding. `variant="default" | "elevated" | "bordered" | "ghost" | "inset" | "interactive" | "selectable"`. A navigation card (`asChild` keeps the child's own handlers) takes `href`/`target`/`rel` or `asChild`; a `selectable` card takes `selected`/`onSelectedChange`/`selectionMode` (`single` → radio, `multiple` → checkbox)/`name`/`value`/`disabled`.
- **Gotcha:** `variant="interactive"` is styling only — it adds no role and no keyboard handling, so it must sit on something that already has them (`href`, `asChild`, or `selectable`). The boolean `interactive` prop is **deprecated** in favour of `variant="interactive"`.
- **Highlight:** `highlighted` draws a brand inset ring on any variant (visual only; the text must say why). Apple: `highlighted:` on `AccivaCard`.
- **Apple:** `AccivaCard` + `AccivaCardHeader/Title/Description/Content/Footer` (`apple/Sources/AccivaUI/Components/Card/Card.swift`) — same `variant`/`padding`; `href: URL` (https/http only) → link card, `action` → button card, `AccivaCard(selected:selectionMode:)` → choice card (`.isSelected` + checkmark). `AccivaCardHeader(content:action:)` adds a trailing action slot. No `asChild`/`name`/`value`; elevation is a fill step, not a shadow.
- **Spec:** `.agents/components/Card.md`

### 9. Checkbox
- **Import:** `import { Checkbox } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Boolean selection input or multi-item checklist selection with indeterminate support.
- **Apple:** `AccivaCheckbox` (`apple/Sources/AccivaUI/Components/Checkbox/Checkbox.swift`) — a native `Toggle` with `.toggleStyle(.accivaCheckbox(indeterminate:))`; native checkbox on macOS, drawn box on iOS/visionOS; indeterminate announces "Mixed"; 44pt row hit area.
- **Spec:** `.agents/components/Checkbox.md`

### 10. ConfirmDialog
- **Import:** `import { ConfirmDialog } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Focused modal dialog for confirming critical, permanent, or destructive operations. Inherits the Modal overlay fade and panel enter/exit motion (disabled under `prefers-reduced-motion`, SC 2.3.3).
- **Apple:** `AccivaConfirmDialog` (`apple/Sources/AccivaUI/Components/ConfirmDialog.swift`) — native `.alert`; destructive confirm and cancel roles; caller owns presentation and loading state.
- **Spec:** `.agents/components/ConfirmDialog.md`

### 11. DataList
- **Import:** `import { DataList } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Key-value metadata summary list for entity detail views.
- **Table columns:** `tableColumns` (`key`, `header`, `cell`, `align`, `numeric`) renders rows as a table; `showColumnHeaders` (default `true`) toggles the header row. Apple: `AccivaDataListColumn` columns on `AccivaDataListRow(item:columns:)`.
- **Row actions & reorder (web):** `rowActions` (`DataListRowAction<T>[]`, trailing overflow menu per row, labelled by `rowActionsLabel`) and `onReorder` (`{from, to}` single-item move; Alt+ArrowUp/Down and the row menu's Move up/Move down, no pointer drag; consumer applies the move to `items`).
- **Apple:** `AccivaDataList` + `AccivaDataListRow` (`apple/Sources/AccivaUI/Components/DataList/DataList.swift`) — a native `List` (`plain`/`inset`) with optional `.searchable`, `.single`/`.multiple` selection the consumer binds, and a sentinel row calling `onLoadMore`; no paginated or grid mode. OS 27 adds `rowActions` as `AccivaRowAction` swipe actions (mirrored as context menu and named accessibility actions), `onReorder` as `AccivaReorderMove` (native reorder on 27, `onMove` below), `dragItem` (Apple-only drag-out), and `copyItem` (⌘C / Edit menu).
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load.
- **Spec:** `.agents/components/DataList.md`

### 12. DatePicker
- **Import:** `import { DatePicker } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Single date selection with accessible calendar popover.
- **Gotcha:** keyboard: day grid is one tab stop with real focus (arrows ±day/week, Home/End, PageUp/Down ±month, Shift ±year, Enter/Space selects); Tab cycles prev, label, next, grid inside the dialog, Escape closes and returns focus to the trigger.
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load.
- **Spec:** `.agents/components/DatePicker.md`


### AppTabs
- **Import:** Apple-only — `AccivaAppTabs`, `AccivaAppTab`, `AccivaAppTabBadge` (`apple/Sources/AccivaUI/Components/AppTabs/AppTabs.swift`); web counterpart is `BottomNav`.
- **Category:** Composite
- **Purpose:** Native adaptive app tab navigation: bottom bar on iPhone, `.sidebarAdaptable` on iOS 18 / macOS 15 / visionOS 2 (sidebar on iPad/macOS, ornament on visionOS), `.tabItem` bar on iOS 17, sidebar on macOS 14. Selection binding, system badges, optional `.customization(_:)`.
- **Gotcha:** apply `.accivaTheme()` once at the app root; each tab's root should wrap its own `NavigationStack`. Badges are system-drawn (no sidebar badge on macOS 14).
- **Spec:** `.agents/components/AppTabs.md`
