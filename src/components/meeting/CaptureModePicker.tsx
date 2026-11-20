'use client';

import { useId } from 'react';
import { Lock, Mic, PhoneCall } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { CaptureModePickerProps } from './CaptureModePicker.types';

const OPTIONS = [
  { value: 'mic', Icon: Mic, title: 'micOnlyTitle', desc: 'micOnlyDesc' },
  { value: 'both', Icon: PhoneCall, title: 'micCallTitle', desc: 'micCallDesc' },
] as const;

export function CaptureModePicker({ mode, locked, onChange }: CaptureModePickerProps) {
  const t = useT('dock');
  const headingId = useId();
  const noteId = useId();
  const current = mode === 'mic' ? 'mic' : 'both';

  return (
    <section className="flex flex-col gap-2">
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('whatToRecord')}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        aria-describedby={locked ? noteId : undefined}
        aria-disabled={locked || undefined}
        className="grid gap-2 sm:grid-cols-2"
      >
        {OPTIONS.map(({ value, Icon, title, desc }) => {
          const selected = value === current;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => !selected && onChange(value)}
              className={`focus-ring flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors enabled:cursor-pointer disabled:cursor-default ${
                selected
                  ? 'border-primary-500 bg-primary-500/10 dark:border-primary-400'
                  : 'border-border-subtle enabled:hover:bg-elevation-2 dark:enabled:hover:bg-elevation-3'
              } ${locked && !selected ? 'opacity-60' : ''}`}
            >
              <Icon
                className={`mt-0.5 size-5 shrink-0 ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{t(title)}</span>
                <span className="text-xs text-muted-foreground">{t(desc)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {locked && (
        <p id={noteId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3.5 shrink-0" aria-hidden="true" />
          {t('modeLocked')}
        </p>
      )}
    </section>
  );
}
