import type { AppSettings } from '@/components/meeting';

export const buildStartOptions = (settings: AppSettings) => ({
  mode: settings.mode,
  micDeviceId: settings.micDeviceId === 'default' ? undefined : settings.micDeviceId,
  language: settings.language === 'auto' ? undefined : settings.language,
  systemVia: settings.systemVia,
});
