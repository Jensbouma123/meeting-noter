'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@jensbouma123/acciva-ui';
import { Check } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { THEME_ICONS, THEME_LABEL_KEYS, THEME_PREFERENCE_CYCLE } from './themeSwitcherConstants';
import { useThemePreference } from './useThemePreference';
import type { ThemePreference, ThemeSwitcherProps } from './ThemeSwitcher.types';

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const t = useT('settings');
  const { preference: current, choose } = useThemePreference();
  const ActiveIcon = THEME_ICONS[current];
  const label = (preference: ThemePreference) => t(THEME_LABEL_KEYS[preference]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          tooltip={t('theme')}
          aria-label={`${t('theme')}: ${label(current)}`}
          leadingIcon={<ActiveIcon className="size-4" />}
          className={`touch-target-44 ${className ?? ''}`.trim()}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
        {THEME_PREFERENCE_CYCLE.map((pref) => {
          const selected = pref === current;
          return (
            <DropdownMenuItem
              key={pref}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => choose(pref)}
              className={selected ? 'font-semibold' : undefined}
            >
              {label(pref)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
