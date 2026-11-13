'use client';

import type React from 'react';
import { Badge } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { RAIL_TABS } from './railTabIds';
import type { RailTabsProps } from './RightRail.types';

export function RailTabs({ active, onChange, count, trailing }: RailTabsProps) {
  const t = useT('rail');
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = RAIL_TABS.indexOf(active);
    let next: number;
    if (e.key === 'ArrowRight') next = (i + 1) % RAIL_TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + RAIL_TABS.length) % RAIL_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = RAIL_TABS.length - 1;
    else return;
    e.preventDefault();
    onChange(RAIL_TABS[next]);
    document.getElementById(`rail-tab-${RAIL_TABS[next]}`)?.focus();
  };
  return (
    <div className="flex shrink-0 items-stretch justify-between gap-2 border-b border-border-subtle px-4">
      <div role="tablist" aria-label={t('tabs')} onKeyDown={onKeyDown} className="flex min-w-0 items-stretch gap-4">
        {RAIL_TABS.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`rail-tab-${tab}`}
              aria-selected={selected}
              aria-controls={`rail-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab)}
              className={`focus-ring relative flex items-center gap-1.5 whitespace-nowrap py-3 text-sm font-semibold transition-colors ${
                selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(tab)}
              {tab === 'participants' && (
                <Badge variant="neutral" size="xs" className="leading-none">
                  {count}
                </Badge>
              )}
              {selected && (
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500" />
              )}
            </button>
          );
        })}
      </div>
      {trailing && <div className="flex items-center">{trailing}</div>}
    </div>
  );
}
