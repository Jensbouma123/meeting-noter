'use client';

import { Button } from '@jensbouma123/acciva-ui';
import { SpellCheck } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { FixWordToolbarProps } from './FixWordAction.types';

export function FixWordToolbar({ barRef, placement, onOpen }: FixWordToolbarProps) {
  const t = useT('transcript');
  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={t('fixWord.button')}
      data-side={placement?.side}
      className="fixed z-40 flex items-center rounded-lg border border-border-soft bg-elevation-3 p-0.5 text-foreground shadow-elevation-3 dark:bg-elevation-4"
      style={{ top: placement?.top ?? 0, left: placement?.left ?? 0, visibility: placement ? 'visible' : 'hidden' }}
    >
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onOpen}
        leadingIcon={<SpellCheck className="size-3.5" aria-hidden="true" />}
        className="text-foreground"
      >
        {t('fixWord.button')}
      </Button>
      <span
        aria-hidden="true"
        data-testid="fix-word-pointer"
        className={`absolute size-2 -translate-x-1/2 rotate-45 border-border-soft bg-elevation-3 dark:bg-elevation-4 ${
          placement?.side === 'below' ? '-top-1 border-l border-t' : '-bottom-1 border-b border-r'
        }`}
        style={{ left: placement?.arrowX ?? 0 }}
      />
    </div>
  );
}
