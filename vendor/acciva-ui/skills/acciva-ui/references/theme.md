# Generating a Theme from a Brand Seed

Reach for this when the human gives you a brand colour and you need the token set for it. Run the tool with the seed you were given. The tool takes the seed as-is and never changes its hue.

## CLI

```sh
npx acciva theme <seed> --harmony <name> --format css|tailwind|dtcg --out <path> --json
```

Defaults: `--harmony complementary`, `--format css`, stdout. stdout carries only the theme (redirect-safe: no banners, colours, or progress). `--out <path>` writes to a file instead. `--json` emits `{ seed, harmony, passesAA, unresolvable, failures, css | tailwind | dtcg }` for branching.

## Programmatic

```ts
import { generateTheme } from "@jensbouma123/acciva-ui/color";

const theme = generateTheme(seed, { harmony });
```

Returns `{ seed, harmony, css, tailwind, dtcg, audit, passesAA, overrides, unresolvable }`. Pure and synchronous: same seed and harmony give byte-identical output.

## Built-in presets

`PRESET_PALETTES` is the built-in list: `Ocean`, `Forest`, `Sunset`, `Orchid`,
`Crimson`, `Slate` and `Turf`. It ships on the `./theme` entry point:

```ts
import { PRESET_PALETTES, buildPresetTheme } from "@jensbouma123/acciva-ui/theme";

const turf = PRESET_PALETTES.find((preset) => preset.name === "Turf");
const tokens = buildPresetTheme(turf, "dark");
```

The first six are a seed and a harmony and nothing else. For those,
`generateTheme(preset.seed, { harmony })` is the whole preset and the CLI above
produces the stylesheet.

`Turf` is not. A green seed (`#00a22b`, `split-complementary`) supplies
`primary`, `accent` and `neutral`, but its amber `secondary` and its four status
families are chosen hues the engine cannot rotate out of one seed, so the preset
carries them in `tokenOverrides` — a per-mode `{ "--property": "#hex" }` map that
`generateTheme` does **not** read. Resolve it with `buildPresetTheme(preset, mode)`
instead, and check `preset.tokenOverrides` before assuming a preset is seed-only.

Do not pin `--focus-ring-offset`, in a preset or in a theme override. It is graded
against the action fills on one side and the outer focus ring on the other, so the
solver has to own it; pinning it is what makes an otherwise-passing palette fail
SC 2.4.11.

## What each format carries

- `css` — the complete drop-in stylesheet: the light `:root` block, the `html[data-theme="dark"]` and `prefers-color-scheme` blocks, the app-facing alias layer (`--background`, `--button-*-background`, `--badge-*`) and the `@theme inline` bridge. Only the 11 public ramp stops (50–950) are emitted; `--format dtcg` carries the full graph. Its first statement is `@import "./base.css"`, so the output file expects the seed-independent base layer as a sibling (copy it from `dist/styles/base.css` together with its `dist/styles/base/` folder, also published as `@jensbouma123/acciva-ui/styles/base`).
- `tailwind` — a valid Tailwind v4 `@theme` block only. It does not gain the alias layer.
- `dtcg` — the complete W3C DTCG 2025.10 graph, all 26 ramp steps included.

## Shipping a custom seed (build-time file, not the package stylesheet)

`@import "@jensbouma123/acciva-ui/styles"` is the default `#00835b` theme. For any other seed, generate a file at build time and import that instead:

```sh
npx acciva theme "<seed>" --out <dir>/tokens.css
cp node_modules/@jensbouma123/acciva-ui/dist/styles/base.css <dir>/base.css
cp -R node_modules/@jensbouma123/acciva-ui/dist/styles/base <dir>/
```

Then `@import "<dir>/tokens.css"` in the app's global CSS. Light/dark stays attribute- and media-driven; do NOT add a runtime seed-swapping API — that would ship the OKLCH engine to the browser.

## Reading the result

- The gate is `passesAA` (exit 0) / `audit.failures.length === 0`. Contrast ratio is the only gate; APCA is advisory.
- Each `unresolvable[]` entry is `{ role, reason, required }`: the role that could not clear the ratio floor `required`.

## When a seed cannot resolve (exit 1)

1. Read the `unresolvable` roles and the ratio each could not clear from stderr (`--json`: `unresolvable` and `failures`).
2. Report back to the human: the seed, the roles it failed, and the ratios they could not clear. State plainly that the fix is a different seed.
3. Stop. The tool does not pick a colour, and there is no auto-nudge. Only replace the seed with one the human approves, then re-run.
