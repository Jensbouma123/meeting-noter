import { oklchToHex } from "../color/index.js";
import { ACTION_PALETTES, ACTION_STEP, BADGE_FILL_STEP, BADGE_LABEL_STEP, BADGE_PALETTES, LINK_STEP, STATUS_PALETTES, } from "./constants.js";
import { onActionFill, onStatusFill, solveOnColour, stopColor } from "./on-colour.js";
/**
 * One dedicated property per role the contrast solver is allowed to move.
 *
 * Before this table each solved role wrote whichever property happened to carry
 * its default — body-on-canvas and body-on-card both wrote `--foreground`, link
 * and badge label both wrote the `--color-primary-800` primitive step — so
 * solving one pair silently undid another's fix (audit Fix 4). Each of these is
 * seeded from the same primitive or semantic role it used to read, so an
 * un-overridden theme renders byte-identically; the difference is that an
 * override now lands on a property nothing else owns, and never on a
 * `--color-<palette>-<stop>` scale step.
 *
 * The seeding rule only applies to a property that had a predecessor.
 * `--border-subtle` had none: it is the decorative hairline and reads
 * `border.subtle`, the ungated L 0.92 / 0.24 separator — not `border.default`,
 * whose 3:1 control boundary would paint every card and table edge as a heavy
 * line. Its pair is graded `exempt` under SC 1.4.11, so darkening it toward a
 * gating ratio is a regression, not a fix.
 *
 * `--subtle-foreground` had none either. It is the third text tier —
 * `foreground.muted`, L 0.50 / 0.64 — which until now no property emitted at
 * all, while `--muted-foreground` carried `foreground.secondary` one step
 * above it. Components that wanted the lighter tier reached for
 * `text-muted-foreground/80` and composited their way to 4.28:1 on the light
 * canvas; the role itself is gated at 4.5:1 against canvas and surface, so the
 * token clears what the alpha could not. Its name is offset from its role by
 * exactly the offset `--muted-foreground` already carries — closing that is a
 * rename of a shipped property, not this variable's job.
 *
 * The gate is canvas and surface only (`buildSemanticRoles`), so
 * `foreground.muted` is not guaranteed on `--elevation-2..4`: in dark mode it
 * measures 4.52:1 on the overlay and 3.99:1 on the dialog. Third-tier text
 * inside a Drawer or Modal belongs on `--muted-foreground`.
 */
export const DERIVED_VARIABLES = [
    { name: "--surface-foreground", pick: (p, m) => p.roles[m].foreground.primary.color },
    { name: "--subtle-foreground", pick: (p, m) => p.roles[m].foreground.muted.color },
    { name: "--link-foreground", pick: (p, m) => stopColor(p, "primary", LINK_STEP[m]) },
    { name: "--brand-foreground", pick: (p, m) => p.roles[m].accent.brand.color },
    { name: "--border-subtle", pick: (p, m) => p.roles[m].border.subtle.color },
    { name: "--border-control", pick: (p, m) => p.roles[m].border.default.color },
    { name: "--focus-ring-surface", pick: (p, m) => p.roles[m].border.focus.color },
    { name: "--focus-ring-control", pick: (p, m) => p.roles[m].border.focus.color },
    { name: "--focus-ring-offset", pick: (p, m) => p.roles[m].border.focusOffset.color },
    ...ACTION_PALETTES.map((name) => ({
        name: `--button-${name}-background`,
        pick: (p) => stopColor(p, name, ACTION_STEP),
    })),
    // On-colour foregrounds, one per semantic fill. Each is solved from the fill
    // it sits on (white when white clears 4.5:1, black when the fill is light),
    // so a light dark-mode status fill gets a dark label instead of an assumed
    // white one.
    ...ACTION_PALETTES.map((name) => ({
        name: `--button-${name}-foreground`,
        pick: onActionFill(name),
    })),
    ...STATUS_PALETTES.map((name) => ({
        name: `--${name}-foreground`,
        pick: onStatusFill(name),
    })),
    {
        name: "--neutral-foreground",
        pick: (p) => solveOnColour(oklchToHex(stopColor(p, "neutral", 900))),
    },
    ...BADGE_PALETTES.flatMap((name) => [
        {
            name: `--badge-${name}-foreground`,
            pick: (p, m) => stopColor(p, name, BADGE_LABEL_STEP[m]),
        },
        {
            name: `--badge-${name}-background`,
            pick: (p, m) => stopColor(p, name, BADGE_FILL_STEP[m]),
        },
    ]),
];
