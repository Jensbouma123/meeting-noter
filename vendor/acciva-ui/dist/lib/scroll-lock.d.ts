export declare function getScrollbarWidth(): number;
/**
 * Reference-counted scroll lock for modal dialogs (Modal, Drawer modal,
 * SettingsSheet, ConfirmDialog via Modal).
 *
 * Why both html and body: the viewport scrollbar is owned by
 * `document.documentElement` on most desktop browsers. Locking only
 * `document.body` leaves the page behind the dialog scrollable and keeps the
 * scrollbar visible while the old code still added `paddingRight`
 * compensation — the background then narrowed and visibly shifted left.
 * Locking both elements removes the scrollbar and freezes the page behind
 * the dialog (WCAG 2.2 SC 2.4.3 / 1.4.10 background-scroll behaviour).
 *
 * Nesting: the first locker records the original styles and applies the
 * compensation; subsequent lockers only bump the counter. The last unlock
 * restores. Unlock is idempotent.
 */
export declare function lockScroll(): () => void;
export declare function useScrollLock(active?: boolean): void;
export declare function __resetScrollLockForTests(): void;
