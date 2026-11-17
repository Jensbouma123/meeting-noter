'use client';

import { Badge, Tab, TabList, TabPanel, Tabs } from '@jensbouma123/acciva-ui';
import type { ReactNode } from 'react';
import { RAIL_TABS } from './railTabIds';
import type { RailTab } from './RightRail.types';
import { useT } from '@/lib/i18n/useT';
import type { RailTabsProps } from './RightRail.types';

export function RailTabs({ active, onChange, count, trailing, children }: RailTabsProps & { children: ReactNode }) {
  const t = useT('rail');
  return (
    <Tabs value={active} onValueChange={(value) => onChange(value as RailTab)} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-stretch justify-between gap-2 border-b border-border-subtle px-4">
        <TabList aria-label={t('tabs')} className="flex min-w-0 items-stretch gap-4">
          {RAIL_TABS.map((tab) => (
            <Tab
              key={tab}
              value={tab}
              className={`relative flex items-center gap-1.5 py-3 text-sm font-semibold ${tab === active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t(tab)}
              {tab === 'participants' && (
                <Badge variant="neutral" size="xs" className="leading-none">
                  {count}
                </Badge>
              )}
              {tab === active && (
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500" />
              )}
            </Tab>
          ))}
        </TabList>
        {trailing && <div className="flex items-center">{trailing}</div>}
      </div>
      {RAIL_TABS.map((tab) => (
        <TabPanel key={tab} value={tab} className="min-h-0 flex-1">
          {tab === active ? children : null}
        </TabPanel>
      ))}
    </Tabs>
  );
}
