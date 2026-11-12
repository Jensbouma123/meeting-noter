### 28. Skeleton
- **Import:** `import { Skeleton } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Shimmer placeholder animation representing data in a loading state.
- **Apple:** `AccivaSkeleton(variant:animation:width:height:lines:)` (`apple/Sources/AccivaUI/Components/Skeleton/Skeleton.swift`) — same `variant`/`animation`/`lines` (tapered last row); fill is `mutedForeground` at 20%, pulse dims to half, shimmer is a masked `neutralForeground` sweep; static under Reduce Motion/Transparency.
- **Spec:** `.agents/components/Skeleton.md`

### Progress
- **Import:** `import { Progress } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Linear bar or circular ring for task progress — determinate with `value`/`max`, indeterminate when `value` is omitted; `tone` colours the indicator.
- **Gotcha:** `label` is required (it is the `aria-label`, not visible text); progress is not announced live — raise a `Toast` on completion (SC 4.1.3). Use `Skeleton` when the coming layout is known, `Button loading` for a busy button.
- **Series:** `series` 1–8 (`--chart-1` … `--chart-8`) overrides `tone` on the indicator only, for share or meter bars.
- **Apple:** `AccivaProgress(_:value:total:variant:tone:series:)` (`apple/Sources/AccivaUI/Components/Progress.swift`) over `ProgressView`, tinted by tone; `variant: .circular` is a determinate ring (`Gauge` `.accessoryCircularCapacity` on iOS).
- **Spec:** `.agents/components/Progress.md`

### 29. Slider
- **Import:** `import { Slider } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Range selection slider for numerical and percentage values.
- **Apple:** `AccivaSlider` (`apple/Sources/AccivaUI/Components/Slider.swift`) — token-styled native slider; `range`/`step`, `showsValueLabel`, `showsTicks`, `formatValue`; label (or `accessibilityLabel`) is the accessible name.
- **Spec:** `.agents/components/Slider.md`

### 30. Switch
- **Import:** `import { Switch } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Direct on/off toggle switch for instant state modification.
- **Apple:** `AccivaSwitch` (`apple/Sources/AccivaUI/Components/Switch.swift`) — a native `Toggle` with `.toggleStyle(.accivaSwitch(size:))`; tiers map to native `ControlSize`; label-less form requires `accessibilityLabel`.
- **Spec:** `.agents/components/Switch.md`

### 31. Tabs
- **Import:** `import { Tabs, TabList, Tab, TabPanel } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Tabbed navigation interface switching between related views. `variant="pill" | "underline"` and `orientation="horizontal" | "vertical"` cover segmented controls, page/settings tab sets, and vertical tablists. A horizontal list scrolls (x only) with an edge fade when tabs overflow, one indicator slides between tabs, and `draggable` (default true) lets a drag from the selected tab — or a 400ms press-and-hold on any other tab — move that indicator with the finger and slide the selection (commits on release; Escape/cancel restores). Keyboard: Tab/Shift+Tab move focus across tabs without selecting (deliberate APG deviation), Enter/Space select, arrows/Home/End move and select.
- **Apple:** `AccivaTabs` (`apple/Sources/AccivaUI/Components/Tabs/Tabs.swift`) — `variant: .segmented` (default) is a native segmented `Picker` (the `pill` variant) building only the selected panel, with a selector-only init (`selection:tabs:accessibilityLabel:`) for a bare bar when you lay out panels yourself; `variant: .glass(onGlass:showsBar:)` is a toolbar-density bar (one `GlassEffectContainer`, 28pt `.xs` items, morphing `accivaGlass(.selected)` lozenge, `Label` + badge `AccivaTab`s via array or trailing closure, optional `deselectsOnReselect` on optional-bound selections); `showsBar: false` drops the bar's own `.control` capsule (and inner inset) so it can sit inside a caller's toolbar glass group — lozenge and morph unchanged, while `onGlass` also swaps the lozenge glass for a solid fill; no `underline`/`vertical`/per-tab `disabled`. OS 27 `pickerStyle(.tabs)` for `variant: .segmented` is pending the host check that the pill look survives; web is unchanged.
- **Spec:** `.agents/components/Tabs.md`

### 32. Text
- **Import:** `import { Text } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Semantic body, caption, code, and subtitle typography primitive.
- **Apple:** `AccivaText` (`apple/Sources/AccivaUI/Components/Text/Text.swift`) — same `size`/`variant`/`weight`/`align`/`font`/`truncate`; every size scales with Dynamic Type; strings are verbatim (never Markdown), pass an `AttributedString` to opt in; `View.accivaFont(_:weight:font:)` applies token-scaled type to any view; `AccivaTextFont.font(style:pointSize:weight:)` is public for size-proportional glyph fonts (Dynamic Type scales); `AccivaTextFont.fixedFont(size:weight:)` is the exact-size variant for icon tiles, honoured in every family and not Dynamic-Type scaled (SC 1.4.4), never body copy; `AccivaTokens.OnHue.foreground(on:)` picks black/white text at ≥4.5:1 over any hue (SC 1.4.3); no `as`.
- **Spec:** `.agents/components/Text.md`

### 33. Toast
- **Import:** `import { Toast, toast } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Floating non-blocking temporary notifications.
- **Apple:** `AccivaToastCenter` + `AccivaToastStack/AccivaToastView` (`apple/Sources/AccivaUI/Components/Toast/Toast.swift`) — `post(.success/title:description:)` (plus `success/info/warning/danger` conveniences), `dismiss(id:)`/`dismissAll()`, overlay via `.accivaToastOverlay(center:position:)` (top/bottom); `duration: nil` persists (danger/action default; web action default is 10s, Apple port deferred), FIFO queue per position, announcement on appearance, labelled dismiss; strings only, no hotkey/hover-pause.
- **Spec:** `.agents/components/Toast.md`

### 34. Tooltip
- **Import:** `import { Tooltip } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Accessible hover and focus contextual helper labels.
- **Gotcha:** on touch, holding the trigger ~500ms opens the tooltip (`longPress`, default true; auto-dismisses ~1.5s after release, click suppressed once) — never the only route to the name (SC 2.5.1). Shows instantly by default (`delay={0}`); pass `delay={ms}` only when a hover-intent pause is wanted.
- **Apple:** `AccivaTooltip` (`apple/Sources/AccivaUI/Components/Tooltip/Tooltip.swift`) — same `side` (popover-arrow hint)/`delay` (seconds, touch hold)/`maxWidth`; always the trigger's accessibility hint, `.help()` on macOS, long-press popover on iOS/visionOS (stays a popover on iPhone); `View.accivaTooltip(_:side:delay:maxWidth:)` modifier; works on disabled controls.
- **Edge:** near a screen edge it aligns to the trigger's edge (edge-aligned `position-try` fallbacks), never covers the trigger, and is bounded by safe-area insets — no consumer code.
- **Spec:** `.agents/components/Tooltip.md`

### 35. Popover
- **Import:** `import { Popover } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Anchored rich hint cards with title, content, icon-only close button, optional action button, and directional pointer arrow matching Tooltip surface tokens.
- **Gotcha:** `dismissOnOutsideClick` defaults to `false` (macOS hint style) — pass `dismissOnOutsideClick={true}` to close when clicking outside. The `actionLabel` button calls `onAction` then closes (controlled: `onOpenChange(false)`).
- **Edge:** a trigger at a screen edge shifts the card inside the viewport (safe-area aware) — no consumer code.
- **Spec:** `.agents/components/Popover.md`
- **Apple:** `AccivaPopover` uses a native anchored popover with a trigger/content builder, binding or default open state, title, and optional action.

### 35. VirtualList
- **Import:** `import { VirtualList } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** High-performance list windowing for rendering 1,000+ items without DOM lag, supporting optional floating scroll-to-top button.
- **Spec:** `.agents/components/VirtualList.md`

### 36. ColorPicker
- **Import:** `import { ColorPicker } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Form field for one arbitrary colour (brand colour, label tint, chart series). Input-styled trigger opens a spectrum + hue/alpha sliders, HEX/RGB/HSL code inputs with a full-width pill switcher, and optional caller `swatches` — `Popover` from `md:` up, bottom-sheet `Drawer` on phones. `format` sets the stored serialization; `allowAlpha={false}` for opaque-only fields; `name` renders a hidden input; React Hook Form via `Controller` (`value`/`onChange`/`onBlur`/`ref`/`name`).
- **Gotcha:** never pre-sanitize colour strings — `parseColor` (`src/lib/color/formats.ts`) is the only gate. For 2–8 fixed named colours with no free entry use `RadioGroup`; theme generation is the `/color-studio` route, not this.
- **Spec:** `.agents/components/ColorPicker.md`

### 37. FileInput
- **Import:** `import { FileInput } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** File picker form field — click, keyboard, drag-and-drop and opt-in `paste` — that validates `accept` (`"images" | "documents" | "pdf"` or a native list), `maxSize`/`minSize`/`maxFiles`, optionally crops (`crop`, `ImageCropper` in a `Modal`) and compresses (`compress="web" | "thumbnail" | "avatar"` or custom), then hands `File[]` to `onChange`. `variant="dropzone"` (default, with file list) · `"compact"` (Input-height row for dense forms) · `"avatar"` (round profile-photo picker, crops to a circle). Upload state per file via `fileState` → `{ status, progress, error }`; `name` makes native `FormData` carry the processed files.
- **When not:** displaying an existing image is `Avatar`/`OptimizedImage`; a URL/path is `Input`. It does not upload — do the request in `onChange`.
- **Gotcha:** `accept`/size checks are UX, not security — the server re-validates. Un-processed files keep EXIF/GPS; `compress` strips it. Rejections are already shown and announced — don't toast them again. For i18n, `crop={{ messages, label }}` is forwarded to the built-in cropper (FileInput's own `messages` cover the Modal title/buttons) — no need to pair with a standalone `ImageCropper`.
- **Usage:** `<FileInput label="Attachments" multiple accept="documents" maxSize={10 * 1024 * 1024} onChange={setFiles} />` · `<FileInput variant="avatar" label="Profile photo" compress="avatar" onChange={([f]) => save(f)} />`
- **Spec:** `.agents/components/FileInput.md`

### 38. ImageCropper
- **Import:** `import { ImageCropper } from "@jensbouma123/acciva-ui"` + `import { cropImage } from "@jensbouma123/acciva-ui/image"`
- **Category:** Composite
- **Purpose:** Inline controlled crop editor for an image `Blob` you already hold: movable/resizable box, zoom `Slider`, `aspect="free" | "1:1" | "4:3" | "16:9" | "circle" | number`, optional `aspectOptions` switcher. Emits a `CropRect`; `cropImage(source, rect, preset)` produces the `File`.
- **When not:** images picked from the device — use `FileInput crop`. Remote URLs — fetch to a same-origin/CORS Blob first. No rotate/filters.
- **Gotcha:** it has no Apply/Cancel of its own — wrap it in a `Modal` or section with visible buttons, and handle `onError`.
- **Usage:** `<ImageCropper source={blob} aspect="16:9" onChange={setRect} />` then `await cropImage(blob, rect, "web")`
- **Spec:** `.agents/components/ImageCropper.md`

---

### AgentKindChip
- **Import:** `import { AgentKindChip } from "@jensbouma123/acciva-ui"`
- **Category:** Composite
- **Purpose:** Identity mark for a coding-agent kind (`claude`, `pi`, `opencode`, `agy`, `codex`, `hermes`, `copilot`): `display="label"` (icon + name pill) or `"glyph"` (icon disc, `decorative` when the name is adjacent). Kind is told apart by icon and name, never colour.
- **Gotcha:** not interactive — wrap it in a control to make it clickable; no `onClick`.
- **Spec:** `.agents/components/AgentKindChip.md`

### StatusRail
- **Import:** `import { StatusRail } from "@jensbouma123/acciva-ui"`
- **Category:** Primitive
- **Purpose:** Decorative 3-step-thin edge bar for a surface's state (`tone`, `orientation="vertical" | "horizontal"`, `inset`). Parent must be `relative`.
- **Gotcha:** always `aria-hidden`; the state must also be text or a named icon (SC 1.4.1).
- **Spec:** `.agents/components/StatusRail.md`

