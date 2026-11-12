import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, 'globals.css'), 'utf8');

/** CSS without comments, so prose about colours and motion never counts as a rule. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of `@media (prefers-reduced-motion: reduce) { … }`, by brace matching. */
function reducedMotion(): string {
  const start = RULES.indexOf('@media (prefers-reduced-motion: reduce)');
  if (start === -1) return '';
  const open = RULES.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < RULES.length; i += 1) {
    if (RULES[i] === '{') depth += 1;
    else if (RULES[i] === '}') {
      depth -= 1;
      if (depth === 0) return RULES.slice(open + 1, i);
    }
  }
  return '';
}

const REDUCED = reducedMotion();
/** Rules outside the reduced-motion block: what runs at full motion. */
const MOTION_RULES = REDUCED ? RULES.replace(REDUCED, '') : RULES;

/** Class names of rules that start an animation (not `animation: none`). */
function animatedClasses(): string[] {
  const classes = new Set<string>();
  for (const match of MOTION_RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector, body] = match;
    const animations = body
      .split(';')
      .map((declaration) => declaration.trim())
      .filter((declaration) => /^animation:/.test(declaration))
      .map((declaration) => declaration.slice('animation:'.length).trim());
    if (!animations.some((value) => value !== '' && value !== 'none')) continue;
    for (const cls of selector.matchAll(/\.([a-z0-9-]+)/gi)) classes.add(cls[1]);
  }
  return [...classes];
}

describe('globals.css', () => {
  it('has a reduced-motion block at all', () => {
    expect(REDUCED).not.toBe('');
  });

  it('still every local animation under prefers-reduced-motion', () => {
    // A new animated class without an override is exactly how a vestibular
    // trigger ships: the library's 0ms tokens only reach transitions.
    const animated = animatedClasses();
    // Guards the analyser itself: an empty list would pass vacuously.
    expect(animated).toEqual(expect.arrayContaining(['mn-word-new', 'animate-turn-enter', 'animate-banner-enter']));
    const unhandled = animated.filter((cls) => !REDUCED.includes(`.${cls}`));
    expect(unhandled).toEqual([]);
  });

  it('stops the animation of remounted transcript rows', () => {
    // Virtualised rows remount when scrolled back into view; replaying the
    // enter animation there reads as a flicker.
    expect(MOTION_RULES).toMatch(/\.mn-vrow\s+\.animate-turn-enter\s*\{[^}]*animation:\s*none/);
  });

  it('declares no colour of its own', () => {
    // Colour comes from the acciva-ui tokens, which have a dark counterpart;
    // a literal here is a colour that breaks in the other theme.
    expect(RULES).not.toMatch(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i);
  });

  it('lets long translated dialog actions wrap instead of clipping', () => {
    // The library fixes its control height; Dutch button labels overflow it.
    const block = MOTION_RULES.match(/\.dialog-actions\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(block).toMatch(/flex-wrap:\s*wrap/);
    const buttons = MOTION_RULES.match(/\.dialog-actions\s*>\s*button\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(buttons).toMatch(/height:\s*auto/);
    expect(buttons).toMatch(/min-height:/);
  });

  it('opens the dock microphone menu upward, right-aligned, only with anchor positioning', () => {
    const anchor = RULES.slice(RULES.indexOf('@supports (anchor-name: --a)'));
    const micMenu = anchor.match(/\.dropdown-menu\.mic-menu\[data-align="end"\]\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(micMenu).toMatch(/position-area:\s*block-start span-inline-start/);
    expect(micMenu).toMatch(/--dropdown-offset/);
  });
});
