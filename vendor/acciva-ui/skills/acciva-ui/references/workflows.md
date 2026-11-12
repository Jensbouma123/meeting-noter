# Component workflow

Mandatory order for adding or changing a component. Full detail: `CLAUDE.md`.

1. **Spec** — create/update `.agents/components/<Name>.md` before code: frontmatter keys `name`, `import`, `category`, `status`, `client`, `platform`, `tags`, `a11y_role`, `touch_target`; sections `What it is`, `When to use / when not`, `Props`, `Usage`, `Accessibility contract`, `Responsive behaviour`, `Security`, `Composition`, `Agent recipe`.
2. **Implement** — `src/components/ui|blocks/<Name>.tsx` plus `<Name>.test.tsx`; mobile-first, token classes, WCAG 2.2 AA.
3. **Export** — `export * from "./<Name>";` in `src/components/ui/index.ts` or `blocks/index.ts`.
4. **Docs site** — example in `src/app/(docs)/components/[slug]/examples/<slug>.tsx`; register in `src/app/(docs)/content.ts` and `examples/index.ts`.
5. **Skill catalog** — entry in [components.md](./components.md); update the decision matrix in [SKILL.md](../SKILL.md) for a new category or branch.
6. **Verify** — `npm run verify:all` (includes `check-skill-sync`: source, spec and catalog must agree).
