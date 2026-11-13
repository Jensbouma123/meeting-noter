/**
 * App-wide single-open registry: at most one Tooltip is visible at a time, with or without a
 * `TooltipGroup`. Module scope, so it needs no provider.
 */
let active = null;
/** Records `owner` as the visible tooltip, closing the previous one first. */
export function claimOpen(owner, close) {
    const previous = active;
    active = { owner, close };
    if (previous && previous.owner !== owner)
        previous.close();
}
/** Drops `owner`'s claim once it closes or unmounts; a no-op when another tooltip holds it. */
export function releaseOpen(owner) {
    if (active?.owner === owner)
        active = null;
}
