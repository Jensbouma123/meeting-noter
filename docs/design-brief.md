# Meeting Noter design brief (UI worker)

Feel: calm, modern, premium note-taker (think Granola / Otter / Linear polish). Transcript is the hero; chrome recedes.

## Layout
- Top bar: title (editable, "Untitled meeting"), live timer (tabular-nums), status pill, settings gear.
- Center: live transcript column (max ~72ch), speaker-grouped turns: colored dot + label + timestamp, text below. Partial (final=false) text renders at 55% opacity with a soft blinking caret; when final it eases to 100%.
- Bottom dock (floating, centered, rounded-full, backdrop-blur): big record/stop button, pause, source toggle (Mic / Call / Both), live level meters per source.
- Right rail (collapsible, hidden < 900px): speakers list with talk-time bars, click to rename inline.
- Empty state: friendly illustration-free prompt + primary "Start recording" and a hint about sharing the call tab with "Share tab audio" checked.
- Settings sheet (slide-over): capture mode, mic device, language, auto-scroll toggle. Persist in localStorage `mn.settings` (try/catch).
- Mobile/narrow: single column, dock stays reachable.

## Motion (must feel natural, never janky)
- Animate ONLY transform and opacity. No layout-thrashing animations, no animating height except via grid-template-rows 0fr->1fr.
- Durations: 120ms micro (hover/press), 220ms enter, 180ms exit. Easing: `cubic-bezier(0.22,1,0.36,1)` (ease-out-quint) for enters; spring-ish `linear()` curve for the record button.
- New turn enters: translateY(6px)+opacity 0 -> 0; words appended to a partial do NOT re-animate the whole block.
- Record button: morph circle -> rounded square on start, subtle breathing ring while live (opacity/scale, 2.4s).
- Level meters: canvas or transforms (scaleY) driven by `meeting.subscribeLevels` in rAF, smoothed (attack 0.5 / release 0.08). Never setState at audio rate.
- Auto-scroll: stick to bottom only when user is within 80px of bottom; otherwise show a "Jump to live" pill.
- Respect `prefers-reduced-motion`: drop translations, keep opacity fades.

## Performance
- Virtualize/windows the transcript when > 300 turns (content-visibility:auto on turn blocks is acceptable first step).
- Memoize turn components by segment id + text; selectors narrow (`useMeeting(s => s.status)`).
- No new npm dependencies: CSS + Web Animations API + acciva-ui + lucide-react only.

## Visual
- Use acciva-ui components/tokens (see src/styles/acciva/, exchange/acciva-ui.md). 8 speaker colors from tokens, readable on light bg.
- Typography: 15-16px transcript, 1.6 line-height, tabular-nums for times. Generous whitespace.
