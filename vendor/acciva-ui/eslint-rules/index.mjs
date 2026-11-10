/**
 * Local ESLint rules for ACCIVA-UI.
 *
 * Both rules encode a pattern the library already owns and that hand-rolled
 * markup keeps skipping — see `.agents/testing.md` for the contract and
 * `.agents/accessibility.md` for the WCAG success criteria they defend.
 */

import { scrollableRegionTabindex } from "./scrollable-region-tabindex.mjs";
import { touchTarget44 } from "./touch-target-44.mjs";

const plugin = {
  meta: { name: "acciva", version: "1.0.0" },
  rules: {
    "touch-target-44": touchTarget44,
    "scrollable-region-tabindex": scrollableRegionTabindex,
  },
};

export default plugin;
