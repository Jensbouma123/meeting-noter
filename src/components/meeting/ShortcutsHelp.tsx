'use client';

import {
  Badge,
  Button,
  Divider,
  HStack,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['R'], label: 'Start or stop recording' },
  { keys: ['Space'], label: 'Pause or resume recording' },
  { keys: ['⌘/Ctrl', 'F'], label: 'Search transcript' },
  { keys: ['⌘/Ctrl', 'E'], label: 'Export transcript' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['Esc'], label: 'Close a dialog or search' },
];

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  // `Modal` owns the backdrop, the focus trap, Escape handling and the body
  // scroll lock — all of which the hand-rolled overlay re-implemented (and
  // got subtly wrong: it focused a bare close button and never restored focus).
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Shortcuts don't work while you're typing in a field."
      size="sm"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <VStack spacing="none" className="w-full">
        {SHORTCUTS.map((s, i) => (
          <VStack key={s.label} spacing="sm" className="w-full">
            {i > 0 && <Divider />}
            <HStack spacing="md" justify="between" align="center">
              <Text size="sm" variant="muted" className="min-w-0">
                {s.label}
              </Text>
              <HStack spacing="xs" className="shrink-0">
                {s.keys.map((k) => (
                  <kbd key={k} className="contents">
                    <Badge variant="neutral" size="sm" className="font-mono">
                      {k}
                    </Badge>
                  </kbd>
                ))}
              </HStack>
            </HStack>
          </VStack>
        ))}
      </VStack>
    </Modal>
  );
}
