import { useEffect, useState } from 'react';
import { meeting } from '@/components/meeting/store';

export function useMicDevices(): MediaDeviceInfo[] {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    meeting
      .listMicDevices()
      .then((devs) => setDevices(devs))
      .catch(() => setDevices([]));
  }, []);
  return devices;
}
