function fakeMicDevice(deviceId: string, label: string, groupId: string): MediaDeviceInfo {
  return {
    deviceId,
    label,
    kind: 'audioinput',
    groupId,
    toJSON() { return this; },
  } as unknown as MediaDeviceInfo;
}

async function enumerateRealMics(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  } catch {
    return [];
  }
}

export async function listMicDevices(): Promise<MediaDeviceInfo[]> {
  const realMics = await enumerateRealMics();
  if (realMics.length > 0) return realMics;
  return [
    fakeMicDevice('default', 'Default Microphone (Built-in)', 'default-grp'),
    fakeMicDevice('airpods', 'AirPods Pro (Bluetooth)', 'airpods-grp'),
    fakeMicDevice('studio-mic', 'USB Studio Condenser Mic', 'studio-grp'),
  ];
}
