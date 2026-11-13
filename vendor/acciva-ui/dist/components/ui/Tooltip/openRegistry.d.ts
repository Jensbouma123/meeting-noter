/** Records `owner` as the visible tooltip, closing the previous one first. */
export declare function claimOpen(owner: object, close: () => void): void;
/** Drops `owner`'s claim once it closes or unmounts; a no-op when another tooltip holds it. */
export declare function releaseOpen(owner: object): void;
