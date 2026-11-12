### Table
- **Import:** `import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Native `<table>` in a focusable, labelled horizontal scroll region: `density="comfortable" | "compact"` and a CSS-only sticky first column.
- **Gotcha:** the scroll region needs an `aria-label` and is focusable (SC 1.3.1, 2.1.1). Headers come from `TableHeaderCell`, which carries `th scope`.
- **Apple:** `AccivaTable` (`apple/Sources/AccivaUI/Components/Table/Table.swift`) — SwiftUI `Grid`, same density. No sticky column: it scrolls horizontally.
- **Spec:** `.agents/components/Table.md`

### Code
- **Import:** `import { Code } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Inline code in the mono family, a native `<code>` that inherits the surrounding size. `variant="plain" | "pill"`.
- **Gotcha:** text content only, never `dangerouslySetInnerHTML` (security: untrusted content).
- **Apple:** `AccivaCode` + `AccivaCodeVariant` (`apple/Sources/AccivaUI/Components/Code.swift`) — same two variants.
- **Spec:** `.agents/components/Code.md`

### Kbd
- **Import:** `import { Kbd } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Keyboard key chip: a native `<kbd>` in the mono family on an elevated surface at the `xxs` text size.
- **Gotcha:** a visual chip only; it does not announce anything, so keep the key name in readable text.
- **Apple:** `AccivaKbd` (`apple/Sources/AccivaUI/Components/Kbd.swift`) — same chip.
- **Spec:** `.agents/components/Kbd.md`

### PageHeader
- **Import:** `import { PageHeader } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Page title block: `title` as an h1 (`Heading` at `3xl`), optional `eyebrow`, muted `description`, and `actions`. `maxWidth` sets the readable-width ceiling.
- **Gotcha:** actions wrap below the title on phones and sit inline from `sm`. Renders a `<header>` whose title is an `h1`.
- **Apple:** `AccivaPageHeader<Actions>` (`apple/Sources/AccivaUI/Components/PageHeader/PageHeader.swift`) — same slots; `AccivaPageHeaderMaxWidth` mirrors `maxWidth`.
- **Spec:** `.agents/components/PageHeader.md`

### IconTile
- **Import:** `import { IconTile } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Fixed-footprint tinted tile holding one icon or a short numeral/initials string: `tone`, `emphasis="soft" | "solid"`, `shape="rounded" | "full"`, `size="sm" | "md" | "lg"`.
- **Gotcha:** decorative (`aria-hidden`) unless you pass a name, which makes it `role="img"`. Non-interactive; wrap it in a button for an action.
- **Apple:** `AccivaIconTile<Content>` + `AccivaIconTileTone`/`Emphasis`/`Shape`/`Size` (`apple/Sources/AccivaUI/Components/IconTile/`) — same vocabulary.
- **Spec:** `.agents/components/IconTile.md`

### RowList
- **Import:** `import { RowList } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Static read-only list: `RowList` renders a `ul`, each `RowList.Item` an `li` with `leading`, `title`, muted `meta` and `trailing` slots; `divided` adds hairlines.
- **Gotcha:** `aria-label` is required (the list is named by it). Rows have no hover or press state; use `ListItem` for interactive rows.
- **Apple:** `AccivaRowList<Content>` + `AccivaRowListItem` (`apple/Sources/AccivaUI/Components/RowList/RowList.swift`) — same slots; named to avoid clashing with SwiftUI `List`.
- **Spec:** `.agents/components/RowList.md`

### PageChrome
- **Import:** Apple-only — `AccivaPageChrome`, `View.accivaPage(_:)` (`apple/Sources/AccivaUI/Components/PageChrome/PageChrome.swift`); web counterparts are NavHeader / PageHeader.
- **Category:** Layout
- **Purpose:** Native `NavigationStack` page chrome: large/inline title, subtitle, toolbar slots for `AccivaIconButton`/`AccivaButton`, optional `.searchable`.
- **Gotcha:** apply `.accivaTheme()` once above it; subtitle shows on macOS and OS 26+ only; in-content titles stay `AccivaPageHeader`.
- **Spec:** `.agents/components/PageChrome.md`

### BottomNavDrawer
- **Import:** `import { BottomNavDrawer } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Non-modal drawer behind a `BottomNav` that grows up out of the bar's top edge — now playing, an active run, a cart. Collapsed: grab handle + optional `peek` row above the bar; open: the body, capped below the top safe area. Drag the handle or peek row, or pull the open body down from its top, or tap the handle; `halfDetent` adds a middle snap; `open`/`defaultOpen`/`onOpenChange` (user changes only); `snap`/`defaultSnap` (controlled `peek`/`half`/`full`, wins over `open`); `onSnapChange(snap, heightPx)`; `hug` sizes peek/full to content; `draggable={false}` leaves the handle as the only toggle (drag down settles to peek, never dismisses).
- **Gotcha:** only with a `BottomNav`, one *visible* per bar, and `hideAt` must match the bar's. Mountable per page (outside `AppShell`): then the page pads its scroll container with `pb-safe-nav-drawer`; the drawer never pads. `AppShell`'s `bottomDrawer` slot does it for `<main>`. A blocking sheet is `Drawer`/`Modal`; a free-standing persistent sheet is `Drawer modality="persistent"`. Every action needs a tap path (SC 2.5.7).
- **Apple:** not yet ported — planned as `.bottomDrawerSlot` on `AccivaAppShell` (see the spec's Apple section).
- **Spec:** `.agents/components/BottomNavDrawer.md`
