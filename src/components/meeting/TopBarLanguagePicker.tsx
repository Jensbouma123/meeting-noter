import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@jensbouma123/acciva-ui';
import { Check, Globe } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { LANGUAGE_PICK_OPTIONS } from './topBarLanguageOptions';
import type { TopBarLanguagePickerProps } from './TopBarLanguagePicker.types';

export function TopBarLanguagePicker({
  language,
  selectedLang,
  onPickLanguage,
}: TopBarLanguagePickerProps) {
  const t = useT('topbar');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<Globe className="size-3" />}
          tooltip={
            language.locked
              ? t('languageTip').replace('{name}', language.name)
              : t('detectingLanguage').replace('{name}', language.name)
          }
          aria-label={t('language').replace('{name}', language.name)}
          className="touch-target-44 font-medium"
        >
          <span
            key={`${language.code}:${language.name}`}
            className="animate-lang-crossfade whitespace-nowrap"
          >
            <span className="sm:hidden">{language.code.toUpperCase()}</span>
            <span className="hidden sm:inline">{language.name}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuLabel>{t('spokenLanguage')}</DropdownMenuLabel>
        {LANGUAGE_PICK_OPTIONS.map((opt) => {
          const selected = selectedLang === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onPickLanguage(opt.value)}
              className={selected ? 'font-semibold' : undefined}
            >
              {opt.label === 'autoDetect' ? t(opt.label) : opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
