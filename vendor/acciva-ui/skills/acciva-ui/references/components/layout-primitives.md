## Layout Primitives

Server-renderable, token-driven layout boxes using SwiftUI's naming and logical
(`leading`/`trailing`) alignment vocabulary, so RTL works with no extra effort.
`Stack` owns the shared `Spacing`, `StackAlign`, `StackJustify`, `SPACING_GAP`
and `INSET_PADDING` scale that the others import.

### Stack
- **Import:** `import { Stack } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Base flexbox box with a run-time `direction`, token `spacing`, and the logical align/justify vocabulary every other layout primitive shares.
- **Variant:** `direction` also takes a mobile-first record, e.g. `{ base: "vertical", md: "horizontal" }`; each breakpoint overrides the one before it, and `base` defaults to vertical.
- **Gotcha:** `as` is fully polymorphic (`Stack<C extends ElementType = "div">`) — `as="form"` types `onSubmit`/`noValidate` and `ref` as a real `HTMLFormElement`'s, no cast or prop spread needed. `HStack`/`VStack`/`ZStack` inherit the same typing.
- **Spec:** `.agents/components/Stack.md`

### HStack
- **Import:** `import { HStack } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Horizontal stack with cross-axis centring by default — toolbars, icon+label pairs, label/value rows.
- **Spec:** `.agents/components/HStack.md`

### VStack
- **Import:** `import { VStack } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Vertical stack whose children stretch to full width by default — forms, card bodies, page sections.
- **Gotcha:** Polymorphic like `Stack` — `<VStack as="form" onSubmit={...} noValidate>` typechecks with real `<form>` props instead of needing a raw `<form>` wrapper.
- **Spec:** `.agents/components/VStack.md`

### Spacer
- **Import:** `import { Spacer } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Elastic `aria-hidden` gap that pushes the children after it to the far end of a row or column, on either axis.
- **Spec:** `.agents/components/Spacer.md`

### ZStack
- **Import:** `import { ZStack } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Layers children in one CSS grid cell for overlays — captions over images, badges on avatars — with nine-value alignment.
- **Spec:** `.agents/components/ZStack.md`

### Divider
- **Import:** `import { Divider } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** One-pixel `bg-border` rule, horizontal or vertical, decorative by default and a real `separator` on request.
- **Apple:** `AccivaDivider(orientation:inset:)` (`apple/Sources/AccivaUI/Components/Divider.swift`) over the system `Divider`; always paints `Colors.border` and is always hidden from VoiceOver; `orientation` must match the enclosing stack.
- **Spec:** `.agents/components/Divider.md`

### Frame
- **Import:** `import { Frame } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Sizing and padding box — readable `maxWidth` ceilings, token padding, fill, and centring, with no classes emitted by default. `maxWidth` reads the shared `FRAME_MAX_WIDTH` table in `src/lib/layout-tokens.ts`, so `xs`–`7xl`, `studio` (100rem), `prose`, `full` and `none` are all available — never write `mx-auto max-w-[…]` by hand.
- **Spec:** `.agents/components/Frame.md`

### Grid
- **Import:** `import { Grid } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Mobile-first CSS grid — fixed column counts of 1-8 per breakpoint, or auto-fit tracks from a `minItemWidth`. Seven columns is a calendar week (`columns={7}`), so a month grid is a `Grid`, never nested stacks.
- **Spec:** `.agents/components/Grid.md`

### Section
- **Import:** `import { Section } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Semantic `<section>` region with an optional heading, description and actions row, wired to `aria-labelledby`. `headerSize="sm" | "md" | "lg" | "xl" | "2xl"` (default `"lg"`) sets the header's visual tier, moving the title's `Heading` size and the description's text size together.
- **Gotcha:** `headerSize` and `level` are separate axes — `level` is the document outline (which `h` tag), `headerSize` is how loud the header looks. A nested `h3` can read as loud as a page title and an `h2` can be quietened to sit inside a card; never change `level` to get a size (SC 1.3.1).
- **Apple:** `AccivaSection` + `AccivaSectionHeader` (`apple/Sources/AccivaUI/Components/Section/Section.swift`) — same `level` (h2–h4) / `headerSize` / `spacing` / `inset`; adds `footer` and `surface: true` (inset surface); inside `List`/`Form` put `AccivaSectionHeader` in a native `Section` header.
- **Spec:** `.agents/components/Section.md`

### SocialButton
- **Import:** `import { SocialButton } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Brand-compliant identity buttons — `provider="google" | "apple" | "github" | "microsoft"` — with inline SVG marks and accessible name enforcement. `variant="default" | "light" | "dark" | "neutral" | "black" | "white" | "outline"`, plus `fullWidth` and `loading`.
- **Gotcha:** the vendor marks keep the vendors' own hex, which `.agents/styling.md` exempts from the token rule. Reach for it only when the action is literally "sign in with &lt;vendor&gt;" — anything else is a `Button`.
- **Spec:** `.agents/components/SocialButton.md`

### PasswordField
- **Import:** `import { PasswordField } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Password input with built-in caps-lock warning, dependency-free strength meter, confirmation matching, and autocomplete handling. `mode="login" | "signup" | "reset"`, `showStrengthMeter`, `confirmMode` + `confirmLabel`.
- **Gotcha:** a plain login password does not need this — `Input type="password"` already ships the reveal toggle. Reach for `PasswordField` when you need the meter, the confirm pair, or the signup autocomplete wiring.
- **Spec:** `.agents/components/PasswordField.md`
- **Apple:** `AccivaPasswordField` (`apple/Sources/AccivaUI/Components/PasswordField.swift`) — same `mode`, strength meter (`AccivaPasswordStrength`, same 0–4 scoring) and confirm pair; `text:`/`confirmText:` are bindings; `.newPassword` for signup/reset; Caps Lock warning is macOS-only; reveal toggle inside the field chrome.

### OtpInput
- **Import:** `import { OtpInput } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Segmented one-time-password and PIN entry with N single-character boxes, hidden real input for autocomplete="one-time-code", and paste-fills-all. `length`, `type="numeric" | "alphanumeric"`, `mask`, `onComplete`.
- **Gotcha:** not a short text field — that is `Input`. Arrow keys and Backspace navigate between boxes and every box is a 44px target.
- **Spec:** `.agents/components/OtpInput.md`
- **Apple:** `AccivaOtpInput` (`apple/Sources/AccivaUI/Components/OtpInput/OtpInput.swift`) — one native `TextField` (`SecureField` when `mask`) with `.oneTimeCode` + number pad, boxes drawn behind it; `text:` is a binding, `length`, `type: .numeric/.alphanumeric`, `onComplete`; one VoiceOver element, not N.

### DashboardShell
- **Import:** `import { DashboardShell } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Full dashboard composition pattern uniting an icon rail `Sidebar`, top navigation header via `AppShell`/`NavHeader`, and `<main>` content area with responsive mobile drawer support. `sidebar` (ReactNode) replaces the built-in rail built from `sidebarItems` (optional, default `[]`). `showMobileTrigger={false}` omits the injected floating mobile nav button; `mainPadding={false}` omits the default `<main>` padding (both apply only with a custom `header`).
- **Spec:** `.agents/components/DashboardShell.md`

### SettingsPage
- **Import:** `import { SettingsPage, SettingsSection } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Structured preferences/settings form pattern composed of card-based sections (`Card`, `VStack`, `Heading`), input controls (`FormField`, `Input`), and standard primary/cancel action buttons.
- **Spec:** `.agents/components/SettingsPage.md`

### ListDetailView
- **Import:** `import { ListDetailView } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** Master-detail data view composing `DataTable` or `VirtualList` with a slide-over `Drawer` detail panel upon item selection.
- **Spec:** `.agents/components/ListDetailView.md`

### KanbanCard
- **Import:** `import { KanbanCard } from "@jensbouma123/acciva-ui"`
- **Category:** Block
- **Purpose:** One board ticket tile from `ticketKey`, `title`, `status` (+ `category`, `labels`, `blockedBy`, `counter`, `branch`). `onOpen` makes the tile a real button; `primaryAction` is a sibling button and the non-drag way to move a ticket.
- **Gotcha:** import from the blocks barrel path `@/components/blocks/KanbanCard`; the board owns drag and drop and must offer a non-drag move (SC 2.5.7).
- **Apple:** `AccivaKanbanCard` (`apple/Sources/AccivaUI/Components/KanbanCard/KanbanCard.swift`) — same `ticketKey`/`title`/`status`/`category`/`labels`/`blockedBy`; `onOpen`, `primaryAction`; generic init adds a trailing `actor` slot (e.g. `AccivaAvatar`) with `actorName` announced in the value.
- **Spec:** `.agents/components/KanbanCard.md`

---
