### 13. DateRangePicker
- **Import:** `import { DateRangePicker } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Calendar popover for selecting start and end date bounds.
- **Gotcha:** same keyboard model as DatePicker; while picking the end date the keys move the previewed end. Band is continuous per week row; phones get a `fixed inset-x-4` dialog and one scrolling presets row; footer announces the range ("Aug 10 – 20, 2026 · 11 days") politely.
- **Surface:** overlay fill `bg-elevation-3` + border + `shadow-elevation-3`, so it reads over a `bg-surface` Drawer/Modal in dark mode.
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load.
- **Spec:** `.agents/components/DateRangePicker.md`

### 14. Drawer
- **Import:** `import { Drawer } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Side overlay or bottom sheet for secondary navigation and filter drawers. `modality="modal" | "persistent"`, `side="bottom" | "left" | "right"`, and `peek`/`half`/`full` detents (`detent`, `defaultDetent`, axis-agnostic `minSize`/`defaultSize`/`maxSize` alongside the vertical `*Height` aliases). The drag slider, drag-resize, and detents are opt-in via `draggable` (default `false` — a fixed sheet with no slider); without it the detent props are ignored. Touch dismissal is separate and on by default: `swipeToDismiss` (default `true`, coarse pointers only) composes with `draggable` instead of competing with it — with `draggable` off it flicks the drawer closed with no resize and renders a named grabber button (tap/`Enter`/`Space` closes); with `draggable` on the slider is the single affordance, dragging between detents and dismissing on a flick past the lowest detent. `onSnapChange` reports `(sizePx, detent)`. `closeLabel` names the persistent close control, which is clip-concealed on touch via `touch-concealed` (no `pointer-events: none`, so AT-synthesized taps still activate it) while staying named, focus-revealable and tappable unless `showCloseOnTouch` is set.
- **Gotcha:** `persistent` has no backdrop, no focus trap and never marks siblings `inert`, so the page stays operable — pair it with a trigger carrying `aria-expanded`/`aria-controls`. It also ignores `side` (dev warning) because it docks to the inline end at `md:`.
- **Safe area:** `safeAreaPadding` (default `true`) pads the bottom by the home-indicator inset; pass `false` when the host already pads that edge. Web-only (Apple sheets get it from the system). Initial focus keeps an `autoFocus` descendant instead of jumping to the close button (SC 2.4.3).
- **Dirty guard:** `confirmDismissal` (`{ title, message?, discardLabel?, keepLabel?, isDirty }`) routes every dismiss path (backdrop, Escape, grabber, close, flick) through a discard prompt while `isDirty`; the persistent mode is not guarded.
- **Apple:** `AccivaDrawer` (`apple/Sources/AccivaUI/Components/Drawer.swift`) — native `.sheet` detents for modal/bottom presentation and `.inspector` for persistent side presentation; required detent binding, 96pt peek. `confirmDismissal` takes `AccivaDismissConfirmation` (`dismissalConfirmationDialog` on iOS/macOS 27, `interactiveDismissDisabled` below; Swift has no drawer close control, so a consumer close button must check `isDirty` itself). Reduce Motion cross-fade on iOS/visionOS 27. `style: .fullScreenCover` (iOS/visionOS) and themed via `.accivaSheetChrome()`.
- **Spec:** `.agents/components/Drawer.md`

### 15. DropdownMenu
- **Import:** `import { DropdownMenu, DropdownMenuItem } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Contextual action menu triggered by buttons with keyboard roving focus.
- **Gotcha:** ArrowUp on the trigger opens on the last item, typing jumps to a matching label, Tab closes and continues from the trigger, Escape returns focus; the trigger tooltip stays hidden while open. `DropdownMenuShortcut` is an end-aligned `<kbd>` (never glue it to the label). A long menu is capped at the space on the side it opened (minus `--overlay-gutter`), opens on the roomier side and scrolls inside; no height prop needed.
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load.
- **Spec:** `.agents/components/DropdownMenu.md`
- **Apple:** `AccivaDropdownMenu` / `AccivaDropdownMenuItem` (`apple/Sources/AccivaUI/Components/DropdownMenu/DropdownMenu.swift`) — a native `Menu` with the trigger styled by `AccivaButtonStyle` (`variant`/`size`, `iconOnly` needs `accessibilityLabel:`); items are `Button(role:)` with `variant: .danger` → destructive role and an `AccivaSymbol` or SF Symbol icon; separators, sections and checkbox items are `Divider`, `Section`, `Toggle`; no controlled open state.

### 16. EmptyState
- **Import:** `import { EmptyState } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Graphic placeholder and call-to-action when lists, search results, or tables have no items.
- **Apple:** `AccivaEmptyState` (`apple/Sources/AccivaUI/Components/EmptyState.swift`) over `ContentUnavailableView`; `systemImage` defaults to `tray`, optional `actions` builder; no `size`.
- **Spec:** `.agents/components/EmptyState.md`

### 17. FormField
- **Import:** `import { FormField } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Layout wrapper pairing form controls with accessible labels, helper text, and error messages.
- **Apple:** `AccivaFormField` (`apple/Sources/AccivaUI/Components/FormField.swift`) — wraps one native control; the label becomes its accessible name, required + error/hint its accessibility hint; a new error is announced and turns ACCIVA-styled fields inside `danger`. Inside `Form`, use a native `Section` with `AccivaSectionHeader` instead.
- **Spec:** `.agents/components/FormField.md`

### 18. Heading
- **Import:** `import { Heading } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Semantic typography heading levels (h1–h6) with consistent size scales.
- **Variant:** `size="display"` is fluid: `text-3xl` on phones, `sm:text-4xl`, `lg:text-6xl`, with `text-balance` and `wrap-break-word` defaults.
- **Apple:** `AccivaHeading` (`apple/Sources/AccivaUI/Components/Heading/Heading.swift`) — `level` → `.isHeader` + `.accessibilityHeading`; `size` decoupled from level; display/heading roles use AccivaSans, smaller tiers the system font; `isHeading: false` replaces `as="span"`. Dynamic Type already scales the display size.
- **Spec:** `.agents/components/Heading.md`

### 19. IconPicker
- **Import:** `import { IconPicker } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Searchable icon selection interface with virtualized grid.
- **Spec:** `.agents/components/IconPicker.md`

### 20. Input
- **Import:** `import { Input } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Accessible text, password, number, and search field. `leadingAddon` / `trailingAddon` attach a bordered segment *outside* the field (`https://`, `$`, `.com`, `USD`).
- **Gotcha:** an addon is not a `leadingIcon` — it sits outside the field so the caret stays clear, and it is announced with the field via `aria-describedby` (SC 1.3.1, SC 3.3.2). Use `leadingIcon` only for a decorative mark inside the box.
- **Apple:** `AccivaTextFieldStyle` (`.textFieldStyle(.acciva(size:isInvalid:))`) styles any native `TextField`/`SecureField`; `.accivaTextEditorStyle()` does the same for `TextEditor` (multi-line); `AccivaTextArea` (`Components/TextArea/TextArea.swift`) auto-grows between `minLines`/`maxLines` and takes `surface: .solid`/`.glass` (system material)/`.none` (chromeless: no fill, border or focus ring, for a field inside a glass container such as a chat composer; the container must show the focus indicator, and pass `error` so an invalid state stays visible), optional `isFocused` (caller-owned focus), an iOS 18+ `selection` init, and `onKeySubmit` (`(shift:) -> KeyPress.Result`) for Return/Shift-Return — `onSubmit` routes through that hook (plain Return) since `TextEditor` `.onSubmit` never fires; `font: AccivaTextFont` (`.mono` for code), `fillsHeight: true` to fill its container instead of growing to `maxLines`, and `isInvalid: true` for the red border without a message. `AccivaInput` (`apple/Sources/AccivaUI/Components/Input.swift`) adds label/hint/error (`showsLabel: false` hides the label but keeps it as the accessible name), `onSubmit`/`onCommit` (commit on submit or focus loss), `type: .search` (magnifier, clear, web-search keyboard), `leadingSystemImage`, `type` → keyboard + `textContentType` (iOS/visionOS), `clearable`, password reveal (`.isSelected`); 44pt hit areas. Numeric: `AccivaInput("Amount", value: $amount, format: .number)` binds any `ParseableFormatStyle` value like `TextField(value:format:)` (`type: .number` for whole numbers, else decimal pad). `surface: .glass` gives a capsule with the system material (same enum as `AccivaTextArea`). `isFocused` takes a caller-owned `FocusState<Bool>.Binding`, also on the `search:` variant. No `validate`/char count/addons.
- **Spec:** `.agents/components/Input.md`

### 21. Logo
- **Import:** `import { Logo } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Reusable brand logo asset with customizable mark slot (`mark` ReactNode or `src`/`alt` image pair, defaulting to ACCIVA prism monogram), wordmark, and responsive variants.
- **Spec:** `.agents/components/Logo.md`

### 22. Modal
- **Import:** `import { Modal } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Dialog window with focus trapping, backdrop blur, and escape-key dismissal. Enters with an overlay fade plus a panel fade/rise/scale and exits the same way before unmounting — pointer-aware travel, removed under `prefers-reduced-motion` (SC 2.3.3).
- **Dirty guard:** `confirmDismissal` (`{ title, message?, discardLabel?, keepLabel?, isDirty }`) makes Escape, backdrop and the close button open a discard prompt while `isDirty`, instead of closing (SC 3.3.4).
- **Apple:** `AccivaModal` (`apple/Sources/AccivaUI/Components/Modal/Modal.swift`) presents native `.sheet` with system-managed focus and dismissal; size tiers map to medium/large detents. `confirmDismissal` takes `AccivaDismissConfirmation` (`dismissalConfirmationDialog` on iOS 27 / macOS 15, `interactiveDismissDisabled` below); Reduce Motion cross-fade on iOS/visionOS 27. Optional `sheet: AccivaSheetOptions` adds `.fraction`/`.height` detents, `.fullScreenCover` (iOS/visionOS) and drag indicator control.
- **Spec:** `.agents/components/Modal.md`

### 22. OptimizedImage
- **Import:** `import { OptimizedImage } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** High-performance responsive image wrapper with aspect ratio and blur placeholders.
- **Spec:** `.agents/components/OptimizedImage.md`

### 23. Pagination
- **Import:** `import { Pagination } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Navigation controls for moving across pages in large datasets.
- **Apple:** `AccivaPagination` (`apple/Sources/AccivaUI/Components/Pagination/Pagination.swift`) — stateless; same `page`/`totalPages`/`siblingCount`/page-size/jump options, active page is `.isSelected`, rows-per-page is a `Picker(.menu)`.
- **Spec:** `.agents/components/Pagination.md`

### 24. RadioGroup
- **Import:** `import { RadioGroup, RadioItem } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Mutually exclusive choice among 2–6 visible options.
- **Apple:** `AccivaRadioGroup` (`apple/Sources/AccivaUI/Components/RadioGroup/RadioGroup.swift`) — native `.radioGroup` `Picker` on macOS, native `Button` rows with `.isSelected` on iOS/visionOS; `variant: .card` tiles with descriptions; `variant` is per group; `AccivaRadioCustomGroup` renders arbitrary per-option content (each option needs an accessibility label). `AccivaRadioGroup.haloInset` (public, half a spacing unit) is the leading inset to apply to a container so the selected dot halo is not clipped.
- **Hint:** `arrowHint` (string | `false`): first-keyboard-focus arrow-key caption, once per page load.
- **Spec:** `.agents/components/RadioGroup.md`

### 25. ScrollView
- **Import:** `import { ScrollView } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Smooth scrolling container with touch momentum and indicators.
- **Spec:** `.agents/components/ScrollView.md`

### 26. SearchableSelect
- **Import:** `import { SearchableSelect } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Combobox for searching and selecting from large option datasets. The panel is a top-layer anchored popover, capped at the space on the side it opened (minus `--overlay-gutter`), so it fits short/landscape screens; the list scrolls inside.
- **Apple:** `AccivaSearchableSelect` (`apple/Sources/AccivaUI/Components/SearchableSelect/SearchableSelect.swift`) — popover with a filter field over generic `Hashable` options, `Binding<Value?>`, optional custom `filter`, `emptyMessage`; two-level grouping via `sections:` (`AccivaSearchableSelectSection`, headers with the heading trait, empty groups hidden) and a caller trigger via `.customTrigger { text, hasValue in AnyView(...) }`; for short lists use `AccivaSelect`.
- **Spec:** `.agents/components/SearchableSelect.md`

### 27. Select
- **Import:** `import { Select } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Standard dropdown menu for small lists of static choices. `size` (Input tiers) and `className` (trigger) props; the listbox is a top-layer anchored popover, so `overflow:hidden` ancestors do not clip it; it is capped at the space on the side it opened (minus `--overlay-gutter`), opens on the roomier side and scrolls inside.
- **Apple:** `AccivaSelect` (`apple/Sources/AccivaUI/Components/Select/Select.swift`) — a token-styled `Menu` trigger over a native `Picker`; generic `Hashable` values, `Binding<Value?>`, placeholder and per-option `disabled`, optional `systemImage`, a leading icon, `size:` (Input tiers), and `noneLabel` to add a "none" row that clears the selection.
- **Spec:** `.agents/components/Select.md`

