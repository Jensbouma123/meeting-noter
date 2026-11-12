# ACCIVA-UI Component Reference

This reference is an on-demand catalog of all 81 components available in `@jensbouma123/acciva-ui`.

---

## Responsive `size`

- **Purpose:** on components whose `size` takes a `SizeTier`, `size` accepts a bare tier (`size="md"`, unchanged) or a mobile-first responsive record (`size={{ base: "lg", md: "sm" }}`). `base` is the phone-portrait tier and is required; `sm`/`md`/`lg` override it at wider viewports.
- **Gotcha:** reach for a record when one tier is wrong somewhere — a comfortable `lg` control on a phone that compacts to `sm` on desktop. A bare tier never changes across viewports, so only add breakpoints you need.
- **Spec:** [Sizing scale](../../../src/app/(docs)/sizing/page.tsx)

---


## Catalog files

Entries are split by topic; each file holds the `###` entries for its section.

- [UI Primitives (1)](./components/ui-primitives-1.md)
- [UI Primitives (2)](./components/ui-primitives-2.md)
- [UI Primitives (3)](./components/ui-primitives-3.md)
- [UI Primitives (4)](./components/ui-primitives-4.md)
- [UI Primitives (5)](./components/ui-primitives-5.md)
- [Composition Blocks](./components/composition-blocks.md)
- [Layout Primitives](./components/layout-primitives.md)
- [PWA hooks, App routes, Deprecated prop names](./components/pwa-routes-deprecated.md)
