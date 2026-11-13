import type { ShortcutEntry } from './ShortcutsHelp.types';

export const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['R'], label: 'shortcuts.record' },
  { keys: ['Space'], label: 'shortcuts.pause' },
  { keys: ['⌘/Ctrl', 'F'], label: 'shortcuts.search' },
  { keys: ['⌘/Ctrl', 'E'], label: 'shortcuts.export' },
  { keys: ['?'], label: 'shortcuts.show' },
  { keys: ['Esc'], label: 'shortcuts.close' },
];
