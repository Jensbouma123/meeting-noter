---
name: acciva-ui
description: Design system and component library guide for ACCIVA-UI (@jensbouma123/acciva-ui). Use when choosing UI components, implementing layouts, forms, navigation, or data display, and to look up component usage, props, and design token rules on demand.
---

# ACCIVA-UI Agent Skill

ACCIVA-UI is an agent-first, accessible (WCAG 2.2 AA floor), token-driven UI component library built for Next.js 16 (App Router), React 19, Tailwind CSS v4, and TypeScript.

This skill is designed for **progressive disclosure**: it provides a lightweight decision tree in context. For detailed component props, accessibility contracts, and composition recipes, view the on-demand spec file at `.agents/components/<Name>.md` or [references/components.md](./references/components.md).

---

## Bundle setup (Next.js)

Wrap the consumer's `next.config.ts` with `withAcciva` from `@jensbouma123/acciva-ui/next`. It merges `@jensbouma123/acciva-ui` and `lucide-react` into `experimental.optimizePackageImports` (deduped, the user's entries and other keys untouched), so only the components and icons actually imported are bundled. Recommended over setting `optimizePackageImports` by hand.

```ts
import { withAcciva } from "@jensbouma123/acciva-ui/next";
export default withAcciva({ /* user config */ });
```

Single components can also be imported by subpath (`@jensbouma123/acciva-ui/ui/Button`, `.../blocks/NavHeader`); the root import still works. `NavHeader` gets its search data via the `searchItems` prop — never import docs-site content into library code.

## CLI: import vs vendor (`acciva`)

The package ships an `acciva` bin with three commands: `theme` (see [references/theme.md](./references/theme.md)), `list`, and `add`.

- **Import by default.** Use the package exports above when the component fits as-is — consumers get fixes with every upgrade.
- **Vendor with `add`** only when the user wants to own and change a component's markup or behaviour beyond its props, or ships without the package's JS. `npx acciva add <name...>` copies the source plus every internal file it imports (resolved transitively, each once) into `src/components/acciva/` (helpers under `lib/`), with imports rewritten to relative paths. The copies stop following package updates.
- **Agents pass `--json`**: `acciva list --json` gives each component's `name`, `kind` (`ui`/`block`), `description`, `files` and internal `dependencies`; `acciva add … --json` prints `{ components, added, skipped, files:[{from,to}], peerDependencies, devDependencies, notes, errors, dryRun }` (`devDependencies` lists type packages such as `@types/node` that the copies' `process.env.NODE_ENV` checks need). Exit 0 = everything resolved and is on disk; exit 1 = unknown name (message names the closest match), a `--path` outside the project, or a write error.
- Plan first with `--dry-run`. Existing files are never replaced without `--overwrite` — don't pass it over a user's edited copy without asking. `--path <dir>` must stay inside the project root.
- `add` installs nothing and never touches the network: install the `peerDependencies` it reports yourself, keep the package installed, and keep `@import "@jensbouma123/acciva-ui/styles";` (or the `acciva theme` output) in the global CSS — vendored components style themselves from those tokens.
- Web only: SwiftUI consumers import the `AccivaUI` Swift package; there is no Swift vendoring.

## 🧭 Quick Component Decision Matrix (When to Use What)

### 1. Feedback, Overlays & Dialogs
| If you need to... | Use Component | Spec / Reference | Avoid Using |
|---|---|---|---|
| Ask user to confirm a dangerous/important action | `ConfirmDialog` | ConfirmDialog.md | Generic `Modal` |
| Show complex interactive dialog / custom form overlay | `Modal` | Modal.md | `Drawer` (unless mobile sheet) |
| Show side drawer, slide-over menu, or mobile action sheet | `Drawer` | Drawer.md | `Modal` |
| Show non-blocking transient status feedback | `Toast` | Toast.md | `Alert` |
| Show persistent contextual status / banner message | `Alert` | Alert.md | `Toast` |
| Show micro-hint on hover / focus for icon buttons | `Tooltip` | Tooltip.md | `Modal` / `Alert` |

### 2. Form Inputs & Selection Controls
| If you need to... | Use Component | Spec / Reference | Avoid Using |
|---|---|---|---|
| Text, number, email, password input with label/errors | `Input` or `FormField` | Input.md / FormField.md | Raw `<input>` |
| Standard dropdown selection (< 15 static options) | `Select` | Select.md | `SearchableSelect` |
| Searchable / filterable combobox (> 15 options or async) | `SearchableSelect` | SearchableSelect.md | `Select` |
| Single boolean toggle with immediate setting effect | `Switch` | Switch.md | `Checkbox` |
| Form checkbox (or multi-selection list) | `Checkbox` | Checkbox.md | `Switch` |
| Mutually exclusive choice from 2–6 visible options | `RadioGroup` | RadioGroup.md | `Select` |
| Continuous or stepped range value adjustment | `Slider` | Slider.md | `Input` |
| Single date selection | `DatePicker` | DatePicker.md | Raw `<input type="date">` |
| Date range (start & end bound) selection | `DateRangePicker` | DateRangePicker.md | Two separate date pickers |
| Lucide icon selection interface | `IconPicker` | IconPicker.md | Raw icon strings |
| Pick one arbitrary colour (HEX/RGB/HSL, alpha, swatches) | `ColorPicker` | ColorPicker.md | Raw `<input type="color">` |
| Attach files / documents / images from the device (click, drag-and-drop, paste) | `FileInput` (`variant="dropzone"`) | FileInput.md | Raw `<input type="file">`, `Input` |
| One file in a dense form row (invoice, CV) | `FileInput variant="compact"` | FileInput.md | Dropzone in a tight grid |
| Let the user pick / change their profile photo | `FileInput variant="avatar"` | FileInput.md | `Avatar` (display only) |
| Shrink / crop images before upload | `FileInput` with `compress` / `crop` | FileInput.md | Image libraries (zero-dep helpers ship in `@/lib/image`) |
| Crop an image `Blob` you already hold (not from a picker) | `ImageCropper` + `cropImage()` | ImageCropper.md | `ImageCropper` for picker images (use `FileInput crop`) |

#### Files & images: FileInput vs ImageCropper vs Input / Avatar
- `FileInput` picks + validates (`accept`, `maxSize`, `minSize`, `maxFiles`) + optionally crops/compresses, then hands `File[]` to `onChange`. It **never uploads**: do the request in `onChange` and show progress through `fileState`. Do not re-validate type/size in `onChange` — but the server must.
- `variant`: `"dropzone"` (default, attachments + file list) · `"compact"` (one Input-height row) · `"avatar"` (round picker, crops to a circle). Displaying an existing photo is `Avatar`, a URL/path field is `Input`.
- Images going to a server: add `compress="web"` (`"avatar"` for profile photos, `"thumbnail"` for 512px); re-encoding also strips EXIF/GPS.
- `ImageCropper` is only for a `Blob` already in app state; keep the `CropRect` from `onChange` and call `cropImage(source, rect, preset)` on your own Apply button. Remote URLs: fetch to a Blob first.
- Helpers (`cropImage`, `compressImage`, `formatBytes`, `matchesAccept`, …) import from `@/lib/image` in-repo, `@jensbouma123/acciva-ui/image` from the package.

```tsx
<FileInput label="Attachments" multiple accept="documents" maxSize={10 * 1024 * 1024} onChange={setFiles} />
<FileInput variant="compact" label="Invoice (PDF)" accept="pdf" name="invoice" required />
<FileInput variant="avatar" label="Profile photo" compress="avatar" previewSrc={user.avatarUrl} onChange={([f]) => save(f)} />
<FileInput label="Cover" accept="images" compress="web" crop={{ aspect: "16:9" }} onChange={setFiles} />
<ImageCropper source={blob} aspect="1:1" onChange={setRect} />
```

### 3. Navigation & Menus
| If you need to... | Use Component | Spec / Reference | Avoid Using |
|---|---|---|---|
| Top global application header | `NavHeader` | NavHeader.md | Custom header |
| Collapsible desktop sidebar navigation | `Sidebar` | Sidebar.md | Custom `<div>` |
| Multi-level (group > item > variant) collapsible nav tree | `NavTree` | NavTree.md | Custom `<div>` nesting |
| Mobile bottom navigation bar (< 5 main destinations) | `BottomNav` | BottomNav.md | `Sidebar` on mobile |
| Hierarchical location breadcrumbs | `Breadcrumbs` | Breadcrumbs.md | Custom span list |
| Switch between parallel views in the same context | `Tabs` | Tabs.md | `BottomNav` |
| Multi-page table/list navigation | `Pagination` | Pagination.md | Custom next/prev |
| Contextual dropdown action menu / kebab menu | `DropdownMenu` | DropdownMenu.md | `Select` |

### 4. Data Display & Surfaces
| If you need to... | Use Component | Spec / Reference | Avoid Using |
|---|---|---|---|
| Content surface container with elevation | `Card` | Card.md | Plain `<div className="border">` |
| KPI metric, count, or analytic stat summary | `StatCard` | StatCard.md | Generic `Card` |
| Structured table with sort, filter, pagination | `DataTable` | DataTable.md | Raw `<table>` |
| Key-value detail description list | `DataList` | DataList.md | Generic table |
| Long list with 100+ items (virtualized performance) | `VirtualList` | VirtualList.md | Unvirtualized `.map()` |
| Collapsible FAQ / stacked accordion sections | `Accordion` | Accordion.md | Custom disclosure |
| Status pill / tag / count indicator | `Badge` | Badge.md | Custom span |
| Placeholder zero-data screen with action | `EmptyState` | EmptyState.md | Blank screen |
| Loading placeholder skeletons | `Skeleton` | Skeleton.md | Spinners alone |
| Responsive image with blur placeholder | `OptimizedImage` | OptimizedImage.md | Raw `<img>` |

### 5. Layout & Application Blocks
| If you need to... | Use Component | Spec / Reference |
|---|---|---|
| Complete responsive application layout | `AppShell` | AppShell.md |
| Filtering, search input, and sorting toolbar | `FilterBar` | FilterBar.md |
| Side configuration & settings panel | `SettingsSheet` | SettingsSheet.md |
| Typography headings (h1–h6 with semantic levels) | `Heading` | Heading.md |
| Typography body, caption, subtitle text | `Text` | Text.md |
| Smooth scrolling container with touch support | `ScrollView` | ScrollView.md |

---

## 🎨 Non-Negotiable Styling & Accessibility Rules

1. **Mobile-First Always**: Base Tailwind classes must represent phone layout. Use `sm:`, `md:`, `lg:` only for progressively adding space or multi-column layout.
2. **Design Tokens Only**:
   - Never use arbitrary pixel or hand-picked hex values (`w-[342px]`, `#0ea5e9`).
   - Use token classes: `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-focus-ring`.
   - Use semantic colors: `primary-*`, `secondary-*`, `accent-*`, `success-*`, `warning-*`, `danger-*`, `info-*`, `neutral-*`.
   - Use elevations: `elevation-0` through `elevation-4`.
3. **Touch Targets**: Interactive controls must have at least a `44px` hit area on touch devices (`touch-target-44` or `min-h-11`).
4. **WCAG 2.2 AA Floor**: All interactive components must support keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`, Arrow keys) and maintain 3:1 contrast for UI controls / 4.5:1 for text.

---

## 🔄 The Agent Workflow: Adding or Modifying Components

Adding or changing a component is a mandatory 6-step sync (spec, implementation, export, docs example, skill catalog, `npm run verify:all`): see [references/workflows.md](./references/workflows.md).

---

## 📚 On-Demand Deep References

- [Component Catalog & Details](./references/components.md) — Comprehensive list with imports and specs.
- [Design Tokens & Theme Reference](./references/tokens.md) — OKLCH palette, radii, and elevations.
- [Generating a Theme from a Brand Seed](./references/theme.md) — `npx acciva theme <seed>`, `generateTheme`, and what to do when a seed cannot resolve.
- [Agent Contribution Workflows](./references/workflows.md) — Step-by-step developer guidelines.
