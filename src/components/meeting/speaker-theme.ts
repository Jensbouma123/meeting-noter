/** Speaker colour palette.
 *
 * Every entry pairs a *dot* (a filled shape, so its 500-step reads on any
 * canvas) with a *text* class used for the speaker's name.
 *
 * The text classes carry an explicit `dark:` step, and that is load-bearing
 * rather than cosmetic. The `--color-*-50 … *-900` palette stops are defined
 * once for the whole theme: the dark palette redefines only the *semantic
 * roles* (`--foreground`, `--muted-foreground`, `--surface`, `--danger`, …),
 * never the raw 11-step scale. So a bare `text-primary-700` stays `#006948` —
 * dark green — when the canvas goes to `#060a08`, and the speaker's name
 * disappears. Each `textClass` therefore names a light-mode step AND the
 * matching 300-step that clears contrast on the dark surface.
 */

export interface SpeakerColorStyle {
  /** Filled dot. The 500-step is mid-tone enough to read on both canvases. */
  dotClass: string;
  /** Speaker name text, light + dark steps. */
  textClass: string;
  /** Talk-time bar fill. */
  barBgClass: string;
  /** Human-readable name, for debugging and future pickers. */
  name: string;
}

export const SPEAKER_COLORS: SpeakerColorStyle[] = [
  // 0: primary (brand green)
  {
    dotClass: 'bg-primary-500',
    textClass: 'text-primary-700 dark:text-primary-300',
    barBgClass: 'bg-primary-500',
    name: 'Primary Green',
  },
  // 1: secondary (teal)
  {
    dotClass: 'bg-secondary-500',
    textClass: 'text-secondary-700 dark:text-secondary-300',
    barBgClass: 'bg-secondary-500',
    name: 'Teal',
  },
  // 2: accent (magenta / berry)
  {
    dotClass: 'bg-accent-500',
    textClass: 'text-accent-700 dark:text-accent-300',
    barBgClass: 'bg-accent-500',
    name: 'Berry',
  },
  // 3: info (blue)
  {
    dotClass: 'bg-info-500',
    textClass: 'text-info-700 dark:text-info-300',
    barBgClass: 'bg-info-500',
    name: 'Blue',
  },
  // 4: warning (amber)
  {
    dotClass: 'bg-warning-500',
    textClass: 'text-warning-800 dark:text-warning-300',
    barBgClass: 'bg-warning-500',
    name: 'Amber',
  },
  // 5: danger (rose / red)
  {
    dotClass: 'bg-danger-500',
    textClass: 'text-danger-700 dark:text-danger-300',
    barBgClass: 'bg-danger-500',
    name: 'Rose',
  },
  // 6: success (emerald green)
  {
    dotClass: 'bg-success-500',
    textClass: 'text-success-800 dark:text-success-300',
    barBgClass: 'bg-success-500',
    name: 'Emerald',
  },
  // 7: neutral (slate)
  {
    dotClass: 'bg-neutral-500',
    textClass: 'text-neutral-700 dark:text-neutral-300',
    barBgClass: 'bg-neutral-500',
    name: 'Slate',
  },
];

export function getSpeakerColor(index: number): SpeakerColorStyle {
  const safeIdx = Math.abs(index) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[safeIdx];
}
