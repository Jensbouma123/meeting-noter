'use client';

import { Alert, Radio, RadioGroup, Select, Text } from '@jensbouma123/acciva-ui';
import type { CaptureMode } from '@/lib/meeting';
import { useT } from '@/lib/i18n/useT';
import type { SettingsSectionProps } from './types';
import { useMicDevices } from './useMicDevices';
import { useSettleLegacyNativeCapture } from './useSettleLegacyNativeCapture';
import { SettingsGroup, SettingsRow, SettingsStackedRow } from './SettingsRow';

export function AudioCaptureSection({
  settings,
  onSettingsChange,
}: SettingsSectionProps) {
  const t = useT('settings');
  const devices = useMicDevices();
  useSettleLegacyNativeCapture({ settings, onSettingsChange });

  const needsPermission = devices.length > 0 && devices.every((d) => !d.label);

  const micOptions = devices.map((d, index) => ({
    value: d.deviceId || `device-${index}`,
    label: d.label || `${t('mic')} ${index + 1}`,
  }));
  if (micOptions.length === 0) {
    micOptions.push({ value: 'default', label: t('defaultMic') });
  }

  return (
    <>
      <SettingsGroup>
        <SettingsStackedRow
          label={t('audioSource')}
          description={t('audioSourceDescription')}
        >
          <RadioGroup
            value={settings.mode}
            onChange={(mode) => onSettingsChange({ ...settings, mode: mode as CaptureMode })}
            orientation="vertical"
          >
            <Radio value="mic" label={t('mic')} description={t('micOnly')} />
            <Radio value="both" label={t('micAndCall')} description={t('micAndCallDescription')} />
          </RadioGroup>
        </SettingsStackedRow>
      </SettingsGroup>

      <Alert variant="info" layout="inline" title={t('recordingCallAudio')}>
        {t('recordingCallAudioHelp')}
      </Alert>

      <SettingsGroup>
        <SettingsRow
          label={t('microphone')}
          description={t('microphoneDescription')}
          htmlFor="setting-mic-device"
          control={
            <div className="flex flex-col gap-2">
              <Select
                id="setting-mic-device"
                options={micOptions}
                value={settings.micDeviceId}
                onChange={(micDeviceId) => onSettingsChange({ ...settings, micDeviceId })}
                placeholder={t('chooseMic')}
                aria-label={t('microphone')}
              />
              {needsPermission && (
                <Text size="xs" variant="muted">
                  {t('micPermission')}
                </Text>
              )}
            </div>
          }
        />
      </SettingsGroup>
    </>
  );
}
