### AttentionBadge
- **Import:** `import { AttentionBadge } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Says a human is needed: `reason="grill" | "compare" | "permission" | "stuck"`, as a `label` pill or an `indicator` for an avatar corner (`decorative` when row text states the reason).
- **Gotcha:** appearing is not announced — raise a `Toast` yourself (SC 4.1.3). `compare` uses the badge info token pair through the component's own three-tone mapping (`AccivaAttentionTone`); a plain status label can use `Badge variant="info"` directly.
- **Spec:** `.agents/components/AttentionBadge.md`

### ListItem
- **Import:** `import { ListItem } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Interactive list row: `title` + optional `subtitle`, `leading`/`trailing` inert slots, `selected` (single-select), `checked` (multi-select, switches to `role="checkbox"`), `depth` for outline indent.
- **Gotcha:** `checked` wins over `selected`. Slots must be inert (no nested controls).
- **Variant:** `asChild` is link mode: the row merges onto one link (`<ListItem asChild selected={isCurrent}><Link href=… /></ListItem>`). The child's own `onClick` is kept (runs first). Web-only; on Swift use `AccivaListItemLink`.
- **Apple:** `AccivaListItem` (`apple/Sources/AccivaUI/Components/ListItem/ListItem.swift`) — same title/subtitle/leading/trailing/selected/checked/depth. No swipe slot: swipe actions on rows go through `AccivaDataList` `rowActions`, since `swipeActionsContainer()` outside `List` is unverified (host spike pending).
- **Spec:** `.agents/components/ListItem.md`

### SplitPane
- **Import:** `import { SplitPane } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Sidebar + detail panes side by side from `md`, stacked on phones; optional full-width `header`; `defaultSidebarWidth="sm" | "md" | "lg"`; `resizable` swaps the divider for a focusable splitter.
- **Gotcha:** the sidebar never squeezes the detail pane. `onSidebarWidthChange` reports the clamped px width.
- **Apple:** `AccivaSplitPane` (`apple/Sources/AccivaUI/Components/SplitPane/SplitPane.swift`) — generic over sidebar, detail and header views.
- **Spec:** `.agents/components/SplitPane.md`

### FooterBar
- **Import:** `import { FooterBar } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Bottom action bar: top border over a surface row, `leading` and `trailing` icon-action groups, padded over the safe area.
- **Gotcha:** icon-only actions in the slots need a name (`Button iconOnly tooltip`). See `.agents/pwa.md` for the safe-area rules.
- **Apple:** `AccivaFooterBar` (`apple/Sources/AccivaUI/Components/FooterBar.swift`) — generic `leading`/`trailing` builders.
- **Spec:** `.agents/components/FooterBar.md`

### StatusDot
- **Import:** `import { StatusDot } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Presence/state dot in six tones (`neutral` | `info` | `success` | `warning` | `danger` | `brand`), with a required `label` as its accessible name, `showLabel` for visible text, and `pulse` for ongoing activity.
- **Gotcha:** `label` is required so the dot is never colour alone (SC 1.4.1). `pulse` is static under reduced motion.
- **Apple:** `AccivaStatusDot` (`apple/Sources/AccivaUI/Components/StatusDot.swift`) — same tones and `pulse`; the diameter tracks the size tier.
- **Spec:** `.agents/components/StatusDot.md`

### TypingIndicator
- **Import:** `import { TypingIndicator } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Three animated dots meaning "someone is typing"; `size="sm" | "md" | "lg"`. Timing comes from the motion tokens.
- **Gotcha:** `label` is required and is the only announced text; the dots are `aria-hidden` (SC 4.1.3).
- **Apple:** `AccivaTypingIndicator` (`apple/Sources/AccivaUI/Components/TypingIndicator.swift`) — same label and size tiers; timing from `AccivaTokens.Motion`.
- **Spec:** `.agents/components/TypingIndicator.md`

### DiffStat
- **Import:** `import { DiffStat } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** GitHub-style `+additions / -deletions` counts with a five-block strip showing the split. Read-only.
- **Gotcha:** the whole stat is one `role="img"` named by the counts; the strip is `aria-hidden`. Negative counts clamp to zero.
- **Apple:** `AccivaDiffStat` (`apple/Sources/AccivaUI/Components/DiffStat.swift`) — same `filledBlocks` rule as the web helper.
- **Spec:** `.agents/components/DiffStat.md`

### Stepper
- **Import:** `import { Stepper } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Progress through an ordered list of steps: `steps` (string[]) + zero-based `current`; `variant="dots" | "chips"`.
- **Gotcha:** `current` is clamped to the step range. The current step is marked by size and fill, not colour alone (SC 1.4.1).
- **Apple:** `AccivaStepper` (`apple/Sources/AccivaUI/Components/Stepper/Stepper.swift`) — same steps/current/variant.
- **Spec:** `.agents/components/Stepper.md`

### Swatch
- **Import:** `import { Swatch, LegendItem } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Colour chip in four size tiers (`xs` | `sm` | `md` | `lg`); `label` names it. `LegendItem` pairs a swatch with a `label` and a visible `caption`.
- **Gotcha:** `color` is parsed and re-serialised before it reaches CSS. Absent `label` = decorative.
- **Apple:** `AccivaSwatch` + `AccivaLegendItem` (`apple/Sources/AccivaUI/Components/Swatch.swift`) — same size tiers and naming rule.
- **Spec:** `.agents/components/Swatch.md`

### SwatchPicker
- **Import:** `import { SwatchPicker } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Form control to pick one colour from `options` (`string` or `{ value, label }`); controlled `value`/`onChange` or `defaultValue`; `orientation`, `size`, `label`, `hint`, `error`.
- **Gotcha:** renders a radiogroup; `onChange` receives the value and parsed colour details. `error` is announced as an alert.
- **Apple:** `AccivaSwatchPicker<Value>` (`apple/Sources/AccivaUI/Components/SwatchPicker.swift`) — generic over `Hashable` values.
- **Spec:** `.agents/components/SwatchPicker.md`

### HeatCell
- **Import:** `import { HeatCell } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** One heatmap cell: `intensity` 0–1 quantised to five opacity steps; `isEmpty` for a neutral no-data fill.
- **Gotcha:** with `label` the cell is `role="img"`; without it, it is decorative and the grid must be explained in text (SC 1.4.1, 1.1.1).
- **Apple:** `AccivaHeatCell` (`apple/Sources/AccivaUI/Components/HeatCell.swift`) — same intensity steps and label rule.
- **Spec:** `.agents/components/HeatCell.md`

### MessageBubble
- **Import:** `import { MessageBubble } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Chat bubble: `role="user"` aligns trailing on a brand tint; `role="assistant"` aligns leading on a muted surface. `author` names the sender.
- **Gotcha:** string children render as plain text, never Markdown or HTML (security: treat content as untrusted).
- **Apple:** `AccivaMessageBubble<Content>` (`apple/Sources/AccivaUI/Components/MessageBubble.swift`) — same role sides and `author` naming.
- **Spec:** `.agents/components/MessageBubble.md`

### DisclosureButton
- **Import:** `import { DisclosureButton } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Ghost text trigger with a trailing chevron for opening a menu, popover or listbox. Owns no open state: pass `aria-expanded` / `aria-haspopup`, or wrap it in `DropdownMenuTrigger`, which clones the child with them.
- **Gotcha:** `leadingIcon`, `size` and `disabled` as on other controls. It does not toggle anything by itself.
- **Apple:** `AccivaDisclosureButton` (`apple/Sources/AccivaUI/Components/DisclosureButton.swift`) — same ghost trigger with a trailing chevron; no open state of its own.
- **Spec:** `.agents/components/DisclosureButton.md`

