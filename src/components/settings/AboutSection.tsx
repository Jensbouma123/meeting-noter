'use client';

import { Alert, Button, Text, VStack } from '@jensbouma123/acciva-ui';
import { useState } from 'react';
import pkg from '../../../package.json';
import { useT } from '@/lib/i18n/useT';
import { useUpdate } from '@/components/update/useUpdate';
import { UpdateDialog } from '@/components/update/UpdateDialog';
import { restartOnboarding } from '@/lib/onboarding/store';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

const APP_VERSION = pkg.version;

export function AboutSection() {
  const t = useT('update');
  const tOnboarding = useT('onboarding');
  const update = useUpdate();
  const [open, setOpen] = useState(false);
  const info = update.info;

  return (
    <>
      <SettingsGroup>
        <SettingsRow label="Meeting Noter" description={t('aboutDescription')} control={<Text size="sm" variant="muted" font="mono">v{APP_VERSION}</Text>} />
        <VStack spacing="xs" className="w-full p-4">
          <Text size="xs" variant="muted">{t('privacy')}</Text>
        </VStack>
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          label={tOnboarding('reopen.title')}
          description={tOnboarding('reopen.description')}
          control={<Button variant="secondary" onClick={restartOnboarding}>{tOnboarding('reopen.action')}</Button>}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow label={t('updates')} description={info?.notes || (info?.available ? '' : t(update.status === 'checking' ? 'checking' : update.status === 'error' ? 'checkFailed' : 'upToDate'))} control={null} />
        {info?.notes && <Alert variant="info" layout="inline">{info.notes}</Alert>}
        {info?.available && !info.canApply && <Alert variant="warning" layout="inline">{t('manual')}</Alert>}
        <div className="p-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void update.refresh()}>{t('checkAgain')}</Button>
          {info?.available && info.pageUrl && <Button variant="secondary" onClick={() => window.open(info.pageUrl, '_blank', 'noopener,noreferrer')}>{t('whatsNew')}</Button>}
          {info?.available && <Button onClick={() => setOpen(true)} disabled={!info.canApply}>{t('updateNow')}</Button>}
        </div>
      </SettingsGroup>
      <UpdateDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
